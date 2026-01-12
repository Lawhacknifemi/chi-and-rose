/**
 * Google Play Billing API Verification Service
 * 
 * Verifies in-app purchases and subscriptions from Google Play Store
 * 
 * Documentation: https://developer.android.com/google/play/billing
 */

import { env } from "@chi-and-rose/env/server";
import { google } from "googleapis";

export interface GooglePlayPurchase {
  purchaseToken: string;
  productId: string;
  packageName: string;
  orderId?: string;
}

export interface GooglePlayVerificationResult {
  valid: boolean;
  purchase?: {
    orderId: string;
    purchaseType: number; // 0 = purchase, 1 = subscription
    purchaseTime: number; // milliseconds since epoch
    purchaseState: number; // 0 = purchased, 1 = canceled
    developerPayload?: string;
    autoRenewing?: boolean; // For subscriptions
    expiryTimeMillis?: string; // For subscriptions
    startTimeMillis?: string; // For subscriptions
  };
  error?: string;
}

/**
 * Verify a Google Play purchase token
 */
export async function verifyGooglePlayPurchase(
  purchaseToken: string,
  productId: string,
  packageName: string
): Promise<GooglePlayVerificationResult> {
  try {
    // Initialize Google Play Developer API
    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: env.GOOGLE_PLAY_SERVICE_ACCOUNT_EMAIL,
        private_key: env.GOOGLE_PLAY_PRIVATE_KEY?.replace(/\\n/g, "\n"),
      },
      scopes: ["https://www.googleapis.com/auth/androidpublisher"],
    });

    const androidPublisher = google.androidpublisher({
      version: "v3",
      auth,
    });

    // Verify purchase
    const response = await androidPublisher.purchases.products.get({
      packageName,
      productId,
      token: purchaseToken,
    });

    const purchase = response.data;

    if (!purchase) {
      return {
        valid: false,
        error: "Purchase not found",
      };
    }

    // Check if purchase is valid
    const purchaseState = purchase.purchaseState;
    const isPurchased = purchaseState === 0; // 0 = purchased

    return {
      valid: isPurchased,
      purchase: {
        orderId: purchase.orderId || "",
        purchaseType: 0, // Product purchase
        purchaseTime: parseInt(purchase.purchaseTimeMillis || "0"),
        purchaseState: purchaseState || 0,
        developerPayload: purchase.developerPayload,
      },
    };
  } catch (error: any) {
    console.error("Google Play verification error:", error);
    return {
      valid: false,
      error: error.message || "Verification failed",
    };
  }
}

/**
 * Verify a Google Play subscription
 */
export async function verifyGooglePlaySubscription(
  purchaseToken: string,
  subscriptionId: string,
  packageName: string
): Promise<GooglePlayVerificationResult> {
  try {
    // Initialize Google Play Developer API
    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: env.GOOGLE_PLAY_SERVICE_ACCOUNT_EMAIL,
        private_key: env.GOOGLE_PLAY_PRIVATE_KEY?.replace(/\\n/g, "\n"),
      },
      scopes: ["https://www.googleapis.com/auth/androidpublisher"],
    });

    const androidPublisher = google.androidpublisher({
      version: "v3",
      auth,
    });

    // Verify subscription
    const response = await androidPublisher.purchases.subscriptions.get({
      packageName,
      subscriptionId,
      token: purchaseToken,
    });

    const subscription = response.data;

    if (!subscription) {
      return {
        valid: false,
        error: "Subscription not found",
      };
    }

    // Check subscription status
    const expiryTimeMillis = subscription.expiryTimeMillis;
    const autoRenewing = subscription.autoRenewing === true;
    const isActive = expiryTimeMillis
      ? parseInt(expiryTimeMillis) > Date.now()
      : false;

    return {
      valid: isActive,
      purchase: {
        orderId: subscription.orderId || "",
        purchaseType: 1, // Subscription
        purchaseTime: parseInt(subscription.startTimeMillis || "0"),
        purchaseState: isActive ? 0 : 1, // 0 = active, 1 = expired
        autoRenewing,
        expiryTimeMillis: expiryTimeMillis || undefined,
        startTimeMillis: subscription.startTimeMillis || undefined,
      },
    };
  } catch (error: any) {
    console.error("Google Play subscription verification error:", error);
    return {
      valid: false,
      error: error.message || "Verification failed",
    };
  }
}
