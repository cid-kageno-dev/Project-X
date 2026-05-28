import { pgTable, text, serial, integer, timestamp, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { workspacesTable } from "./workspaces";

export const terminalStatusEnum = pgEnum("terminal_status", ["active", "closed"]);

export const terminalSessionsTable = pgTable("terminal_sessions", {
  id: serial("id").primaryKey(),
  workspaceId: integer("workspace_id").notNull().references(() => workspacesTable.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  status: terminalStatusEnum("status").notNull().default("active"),
  shell: text("shell").default("/bin/bash"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertTerminalSessionSchema = createInsertSchema(terminalSessionsTable).omit({ id: true, createdAt: true });
export type InsertTerminalSession = z.infer<typeof insertTerminalSessionSchema>;
export type TerminalSession = typeof terminalSessionsTable.$inferSelect;
