import { env } from "@chi-and-rose/env/web";
import { polarClient } from "@polar-sh/better-auth";
import { createAuthClient } from "better-auth/react";

console.log("[Auth Client] Initializing with BaseURL:", env.NEXT_PUBLIC_SERVER_URL);

// Hardcoded URLs to bypass Environment Variable caching/injection issues
const PUBLIC_URL = "https://clownfish-app-t7z9u.ondigitalocean.app";
const INTERNAL_URL = "http://api-server:3000";

const baseURL = typeof window === "undefined"
  ? INTERNAL_URL
  : PUBLIC_URL;

console.log("[Auth Client] Resolved BaseURL:", baseURL);

export const authClient = createAuthClient({
  baseURL,
  basePath: "/api/auth", // Must match Express mounting path
  plugins: [polarClient()],
});
