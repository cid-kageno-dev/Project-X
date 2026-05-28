import { Router } from "express";
import { CreateCommitBody } from "@workspace/api-zod";

const router = Router();

const SAMPLE_COMMITS = [
  { sha: "a3f4e91", message: "feat: add WebSocket streaming for terminal sessions", author: "Alex Chen", date: new Date(Date.now() - 3600000).toISOString() },
  { sha: "b8c2d14", message: "fix: resolve memory leak in container runtime manager", author: "Sarah Kim", date: new Date(Date.now() - 86400000).toISOString() },
  { sha: "c1e9f23", message: "chore: upgrade drizzle-orm to v0.38 and update schema", author: "Alex Chen", date: new Date(Date.now() - 172800000).toISOString() },
  { sha: "d7a5b36", message: "feat: implement CRDT-based collaborative editing", author: "Marcus Osei", date: new Date(Date.now() - 259200000).toISOString() },
  { sha: "e4c8a47", message: "perf: optimize AI context window management", author: "Sarah Kim", date: new Date(Date.now() - 345600000).toISOString() },
];

router.get("/git/workspaces/:workspaceId/status", async (req, res) => {
  const workspaceId = parseInt(req.params.workspaceId);
  if (isNaN(workspaceId)) return res.status(400).json({ error: "Invalid workspaceId" });

  res.json({
    workspaceId,
    branch: "main",
    staged: ["src/routes/ai.ts", "lib/db/src/schema/index.ts"],
    unstaged: ["artifacts/ide/src/App.tsx", "artifacts/ide/src/index.css"],
    untracked: ["artifacts/ide/src/pages/workspace.tsx"],
    ahead: 2,
    behind: 0,
  });
});

router.get("/git/workspaces/:workspaceId/commits", async (req, res) => {
  const workspaceId = parseInt(req.params.workspaceId);
  if (isNaN(workspaceId)) return res.status(400).json({ error: "Invalid workspaceId" });

  res.json(SAMPLE_COMMITS);
});

router.post("/git/workspaces/:workspaceId/commits", async (req, res) => {
  const workspaceId = parseInt(req.params.workspaceId);
  if (isNaN(workspaceId)) return res.status(400).json({ error: "Invalid workspaceId" });

  const parsed = CreateCommitBody.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.message });

  const sha = Math.random().toString(16).slice(2, 9);
  res.json({
    sha,
    message: parsed.data.message,
    author: "Current User",
    date: new Date().toISOString(),
  });
});

router.get("/git/workspaces/:workspaceId/branches", async (req, res) => {
  const workspaceId = parseInt(req.params.workspaceId);
  if (isNaN(workspaceId)) return res.status(400).json({ error: "Invalid workspaceId" });

  res.json({
    current: "main",
    branches: ["main", "feat/ai-streaming", "fix/container-lifecycle", "chore/deps-upgrade"],
  });
});

export default router;
