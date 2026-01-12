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
export async function createContext(opts: CreateContextOptions) {
  // Better-Auth's getSession supports both cookies and Authorization headers
  // It will automatically extract the session token from:
  // - Cookie: better-auth.session_token=...
  // - Authorization: Bearer <session_token>
  const session = await auth.api.getSession({
    headers: fromNodeHeaders(opts.req.headers),
  });

  return {
    session,
  };
}

export type Context = Awaited<ReturnType<typeof createContext>>;
