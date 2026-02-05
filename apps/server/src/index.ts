import { createContext } from "@chi-and-rose/api/context";
import { appRouter } from "@chi-and-rose/api/routers/index";
import { auth, sendEmail } from "@chi-and-rose/auth";
import { db, user, eq, provisionDatabase, sql } from "@chi-and-rose/db";
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

// Debug Import
// console.log("[DEBUG] Server importing appRouter...", appRouter); // Removed verbose logging
if (!appRouter) {
  console.error("[CRITICAL] appRouter is UNDEFINED! Check circular dependencies or export issues.");
}

const app = express();
app.set("trust proxy", true); // Ensure express trusts the environment (adb/proxies)

// 1. Logger First!
app.use((req, res, next) => {
  console.log(`[Global Debug] ${req.method} ${req.url} (path: ${req.path}) [Origin: ${req.headers.origin}]`);
  next();
});

// 2. Simple Root Check
app.get("/", (req, res) => {
  res.status(200).send("Server Ready (v2)");
});


// Temporary Secret Endpoint for Admin Promotion (Bypasses Firewall)


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
// Support stripped paths by rewriting /auth -> /api/auth
const authHandler = toNodeHandler(auth);
app.use((req, res, next) => {
  // DigitalOcean strips /api prefix from routes, so /api/auth comes in as /auth
  // We rewrite it back to /api/auth so Better-Auth (which checks baseURL) is happy
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
  // Skip JSON parsing for Auth (handled by Better-Auth) and RPC (handled manually if needed, or fine to parse)
  // We just exclude Auth strictly.
  if (req.path.startsWith("/api/auth")) {
    next();
  } else {
    express.json()(req, res, next);
  }
});

// ... (skipping RPC Handler setup lines)

// -------------------------------------------------------------------------
// DEBUGGING: Define Local Router to bypass Cross-Package Symbol Mismatch
// -------------------------------------------------------------------------
// -------------------------------------------------------------------------
// DEBUGGING: Define Local Router to bypass Cross-Package Symbol Mismatch
// -------------------------------------------------------------------------
/*
import { os } from "@orpc/server";
const o = os.$context<{}>();

const testRouter = o.router({
  healthCheck: o.handler(() => "OK (Local Router)"),
  // Mock other routes so server doesn't crash on startup if it checks keys
  health: {
    getProfile: o.handler(() => ({})),
  }
});
*/

// Create oRPC handler using REAL appRouter
const rpcHandler = new RPCHandler({
  router: appRouter, // <--- Reverted to appRouter
  createContext,
  onError,
});

/*
// Create OpenAPI handler (DISABLED: Crashing server with Symbol Mismatch)
const apiHandler = new OpenAPIHandler({
  router: appRouter, 
  createContext,
  onError,
  converter: new ZodToJsonSchemaConverter(),
  plugins: [new OpenAPIReferencePlugin()],
});
*/

