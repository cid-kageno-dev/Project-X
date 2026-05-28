import { Router } from "express";
import { db } from "@workspace/db";
import { workspacesTable, deploymentsTable, containersTable } from "@workspace/db";
import { eq, count, sql } from "drizzle-orm";

const router = Router();

router.get("/metrics/overview", async (req, res) => {
  try {
    const [wCount] = await db.select({ count: count() }).from(workspacesTable);
    const [cCount] = await db.select({ count: count() }).from(containersTable)
      .where(eq(containersTable.status, "running"));
    const [dCount] = await db.select({ count: count() }).from(deploymentsTable);
    const [successCount] = await db.select({ count: count() }).from(deploymentsTable)
      .where(eq(deploymentsTable.status, "success"));

    const successRate = dCount.count > 0 ? (successCount.count / dCount.count) * 100 : 100;

    const recentActivity = [
      { timestamp: new Date(Date.now() - 30000).toISOString(), event: "Deployment succeeded", workspace: "api-gateway" },
      { timestamp: new Date(Date.now() - 120000).toISOString(), event: "Container started", workspace: "frontend-app" },
      { timestamp: new Date(Date.now() - 300000).toISOString(), event: "Build completed", workspace: "ml-service" },
      { timestamp: new Date(Date.now() - 600000).toISOString(), event: "Workspace created", workspace: "data-pipeline" },
      { timestamp: new Date(Date.now() - 900000).toISOString(), event: "Git commit pushed", workspace: "api-gateway" },
    ];

    res.json({
      cpuPercent: Math.random() * 45 + 10,
      memoryMb: Math.floor(Math.random() * 2048) + 1024,
      memoryTotalMb: 8192,
      activeContainers: cCount.count,
      activeWorkspaces: wCount.count,
      totalDeployments: dCount.count,
      deploymentSuccessRate: Math.round(successRate * 10) / 10,
      recentActivity,
    });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to get metrics overview" });
  }
});

router.get("/metrics/workspace/:workspaceId", async (req, res) => {
  const workspaceId = parseInt(req.params.workspaceId);
  if (isNaN(workspaceId)) return res.status(400).json({ error: "Invalid workspaceId" });

  res.json({
    workspaceId,
    cpuPercent: Math.random() * 60 + 5,
    memoryMb: Math.floor(Math.random() * 512) + 128,
    requestsPerMinute: Math.floor(Math.random() * 1000) + 50,
    errorRate: Math.random() * 2,
    uptime: Math.floor(Math.random() * 86400) + 3600,
  });
});

export default router;
