"""
NovaDev Python AI Service
Handles: /api/ai — conversations, messages, code analysis, embeddings
"""

import os
import asyncio
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse

from routers import chat, analyze

PORT = int(os.environ.get("PORT", 8082))

app = FastAPI(
    title="NovaDev AI Service",
    description="Python AI brain: agents, code analysis, embeddings, chat",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(chat.router, prefix="/api/ai", tags=["chat"])
app.include_router(analyze.router, prefix="/api/ai", tags=["analyze"])


@app.get("/api/ai/healthz")
async def health():
    return {
        "status": "ok",
        "service": "python-ai",
        "lang": "Python 3.12",
        "capabilities": ["chat", "code-analysis", "embeddings", "agents"],
    }


@app.get("/api/ai/models")
async def list_models():
    """List available local AI models."""
    return [
        {"id": "qwen2.5-coder:7b",    "name": "Qwen 2.5 Coder 7B",    "size": "4.7GB", "status": "ready",    "type": "code"},
        {"id": "deepseek-coder:6.7b",  "name": "DeepSeek Coder 6.7B",  "size": "3.8GB", "status": "ready",    "type": "code"},
        {"id": "llama3.2:3b",          "name": "Llama 3.2 3B",          "size": "2.0GB", "status": "ready",    "type": "general"},
        {"id": "nomic-embed-text",     "name": "Nomic Embed Text",      "size": "274MB", "status": "ready",    "type": "embedding"},
        {"id": "codellama:13b",        "name": "Code Llama 13B",        "size": "7.4GB", "status": "pulling",  "type": "code"},
        {"id": "mistral:7b",           "name": "Mistral 7B",            "size": "4.1GB", "status": "not_pulled","type": "general"},
    ]


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=PORT, log_level="info")
