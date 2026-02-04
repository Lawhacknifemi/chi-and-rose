"use client";

import { env } from "@chi-and-rose/env/web"; // Import config, not the file itself if possible to avoid runtime errors, but env package is safe
import { useEffect, useRef, useState } from "react";
import { Button } from "./ui/button";
import Script from "next/script";

interface CloudinaryUploadWidgetProps {
    onUpload: (url: string) => void;
}

export default function CloudinaryUploadWidget({ onUpload }: CloudinaryUploadWidgetProps) {
    const cloudinaryRef = useRef<any>(null);
    const widgetRef = useRef<any>(null);
    const [isLoaded, setIsLoaded] = useState(false);

    const initializeWidget = () => {
        // Ensure Cloudinary script is loaded and widget is not already initialized
        if ((window as any).cloudinary && !widgetRef.current) {
            cloudinaryRef.current = (window as any).cloudinary;

            widgetRef.current = cloudinaryRef.current.createUploadWidget(
                {
                    cloudName: env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
                    uploadPreset: env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET,
                },
                (error: any, result: any) => {
                    if (!error && result && result.event === "success") {
                        console.log("Upload success:", result.info);
                        onUpload(result.info.secure_url);
                    } else if (error) {
                        console.error("Cloudinary Error:", error);
                        // alert("Upload Error: " + (error.message || "Unknown error"));
                    }
                }
            );
            setIsLoaded(true);
        }
    };

    return (
        <>
            <Script
                src="https://upload-widget.cloudinary.com/global/all.js"
                onLoad={initializeWidget}
            />
            <Button
                type="button"
                variant="secondary"
                disabled={!isLoaded}
                onClick={() => {
                    if (widgetRef.current) {
                        widgetRef.current.open();
                    } else {
                        // Retry initialization if clicked before auto-load
                        initializeWidget();
                        if (widgetRef.current) {
                            widgetRef.current.open();
                        } else {
                            alert("Widget is loading...");
                        }
                    }
                }}
            >
                {isLoaded ? "Upload Article Image" : "Loading uploader..."}
            </Button>
        </>
    );
}
