import { Router } from "express";
import { db } from "@workspace/db";
import { conversationsTable, messagesTable } from "@workspace/db";
import { eq, count } from "drizzle-orm";
import { CreateConversationBody, SendMessageBody } from "@workspace/api-zod";

const router = Router();

const fmtConv = (c: typeof conversationsTable.$inferSelect, messageCount = 0) => ({
  ...c,
  messageCount,
  createdAt: c.createdAt.toISOString(),
  updatedAt: c.updatedAt.toISOString(),
});

const fmtMsg = (m: typeof messagesTable.$inferSelect) => ({
  ...m,
  createdAt: m.createdAt.toISOString(),
});

router.get("/ai/conversations", async (req, res) => {
  try {
    const workspaceId = req.query.workspaceId ? parseInt(req.query.workspaceId as string) : undefined;

    const conversations = await db.select().from(conversationsTable)
      .orderBy(conversationsTable.updatedAt);

    const counts = await db.select({
      conversationId: messagesTable.conversationId,
      count: count(),
    }).from(messagesTable).groupBy(messagesTable.conversationId);

    const countMap = Object.fromEntries(counts.map(c => [c.conversationId, c.count]));

    const filtered = workspaceId
      ? conversations.filter(c => c.workspaceId === workspaceId)
      : conversations;

    res.json(filtered.map(c => fmtConv(c, countMap[c.id] ?? 0)));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to list conversations" });
  }
});

router.post("/ai/conversations", async (req, res) => {
  const parsed = CreateConversationBody.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.message });

  try {
    const [conv] = await db.insert(conversationsTable).values({
      title: parsed.data.title,
      model: parsed.data.model,
      workspaceId: parsed.data.workspaceId ?? null,
    }).returning();

    res.status(201).json(fmtConv(conv, 0));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to create conversation" });
  }
});

router.get("/ai/conversations/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: "Invalid id" });

  try {
    const [conv] = await db.select().from(conversationsTable).where(eq(conversationsTable.id, id));
    if (!conv) return res.status(404).json({ error: "Not found" });

    const messages = await db.select().from(messagesTable)
      .where(eq(messagesTable.conversationId, id))
      .orderBy(messagesTable.createdAt);

    res.json({
      ...fmtConv(conv, messages.length),
      messages: messages.map(fmtMsg),
    });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to get conversation" });
  }
});

router.delete("/ai/conversations/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: "Invalid id" });

  try {
    await db.delete(conversationsTable).where(eq(conversationsTable.id, id));
    res.status(204).end();
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to delete conversation" });
  }
});

router.post("/ai/conversations/:id/messages", async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: "Invalid id" });

  const parsed = SendMessageBody.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.message });

  try {
    const [conv] = await db.select().from(conversationsTable).where(eq(conversationsTable.id, id));
    if (!conv) return res.status(404).json({ error: "Conversation not found" });

    await db.insert(messagesTable).values({
      conversationId: id,
      role: "user",
      content: parsed.data.content,
    });

    const model = parsed.data.model ?? conv.model;
    const aiResponse = `[${model}] I've analyzed your request: "${parsed.data.content.slice(0, 80)}". Here's what I found in your codebase — the main entry point initializes the Express server and registers route handlers. I recommend extracting the middleware configuration into a separate module for better separation of concerns.`;

    const [aiMsg] = await db.insert(messagesTable).values({
      conversationId: id,
      role: "assistant",
      content: aiResponse,
      tokensUsed: Math.floor(Math.random() * 200) + 50,
    }).returning();

    await db.update(conversationsTable).set({ updatedAt: new Date() }).where(eq(conversationsTable.id, id));

    res.json(fmtMsg(aiMsg));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to send message" });
  }
});

// AI Models — simulated catalog
const MODEL_CATALOG = [
  { name: "qwen2.5-coder:7b", displayName: "Qwen2.5 Coder 7B", provider: "ollama", status: "available", sizeMb: 4800, contextWindow: 32768, description: "Fast code-focused model by Alibaba" },
  { name: "deepseek-coder:6.7b", displayName: "DeepSeek Coder 6.7B", provider: "ollama", status: "available", sizeMb: 4200, contextWindow: 16384, description: "High-quality code generation" },
  { name: "phi-3:mini", displayName: "Phi-3 Mini", provider: "ollama", status: "downloading", sizeMb: 2300, contextWindow: 8192, description: "Microsoft's compact but capable model" },
  { name: "gemma:7b", displayName: "Gemma 7B", provider: "ollama", status: "not_installed", sizeMb: 5200, contextWindow: 8192, description: "Google's open model family" },
  { name: "gpt-4o", displayName: "GPT-4o", provider: "openai", status: "available", sizeMb: null, contextWindow: 128000, description: "OpenAI's flagship multimodal model" },
  { name: "claude-3-5-sonnet", displayName: "Claude 3.5 Sonnet", provider: "anthropic", status: "available", sizeMb: null, contextWindow: 200000, description: "Anthropic's top coding model" },
];

router.get("/ai/models", async (_req, res) => {
  res.json(MODEL_CATALOG);
});

router.post("/ai/models/:name/pull", async (req, res) => {
  res.json({ name: req.params.name, status: "downloading", progress: 0 });
});

router.delete("/ai/models/:name", async (req, res) => {
  res.status(204).end();
});

export default router;
