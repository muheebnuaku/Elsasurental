import {
  convertToModelMessages,
  createUIMessageStreamResponse,
  isStepCount,
  streamText,
  toUIMessageStream,
  type UIMessage,
} from "ai";
import { z } from "zod";
import { agentInstructions, agentTools } from "@/lib/ai/agent";
import { aiConfigured, chatModel, chatProviderOptions } from "@/lib/ai/provider";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Json } from "@/types/supabase";
import { clientIp, rateLimit, tooManyRequests } from "@/lib/rate-limit";
import { reportError } from "@/lib/observability";

export const maxDuration = 60;

const bodySchema = z.object({
  id: z.string().uuid(),
  messages: z.array(z.custom<UIMessage>((m) => typeof m === "object" && m !== null && "role" in m)).min(1).max(60),
});

export async function POST(req: Request) {
  if (!aiConfigured()) {
    return Response.json({ error: "The assistant is offline right now. Please WhatsApp us." }, { status: 503 });
  }
  const ip = clientIp(req);
  const rl = rateLimit(`ai:${ip}`, 15, 60_000);
  if (!rl.ok) return tooManyRequests(rl.retryAfterSec);

  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Invalid chat request" }, { status: 400 });
  const { id, messages } = parsed.data;

  const result = streamText({
    model: chatModel(),
    instructions: agentInstructions(),
    messages: await convertToModelMessages(messages),
    tools: agentTools,
    stopWhen: isStepCount(6),
    providerOptions: chatProviderOptions,
  });

  return createUIMessageStreamResponse({
    stream: toUIMessageStream({
      stream: result.stream,
      originalMessages: messages,
      onEnd: ({ messages: all }) => saveConversation(id, all).catch((e) => reportError("ai.chat.save", e)),
    }),
  });
}

// Log every chat to conversations/messages so staff can read them (admin inbox, Phase 2).
async function saveConversation(id: string, all: UIMessage[]) {
  const db = createAdminClient();
  const now = new Date().toISOString();
  await db.from("conversations").upsert({ id, channel: "web", last_message_at: now }, { onConflict: "id" });
  const latest = all.slice(-2); // the user's message and the assistant's reply
  const rows = latest.map((m) => ({
    conversation_id: id,
    role: m.role === "user" ? ("user" as const) : ("assistant" as const),
    content: m.parts.map((p) => (p.type === "text" ? p.text : "")).join("").slice(0, 8000) || null,
    tool_payload: m.parts.some((p) => p.type.startsWith("tool-"))
      ? (JSON.parse(JSON.stringify(m.parts.filter((p) => p.type.startsWith("tool-")))) as Json)
      : null,
  }));
  if (rows.length) await db.from("messages").insert(rows);
}
