import { env } from "@chi-and-rose/env/web";
import { polarClient } from "@polar-sh/better-auth";
import { createAuthClient } from "better-auth/react";

console.log("[Auth Client] Initializing with BaseURL:", env.NEXT_PUBLIC_SERVER_URL);

// Use environment variable for both client and server
const baseURL = env.NEXT_PUBLIC_SERVER_URL;

console.log("[Auth Client] Resolved BaseURL:", baseURL);

export const authClient = createAuthClient({
  baseURL,
  basePath: "/api/auth", // Must match Express mounting path
  plugins: [polarClient()],
});
