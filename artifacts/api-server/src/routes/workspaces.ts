import { Router } from "express";
import { db } from "@workspace/db";
import { workspacesTable, deploymentsTable, containersTable } from "@workspace/db";
import { eq, sql } from "drizzle-orm";
import {
  CreateWorkspaceBody,
  UpdateWorkspaceBody,
} from "@workspace/api-zod";

const router = Router();

router.get("/workspaces/stats", async (req, res) => {
  try {
    const rows = await db
      .select({ status: workspacesTable.status, language: workspacesTable.language })
      .from(workspacesTable);

    const stats = { total: rows.length, running: 0, idle: 0, building: 0, error: 0 };
    const langMap: Record<string, number> = {};

    for (const r of rows) {
      stats[r.status as keyof typeof stats] = (stats[r.status as keyof typeof stats] as number) + 1;
      langMap[r.language] = (langMap[r.language] ?? 0) + 1;
    }

    const languageBreakdown = Object.entries(langMap).map(([language, count]) => ({ language, count }));
    res.json({ ...stats, languageBreakdown });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to get workspace stats" });
  }
});

router.get("/workspaces", async (req, res) => {
  try {
    const workspaces = await db.select().from(workspacesTable).orderBy(workspacesTable.createdAt);
    res.json(workspaces.map(w => ({
      ...w,
      createdAt: w.createdAt.toISOString(),
      updatedAt: w.updatedAt.toISOString(),
      lastActiveAt: w.lastActiveAt?.toISOString() ?? null,
    })));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to list workspaces" });
  }
});

router.post("/workspaces", async (req, res) => {
  const parsed = CreateWorkspaceBody.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.message });

  try {
    const [workspace] = await db.insert(workspacesTable).values({
      name: parsed.data.name,
      description: parsed.data.description ?? null,
      language: parsed.data.language,
      githubUrl: parsed.data.githubUrl ?? null,
      branch: parsed.data.branch ?? "main",
    }).returning();

    res.status(201).json({
      ...workspace,
      createdAt: workspace.createdAt.toISOString(),
      updatedAt: workspace.updatedAt.toISOString(),
      lastActiveAt: null,
    });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to create workspace" });
  }
});

router.get("/workspaces/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: "Invalid id" });

  try {
    const [workspace] = await db.select().from(workspacesTable).where(eq(workspacesTable.id, id));
    if (!workspace) return res.status(404).json({ error: "Not found" });

    res.json({
      ...workspace,
      createdAt: workspace.createdAt.toISOString(),
      updatedAt: workspace.updatedAt.toISOString(),
      lastActiveAt: workspace.lastActiveAt?.toISOString() ?? null,
    });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to get workspace" });
  }
});

router.patch("/workspaces/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: "Invalid id" });

  const parsed = UpdateWorkspaceBody.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.message });

  try {
    const [workspace] = await db.update(workspacesTable)
      .set({ ...parsed.data, updatedAt: new Date() })
      .where(eq(workspacesTable.id, id))
      .returning();

    if (!workspace) return res.status(404).json({ error: "Not found" });

    res.json({
      ...workspace,
      createdAt: workspace.createdAt.toISOString(),
      updatedAt: workspace.updatedAt.toISOString(),
      lastActiveAt: workspace.lastActiveAt?.toISOString() ?? null,
    });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to update workspace" });
  }
});

router.delete("/workspaces/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: "Invalid id" });

  try {
    await db.delete(workspacesTable).where(eq(workspacesTable.id, id));
    res.status(204).end();
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to delete workspace" });
  }
});

export default router;
