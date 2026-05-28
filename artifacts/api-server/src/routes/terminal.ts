import { Router } from "express";
import { db } from "@workspace/db";
import { terminalSessionsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { CreateTerminalSessionBody } from "@workspace/api-zod";

const router = Router();

const fmt = (s: typeof terminalSessionsTable.$inferSelect) => ({
  ...s,
  createdAt: s.createdAt.toISOString(),
});

router.get("/terminal/sessions", async (req, res) => {
  try {
    const sessions = await db.select().from(terminalSessionsTable)
      .where(eq(terminalSessionsTable.status, "active"))
      .orderBy(terminalSessionsTable.createdAt);
    res.json(sessions.map(fmt));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to list terminal sessions" });
  }
});

router.post("/terminal/sessions", async (req, res) => {
  const parsed = CreateTerminalSessionBody.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.message });

  try {
    const [session] = await db.insert(terminalSessionsTable).values({
      workspaceId: parsed.data.workspaceId,
      name: parsed.data.name,
      shell: parsed.data.shell ?? "/bin/bash",
      status: "active",
    }).returning();

    res.status(201).json(fmt(session));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to create terminal session" });
  }
});

router.delete("/terminal/sessions/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: "Invalid id" });

  try {
    await db.update(terminalSessionsTable).set({ status: "closed" }).where(eq(terminalSessionsTable.id, id));
    res.status(204).end();
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to close terminal session" });
  }
});

export default router;
