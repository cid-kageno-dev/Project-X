"""
AI Chat router — conversations and message handling with simulated streaming.
"""

import asyncio
import json
import random
import time
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

router = APIRouter()

# ── In-memory conversation store ──────────────────────────────────────────────

_conversations: dict[int, dict] = {
    1: {
        "id": 1, "workspaceId": 1, "title": "Review rate limiting logic",
        "model": "qwen2.5-coder:7b",
        "createdAt": "2026-05-28T13:00:00Z", "updatedAt": "2026-05-28T15:00:00Z",
        "messages": [
            {"id": 1, "role": "user", "content": "Can you review the rate limiting middleware and suggest improvements?", "tokensUsed": 32, "createdAt": "2026-05-28T13:00:00Z"},
            {"id": 2, "role": "assistant", "content": "Looking at your middleware, I recommend switching to a sliding window algorithm and adding Redis for distributed rate limiting. Key improvements:\n\n1. **Sliding window** replaces fixed windows — prevents burst traffic at window boundaries.\n2. **Redis store** (`rate-limit-redis` with `ioredis`) ensures all replicas share counters.\n3. **Per-user keys** combine IP + JWT `sub` claim for accurate per-user limiting.\n4. **Exponential backoff** headers (`Retry-After`) on 429 responses improve client behavior.", "tokensUsed": 187, "createdAt": "2026-05-28T13:00:05Z"},
        ]
    },
    2: {
        "id": 2, "workspaceId": 1, "title": "Debug CORS preflight failures",
        "model": "deepseek-coder:6.7b",
        "createdAt": "2026-05-27T12:00:00Z", "updatedAt": "2026-05-27T14:00:00Z",
        "messages": []
    },
    3: {
        "id": 3, "workspaceId": 3, "title": "Optimize embedding batch size",
        "model": "nomic-embed-text",
        "createdAt": "2026-05-28T12:00:00Z", "updatedAt": "2026-05-28T14:30:00Z",
        "messages": []
    },
}
_next_convo_id = 4
_next_msg_id = 10

# ── AI response generation ────────────────────────────────────────────────────

_CODE_RESPONSES = [
    "I've analyzed your code. Here are the key improvements I'd recommend:\n\n```typescript\n// Use a more efficient data structure\nconst cache = new Map<string, { value: T; expires: number }>();\n\nexport function memoize<T>(fn: () => T, ttl = 60_000): () => T {\n  return () => {\n    const entry = cache.get(fn.toString());\n    if (entry && entry.expires > Date.now()) return entry.value;\n    const value = fn();\n    cache.set(fn.toString(), { value, expires: Date.now() + ttl });\n    return value;\n  };\n}\n```\n\nThis approach reduces redundant computation and improves cache hit rates significantly.",

    "Looking at this pattern, I see a classic N+1 query problem. Here's the fix:\n\n```python\n# Before: N+1 queries\nworkspaces = db.query(Workspace).all()\nfor ws in workspaces:\n    ws.containers = db.query(Container).filter_by(workspace_id=ws.id).all()\n\n# After: single JOIN query\nworkspaces = (\n    db.query(Workspace)\n    .options(joinedload(Workspace.containers))\n    .all()\n)\n```\n\nWith `joinedload`, SQLAlchemy emits a single SQL `JOIN` instead of one query per workspace.",

    "Here's how I'd structure this as a proper Go interface:\n\n```go\ntype ContainerRuntime interface {\n    Start(ctx context.Context, id string) error\n    Stop(ctx context.Context, id string, timeout time.Duration) error\n    Logs(ctx context.Context, id string) (io.ReadCloser, error)\n    Stats(ctx context.Context, id string) (<-chan Stats, error)\n}\n\n// DockerRuntime satisfies ContainerRuntime\ntype DockerRuntime struct {\n    client *docker.Client\n    logger *slog.Logger\n}\n```\n\nUsing an interface makes the runtime swappable (Docker, Podman, containerd) without changing call sites.",

    "For the Rust WebSocket handler, consider pinning the future to avoid allocations:\n\n```rust\nuse axum::{\n    extract::ws::{WebSocket, WebSocketUpgrade, Message},\n    response::IntoResponse,\n};\n\npub async fn ws_handler(\n    ws: WebSocketUpgrade,\n    State(state): State<Arc<AppState>>,\n) -> impl IntoResponse {\n    ws.on_upgrade(|socket| handle_socket(socket, state))\n}\n\nasync fn handle_socket(mut socket: WebSocket, state: Arc<AppState>) {\n    while let Some(Ok(msg)) = socket.recv().await {\n        if let Message::Text(text) = msg {\n            // process terminal input\n            let _ = socket.send(Message::Text(text)).await;\n        }\n    }\n}\n```",
]

