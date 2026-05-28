import { Router } from "express";
import { db } from "@workspace/db";
import { deploymentsTable, workspacesTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import { CreateDeploymentBody } from "@workspace/api-zod";

const router = Router();

const fmt = (d: typeof deploymentsTable.$inferSelect, workspaceName?: string | null) => ({
  ...d,
  workspaceName: workspaceName ?? null,
  createdAt: d.createdAt.toISOString(),
  finishedAt: d.finishedAt?.toISOString() ?? null,
});

router.get("/deployments/recent", async (req, res) => {
  try {
    const rows = await db
      .select({ deployment: deploymentsTable, workspace: workspacesTable })
      .from(deploymentsTable)
      .leftJoin(workspacesTable, eq(deploymentsTable.workspaceId, workspacesTable.id))
      .orderBy(desc(deploymentsTable.createdAt))
      .limit(10);

    res.json(rows.map(r => fmt(r.deployment, r.workspace?.name)));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to get recent deployments" });
  }
});

router.get("/deployments", async (req, res) => {
  try {
    const workspaceId = req.query.workspaceId ? parseInt(req.query.workspaceId as string) : undefined;

    const rows = await db
      .select({ deployment: deploymentsTable, workspace: workspacesTable })
      .from(deploymentsTable)
      .leftJoin(workspacesTable, eq(deploymentsTable.workspaceId, workspacesTable.id))
      .orderBy(desc(deploymentsTable.createdAt));

    const filtered = workspaceId
      ? rows.filter(r => r.deployment.workspaceId === workspaceId)
      : rows;

    res.json(filtered.map(r => fmt(r.deployment, r.workspace?.name)));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to list deployments" });
  }
});

router.post("/deployments", async (req, res) => {
  const parsed = CreateDeploymentBody.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.message });

  try {
    const [deployment] = await db.insert(deploymentsTable).values({
      workspaceId: parsed.data.workspaceId,
      environment: parsed.data.environment as "development" | "staging" | "production",
      commitSha: parsed.data.commitSha ?? null,
      commitMessage: parsed.data.commitMessage ?? null,
      status: "pending",
    }).returning();

    // Simulate async build completion
    setTimeout(async () => {
      await db.update(deploymentsTable)
        .set({
          status: Math.random() > 0.15 ? "success" : "failed",
          buildDuration: Math.floor(Math.random() * 60) + 10,
          url: `https://app-${deployment.id}.novadev.app`,
          finishedAt: new Date(),
        })
        .where(eq(deploymentsTable.id, deployment.id));
    }, 3000);

    res.status(201).json(fmt(deployment));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to create deployment" });
  }
});

router.get("/deployments/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: "Invalid id" });

  try {
    const rows = await db
      .select({ deployment: deploymentsTable, workspace: workspacesTable })
      .from(deploymentsTable)
      .leftJoin(workspacesTable, eq(deploymentsTable.workspaceId, workspacesTable.id))
      .where(eq(deploymentsTable.id, id));

    if (!rows[0]) return res.status(404).json({ error: "Not found" });
    res.json(fmt(rows[0].deployment, rows[0].workspace?.name));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to get deployment" });
  }
});

router.post("/deployments/:id/rollback", async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: "Invalid id" });

  try {
    const [original] = await db.select().from(deploymentsTable).where(eq(deploymentsTable.id, id));
    if (!original) return res.status(404).json({ error: "Not found" });

    const [rollback] = await db.insert(deploymentsTable).values({
      workspaceId: original.workspaceId,
      environment: original.environment,
      commitSha: original.commitSha ?? null,
      commitMessage: `Rollback to deployment #${id}`,
      status: "success",
      buildDuration: 5,
      url: original.url ?? null,
      finishedAt: new Date(),
    }).returning();

    await db.update(deploymentsTable).set({ status: "rolled_back" }).where(eq(deploymentsTable.id, id));

    res.json(fmt(rollback));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to rollback" });
  }
});

export default router;
