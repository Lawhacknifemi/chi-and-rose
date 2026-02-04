import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

export const env = createEnv({
  client: {
    // If skipping validation, allow anything, otherwise require URL
    NEXT_PUBLIC_SERVER_URL: process.env.SKIP_ENV_VALIDATION ? z.string().optional() : z.url(),
    NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME: z.string().optional(),
    NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET: z.string().optional(),
  },
  runtimeEnv: {
    NEXT_PUBLIC_SERVER_URL: process.env.NEXT_PUBLIC_SERVER_URL,
    NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
    NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET: process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET,
  },
  skipValidation: !!process.env.SKIP_ENV_VALIDATION,
  emptyStringAsUndefined: true,
});
