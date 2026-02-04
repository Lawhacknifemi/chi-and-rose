# Definitive DigitalOcean Deployment Guide

This guide describes the **Unified Docker Strategy**, which is the most robust way to deploy a Turbo Monorepo to DigitalOcean.

## The Strategy
1.  **One Dockerfile**: Located at `Dockerfile` (Root). It builds *everything*.
2.  **One Entrypoint**: `entrypoint.sh` decides whether to run the `web` or `server` based on an environment variable (`APP_SERVICE`).
3.  **App Spec**: `.do/app.yaml` automates the configuration so you don't have to fiddle with UI settings.

---

## Step 1: Verify Environment Variables
Before deploying, strictly ensure you have these values ready. Add them to the **Environment Variables** tab for the `api-server` component.

### Required
*   `DATABASE_URL`: Your full PostgreSQL connection string.
*   `BETTER_AUTH_SECRET`: A random 32-char string.
*   `BETTER_AUTH_URL`: `${APP_URL}` (or your full domain, e.g., `https://chi-and-rose-abcde.ondigitalocean.app`)
*   `POLAR_ACCESS_TOKEN`: Your Polar API Token (or a placeholder `dummy` if testing).
*   `POLAR_SUCCESS_URL`: `${APP_URL}/success` (or placeholder).
*   `CORS_ORIGIN`: `${APP_URL}` (or `*` for initial testing).

### Optional (But may be validated if not skipped)
*   `GOOGLE_CLIENT_ID`, `APPLE_CLIENT_ID`, etc. (if using OAuth).

> **Tip:** If you see "Readiness probe failed" initially, check the logs. It usually means these variables are missing.

## Step 2: Deploy using App Spec (Recommended)
This is the "One-Click" method if the code is already on GitHub.

1.  Go to **DigitalOcean Apps Dashboard**.
2.  Click **Create App**.
3.  Select **GitHub** and your repository (`chi-and-rose`).
4.  **Important**: It should detect `.do/app.yaml`.
    *   If it asks "Use App Spec?", click **YES**.
    *   If it doesn't ask, select the repository, then look for "Edit Plan" or "Upload App Spec" and verify it's using `.do/app.yaml`.
5.  **Environment Variables**:
    *   The Spec has a placeholder for the DB URL.
    *   Go to the **Environment Variables** tab (for `api-server`).
    *   Edit `DATABASE_URL` and paste your **Real Connection String**.
6.  **Click Save / Build**.

## Step 3: Troubleshooting Build Errors
If usage of the App Spec fails or you prefer Manual Configuration:

### Manual Configuration (Fallback)
If you must configure manually, follow these EXACT rules:

**Web Service 1: API Server**
*   **Name**: `api-server`
*   **Source Directory**: `/` (Root)
*   **Build Strategy**: **Dockerfile** (You MUST force this override).
*   **Dockerfile Path**: `Dockerfile` (The root one, NOT apps/server/...).
*   **Environment Variables**:
    *   `APP_SERVICE` = `server`
    *   `DATABASE_URL` = ...
    *   `NODE_ENV` = `production`

**Web Service 2: Web Dashboard**
*   **Name**: `web-dashboard`
*   **Source Directory**: `/` (Root)
*   **Build Strategy**: **Dockerfile**
*   **Dockerfile Path**: `Dockerfile`
*   **Environment Variables**:
    *   `APP_SERVICE` = `web`
    *   `NEXT_PUBLIC_SERVER_URL` = `${APP_URL}` (or your full domain)
    *   `NODE_ENV` = `production`

---

## Common Issues

**"Workspace dependency not found"**
*   **Cause**: You set the Source Directory to `apps/server` or `apps/web`.
*   **Fix**: Set Source Directory to `/` (Root) and use the Root `Dockerfile`.

**"Invalid environment variable ... expected URL"**
*   **Cause**: Next.js build validation.
*   **Fix**: We have relaxed the validation in `packages/env` to allow strings. Ensure you have the latest code pushed.

**"Something went wrong" (Routing/Ingress)**
*   **Cause**: Both services trying to claim `/`.
*   **Fix**: The `api-server` should only handle `/api` routes. The `web-dashboard` handles `/`. The provided `do-app.yaml` handles this splitting automatically.
