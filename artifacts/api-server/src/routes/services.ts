import { Router } from "express";

const router = Router();

const SERVICES = [
  {
    id: "typescript-api",
    name: "API Gateway",
    language: "TypeScript",
    runtime: "Node.js v24",
    port: 8080,
    paths: ["/api/workspaces", "/api/files", "/api/terminal", "/api/healthz"],
    responsibilities: ["Workspace management", "File operations", "Session management", "Route orchestration"],
    color: "#3178c6",
    icon: "ts",
    status: "running",
  },
  {
    id: "go-infra",
    name: "Infra Service",
    language: "Go",
    runtime: "Go 1.25",
    port: 8008,
    paths: ["/api/containers", "/api/deployments"],
    responsibilities: ["Container lifecycle", "Deployment pipelines", "Infrastructure management", "Build orchestration"],
    color: "#00acd7",
    icon: "go",
    status: "running",
  },
  {
    id: "python-ai",
    name: "AI Brain",
    language: "Python",
    runtime: "Python 3.12 + FastAPI",
    port: 8082,
    paths: ["/api/ai"],
    responsibilities: ["LLM inference", "Code analysis", "Context management", "Multi-model routing"],
    color: "#3776ab",
    icon: "py",
    status: "running",
  },
  {
    id: "rust-rt",
    name: "Realtime Core",
    language: "Rust",
    runtime: "Rust stable + Axum",
    port: 8083,
    paths: ["/ws/terminal", "/api/metrics"],
    responsibilities: ["WebSocket terminals", "SSE metrics stream", "Zero-copy I/O", "Low-latency events"],
    color: "#ce4a23",
    icon: "rs",
    status: "running",
  },
  {
    id: "node-git",
    name: "Git Service",
    language: "Node.js",
    runtime: "Node.js v24 + simple-git",
    port: 8084,
    paths: ["/api/git"],
    responsibilities: ["Git operations", "Branch management", "Commit history", "Diff generation"],
    color: "#68a063",
    icon: "js",
    status: "running",
  },
];

router.get("/services", async (_req, res) => {
  res.json(SERVICES);
});

router.get("/services/:id/health", async (req, res) => {
  const svc = SERVICES.find(s => s.id === req.params.id);
  if (!svc) return res.status(404).json({ error: "Service not found" });

  let healthy = false;
  let latencyMs = 0;
  let details: Record<string, unknown> = {};

  try {
    const start = Date.now();
    const target =
      svc.id === "typescript-api" ? "http://localhost:8080/api/healthz" :
      svc.id === "go-infra"       ? "http://localhost:8008/api/healthz" :
      svc.id === "python-ai"      ? "http://localhost:8082/api/healthz" :
      svc.id === "rust-rt"        ? "http://localhost:8083/api/healthz" :
                                    "http://localhost:8084/api/healthz";

    const response = await fetch(target, { signal: AbortSignal.timeout(3000) });
    latencyMs = Date.now() - start;
    healthy = response.ok;
    if (response.ok) {
      details = await response.json() as Record<string, unknown>;
    }
  } catch {
    healthy = false;
  }

  res.json({ id: svc.id, healthy, latencyMs, details });
});

export default router;
