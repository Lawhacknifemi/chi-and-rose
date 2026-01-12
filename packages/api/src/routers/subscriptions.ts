/**
 * Subscription/Entitlement API
 * 
 * Handles subscription verification and entitlements.
 * This is SEPARATE from authentication - subscriptions are about access control,
 * not user identity.
 * 
 * Authentication = "Who are you?" → Better-Auth
 * Subscriptions = "What can you access?" → This service
 */

import { z } from "zod";
import { db } from "@chi-and-rose/db";
import { mobileSubscription } from "@chi-and-rose/db/schema/mobile-subscriptions";
import { eq, and } from "drizzle-orm";
import { protectedProcedure, publicProcedure } from "../index";
import { verifyGooglePlayPurchase as verifyGooglePurchase, verifyGooglePlaySubscription } from "@chi-and-rose/auth/lib/google-play";
import { verifyAppleReceipt, findActiveSubscription } from "@chi-and-rose/auth/lib/apple-app-store";
import { nanoid } from "nanoid";

// Request schemas
const verifyGooglePlaySchema = z.object({
  purchaseToken: z.string().min(1),
  productId: z.string().min(1),
  packageName: z.string().min(1),
  isSubscription: z.boolean().default(false),
});

const verifyAppleSchema = z.object({
  receiptData: z.string().min(1), // Base64 encoded receipt
  productId: z.string().min(1),
});

/**
 * Verify Google Play purchase/subscription
 * 
 * Note: Requires authentication to link purchase to user account
 */
export const verifyGooglePlayPurchase = protectedProcedure
  .input(verifyGooglePlaySchema)
  .handler(async ({ input, context }) => {
    const { purchaseToken, productId, packageName, isSubscription } = input;
    const userId = context.session!.user.id;

    // Verify with Google Play API
    const verification = isSubscription
      ? await verifyGooglePlaySubscription(purchaseToken, productId, packageName)
      : await verifyGooglePurchase(purchaseToken, productId, packageName);

    if (!verification.valid || !verification.purchase) {
      return {
        success: false,
        error: verification.error || "Purchase verification failed",
      };
    }

    const purchase = verification.purchase;

    // Check if subscription already exists
    const existing = await db
      .select()
      .from(mobileSubscription)
      .where(
        and(
          eq(mobileSubscription.userId, userId),
          eq(mobileSubscription.platform, "google_play"),
          eq(mobileSubscription.productId, productId),
          eq(mobileSubscription.purchaseToken, purchaseToken)
        )
      )
      .limit(1);

    const now = new Date();
    const purchaseDate = new Date(purchase.purchaseTime);
    const expiryDate = purchase.expiryTimeMillis
      ? new Date(parseInt(purchase.expiryTimeMillis))
      : null;
    const isActive = purchase.purchaseState === 0 && (!expiryDate || expiryDate > now);

    if (existing.length > 0) {
      // Update existing subscription
      await db
        .update(mobileSubscription)
        .set({
          isActive,
          expiresAt: expiryDate,
          autoRenewing: purchase.autoRenewing || false,
          expiryDate,
          lastVerifiedAt: now,
          verificationStatus: isActive ? "verified" : "expired",
          updatedAt: now,
        })
        .where(eq(mobileSubscription.id, existing[0].id));
    } else {
      // Create new subscription record
      await db.insert(mobileSubscription).values({
        id: nanoid(),
        userId,
        platform: "google_play",
        productId,
        purchaseToken,
        orderId: purchase.orderId,
        packageName,
        isActive,
        expiresAt: expiryDate,
        autoRenewing: purchase.autoRenewing || false,
        purchaseDate,
        expiryDate,
        verifiedAt: now,
        lastVerifiedAt: now,
        verificationStatus: isActive ? "verified" : "expired",
        receiptData: JSON.stringify(purchase),
      });
    }

    return {
      success: true,
      subscription: {
        isActive,
        expiresAt: expiryDate?.toISOString(),
        autoRenewing: purchase.autoRenewing || false,
      },
    };
  });

/**
 * Verify Apple App Store receipt
 * 
 * Note: Requires authentication to link purchase to user account
 */
export const verifyApplePurchase = protectedProcedure
  .input(verifyAppleSchema)
  .handler(async ({ input, context }) => {
    const { receiptData, productId } = input;
    const userId = context.session!.user.id;

    // Verify with Apple App Store
    const verification = await verifyAppleReceipt(receiptData, true);

    if (!verification.valid || !verification.receipt) {
      return {
        success: false,
        error: verification.error || "Receipt verification failed",
      };
    }

    const receipt = verification.receipt;

    // Find active subscription for this product
    const activeSubscription = findActiveSubscription(receipt, productId);

    if (!activeSubscription) {
      return {
        success: false,
        error: "No active subscription found for this product",
      };
    }

    // Check if subscription already exists
    const existing = await db
      .select()
      .from(mobileSubscription)
      .where(
        and(
          eq(mobileSubscription.userId, userId),
          eq(mobileSubscription.platform, "apple_app_store"),
          eq(mobileSubscription.productId, productId),
          eq(mobileSubscription.transactionId, activeSubscription.transactionId)
        )
      )
      .limit(1);

    const now = new Date();
    const purchaseDate = new Date(activeSubscription.purchaseDate);
    const expiryDate = activeSubscription.expiresDate
      ? new Date(activeSubscription.expiresDate)
      : null;
    const isActive = !activeSubscription.cancellationDate && (!expiryDate || expiryDate > now);

    if (existing.length > 0) {
      // Update existing subscription
      await db
        .update(mobileSubscription)
        .set({
          isActive,
          expiresAt: expiryDate,
          expiryDate,
          cancellationDate: activeSubscription.cancellationDate
            ? new Date(activeSubscription.cancellationDate)
            : null,
          lastVerifiedAt: now,
          verificationStatus: isActive ? "verified" : "expired",
          updatedAt: now,
        })
        .where(eq(mobileSubscription.id, existing[0].id));
    } else {
      // Create new subscription record
      await db.insert(mobileSubscription).values({
        id: nanoid(),
        userId,
        platform: "apple_app_store",
        productId,
        transactionId: activeSubscription.transactionId,
        originalTransactionId: activeSubscription.originalTransactionId,
        packageName: receipt.bundleId,
        isActive,
        expiresAt: expiryDate,
        purchaseDate,
        expiryDate,
        cancellationDate: activeSubscription.cancellationDate
          ? new Date(activeSubscription.cancellationDate)
          : null,
        verifiedAt: now,
        lastVerifiedAt: now,
        verificationStatus: isActive ? "verified" : "expired",
        receiptData: JSON.stringify(receipt),
      });
    }

    return {
      success: true,
      subscription: {
        isActive,
        expiresAt: expiryDate?.toISOString(),
        transactionId: activeSubscription.transactionId,
      },
    };
  });

