import { pgTable, text, integer, timestamp, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const planEnum = pgEnum("plan", ["free", "pro", "unlimited"]);

export const apiKeysTable = pgTable("api_keys", {
  id: text("id").primaryKey(), // uuid
  keyId: text("key_id").notNull().unique(), // short public id like "sf_abc123"
  apiKey: text("api_key").notNull().unique(), // the full bearer token "sf_..."
  email: text("email").notNull(),
  name: text("name"),
  plan: planEnum("plan").notNull().default("free"),
  requestsToday: integer("requests_today").notNull().default(0),
  dailyLimit: integer("daily_limit").notNull().default(500),
  lastResetAt: timestamp("last_reset_at", { withTimezone: true }).notNull().defaultNow(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertApiKeySchema = createInsertSchema(apiKeysTable).omit({
  requestsToday: true,
  lastResetAt: true,
  createdAt: true,
});

export type InsertApiKey = z.infer<typeof insertApiKeySchema>;
export type ApiKey = typeof apiKeysTable.$inferSelect;
