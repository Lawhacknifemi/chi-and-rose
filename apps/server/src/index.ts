
import { createContext } from "@chi-and-rose/api/context";
import { appRouter } from "@chi-and-rose/api/routers/index";
import { auth, sendEmail } from "@chi-and-rose/auth";
import { db, user, eq } from "@chi-and-rose/db";
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

// Debug Import
console.log("[DEBUG] Initializing appRouter in routers/index.ts");
if (!appRouter) {
  console.error("[CRITICAL] appRouter is UNDEFINED! Check circular dependencies or export issues.");
}

const app = express();
app.set("trust proxy", true); // Ensure express trusts the environment (adb/proxies)

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

// 1. Better-Auth Handler
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

// 2. Global Body Parsing
app.use((req, res, next) => {
  if (req.path.startsWith("/api/auth")) {
    next();
  } else {
    express.json()(req, res, next);
  }
});

console.log("[DEBUG] Body parsing middleware registered");

// Create oRPC handler using REAL appRouter (kept for reference or fallback usage if needed)
const rpcHandler = new RPCHandler({
  router: appRouter,
  createContext,
  onError,
});

// Mount oRPC handlers
app.use("/rpc", async (req, res, next) => {
  // Canary for liveness check
  if (req.path === '/__canary') {
    const v = "v_12345";
    console.log(`[RPC] Canary hit! ${v}`);
    return res.type('text').send(`CHIRP ${v}`);
  }

  console.log(`[RPC Handler] Delegating to Custom Handler: ${req.url}`);
  return handleRPC(req, res);
});


// Fallback: Mount RPC at root for stripped paths (e.g. /healthCheck instead of /rpc/healthCheck)
app.use("/", async (req, res, next) => {
  // Skip if already handled by other routes
  if (req.path.startsWith("/api/auth") || req.path.startsWith("/login") || req.path.startsWith("/debug-env")) {
    return next();
  }

  console.log(`[Root RPC Handler] Handling: ${req.path}`);
  return handleRPC(req, res);
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

  if (!provider || !callbackURL) {
    return res.status(400).send("Missing provider or callbackURL");
  }

  const apiUrl = "/api/auth/sign-in/social";
  const bridgeUrl = `http://localhost:3000/login/success?target=${encodeURIComponent(callbackURL as string)}`;

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

app.listen(3000, () => {
  console.log("Server is running on http://0.0.0.0:3000");
  console.log("Google Client ID present:", !!env.GOOGLE_CLIENT_ID);
  if (env.GOOGLE_CLIENT_ID) {
    console.log("Google Client ID prefix:", env.GOOGLE_CLIENT_ID.substring(0, 5) + "...");
  }

  // Inspect the actual Better-Auth configuration
  console.log("Auth Config BaseURL:", auth.options.baseURL);
  console.log("Auth Config Google Enabled:", auth.options.socialProviders?.google?.enabled);
});
