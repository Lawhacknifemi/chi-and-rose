import type { RouterClient } from "@orpc/server";
import { protectedProcedure, publicProcedure } from "../index";
import * as healthRouter from "./health";
import * as scannerRouter from "./scanner";
import * as subscriptionsRouter from "./subscriptions";
import * as cmsRouter from "./cms";
import * as usersRouter from "./users";
import * as discoverRouter from "./discover";
import * as communityRouter from "./community";
import * as flowRouter from "./flow";

console.log("[DEBUG] Initializing appRouter in routers/index.ts");

// Explicitly define router using builder to ensure symbols are attached
export const appRouter = publicProcedure.router({
  healthCheck: publicProcedure.handler(() => {
    return "OK";
  }),
  // ...
  community: publicProcedure.router({
    getGroups: communityRouter.getGroups,
    createGroup: communityRouter.createGroup,
    joinGroup: communityRouter.joinGroup,
    leaveGroup: communityRouter.leaveGroup,
    getGroupDetails: communityRouter.getGroupDetails,
    listGroupPosts: communityRouter.listGroupPosts,
    getFeed: communityRouter.getFeed,
    createPost: communityRouter.createPost,
    createComment: communityRouter.createComment,
    updatePost: communityRouter.updatePost,
    getPostDetails: communityRouter.getPostDetails,
    adminDeleteGroup: communityRouter.adminDeleteGroup,
    adminUpdateGroup: communityRouter.adminUpdateGroup,
    adminListAllPosts: communityRouter.adminListAllPosts,
    adminDeletePost: communityRouter.adminDeletePost,
    adminDeleteComment: communityRouter.adminDeleteComment,
    adminListGroupMembers: communityRouter.adminListGroupMembers,
    adminToggleCommentPermission: communityRouter.adminToggleCommentPermission,
  }),
  privateData: protectedProcedure.handler(({ context }) => {
    return {
      message: "This is private",
      user: context.session?.user,
    };
  }),
  // Subscription/Entitlement endpoints (separate from auth)
  subscriptions: publicProcedure.router({
    verifyGooglePlay: subscriptionsRouter.verifyGooglePlayPurchase,
    verifyApple: subscriptionsRouter.verifyApplePurchase,
    getSubscriptions: subscriptionsRouter.getSubscriptions,
    hasAccess: subscriptionsRouter.hasAccess,
    syncSubscription: subscriptionsRouter.syncSubscription,
  }),
  health: publicProcedure.router({
    getProfile: healthRouter.getProfile,
    updateProfile: healthRouter.updateProfile,
    dailyInsight: healthRouter.dailyInsight,
    getFeed: healthRouter.getFeed,
    getArticle: healthRouter.getArticle,
    chat: healthRouter.chat,
    getIntro: healthRouter.getIntro,
  }),
  scanner: publicProcedure.router({
    scanBarcode: scannerRouter.scanBarcode,
    scanFromImage: scannerRouter.scanFromImage,
    getIngredientInsight: scannerRouter.getIngredientInsight,
    getRecentScans: scannerRouter.getRecentScans,
    analyzeIngredients: scannerRouter.analyzeIngredients,
    createProduct: scannerRouter.createProduct,
    getProductDetails: scannerRouter.getProductDetails,
    detectBarcode: scannerRouter.detectBarcode,
  }),
  cms: publicProcedure.router({
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
  }),
  users: publicProcedure.router({
    listUsers: usersRouter.listUsers,
    toggleSuspension: usersRouter.toggleSuspension,
    updateUserPlan: usersRouter.updateUserPlan,
    updateUserRole: usersRouter.updateUserRole,
    deleteUser: usersRouter.deleteUser,
  }),
  discover: publicProcedure.router({
    getFeed: discoverRouter.getFeed,
  }),
  flow: publicProcedure.router(flowRouter),
});
export type AppRouter = typeof appRouter;
export type AppRouterClient = RouterClient<typeof appRouter>;
