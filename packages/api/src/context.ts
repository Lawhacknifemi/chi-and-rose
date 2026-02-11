import type { Request } from "express";

import { auth } from "@chi-and-rose/auth";
import { fromNodeHeaders } from "better-auth/node";

interface CreateContextOptions {
  req: Request;
}

/**
 * Create context for oRPC procedures
 * 
 * Supports multiple authentication methods:
 * 1. Cookies (web clients) - Better-Auth handles automatically
 * 2. Authorization: Bearer <token> (mobile clients) - Better-Auth handles automatically
 * 3. Session token in Authorization header
 * 
 * Better-Auth's getSession() automatically extracts session from:
 * - Cookies (Cookie header)
 * - Authorization header (Bearer token)
 * - Custom headers
 */
export async function createContext(opts: CreateContextOptions): Promise<any> {
  const requestId = Math.random().toString(36).substring(7);
  console.log(`[Context:${requestId}] Starting context creation for ${opts.req.method} ${opts.req.url}`);

  try {
    console.log(`[Context:${requestId}] Calling better-auth getSession...`);
    const session = await auth.api.getSession({
      headers: fromNodeHeaders(opts.req.headers),
    });
    console.log(`[Context:${requestId}] Session retrieval complete. Found: ${!!session} (User: ${session?.user?.id || 'none'})`);

    if (!session && opts.req.headers.authorization) {
      console.log(`[Context:${requestId}] WARN: Authorization header present but no session found.`);
    }

    return {
      session,
      req: opts.req,
      requestId,
    };
  } catch (error) {
    console.error(`[Context:${requestId}] CRITICAL ERROR during session retrieval:`, error);
    throw error; // Let oRPC handle the error
  }
}

export type Context = Awaited<ReturnType<typeof createContext>>;
