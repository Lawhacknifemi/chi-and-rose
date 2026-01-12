import { createContext } from "@chi-and-rose/api/context";
import { appRouter } from "@chi-and-rose/api/routers/index";
import { auth } from "@chi-and-rose/auth";
import { env } from "@chi-and-rose/env/server";
import { OpenAPIHandler } from "@orpc/openapi/node";
import { OpenAPIReferencePlugin } from "@orpc/openapi/plugins";
import { onError } from "@orpc/server";
import { RPCHandler } from "@orpc/server/node";
import { ZodToJsonSchemaConverter } from "@orpc/zod/zod4";
import { toNodeHandler } from "better-auth/node";
import cors from "cors";
import express from "express";

const app = express();

app.use(
  cors({
    origin: env.CORS_ORIGIN,
    methods: ["GET", "POST", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  }),
);

// Mount Better-Auth handler BEFORE express.json()
// Better-Auth handles its own body parsing, so it should be mounted first
const authHandler = toNodeHandler(auth);

// Debug: Log all requests to see what's happening
app.use((req, res, next) => {
  if (req.path.startsWith("/api/auth")) {
    console.log(`[Debug] Request to ${req.method} ${req.path} (originalUrl: ${req.originalUrl})`);
  }
  next();
});

// Mount Better-Auth handler
// Mount at /api/auth - express will strip the prefix
app.use("/api/auth", authHandler);

app.use(express.json()); // Parse JSON bodies for other routes AFTER Better-Auth

const rpcHandler = new RPCHandler(appRouter, {
  interceptors: [
    onError((error) => {
      console.error(error);
    }),
  ],
});
const apiHandler = new OpenAPIHandler(appRouter, {
  plugins: [
    new OpenAPIReferencePlugin({
      schemaConverters: [new ZodToJsonSchemaConverter()],
    }),
  ],
  interceptors: [
    onError((error) => {
      console.error(error);
    }),
  ],
});

// Mount oRPC handlers - use app.use with path to match /rpc and /rpc/*
app.use("/rpc", async (req, res, next) => {
  const rpcResult = await rpcHandler.handle(req, res, {
    prefix: "/rpc",
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

app.get("/", (_req, res) => {
  res.status(200).send("OK");
});

app.listen(3000, () => {
  console.log("Server is running on http://localhost:3000");
});