_ANALYSIS_RESPONSES = [
    "**Code Quality Score: 87/100**\n\nStrengths:\n- Clean separation of concerns\n- Consistent naming conventions\n- Good error propagation patterns\n\nImprovements:\n- Add input validation at API boundaries\n- Extract magic numbers to named constants\n- Consider adding structured logging",
]


async def _stream_response(text: str):
    """Simulate token-by-token streaming like a real LLM."""
    words = text.split(" ")
    for i, word in enumerate(words):
        chunk = word + (" " if i < len(words) - 1 else "")
        yield f"data: {json.dumps({'delta': chunk})}\n\n"
        await asyncio.sleep(random.uniform(0.02, 0.06))
    yield "data: [DONE]\n\n"


# ── Routes ────────────────────────────────────────────────────────────────────

class ConversationCreate(BaseModel):
    workspaceId: int
    title: Optional[str] = "New conversation"
    model: Optional[str] = "qwen2.5-coder:7b"


class MessageCreate(BaseModel):
    content: str
    stream: Optional[bool] = False


@router.get("/conversations")
async def list_conversations(workspaceId: Optional[int] = None):
    convos = list(_conversations.values())
    if workspaceId:
        convos = [c for c in convos if c["workspaceId"] == workspaceId]
    # Return without messages (summary only)
    return [{k: v for k, v in c.items() if k != "messages"} for c in convos]


@router.post("/conversations", status_code=201)
async def create_conversation(body: ConversationCreate):
    global _next_convo_id
    now = datetime.now(timezone.utc).isoformat()
    convo = {
        "id": _next_convo_id,
        "workspaceId": body.workspaceId,
        "title": body.title,
        "model": body.model,
        "createdAt": now,
        "updatedAt": now,
        "messages": [],
    }
    _conversations[_next_convo_id] = convo
    _next_convo_id += 1
    return {k: v for k, v in convo.items() if k != "messages"}


@router.get("/conversations/{conversation_id}")
async def get_conversation(conversation_id: int):
    if conversation_id not in _conversations:
        raise HTTPException(status_code=404, detail="Conversation not found")
    return _conversations[conversation_id]


@router.get("/conversations/{conversation_id}/messages")
async def list_messages(conversation_id: int):
    if conversation_id not in _conversations:
        raise HTTPException(status_code=404, detail="Conversation not found")
    return _conversations[conversation_id]["messages"]


@router.post("/conversations/{conversation_id}/messages", status_code=201)
async def send_message(conversation_id: int, body: MessageCreate):
    global _next_msg_id
    if conversation_id not in _conversations:
        raise HTTPException(status_code=404, detail="Conversation not found")

    now = datetime.now(timezone.utc).isoformat()
    convo = _conversations[conversation_id]

    # Store user message
    user_msg = {
        "id": _next_msg_id, "role": "user", "content": body.content,
        "tokensUsed": len(body.content.split()), "createdAt": now,
    }
    convo["messages"].append(user_msg)
    _next_msg_id += 1

    # Generate AI response
    response_text = random.choice(_CODE_RESPONSES)
    ai_msg = {
        "id": _next_msg_id, "role": "assistant", "content": response_text,
        "tokensUsed": len(response_text.split()), "createdAt": now,
    }
    convo["messages"].append(ai_msg)
    _next_msg_id += 1
    convo["updatedAt"] = now

    if body.stream:
        return StreamingResponse(
            _stream_response(response_text),
            media_type="text/event-stream",
            headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
        )

    return ai_msg
