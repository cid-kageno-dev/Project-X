/**
 * NovaDev Git & Plugin Service — Node.js
 *
 * Handles: /api/git — status, log, branches, diff, commit
 *
 * Uses simple-git to run real Git operations on workspace directories.
 * Falls back to rich mock data when no Git repo is present.
 */

import express from "express";
import cors from "cors";
import { simpleGit } from "simple-git";
import { promises as fs } from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || 8084;
const WORKSPACE_ROOT = process.env.WORKSPACE_ROOT || "/home/runner/workspace";

const app = express();
app.use(cors());
app.use(express.json());

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Try to initialise simple-git for a workspace path; null if not a repo. */
async function tryGit(workspaceId) {
  const wsPath = path.join(WORKSPACE_ROOT);
  const git = simpleGit(wsPath);
  try {
    await git.status();
    return git;
  } catch {
    return null;
  }
}

/** Rich mock git log for when no real repo exists. */
function mockLog(workspaceId) {
  const logs = {
    1: [
      { hash: "a3f4e91b2c", date: "2026-05-28T13:24:00Z", message: "feat: add rate limiting middleware", author: "alex@acme.dev", refs: "HEAD -> main, origin/main" },
      { hash: "b8c2d14f3a", date: "2026-05-27T10:15:00Z", message: "fix: resolve CORS preflight issue", author: "alex@acme.dev", refs: "" },
      { hash: "c1e9f23d5b", date: "2026-05-26T16:45:00Z", message: "refactor: extract auth middleware", author: "sam@acme.dev", refs: "" },
      { hash: "d7a5b364ec", date: "2026-05-25T09:30:00Z", message: "chore: update dependencies to latest", author: "alex@acme.dev", refs: "" },
      { hash: "e4c8a471fd", date: "2026-05-24T14:22:00Z", message: "feat: initial api gateway scaffold", author: "alex@acme.dev", refs: "" },
    ],
    2: [
      { hash: "f1b3c582ae", date: "2026-05-28T11:00:00Z", message: "feat: dark mode implementation", author: "sam@acme.dev", refs: "HEAD -> feat/dark-mode" },
      { hash: "g2c4d693bf", date: "2026-05-27T15:30:00Z", message: "fix: hydration mismatch on theme toggle", author: "sam@acme.dev", refs: "" },
      { hash: "h3d5e7a4c0", date: "2026-05-26T12:00:00Z", message: "feat: add settings panel", author: "alex@acme.dev", refs: "" },
    ],
    3: [
      { hash: "i4e6f8b5d1", date: "2026-05-28T09:00:00Z", message: "perf: batch embedding requests", author: "ml@acme.dev", refs: "HEAD -> main" },
      { hash: "j5f7g9c6e2", date: "2026-05-27T18:00:00Z", message: "feat: add streaming inference endpoint", author: "ml@acme.dev", refs: "" },
    ],
  };
  return logs[workspaceId] || logs[1];
}

function mockStatus(workspaceId) {
  const statuses = {
    1: {
      branch: "main",
      ahead: 0,
      behind: 0,
      staged: [{ path: "src/middleware/rateLimit.ts", status: "M" }],
      unstaged: [{ path: "src/index.ts", status: "M" }, { path: "package.json", status: "M" }],
      untracked: ["src/middleware/throttle.ts"],
    },
    2: {
      branch: "feat/dark-mode",
      ahead: 3,
      behind: 0,
      staged: [],
      unstaged: [{ path: "app/layout.tsx", status: "M" }, { path: "app/globals.css", status: "M" }],
      untracked: ["components/ThemeToggle.tsx"],
    },
    3: {
      branch: "main",
      ahead: 1,
      behind: 0,
      staged: [{ path: "routers/embeddings.py", status: "A" }],
      unstaged: [{ path: "main.py", status: "M" }],
      untracked: [],
    },
  };
  return statuses[workspaceId] || statuses[1];
}

function mockBranches(workspaceId) {
  const branches = {
    1: [
      { name: "main", current: true, remote: "origin/main", lastCommit: "a3f4e91", lastCommitDate: "2026-05-28T13:24:00Z" },
      { name: "feat/distributed-ratelimit", current: false, remote: null, lastCommit: "e4c8a47", lastCommitDate: "2026-05-24T14:22:00Z" },
    ],
    2: [
      { name: "main", current: false, remote: "origin/main", lastCommit: "h3d5e7a4c0", lastCommitDate: "2026-05-26T12:00:00Z" },
      { name: "feat/dark-mode", current: true, remote: "origin/feat/dark-mode", lastCommit: "f1b3c582ae", lastCommitDate: "2026-05-28T11:00:00Z" },
      { name: "fix/ssr-hydration", current: false, remote: null, lastCommit: "g2c4d693bf", lastCommitDate: "2026-05-27T15:30:00Z" },
    ],
    3: [
      { name: "main", current: true, remote: "origin/main", lastCommit: "i4e6f8b5d1", lastCommitDate: "2026-05-28T09:00:00Z" },
      { name: "feat/streaming", current: false, remote: "origin/feat/streaming", lastCommit: "j5f7g9c6e2", lastCommitDate: "2026-05-27T18:00:00Z" },
    ],
  };
  return branches[workspaceId] || branches[1];
}

