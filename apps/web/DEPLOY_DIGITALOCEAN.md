# DigitalOcean Deployment Guide

This guide explains how to deploy the Admin Dashboard (`web`) and API Server (`server`) to DigitalOcean using **App Platform**.

## Prerequisites
1.  **DigitalOcean Account**: [Sign up here](https://m.do.co/c/...) if you don't have one.
2.  **GitHub Repository**: Your code must be pushed to GitHub.
3.  **Database**: You need a PostgreSQL database (Managed Database on DigitalOcean or external like Neon/Supabase).

---

## Step 1: Prepare Database
1.  Create a **PostgreSQL Database** in DigitalOcean (recommended for private network access) or use your existing one.
2.  Get the **Connection String** (e.g., `postgresql://user:password@host:port/dbname?sslmode=require`).
3.  **Important**: Ensure your database allows connections from DigitalOcean App Platform (Trusted Sources).

---

## Step 2: Create App in DigitalOcean
1.  Go to [DigitalOcean Apps](https://cloud.digitalocean.com/apps).
2.  Click **Create App**.
3.  Select **GitHub** as the source and choose your repository.
4.  Authorization: Grant access if needed.

## Step 3: Configure Component 1 (API Server)
DigitalOcean will try to detect the service. We will configure it manually for Docker.

1.  **Source Directory**: `/` (Root).
2.  **Resource Type**: `Web Service`.
3.  **Name**: `api-server` (or similar).
4.  **Dockerfile Path**: Edit this to `apps/server/Dockerfile`.
5.  **HTTP Port**: `3000`.
6.  **Environment Variables**:
    You MUST add the following variables (marked as *Secret* where appropriate):
    
    | Key | Value |
    | --- | --- |
    | `DATABASE_URL` | Your full Postgres Connection String |
    | `BETTER_AUTH_SECRET` | A random 32+ char string (run `openssl rand -hex 32`) |
    | `BETTER_AUTH_URL` | Your App's URL + `/api/auth` (See note below*) |
    | `CORS_ORIGIN` | Your Frontend URL (e.g. `https://your-web-app.ondigitalocean.app`) |
    | `CLOUDINARY_CLOUD_NAME` | `dawxj7cns` |
    | `CLOUDINARY_API_KEY` | (From your Cloudinary Dashboard) |
    | `CLOUDINARY_API_SECRET` | (From your Cloudinary Dashboard) |
    | `GOOGLE_CLIENT_ID` | (Optional, for Auth) |
    | `GOOGLE_CLIENT_SECRET`| (Optional, for Auth) |
    | `NODE_ENV` | `production` |

    *> **Note on URLs**: You won't know the exact URL until created. You can use `${APP_URL}` in DigitalOcean, or update this later once the app is live.*

### ⚠️ Important: Force Docker Build
DigitalOcean might try to auto-detect "Node.js" or "Functions" when you select the Root directory. You **must** override this:
1.  Click the **Edit (Pencil)** icon next to the service name.
2.  Look for **Build Strategy** (or "Settings" > "Build").
3.  Change it from **Buildpacks** to **Dockerfile**.
4.  Then set the **Dockerfile Path** to `apps/server/Dockerfile` (for server) or `apps/web/Dockerfile` (for web).

## Step 4: Configure Component 2 (Web Dashboard)
Add a second component to the SAME app.

1.  Click **Add Resource** > **Web Service** (or Docker).
2.  Use the same Repository and Branch.
3.  **Source Directory**: `/` (Root).
4.  **Name**: `web-dashboard`.
5.  **Dockerfile Path**: `apps/web/Dockerfile`.
6.  **HTTP Port**: `3000`.
7.  **Environment Variables**:
    
    | Key | Value |
    | --- | --- |
    | `NEXT_PUBLIC_SERVER_URL` | The URL of your `api-server` component (Internal or External) |
    | `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME` | `dawxj7cns` |
    | `NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET`| `Chrose` |

## Step 5: Build & Deploy
1.  Click **Next** and **Create Resources**.
2.  DigitalOcean will build both Dockerfiles. This might take 5-10 minutes.
3.  Once deployed, you will see two URLs (or one if configured with paths).
    - **API URL**: e.g., `https://api-server-xyz.ondigitalocean.app`
    - **Web URL**: e.g., `https://web-dashboard-xyz.ondigitalocean.app`

## Step 6: Post-Deployment Updates
1.  **Update Environment Variables**:
    - Go to `api-server` > Settings > Environment Variables.
    - Set `BETTER_AUTH_URL` to `https://api-server-xyz.ondigitalocean.app` (The real URL).
    - Set `CORS_ORIGIN` to `https://web-dashboard-xyz.ondigitalocean.app`.
2.  **Update Web Env**:
    - Go to `web-dashboard` > Settings > Environment Variables.
    - Set `NEXT_PUBLIC_SERVER_URL` to the **API URL**.
3.  **Trigger Deploy**: modifying env vars auto-redeploy.

## Troubleshooting
- **Build Fails**: Check the "Build Logs". Ensure `bun.lock` is in the repo.
- **Database Connection**: Ensure the DB allows public access or is in the same VPC/Project.
 
