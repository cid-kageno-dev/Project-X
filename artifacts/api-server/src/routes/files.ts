import { Router } from "express";
import { db } from "@workspace/db";
import { filesTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { CreateFileBody, UpdateFileBody } from "@workspace/api-zod";

const router = Router();

const fmt = (f: typeof filesTable.$inferSelect) => ({
  ...f,
  createdAt: f.createdAt.toISOString(),
  updatedAt: f.updatedAt.toISOString(),
});

router.get("/workspaces/:workspaceId/files", async (req, res) => {
  const workspaceId = parseInt(req.params.workspaceId);
  if (isNaN(workspaceId)) return res.status(400).json({ error: "Invalid workspaceId" });

  try {
    const files = await db.select().from(filesTable).where(eq(filesTable.workspaceId, workspaceId));
    res.json(files.map(fmt));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to list files" });
  }
});

router.post("/workspaces/:workspaceId/files", async (req, res) => {
  const workspaceId = parseInt(req.params.workspaceId);
  if (isNaN(workspaceId)) return res.status(400).json({ error: "Invalid workspaceId" });

  const parsed = CreateFileBody.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.message });

  try {
    const content = parsed.data.content ?? "";
    const [file] = await db.insert(filesTable).values({
      workspaceId,
      name: parsed.data.name,
      path: parsed.data.path,
      type: parsed.data.type as "file" | "directory",
      language: parsed.data.language ?? null,
      content,
      size: content.length,
    }).returning();

    res.status(201).json(fmt(file));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to create file" });
  }
});

router.get("/workspaces/:workspaceId/files/:fileId", async (req, res) => {
  const workspaceId = parseInt(req.params.workspaceId);
  const fileId = parseInt(req.params.fileId);

  try {
    const [file] = await db.select().from(filesTable)
      .where(and(eq(filesTable.id, fileId), eq(filesTable.workspaceId, workspaceId)));

    if (!file) return res.status(404).json({ error: "Not found" });
    res.json(fmt(file));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to get file" });
  }
});

router.patch("/workspaces/:workspaceId/files/:fileId", async (req, res) => {
  const workspaceId = parseInt(req.params.workspaceId);
  const fileId = parseInt(req.params.fileId);

  const parsed = UpdateFileBody.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.message });

  try {
    const updates: Record<string, unknown> = { ...parsed.data, updatedAt: new Date() };
    if (parsed.data.content !== undefined) {
      updates.size = parsed.data.content.length;
    }

    const [file] = await db.update(filesTable)
      .set(updates)
      .where(and(eq(filesTable.id, fileId), eq(filesTable.workspaceId, workspaceId)))
      .returning();

    if (!file) return res.status(404).json({ error: "Not found" });
    res.json(fmt(file));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to update file" });
  }
});

router.delete("/workspaces/:workspaceId/files/:fileId", async (req, res) => {
  const workspaceId = parseInt(req.params.workspaceId);
  const fileId = parseInt(req.params.fileId);

  try {
    await db.delete(filesTable)
      .where(and(eq(filesTable.id, fileId), eq(filesTable.workspaceId, workspaceId)));
    res.status(204).end();
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to delete file" });
  }
});

export default router;
