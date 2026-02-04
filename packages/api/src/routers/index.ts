import type { RouterClient } from "@orpc/server";
import { protectedProcedure, publicProcedure } from "../index";
import * as healthRouter from "./health";
import * as scannerRouter from "./scanner";
import * as subscriptionsRouter from "./subscriptions";
import * as cmsRouter from "./cms";
import * as usersRouter from "./users";

console.log("[DEBUG] Initializing appRouter in routers/index.ts");

// Explicitly define router using builder to ensure symbols are attached
export const appRouter = publicProcedure.router({
  healthCheck: publicProcedure.handler(() => {
    return { status: "OK" };
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
    dailyInsight: healthRouter.dailyInsight,
    getFeed: healthRouter.getFeed,
  },
  scanner: {
    scanBarcode: scannerRouter.scanBarcode,
    getIngredientInsight: scannerRouter.getIngredientInsight,
    getRecentScans: scannerRouter.getRecentScans,
    analyzeIngredients: scannerRouter.analyzeIngredients,
    createProduct: scannerRouter.createProduct,
  },
  cms: {
    listArticles: cmsRouter.listArticles,
    getArticle: cmsRouter.getArticle,
    createArticle: cmsRouter.createArticle,
    updateArticle: cmsRouter.updateArticle,
    deleteArticle: cmsRouter.deleteArticle,
    listTips: cmsRouter.listTips,
    createTip: cmsRouter.createTip,
    updateTip: cmsRouter.updateTip,
    deleteTip: cmsRouter.deleteTip,
    getTip: cmsRouter.getTip,
  },
  users: {
    listUsers: usersRouter.listUsers,
    toggleSuspension: usersRouter.toggleSuspension,
    updateUserPlan: usersRouter.updateUserPlan,
    deleteUser: usersRouter.deleteUser,
  },
});
export type AppRouter = typeof appRouter;
export type AppRouterClient = RouterClient<typeof appRouter>;
