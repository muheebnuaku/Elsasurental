import { convertToModelMessages, createUIMessageStreamResponse, isStepCount, streamText, toUIMessageStream, type UIMessage } from "ai";
import { z } from "zod";
import { adminInstructions, adminTools } from "@/lib/ai/admin-agent";
import { aiConfigured, chatModel, chatProviderOptions } from "@/lib/ai/provider";
import { createClient, getSessionUser } from "@/lib/supabase/server";
import { rateLimit, tooManyRequests } from "@/lib/rate-limit";

// Admin assistant. Admins only; its tools read through the admin's own session (RLS), never write.
export const maxDuration = 60;

const bodySchema = z.object({
  messages: z.array(z.custom<UIMessage>((m) => typeof m === "object" && m !== null && "role" in m)).min(1).max(60),
});

export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user || user.role !== "admin") return Response.json({ error: "Admins only" }, { status: 403 });
  if (!aiConfigured()) return Response.json({ error: "The assistant needs OPENAI_API_KEY to be set." }, { status: 503 });
  const rl = rateLimit(`admin-ai:${user.id}`, 30, 60_000);
  if (!rl.ok) return tooManyRequests(rl.retryAfterSec);

  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Invalid request" }, { status: 400 });

  const result = streamText({
    model: chatModel(),
    instructions: adminInstructions(),
    messages: await convertToModelMessages(parsed.data.messages),
    tools: adminTools(await createClient()),
    stopWhen: isStepCount(8),
    providerOptions: chatProviderOptions,
  });

  return createUIMessageStreamResponse({
    stream: toUIMessageStream({ stream: result.stream, originalMessages: parsed.data.messages }),
  });
}
