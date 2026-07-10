import { pgTable, text, timestamp, uuid, varchar, date } from "drizzle-orm/pg-core";

export const settings = pgTable("settings", {
  id: text("id").primaryKey(),
  discordToken: text("discord_token"),
  forumChannelId: varchar("forum_channel_id", { length: 255 }),
  botName: text("bot_name"),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const forumPosts = pgTable("forum_posts", {
  id: text("id").primaryKey(),
  postDate: date("post_date").notNull(),
  discordPostId: varchar("discord_post_id", { length: 255 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const configHistory = pgTable("config_history", {
  id: uuid("id").defaultRandom().primaryKey(),
  discordToken: text("discord_token").notNull(),
  forumChannelId: varchar("forum_channel_id", { length: 255 }).notNull(),
  botName: text("bot_name"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
