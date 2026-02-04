/**
 * Apple App Store Receipt Validation Service
 * 
 * Verifies in-app purchases and subscriptions from Apple App Store
 * 
 * Documentation: https://developer.apple.com/documentation/appstorereceipts
 */

import { env } from "@chi-and-rose/env/server";

export interface AppleReceiptData {
  receiptData: string; // Base64 encoded receipt
  password?: string; // App-specific shared secret (for subscriptions)
}

export interface AppleTransaction {
  transactionId: string;
  originalTransactionId: string;
  productId: string;
  purchaseDate: number; // milliseconds since epoch
  expiresDate?: number; // For subscriptions
  cancellationDate?: number;
  isTrialPeriod?: boolean;
  isInIntroOfferPeriod?: boolean;
}

export interface AppleVerificationResult {
  valid: boolean;
  receipt?: {
    receiptType: string; // "Production" | "ProductionSandbox"
    bundleId: string;
    applicationVersion: string;
    inApp?: Array<AppleTransaction>;
    latestReceiptInfo?: Array<AppleTransaction>;
  };
  error?: string;
}

/**
 * Verify an Apple App Store receipt
 * 
 * @param receiptData Base64 encoded receipt data
 * @param isProduction Whether to verify against production or sandbox
 */
export async function verifyAppleReceipt(
  receiptData: string,
  isProduction: boolean = true
): Promise<AppleVerificationResult> {
  try {
    // Apple's receipt validation endpoint
    const verifyUrl = isProduction
      ? "https://buy.itunes.apple.com/verifyReceipt"
      : "https://sandbox.itunes.apple.com/verifyReceipt";

    const requestBody = {
      "receipt-data": receiptData,
      password: env.APPLE_APP_SHARED_SECRET, // For auto-renewable subscriptions
      "exclude-old-transactions": false,
    };

    const response = await fetch(verifyUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      return {
        valid: false,
        error: `HTTP ${response.status}: ${response.statusText}`,
      };
    }

    const data = await response.json();

    // Apple status codes
    // 0 = valid receipt
    // 21007 = receipt is from sandbox, retry with sandbox URL
    // Other codes = invalid receipt

    if (data.status === 21007 && isProduction) {
      // Receipt is from sandbox, retry with sandbox URL
      return verifyAppleReceipt(receiptData, false);
    }

    if (data.status !== 0) {
      return {
        valid: false,
        error: getAppleStatusMessage(data.status),
      };
    }

    const receipt = data.receipt;

    return {
      valid: true,
      receipt: {
        receiptType: data.receipt_type || (isProduction ? "Production" : "ProductionSandbox"),
        bundleId: receipt.bundle_id,
        applicationVersion: receipt.application_version,
        inApp: receipt.in_app?.map((item: any) => ({
          transactionId: item.transaction_id,
          originalTransactionId: item.original_transaction_id,
          productId: item.product_id,
          purchaseDate: parseInt(item.purchase_date_ms || "0"),
          expiresDate: item.expires_date_ms ? parseInt(item.expires_date_ms) : undefined,
          cancellationDate: item.cancellation_date_ms ? parseInt(item.cancellation_date_ms) : undefined,
          isTrialPeriod: item.is_trial_period === "true",
          isInIntroOfferPeriod: item.is_in_intro_offer_period === "true",
        })),
        latestReceiptInfo: data.latest_receipt_info?.map((item: any) => ({
          transactionId: item.transaction_id,
          originalTransactionId: item.original_transaction_id,
          productId: item.product_id,
          purchaseDate: parseInt(item.purchase_date_ms || "0"),
          expiresDate: item.expires_date_ms ? parseInt(item.expires_date_ms) : undefined,
          cancellationDate: item.cancellation_date_ms ? parseInt(item.cancellation_date_ms) : undefined,
          isTrialPeriod: item.is_trial_period === "true",
          isInIntroOfferPeriod: item.is_in_intro_offer_period === "true",
        })),
      },
    };
  } catch (error: any) {
    console.error("Apple receipt verification error:", error);
    return {
      valid: false,
      error: error.message || "Verification failed",
    };
  }
}

/**
 * Get human-readable message for Apple status codes
 */
function getAppleStatusMessage(status: number): string {
  const statusMessages: Record<number, string> = {
    21000: "The App Store could not read the receipt data",
    21002: "The receipt data was malformed or missing",
    21003: "The receipt could not be authenticated",
    21004: "The shared secret does not match",
    21005: "The receipt server is not available",
    21006: "This receipt is valid but the subscription has expired",
    21007: "This receipt is from the sandbox environment",
    21008: "This receipt is from the production environment",
    21010: "This receipt could not be authorized",
  };

  return statusMessages[status] || `Unknown error (status: ${status})`;
}

/**
 * Find active subscription for a product ID in receipt
 */
export function findActiveSubscription(
  receipt: AppleVerificationResult["receipt"],
  productId: string
): AppleTransaction | null {
  if (!receipt?.latestReceiptInfo) {
    return null;
  }

  // Find the most recent active subscription for this product
  const now = Date.now();
  const activeSubscriptions = receipt.latestReceiptInfo
    .filter((item) => {
      // Must match product ID
      if (item.productId !== productId) return false;

      // Must not be cancelled
      if (item.cancellationDate) return false;

      // Must not be expired (if it has expiry date)
      if (item.expiresDate && item.expiresDate < now) return false;

      return true;
    })
    .sort((a, b) => (b.expiresDate || 0) - (a.expiresDate || 0)); // Most recent first

  return activeSubscriptions[0] || null;
}
