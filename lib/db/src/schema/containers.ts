import { pgTable, text, serial, integer, timestamp, pgEnum, real } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { workspacesTable } from "./workspaces";

export const containerStatusEnum = pgEnum("container_status", [
  "running", "stopped", "paused", "exited", "creating"
]);

export const containersTable = pgTable("containers", {
  id: serial("id").primaryKey(),
  workspaceId: integer("workspace_id").notNull().references(() => workspacesTable.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  image: text("image").notNull(),
  status: containerStatusEnum("status").notNull().default("creating"),
  port: integer("port"),
  cpuPercent: real("cpu_percent"),
  memoryMb: integer("memory_mb"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  startedAt: timestamp("started_at"),
});

export const insertContainerSchema = createInsertSchema(containersTable).omit({ id: true, createdAt: true });
export type InsertContainer = z.infer<typeof insertContainerSchema>;
export type Container = typeof containersTable.$inferSelect;