app.use("/rpc", async (req, res, next) => {
  // ROBUST STRIPPING:
  // Express 'app.use("/rpc")' usually strips the prefix, resulting in '/scanner/scanBarcode'.
  // However, sometimes with proxies/rewrites, it might persist.

  // 1. Remove leading slash
  if (req.url.startsWith("/")) {
    req.url = req.url.slice(1);
  }

  // 2. Remove 'rpc/' prefix if it somehow remains
  if (req.url.startsWith("rpc/")) {
    req.url = req.url.replace(/^rpc\//, "");
  }

  // Debug Log
  // console.log(`[RPC Handler] Processing: ${req.url}`);

  const rpcResult = await rpcHandler.handle(req, res, {
    prefix: "",
    context: await createContext({ req }),
  });
  if (rpcResult.matched) return;
  next();
});

// -------------------------------------------------------------------------
// EXPLICIT HEALTH CHECK (Bypass ORPC matching issues)
// This guarantees the Load Balancer gets a 200 OK immediately.
// We return { data: "OK" } to mimic standard RPC response envelopes.
// -------------------------------------------------------------------------
app.all("/healthCheck", (req, res) => {
  res.status(200).json({ data: { status: "OK" } });
});

// Fallback: Mount RPC at root for stripped paths (e.g. /healthCheck instead of /rpc/healthCheck)
app.use("/", async (req, res, next) => {
  // Debug Log for Fallback Matcher
  // console.log(`[RPC Fallback Debug] Incoming: url='${req.url}', path='${req.path}', baseUrl='${req.baseUrl}'`);

  // Manual Fix: Ensure req.url does not have leading slash
  if (req.url.startsWith("/")) {
    req.url = req.url.slice(1);
  }

  // Try matching with empty prefix (assuming path is full relative path)
  const result = await rpcHandler.handle(req, res, {
    prefix: "", // CHANGED from "/" to "" to avoid over-stripping or mismatch
    context: await createContext({ req }),
  });

  if (result.matched) {
    console.log(`[RPC Fallback] MATCHED: url=${req.url}`);
    return;
  }

  // If failed, try with "/" just in case (Double attempt strategy)
  /*
  const result2 = await rpcHandler.handle(req, res, {
    prefix: "/",
    context: await createContext({ req }),
  });
  if (result2.matched) {
     console.log(`[RPC Fallback] MATCHED (retry with /): url=${req.url}`);
     return;
  }
  */

  console.log(`[RPC Fallback] handled: matched=${result.matched}, url=${req.url}`);
  next();
});

/* 
app.use("/api-reference", async (req, res, next) => {
  const apiResult = await apiHandler.handle(req, res, {
    prefix: "/api-reference",
    context: await createContext({ req }),
  });
  if (apiResult.matched) return;
  next();
});
*/

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

app.get("/debug-router", (req, res) => {
  // Safe iteration for ORPC router structure
  const getKeys = (obj: any) => {
    if (!obj) return "undefined";
    return Object.keys(obj);
  };

  res.json({
    appRouterKeys: getKeys(appRouter),
    scannerKeys: getKeys((appRouter as any).scanner),
    healthKeys: getKeys((appRouter as any).health),
  });
});

app.get("/debug-env", (req, res) => {
  res.json({
    BETTER_AUTH_URL: process.env.BETTER_AUTH_URL,
    AUTH_OPTIONS_BASE: auth.options.baseURL,
    CORS_ORIGIN: process.env.CORS_ORIGIN,
    HEADERS_ORIGIN: req.headers.origin,
    HEADERS_HOST: req.headers.host,
    DB_HOST: process.env.DATABASE_URL ? process.env.DATABASE_URL.split('@')[1] : "Undefined"
  });
});



app.listen(3000, async () => {
  console.log("---------------------------------------------");
  console.log("🚀 Server Starting...");

  // SELF-PROVISIONING: Ensure DB tables exist
  try {
    await provisionDatabase();

    // ADMIN BOOTSTRAP: Promote user if ADMIN_EMAIL is set
    if (env.ADMIN_EMAIL) {
      console.log(`[Admin Bootstrap] Checking for admin user: ${env.ADMIN_EMAIL}...`);
      try {
        const result = await db.execute(sql`
            UPDATE "user" 
            SET role = 'admin', updated_at = NOW() 
            WHERE email = ${env.ADMIN_EMAIL} AND role != 'admin'
            RETURNING id, email, role
         `);
        if (result.rowCount && result.rowCount > 0) {
          console.log(`✅ [Admin Bootstrap] Successfully promoted ${env.ADMIN_EMAIL} to ADMIN!`);
        } else {
          console.log(`ℹ️ [Admin Bootstrap] User ${env.ADMIN_EMAIL} not found or already admin.`);
        }
      } catch (adminErr) {
        console.error("❌ [Admin Bootstrap] Failed:", adminErr);
      }
    }
  } catch (err) {
    console.error("[CRITICAL] Database/Admin Setup Failed:", err);
  }

  console.log("Server is running on http://0.0.0.0:3000");
  console.log("Google Client ID present:", !!env.GOOGLE_CLIENT_ID);

  // Inspect the actual Better-Auth configuration
  console.log("Auth Config BaseURL:", auth.options.baseURL);
  console.log("Auth Config Google Enabled:", auth.options.socialProviders?.google?.enabled);

  // -------------------------------------------------------------------------
  // DB CONNECTION CHECK & FALLBACK
  // -------------------------------------------------------------------------
  // FALLBACK: Use provided credentials if env var is missing or invalid
  if (!process.env.DATABASE_URL || !process.env.DATABASE_URL.startsWith("postgres")) {
    console.warn("[DB Warning] DATABASE_URL is missing or invalid. Check your DigitalOcean Environment Variables.");
    // Security: Cannot hardcode credentials here (GitHub blocks push). 
    // Please set DATABASE_URL in DigitalOcean App Platform settings.
  }

  try {
    const dbUrl = process.env.DATABASE_URL || "undefined";
    const maskedUrl = dbUrl.includes("@") ? "postgres://*****@" + dbUrl.split("@")[1] : "INVALID_FORMAT";
    console.log(`[DB Debug] Attempting to connect to DB at: ${maskedUrl}`);

    // Simple query to verify connection
    // Note: 'db' is the Drizzle instance. We need raw query or generic execute if possible.
    // If not, we trust the first request will trigger it, but logging the URL structure helps.
    if (dbUrl.includes("localhost") || dbUrl.includes("127.0.0.1")) {
      console.warn("[DB WARNING] DATABASE_URL points to localhost! This will fail in Docker unless you are using host networking or a sidecar.");
    }
  } catch (err) {
    console.error("[DB Debug] Initial Check Failed:", err);
  }
});

