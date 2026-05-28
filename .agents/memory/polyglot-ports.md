---
name: Polyglot service ports
description: Correct ports for each language microservice in NovaDev
---

Go Infra uses port **8008** (not 8081 — was conflicting with a stale process; switched to 8008 which is in the Replit supported port list).

**Port map:**
- TypeScript API Gateway: 8080 (artifact: artifacts/api-server)
- Go Infra (containers/deployments): 8008 (artifact: artifacts/go-infra)
- Python AI (FastAPI): 8082 (artifact: artifacts/python-ai)
- Rust Realtime (Axum, WebSocket): 8083 (artifact: artifacts/rust-rt, workflow: "Rust Realtime Service")
- Node.js Git (simple-git): 8084 (artifact: artifacts/node-git, workflow: "Node Git Service")

**Why:** Port 8081 was permanently occupied by a zombie Go process from an earlier failed workflow start. 8008 is in Replit's supported port list.

**How to apply:** If Go Infra fails to bind, check /proc/net/tcp for stale 8008 occupants. Never use 8081 for Go.
