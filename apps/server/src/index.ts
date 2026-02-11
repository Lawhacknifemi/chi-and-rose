
import { createContext } from "@chi-and-rose/api/context";
import { appRouter } from "@chi-and-rose/api/routers/index";
import { auth, sendEmail } from "@chi-and-rose/auth";
import { db, user, eq, provisionDatabase } from "@chi-and-rose/db";
import { env } from "@chi-and-rose/env/server";
import { OpenAPIHandler } from "@orpc/openapi/node";
import { OpenAPIReferencePlugin } from "@orpc/openapi/plugins";
import { onError } from "@orpc/server";
import { RPCHandler } from "@orpc/server/node";
import { ZodToJsonSchemaConverter } from "@orpc/zod/zod4";
import { toNodeHandler } from "better-auth/node";
import cors from "cors";
import express from "express";
import { handleRPC } from "./utils/custom-rpc";

// Provision database tables on startup
(async () => {
  try {
    console.log("[Server Init] Provisioning database...");
    await provisionDatabase();
  } catch (error) {
    console.error("[Server Init] Provisioning failed:", error);
  }
})();

// Debug Import
console.log("[DEBUG] Initializing appRouter in routers/index.ts");
if (!appRouter) {
  console.error("[CRITICAL] appRouter is UNDEFINED! Check circular dependencies or export issues.");
}

const app = express();
app.set("trust proxy", true); // Ensure express trusts the environment (adb/proxies)

console.log("[Server Init] process.env.BETTER_AUTH_URL:", process.env.BETTER_AUTH_URL);
console.log("[Server Init] env.BETTER_AUTH_URL (parsed):", env.BETTER_AUTH_URL);

app.use((req, res, next) => {
  console.log(`[Global Debug] ${req.method} ${req.url} (path: ${req.path}) [Origin: ${req.headers.origin}]`);
  if (req.path.includes("/auth")) {
    const cookieHeader = req.headers.cookie;
    if (cookieHeader) {
      const cookies: Record<string, string> = {};
      cookieHeader.split(';').forEach(cookie => {
        const parts = cookie.split('=');
        const name = parts[0].trim();
        const value = parts.slice(1).join('=');
        cookies[name] = value;
      });
      console.log(`[Auth Debug] Cookies keys:`, Object.keys(cookies));

      // Log state cookie existence specifically (masked)
      const stateCookie = Object.keys(cookies).find(k => k.includes('state'));
      if (stateCookie) {
        console.log(`[Auth Debug] Found state cookie: ${stateCookie} = ${cookies[stateCookie].substring(0, 10)}...`);
      } else {
        console.log(`[Auth Debug] NO STATE COOKIE FOUND!`);
      }
    } else {
      console.log(`[Auth Debug] Cookies: Missing`);
    }

    if (req.query && req.query.state) {
      console.log(`[Auth Debug] Query State: ${req.query.state}`);
    }
  }
  next();
});