/**
 * Get user's active subscriptions
 * 
 * This checks entitlements - what the user has access to
 */
export const getSubscriptions = protectedProcedure.handler(async ({ context }) => {
  const userId = context.session!.user.id;

  const subscriptions = await db
    .select()
    .from(mobileSubscription)
    .where(
      and(
        eq(mobileSubscription.userId, userId),
        eq(mobileSubscription.isActive, true)
      )
    );

  return {
    subscriptions: subscriptions.map((sub) => ({
      id: sub.id,
      platform: sub.platform,
      productId: sub.productId,
      isActive: sub.isActive,
      expiresAt: sub.expiresAt?.toISOString(),
      autoRenewing: sub.autoRenewing,
      purchaseDate: sub.purchaseDate.toISOString(),
    })),
  };
});

/**
 * Check if user has access to a specific product
 * 
 * This is the main entitlement check function
 */
export const hasAccess = protectedProcedure
  .input(z.object({ productId: z.string() }))
  .handler(async ({ input, context }) => {
    const { productId } = input;
    const userId = context.session!.user.id;

    const subscription = await db
      .select()
      .from(mobileSubscription)
      .where(
        and(
          eq(mobileSubscription.userId, userId),
          eq(mobileSubscription.productId, productId),
          eq(mobileSubscription.isActive, true)
        )
      )
      .limit(1);

    const hasAccess = subscription.length > 0;

    return {
      hasAccess,
      subscription: hasAccess
        ? {
            id: subscription[0].id,
            platform: subscription[0].platform,
            expiresAt: subscription[0].expiresAt?.toISOString(),
          }
        : null,
    };
  });

/**
 * Sync subscription status (re-verify with store)
 */
export const syncSubscription = protectedProcedure
  .input(z.object({ subscriptionId: z.string() }))
  .handler(async ({ input, context }) => {
    const { subscriptionId } = input;
    const userId = context.session!.user.id;

    const subscription = await db
      .select()
      .from(mobileSubscription)
      .where(
        and(
          eq(mobileSubscription.id, subscriptionId),
          eq(mobileSubscription.userId, userId)
        )
      )
      .limit(1);

    if (subscription.length === 0) {
      return {
        success: false,
        error: "Subscription not found",
      };
    }

    const sub = subscription[0];
    const now = new Date();

    // Re-verify based on platform
    if (sub.platform === "google_play" && sub.purchaseToken && sub.productId && sub.packageName) {
      const verification = await verifyGooglePlaySubscription(
        sub.purchaseToken,
        sub.productId,
        sub.packageName
      );

      if (verification.valid && verification.purchase) {
        const expiryDate = verification.purchase.expiryTimeMillis
          ? new Date(parseInt(verification.purchase.expiryTimeMillis))
          : null;
        const isActive = !expiryDate || expiryDate > now;

        await db
          .update(mobileSubscription)
          .set({
            isActive,
            expiresAt: expiryDate,
            autoRenewing: verification.purchase.autoRenewing || false,
            lastVerifiedAt: now,
            verificationStatus: isActive ? "verified" : "expired",
            updatedAt: now,
          })
          .where(eq(mobileSubscription.id, subscriptionId));

        return {
          success: true,
          subscription: {
            isActive,
            expiresAt: expiryDate?.toISOString(),
          },
        };
      }
    } else if (sub.platform === "apple_app_store" && sub.receiptData) {
      const verification = await verifyAppleReceipt(sub.receiptData, true);

      if (verification.valid && verification.receipt) {
        const activeSubscription = findActiveSubscription(verification.receipt, sub.productId);

        if (activeSubscription) {
          const expiryDate = activeSubscription.expiresDate
            ? new Date(activeSubscription.expiresDate)
            : null;
          const isActive = !activeSubscription.cancellationDate && (!expiryDate || expiryDate > now);

          await db
            .update(mobileSubscription)
            .set({
              isActive,
              expiresAt: expiryDate,
              lastVerifiedAt: now,
              verificationStatus: isActive ? "verified" : "expired",
              updatedAt: now,
            })
            .where(eq(mobileSubscription.id, subscriptionId));

          return {
            success: true,
            subscription: {
              isActive,
              expiresAt: expiryDate?.toISOString(),
            },
          };
        }
      }
    }

    return {
      success: false,
      error: "Failed to sync subscription",
    };
  });
