import { v2 as cloudinary } from 'cloudinary';
import { env } from "@chi-and-rose/env/server";

export class ImageService {
    private static instance: ImageService;
    private isConfigured = false;

    private constructor() {
        if (env.CLOUDINARY_CLOUD_NAME && env.CLOUDINARY_API_KEY && env.CLOUDINARY_API_SECRET) {
            cloudinary.config({
                cloud_name: env.CLOUDINARY_CLOUD_NAME,
                api_key: env.CLOUDINARY_API_KEY,
                api_secret: env.CLOUDINARY_API_SECRET,
            });
            this.isConfigured = true;
            console.log("[ImageService] Cloudinary configured successfully.");
        } else {
            console.warn("[ImageService] Cloudinary credentials missing. Image processing will be skipped.");
        }
    }

    public static getInstance(): ImageService {
        if (!ImageService.instance) {
            ImageService.instance = new ImageService();
        }
        return ImageService.instance;
    }

    /**
     * Uploads an image from a remote URL to Cloudinary.
     * Returns the secure Cloudinary URL, or the original URL if upload fails/not configured.
     */
    async uploadFromUrl(url: string, publicId: string, folder: string = "products"): Promise<string> {
        if (!this.isConfigured || !url) return url;

        try {
            console.log(`[ImageService] Uploading ${url} to Cloudinary...`);
            const result = await cloudinary.uploader.upload(url, {
                public_id: publicId,
                folder: folder,
                overwrite: true,
                transformation: [
                    { width: 800, crop: "limit" }, // Resize if too large
                    { quality: "auto" },           // Optimize quality
                    { fetch_format: "auto" }       // Convert to WebP/AVIF if supported
                ]
            });
            console.log(`[ImageService] Upload success: ${result.secure_url}`);
            return result.secure_url;
        } catch (error) {
            console.error("[ImageService] Upload failed:", error);
            // Fallback to original URL so the user still sees an image
            return url;
        }
    }

    /**
     * Uploads an image from a base64 data URL to Cloudinary.
     * Returns the secure Cloudinary URL.
     */
    async uploadFromDataUrl(dataUrl: string, publicId: string, folder: string = "scans"): Promise<string> {
        if (!this.isConfigured || !dataUrl) {
            throw new Error("Cloudinary not configured or invalid data URL");
        }

        try {
            console.log(`[ImageService] Uploading base64 image to Cloudinary...`);
            const result = await cloudinary.uploader.upload(dataUrl, {
                public_id: publicId,
                folder: folder,
                overwrite: true,
                transformation: [
                    { width: 1200, crop: "limit" }, // Resize if too large
                    { quality: "auto" },            // Optimize quality
                    { fetch_format: "auto" }        // Convert to WebP/AVIF if supported
                ]
            });
            console.log(`[ImageService] Upload success: ${result.secure_url}`);
            return result.secure_url;
        } catch (error) {
            console.error("[ImageService] Upload from data URL failed:", error);
            throw new Error("Failed to upload image");
        }
    }
}

export const imageService = ImageService.getInstance();