app.use(
  cors({
    origin: [
      env.CORS_ORIGIN,
      "http://10.0.2.2:3000",
      "http://127.0.0.1:3000",
      "http://localhost:3000",
      "http://127.0.0.1:3001",
      "http://localhost:3001"
    ],
    methods: ["GET", "POST", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  }),
);

// -------------------------------------------------------------------------
// Middleware Stack
// -------------------------------------------------------------------------

// Global Body Parsing (must come before RPC handler)
// Create the JSON parser once, not on every request
const jsonParser = express.json({ limit: "50mb" });
app.use((req, res, next) => {
  if (req.path.startsWith("/api/auth")) {
    // Skip body parsing for Better-Auth routes (it handles its own)
    return next();
  }
  // Apply the JSON parser
  jsonParser(req, res, next);
});

// Custom Handler for Social Sign-In (Supports both Browser redirects and Native Token exchange)
app.use("/api/auth/sign-in/social", express.json(), express.urlencoded({ extended: true }), async (req, res, next) => {
  if (req.method !== "POST") return next();

  console.log(`[Auth Middleware] Intercepting Social Sign-In (${req.headers["content-type"]})`);
  try {
    const isJson = req.headers["content-type"]?.includes("application/json");
    const { provider, callbackURL, idToken, accessToken } = req.body;

    if (!provider) return res.status(400).send("Missing provider");

    // Case 1: Browser-based (form-urlencoded) Redirect Flow
    if (!isJson && callbackURL) {
      console.log("[Auth Middleware] browser-based flow");
      const response = await auth.api.signInSocial({
        body: { provider, callbackURL },
        asResponse: true
      });

      response.headers.forEach((value, key) => { res.setHeader(key, value); });
      const data = await response.json();
      if (data?.url) return res.redirect(data.url);
      return res.status(500).send("No redirect URL returned");
    }

    // Case 2: Native Token Exchange (JSON)
    if (isJson && (idToken || accessToken)) {
      console.log("[Auth Middleware] native token exchange flow");
      const response = await auth.api.signInSocial({
        body: {
          provider,
          idToken,
          accessToken,
          // For token exchange, callbackURL is not used for redirection, 
          // but Better Auth might require it depending on configuration.
          callbackURL: callbackURL || "chiandrose://app/auth/callback"
        },
        asResponse: true
      });

      // Mirror cookies/headers (Crucial for session persistence)
      response.headers.forEach((value, key) => { res.setHeader(key, value); });

      const data = await response.json();
      // Better Auth usually returns the session/user or a redirect if error.
      // If we're here, we want to ensure the mobile app gets the session JSON.
      return res.status(response.status).json(data);
    }

    // Not handled by this shim, let Better Auth handle it or next middleware
    next();
  } catch (e) {
    console.error("[Auth Middleware] Error:", e);
    return res.status(500).send("Internal Auth Error");
  }
});

// Better-Auth Handler (runs for all auth requests)
const authHandler = toNodeHandler(auth);
app.use((req, res, next) => {
  if (req.path.startsWith("/auth")) {
    req.url = "/api" + req.url;
  }

  if (req.path.startsWith("/api/auth")) {
    return authHandler(req, res);
  }
  next();
});

// Create oRPC handler using REAL appRouter
const rpcHandler = new RPCHandler({
  router: appRouter,
  createContext,
  onError: (error) => {
    console.error(`[RPC Error] ${error.code} (${error.status}): ${error.message}`, error.cause);
    // Continue with default onError if needed, or we've already logged it.
  },
});

// Mount oRPC/Unified handlers
app.get("/ping", (req, res) => res.send("pong"));

// 1. Unified Authentication Handler
// Standard toNodeHandler handles req/res correctly
app.use(["/api/auth", "/auth"], authHandler);

// 2. Unified RPC Handler
app.use(["/rpc", "/cms", "/health", "/scanner", "/users", "/discover", "/community", "/flow"], async (req, res, next) => {
  // Canary for liveness check
  if (req.path === '/__canary') {
    const v = "v_unified_v2";
    console.log(`[RPC] Canary hit! ${v}`);
    return res.type('text').send(`CHIRP ${v}`);
  }

  // Health check specialty if bare
  if (req.path === '/healthCheck') {
    return rpcHandler.handle(req, res);
  }

  console.log(`[Unified RPC] Route hit: ${req.originalUrl} -> delegating to handleRPC`);
  try {
    await handleRPC(req, res);
  } catch (err) {
    console.error("[Unified RPC] Handler crashed:", err);
    if (!res.headersSent) {
      res.status(500).json({ error: "Internal Server Error" });
    }
  }
});

// Fallback: Health check and dynamic root routing
app.use("/", async (req, res, next) => {
  // Skip if already handled by other routes or static paths
  if (req.path === "/" || req.path === "/ping" || req.path.startsWith("/login") || req.path.startsWith("/debug-env")) {
    return next();
  }

  // Better-Auth uses /api/auth or stripped etc.
  if (req.path.startsWith("/api/auth") || req.path.startsWith("/auth")) {
    return authHandler(req, res);
  }

  console.log(`[Root Catchall] Attempting resolution for: ${req.url}`);
  try {
    // If it looks like an RPC call (has multiple segments or matches our routers)
    // we use handleRPC which is more robust for stripped paths.
    await handleRPC(req, res);

    // If still not sent, we pass to next
    if (!res.headersSent) {
      next();
    }
  } catch (err) {
    console.error("[Root Catchall] Error:", err);
    if (!res.headersSent) {
      res.status(500).send("Server Error");
    }
  }
});

// Step 2: Better-Auth redirects here after login.
app.get("/login/success", async (req, res) => {
  const target = req.query.target as string;

  if (!target) {
    return res.status(400).send("Missing target deep link");
  }

  try {
    const session = await auth.api.getSession({
      headers: req.headers
    });

    if (!session) {
      return res.status(401).send("Authentication failed: No session found.");
    }

    const token = session.session.token;
    res.redirect(`${target}?token=${token}`);

  } catch (error) {
    console.error("Token Bridge Error:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    res.status(500).send("Internal Server Error: " + errorMessage);
  }
});

app.get("/login/:provider", (req, res) => {
  const { provider } = req.params;
  const { callbackURL } = req.query; // The final deep link destination

  console.log(`[Auth Bridge] Request: ${req.url}`);
  console.log(`[Auth Bridge] Provider: ${provider}`);
  console.log(`[Auth Bridge] callbackURL: ${callbackURL}`);
  console.log(`[Auth Bridge] Query Keys:`, Object.keys(req.query));

  if (!provider || !callbackURL) {
    return res.status(400).send("Missing provider or callbackURL");
  }

  const host = req.headers.host ?? "localhost:3000";
  const protocol = req.protocol ?? "http";
  const apiUrl = "/api/auth/sign-in/social";
  const bridgeUrl = `${protocol}://${host}/login/success?target=${encodeURIComponent(callbackURL as string)}`;

  const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Redirecting to ${provider}...</title>
      </head>
      <body>
        <p>Redirecting to ${provider}...</p>
        <form id="authForm" action="${apiUrl}" method="POST">
          <input type="hidden" name="provider" value="${provider}" />
          <input type="hidden" name="callbackURL" value="${bridgeUrl}" />
        </form>
        <script>
          // Auto-submit the form
          document.getElementById("authForm").submit();
        </script>
      </body>
      </html>
    `;
  res.send(html);
});

app.get("/debug-env", (req, res) => {
  res.json({
    BETTER_AUTH_URL: process.env.BETTER_AUTH_URL,
    AUTH_OPTIONS_BASE: auth.options.baseURL,
    CORS_ORIGIN: process.env.CORS_ORIGIN,
    HEADERS_ORIGIN: req.headers.origin,
    HEADERS_HOST: req.headers.host
  });
});

app.listen(3000, "0.0.0.0", () => {
  console.log("Server is running on http://0.0.0.0:3000");
  console.log("Google Client ID present:", !!env.GOOGLE_CLIENT_ID);
  if (env.GOOGLE_CLIENT_ID) {
    console.log("Google Client ID prefix:", env.GOOGLE_CLIENT_ID.substring(0, 5) + "...");
  }

  // Inspect the actual Better-Auth configuration
  console.log("Auth Config BaseURL:", auth.options.baseURL);
  console.log("Auth Config Google Enabled:", auth.options.socialProviders?.google?.enabled);
});