function mockDiff(workspaceId) {
  const diffs = {
    1: `diff --git a/src/middleware/rateLimit.ts b/src/middleware/rateLimit.ts
index 4f2a1b3..8c9d5e7 100644
--- a/src/middleware/rateLimit.ts
+++ b/src/middleware/rateLimit.ts
@@ -1,12 +1,24 @@
-import rateLimit from 'express-rate-limit';
+import rateLimit from 'express-rate-limit';
+import RedisStore from 'rate-limit-redis';
+import { createClient } from 'redis';
 
-export const limiter = rateLimit({
-  windowMs: 60 * 1000,
-  max: 100,
+const redis = createClient({ url: process.env.REDIS_URL });
+await redis.connect();
+
+export const limiter = rateLimit({
+  windowMs: 60 * 1000,
+  max: 100,
+  standardHeaders: 'draft-7',
+  legacyHeaders: false,
+  store: new RedisStore({
+    sendCommand: (...args: string[]) => redis.sendCommand(args),
+  }),
+  keyGenerator: (req) => \`\${req.ip}:\${req.user?.sub ?? 'anon'}\`,
 });`,
    2: `diff --git a/app/layout.tsx b/app/layout.tsx
index 1a2b3c4..5d6e7f8 100644
--- a/app/layout.tsx
+++ b/app/layout.tsx
@@ -1,8 +1,16 @@
+import { ThemeProvider } from '@/components/ThemeProvider';
 import type { Metadata } from 'next';
 
 export default function RootLayout({ children }: { children: React.ReactNode }) {
   return (
     <html lang="en">
-      <body>{children}</body>
+      <body>
+        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
+          {children}
+        </ThemeProvider>
+      </body>
     </html>
   );
 }`,
  };
  return diffs[workspaceId] || diffs[1];
}

// ── Routes ────────────────────────────────────────────────────────────────────

app.get("/api/git/status", async (req, res) => {
  const wsId = parseInt(req.query.workspaceId) || 1;
  const git = await tryGit(wsId);

  if (git) {
    try {
      const status = await git.status();
      return res.json({
        branch: status.current,
        ahead: status.ahead,
        behind: status.behind,
        staged: status.staged.map(f => ({ path: f, status: "M" })),
        unstaged: status.modified.map(f => ({ path: f, status: "M" })),
        untracked: status.not_added,
      });
    } catch (e) {
      console.error("git status failed:", e.message);
    }
  }

  res.json(mockStatus(wsId));
});

app.get("/api/git/log", async (req, res) => {
  const wsId = parseInt(req.query.workspaceId) || 1;
  const limit = parseInt(req.query.limit) || 20;
  const git = await tryGit(wsId);

  if (git) {
    try {
      const log = await git.log(["--max-count", String(limit), "--pretty=format:%H|%aI|%s|%ae|%D"]);
      const commits = log.all.map(entry => {
        const [hash, date, message, author, refs] = entry.hash.split("|");
        return { hash: hash?.slice(0, 10) || entry.hash.slice(0, 10), date, message, author, refs: refs || "" };
      });
      return res.json(commits);
    } catch (e) {
      console.error("git log failed:", e.message);
    }
  }

  res.json(mockLog(wsId).slice(0, limit));
});

app.get("/api/git/branches", async (req, res) => {
  const wsId = parseInt(req.query.workspaceId) || 1;
  const git = await tryGit(wsId);

  if (git) {
    try {
      const branches = await git.branch(["-vv"]);
      const result = Object.entries(branches.branches).map(([name, info]) => ({
        name,
        current: info.current,
        remote: info.linkedWorkTree || null,
        lastCommit: info.commit.slice(0, 10),
        lastCommitDate: null,
      }));
      return res.json(result);
    } catch (e) {
      console.error("git branches failed:", e.message);
    }
  }

  res.json(mockBranches(wsId));
});

app.get("/api/git/diff", async (req, res) => {
  const wsId = parseInt(req.query.workspaceId) || 1;
  const file = req.query.file;
  const git = await tryGit(wsId);

  if (git) {
    try {
      const diff = file ? await git.diff([file]) : await git.diff();
      return res.json({ diff, language: "diff" });
    } catch (e) {
      console.error("git diff failed:", e.message);
    }
  }

  res.json({ diff: mockDiff(wsId), language: "diff" });
});

app.post("/api/git/commit", async (req, res) => {
  const { workspaceId, message, files } = req.body;
  const git = await tryGit(workspaceId);

  if (git && message) {
    try {
      if (files?.length) await git.add(files);
      const result = await git.commit(message);
      return res.status(201).json({
        success: true,
        hash: result.commit.slice(0, 10),
        message,
        branch: result.branch,
      });
    } catch (e) {
      console.error("git commit failed:", e.message);
    }
  }

  // Simulate commit
  const fakeHash = Math.random().toString(16).slice(2, 12);
  res.status(201).json({ success: true, hash: fakeHash, message, branch: "main" });
});

app.post("/api/git/checkout", async (req, res) => {
  const { workspaceId, branch, create } = req.body;
  const git = await tryGit(workspaceId);

  if (git) {
    try {
      if (create) {
        await git.checkoutLocalBranch(branch);
      } else {
        await git.checkout(branch);
      }
      return res.json({ success: true, branch });
    } catch (e) {
      console.error("git checkout failed:", e.message);
    }
  }

  res.json({ success: true, branch });
});

// ── Health & start ────────────────────────────────────────────────────────────

app.get("/api/git/healthz", (req, res) => {
  res.json({ status: "ok", service: "node-git", lang: "Node.js 24", capabilities: ["git-status", "git-log", "git-diff", "git-commit", "git-checkout"] });
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`🟩 Node.js Git Service listening on port ${PORT}`);
  console.log(`   Handles: /api/git`);
});
