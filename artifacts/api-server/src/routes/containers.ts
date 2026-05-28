import { Router } from "express";
import { db } from "@workspace/db";
import { containersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { CreateContainerBody } from "@workspace/api-zod";

const router = Router();

const LOG_LINES = [
  "Starting container runtime...",
  "Mounting filesystem layers",
  "Initializing network interfaces",
  "Setting up port bindings",
  "Running entrypoint script",
  "Server started on port 3000",
  "Health check passed",
  "Watching for file changes...",
  "Hot reload enabled",
  "Ready to accept connections",
];

const fmt = (c: typeof containersTable.$inferSelect) => ({
  ...c,
  createdAt: c.createdAt.toISOString(),
  startedAt: c.startedAt?.toISOString() ?? null,
});

router.get("/containers", async (req, res) => {
  try {
    const containers = await db.select().from(containersTable).orderBy(containersTable.createdAt);
    res.json(containers.map(fmt));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to list containers" });
  }
});

router.post("/containers", async (req, res) => {
  const parsed = CreateContainerBody.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.message });

  try {
    const [container] = await db.insert(containersTable).values({
      workspaceId: parsed.data.workspaceId,
      name: parsed.data.name,
      image: parsed.data.image,
      port: parsed.data.port ?? null,
      status: "running",
      cpuPercent: Math.random() * 30,
      memoryMb: Math.floor(Math.random() * 256) + 64,
      startedAt: new Date(),
    }).returning();

    res.status(201).json(fmt(container));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to create container" });
  }
});

router.get("/containers/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: "Invalid id" });

  try {
    const [container] = await db.select().from(containersTable).where(eq(containersTable.id, id));
    if (!container) return res.status(404).json({ error: "Not found" });
    res.json(fmt(container));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to get container" });
  }
});

router.delete("/containers/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: "Invalid id" });

  try {
    await db.update(containersTable).set({ status: "stopped" }).where(eq(containersTable.id, id));
    res.status(204).end();
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to stop container" });
  }
});

router.get("/containers/:id/logs", async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: "Invalid id" });

  try {
    const now = Date.now();
    const lines = LOG_LINES.map((message, i) => ({
      timestamp: new Date(now - (LOG_LINES.length - i) * 2000).toISOString(),
      stream: i % 5 === 4 ? "stderr" : "stdout",
      message,
    }));

    res.json({ containerId: id, lines });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to get logs" });
  }
});

export default router;
