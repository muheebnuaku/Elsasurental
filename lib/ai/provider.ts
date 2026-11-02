import { createOpenAI } from "@ai-sdk/openai";
import type { LanguageModel } from "ai";

// The ONLY place that knows which LLM vendor we use. Swap providers here.
// AI_MODEL: any OpenAI model id, e.g. gpt-5.4-mini (default: fast, low cost) or a larger model.
// TODO(confirm): pick the model after checking current prices at platform.openai.com/pricing.

export const DEFAULT_MODEL = "gpt-5.4-mini";

export function aiConfigured() {
  return Boolean(process.env.OPENAI_API_KEY);
}

export function chatModel(): LanguageModel {
  const openai = createOpenAI({ apiKey: process.env.OPENAI_API_KEY });
  return openai(process.env.AI_MODEL || DEFAULT_MODEL);
}

/** Provider-specific knobs. Low reasoning effort keeps chat replies quick and cheap. */
export const chatProviderOptions = {
  openai: { reasoningEffort: "low" as const },
};
