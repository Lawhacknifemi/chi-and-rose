
import { pgTable, text, timestamp, uuid, integer, index } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { user } from "./auth";

// Community Groups (e.g., "PCOS Support Group", "Clean Beauty Enthusiasts")
export const communityGroups = pgTable("community_groups", {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    description: text("description"),
    iconUrl: text("icon_url"), // URL to the group avatar/icon
    memberCount: integer("member_count").default(0).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
        .defaultNow()
        .$onUpdate(() => /* @__PURE__ */ new Date())
        .notNull(),
});

// Community Posts
export const communityPosts = pgTable("community_posts", {
    id: uuid("id").primaryKey().defaultRandom(),
    groupId: uuid("group_id").references(() => communityGroups.id),
    userId: text("user_id").references(() => user.id).notNull(), // Matching auth.ts user id type (text)
    title: text("title").notNull(),
    content: text("content").notNull(),
    imageUrl: text("image_url"),
    likesCount: integer("likes_count").default(0).notNull(),
    commentsCount: integer("comments_count").default(0).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
        .defaultNow()
        .$onUpdate(() => /* @__PURE__ */ new Date())
        .notNull(),
}, (table) => {
    return {
        groupIdIdx: index("community_posts_group_id_idx").on(table.groupId),
        userIdIdx: index("community_posts_user_id_idx").on(table.userId),
    };
});

// Community Comments
export const communityComments = pgTable("community_comments", {
    id: uuid("id").primaryKey().defaultRandom(),
    postId: uuid("post_id").references(() => communityPosts.id).notNull(),
    userId: text("user_id").references(() => user.id).notNull(),
    content: text("content").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
        .defaultNow()
        .$onUpdate(() => /* @__PURE__ */ new Date())
        .notNull(),
}, (table) => {
    return {
        postIdIdx: index("community_comments_post_id_idx").on(table.postId),
    };
});

// Relations
export const communityGroupsRelations = relations(communityGroups, ({ many }) => ({
    posts: many(communityPosts),
}));

export const communityPostsRelations = relations(communityPosts, ({ one, many }) => ({
    group: one(communityGroups, {
        fields: [communityPosts.groupId],
        references: [communityGroups.id],
    }),
    author: one(user, {
        fields: [communityPosts.userId],
        references: [user.id],
    }),
    comments: many(communityComments),
}));

export const communityCommentsRelations = relations(communityComments, ({ one }) => ({
    post: one(communityPosts, {
        fields: [communityComments.postId],
        references: [communityPosts.id],
    }),
    author: one(user, {
        fields: [communityComments.userId],
        references: [user.id],
    }),
}));
