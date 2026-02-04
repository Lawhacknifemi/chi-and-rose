import { env } from "@chi-and-rose/env/web";
import { polarClient } from "@polar-sh/better-auth";
import { createAuthClient } from "better-auth/react";

console.log("[Auth Client] Initializing with BaseURL:", env.NEXT_PUBLIC_SERVER_URL);

export const authClient = createAuthClient({
  baseURL: env.NEXT_PUBLIC_SERVER_URL,
  basePath: "/api/auth", // Must match Express mounting path
  plugins: [polarClient()],
});
