import { pgTable, text, serial, integer, timestamp, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { workspacesTable } from "./workspaces";

export const deploymentStatusEnum = pgEnum("deployment_status", [
  "pending", "building", "deploying", "success", "failed", "rolled_back"
]);
export const deploymentEnvEnum = pgEnum("deployment_env", ["development", "staging", "production"]);

export const deploymentsTable = pgTable("deployments", {
  id: serial("id").primaryKey(),
  workspaceId: integer("workspace_id").notNull().references(() => workspacesTable.id, { onDelete: "cascade" }),
  status: deploymentStatusEnum("status").notNull().default("pending"),
  environment: deploymentEnvEnum("environment").notNull().default("development"),
  url: text("url"),
  commitSha: text("commit_sha"),
  commitMessage: text("commit_message"),
  buildDuration: integer("build_duration"),
  errorMessage: text("error_message"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  finishedAt: timestamp("finished_at"),
});

export const insertDeploymentSchema = createInsertSchema(deploymentsTable).omit({ id: true, createdAt: true });
export type InsertDeployment = z.infer<typeof insertDeploymentSchema>;
export type Deployment = typeof deploymentsTable.$inferSelect;
