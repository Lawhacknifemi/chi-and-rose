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
// import { eq } from "drizzle-orm"; // Removed
import express from "express";

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
// Mount Better-Auth FIRST to ensure it handles its own body parsing and requests.
// Support both /api/auth (Standard) and /auth (Stripped by DigitalOcean key)
const authHandler = toNodeHandler(auth);
app.use((req, res, next) => {
  if (req.path.startsWith("/api/auth") || req.path.startsWith("/auth")) {
    return authHandler(req, res);
  }
  next();
});

// 2. Global Body Parsing
// Skip for Auth and RPC
app.use((req, res, next) => {
  const isAuth = req.path.startsWith("/api/auth") || req.path.startsWith("/auth");
  // RPC check is tricky without prefix, but we can assume anything not auth/login might be RPC if we are strictly the API server
  // For safety, we just allow body parsing generally unless it's strictly excluded
  if (isAuth) {
    next();
  } else {
    express.json()(req, res, next);
  }
});

// ... (skipping RPC Handler setup lines)

// Mount oRPC handlers
// 1. Try standard /rpc prefix
app.use("/rpc", async (req, res, next) => {
  const rpcResult = await rpcHandler.handle(req, res, {
    prefix: "/rpc",
    context: await createContext({ req }),
  });
  if (rpcResult.matched) return;
  next();
});

// 2. Try Root (If DigitalOcean stripped /rpc)
app.use("/", async (req, res, next) => {
  // We only attempt this if it hasn't been handled yet
  const rpcResult = await rpcHandler.handle(req, res, {
    prefix: "", // No prefix, treat URL as /procedureName
    context: await createContext({ req }),
  });
  if (rpcResult.matched) return;
  next();
});

app.use("/api-reference", async (req, res, next) => {
  const apiResult = await apiHandler.handle(req, res, {
    prefix: "/api-reference",
    context: await createContext({ req }),
  });
  if (apiResult.matched) return;
  next();
});

// Root route removed to avoid conflict with Web Dashboard in DigitalOcean
// app.get("/", (_req, res) => {
//   res.status(200).send("OK");
// });

// Step 2: Better-Auth redirects here after login.
// Browser has the session cookie. Server validates it, gets the Token, and redirects to Deep Link.
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

    // This is the session token we need for the mobile app
    const token = session.session.token;

    // Redirect to the deep link with the token
    // E.g. chiandrose://app/auth/callback?token=XYZ
    res.redirect(`${target}?token=${token}`);

  } catch (error) { // Catch unknown error type
    console.error("Token Bridge Error:", error);
    // Safe casting to Error if possible, or just stringify
    const errorMessage = error instanceof Error ? error.message : String(error);
    res.status(500).send("Internal Server Error: " + errorMessage);
  }
});

// Helper route for Native Mobile Apps
// Step 1: Client opens this page. It auto-submits POST to Better-Auth.
// callbackURL is set to /login/success (the bridge).
app.get("/login/:provider", (req, res) => {
  const { provider } = req.params;
  const { callbackURL } = req.query; // The final deep link destination

  if (!provider || !callbackURL) {
    return res.status(400).send("Missing provider or callbackURL");
  }

  const apiUrl = "/api/auth/sign-in/social";
  // We use this server as the intermediate callback to capture the token
  // We use this server as the intermediate callback to capture the token
  // We explicitly encode the final destination in the query param 'target'
  // Use localhost to match BETTER_AUTH_URL env var
  const bridgeUrl = `http://localhost:3000/login/success?target=${encodeURIComponent(callbackURL as string)}`;

  // Use a classic FORM submission to ensure cookies are set on the document context
  // This is more reliable than fetch() for mobile browsers + localhost
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
