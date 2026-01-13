import type { RouterClient } from "@orpc/server";
import { protectedProcedure, publicProcedure } from "../index";
import * as healthRouter from "./health";
import * as scannerRouter from "./scanner";
import * as subscriptionsRouter from "./subscriptions";

export const appRouter = {
  healthCheck: publicProcedure.handler(() => {
    return "OK";
  }),
  privateData: protectedProcedure.handler(({ context }) => {
    return {
      message: "This is private",
      user: context.session?.user,
    };
  }),
  // Subscription/Entitlement endpoints (separate from auth)
  subscriptions: {
    verifyGooglePlay: subscriptionsRouter.verifyGooglePlayPurchase,
    verifyApple: subscriptionsRouter.verifyApplePurchase,
    getSubscriptions: subscriptionsRouter.getSubscriptions,
    hasAccess: subscriptionsRouter.hasAccess,
    syncSubscription: subscriptionsRouter.syncSubscription,
  },
  health: {
    getProfile: healthRouter.getProfile,
    updateProfile: healthRouter.updateProfile,
  },
  scanner: {
    scanBarcode: scannerRouter.scanBarcode,
    getIngredientInsight: scannerRouter.getIngredientInsight,
  },
};
export type AppRouter = typeof appRouter;
export type AppRouterClient = RouterClient<typeof appRouter>;
