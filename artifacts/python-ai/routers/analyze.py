"""
Code analysis router — static analysis, complexity scoring, embedding generation.
"""

import asyncio
import random
from typing import Optional

from fastapi import APIRouter
from pydantic import BaseModel

router = APIRouter()


class AnalyzeRequest(BaseModel):
    code: str
    language: Optional[str] = "typescript"
    filename: Optional[str] = None


class EmbedRequest(BaseModel):
    texts: list[str]
    model: Optional[str] = "nomic-embed-text"


@router.post("/analyze")
async def analyze_code(body: AnalyzeRequest):
    """Perform static analysis and quality scoring on a code snippet."""
    await asyncio.sleep(0.3)  # simulate inference time

    lines = body.code.strip().split("\n")
    line_count = len(lines)
    has_types = ":" in body.code or "<" in body.code
    has_comments = any(l.strip().startswith(("//", "#", "/*", "*", '"""')) for l in lines)
    has_error_handling = any(kw in body.code for kw in ["try", "catch", "except", "Result<", "Option<"])

    score = 70
    issues = []
    suggestions = []

    if has_types:
        score += 8
    else:
        issues.append({"severity": "warning", "line": 1, "message": "No type annotations found — consider adding types for better maintainability"})

    if has_comments:
        score += 7
    else:
        suggestions.append("Add inline comments to explain complex logic")

    if has_error_handling:
        score += 10
    else:
        issues.append({"severity": "info", "line": None, "message": "No error handling detected — add try/catch or Result types"})

    if line_count > 100:
        score -= 5
        suggestions.append(f"File is {line_count} lines — consider splitting into smaller modules")

    complexity = "low" if line_count < 30 else "medium" if line_count < 80 else "high"

    return {
        "score": min(score, 100),
        "complexity": complexity,
        "lineCount": line_count,
        "language": body.language,
        "issues": issues,
        "suggestions": suggestions,
        "metrics": {
            "hasTypes": has_types,
            "hasComments": has_comments,
            "hasErrorHandling": has_error_handling,
            "estimatedTokens": len(body.code.split()),
        },
    }


@router.post("/embed")
async def embed_texts(body: EmbedRequest):
    """Generate vector embeddings for code or text (simulated)."""
    await asyncio.sleep(0.1 * len(body.texts))

    embeddings = []
    for text in body.texts:
        # Deterministic-ish mock embedding (768-dim)
        seed = sum(ord(c) for c in text)
        random.seed(seed)
        vec = [round(random.gauss(0, 0.3), 6) for _ in range(768)]
        embeddings.append(vec)

    return {
        "model": body.model,
        "embeddings": embeddings,
        "dimensions": 768,
        "usage": {"promptTokens": sum(len(t.split()) for t in body.texts)},
    }


@router.post("/agents/debug")
async def debug_agent(body: AnalyzeRequest):
    """Run the debugging agent on a code snippet."""
    await asyncio.sleep(0.5)

    bugs = []
    if "undefined" in body.code and body.language in ("typescript", "javascript"):
        bugs.append({"type": "runtime", "description": "Possible undefined reference — ensure all variables are initialized before use"})
    if "await" in body.code and "async" not in body.code:
        bugs.append({"type": "syntax", "description": "`await` used outside an async function — wrap in `async` or use `.then()`"})
    if "console.log" in body.code:
        bugs.append({"type": "quality", "description": "Debug `console.log` left in code — remove before merging"})

    return {
        "bugsFound": len(bugs),
        "bugs": bugs,
        "recommendation": "No critical issues" if not bugs else f"Found {len(bugs)} issue(s) — review before committing",
    }
