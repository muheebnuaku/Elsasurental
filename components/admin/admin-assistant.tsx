"use client";

import { useEffect, useRef, useState } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { ArrowUp, Loader2, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";

const suggestions = [
  "What's on today?",
  "Which trips this week still need a driver?",
  "How much did we collect this month?",
  "Which upcoming bookings still owe a balance?",
  "Draft a WhatsApp reminder for tomorrow's customers",
];

const working: Record<string, string> = {
  find_bookings: "Looking through bookings…",
  day_schedule: "Checking the schedule…",
  money_summary: "Adding up payments…",
  fleet_status: "Checking vehicles and drivers…",
  customer_lookup: "Searching customers…",
};

/** Light formatting for replies: **bold**, "- " bullets and line breaks. */
function Rich({ text }: { text: string }) {
  return (
    <div className="space-y-1.5">
      {text.split("\n").filter((l, i, a) => l.trim() || (i > 0 && a[i - 1]?.trim())).map((line, i) => {
        const bullet = /^\s*[-•*]\s+/.test(line);
        const body = line.replace(/^\s*[-•*]\s+/, "");
        const parts = body.split(/(\*\*[^*]+\*\*)/g).map((p, j) => (p.startsWith("**") && p.endsWith("**") ? <strong key={j}>{p.slice(2, -2)}</strong> : <span key={j}>{p}</span>));
        if (!line.trim()) return <div key={i} className="h-1" />;
        return bullet ? (
          <p key={i} className="flex gap-2 pl-1"><span className="mt-2 size-1.5 shrink-0 rounded-full bg-brand-orange" />{parts}</p>
        ) : (
          <p key={i}>{parts}</p>
        );
      })}
    </div>
  );
}

function Message({ m }: { m: UIMessage }) {
  return (
    <>
      {m.parts.map((part, i) => {
        if (part.type === "text") {
          if (!part.text.trim()) return null;
          return m.role === "user" ? (
            <div key={i} className="ml-auto max-w-[85%] rounded-2xl rounded-br-md bg-brand-ink px-3.5 py-2.5 text-sm text-white dark:bg-white dark:text-brand-ink">{part.text}</div>
          ) : (
            <div key={i} className="max-w-[92%] rounded-2xl rounded-bl-md border bg-card px-4 py-3 text-sm leading-relaxed"><Rich text={part.text} /></div>
          );
        }
        if (part.type.startsWith("tool-")) {
          const done = (part as { state?: string }).state === "output-available";
          if (done) return null;
          return (
            <p key={i} className="flex items-center gap-2 text-xs text-muted-foreground">
              <Loader2 className="size-3.5 animate-spin" /> {working[part.type.slice(5)] ?? "Working…"}
            </p>
          );
        }
        return null;
      })}
    </>
  );
}

export function AdminAssistant() {
  const [transport] = useState(() => new DefaultChatTransport({ api: "/api/admin/ai" }));
  const { messages, sendMessage, status, error, setMessages } = useChat({ transport });
  const [input, setInput] = useState("");
  const endRef = useRef<HTMLDivElement>(null);
  const busy = status === "submitted" || status === "streaming";

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, status]);

  function ask(text: string) {
    const t = text.trim();
    if (!t || busy) return;
    setInput("");
    sendMessage({ text: t });
  }

  return (
    <div className="flex min-h-[calc(100dvh-12rem)] flex-col rounded-2xl border bg-secondary/30 lg:min-h-[calc(100dvh-9rem)]">
      <div className="flex-1 space-y-3 p-4 sm:p-5">
        {!messages.length && (
          <div className="py-6 sm:py-10">
            <p className="text-lg font-semibold tracking-tight">Ask about your business</p>
            <p className="mt-1 text-sm text-muted-foreground">Bookings, today&apos;s schedule, money, vehicles, drivers and customers. It reads live data and can draft messages, but it never changes anything.</p>
            <div className="mt-5 flex flex-wrap gap-2">
              {suggestions.map((s) => (
                <button key={s} type="button" onClick={() => ask(s)} className="rounded-full border bg-background px-3.5 py-2 text-left text-sm font-medium hover:border-brand-orange hover:text-brand-orange-text">
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}
        {messages.map((m) => (
          <div key={m.id} className="flex flex-col gap-2">
            <Message m={m} />
          </div>
        ))}
        {status === "submitted" && (
          <p className="flex items-center gap-2 text-xs text-muted-foreground"><Loader2 className="size-3.5 animate-spin" /> Thinking…</p>
        )}
        {error && <p className="rounded-xl bg-destructive/10 px-3 py-2 text-sm text-destructive">The assistant couldn&apos;t answer just now. Please try again.</p>}
        <div ref={endRef} />
      </div>

      <form
        onSubmit={(e) => { e.preventDefault(); ask(input); }}
        className="sticky bottom-20 flex items-end gap-2 border-t bg-background/95 p-3 backdrop-blur lg:bottom-0 lg:rounded-b-2xl"
      >
        {messages.length > 0 && (
          <button type="button" onClick={() => setMessages([])} disabled={busy} className="grid size-11 shrink-0 place-items-center rounded-xl border text-muted-foreground hover:bg-muted" aria-label="New conversation" title="New conversation">
            <RotateCcw className="size-4" />
          </button>
        )}
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); ask(input); } }}
          rows={1}
          placeholder="Ask anything, e.g. who's travelling on Saturday?"
          aria-label="Message"
          className="max-h-32 min-h-11 flex-1 resize-none rounded-xl border bg-background px-3.5 py-2.5 text-base outline-none focus-visible:border-brand-orange focus-visible:ring-3 focus-visible:ring-brand-orange/25 sm:text-sm"
        />
        <button type="submit" disabled={busy || !input.trim()} className={cn("grid size-11 shrink-0 place-items-center rounded-xl bg-brand-orange text-brand-ink transition-opacity", (busy || !input.trim()) && "opacity-50")} aria-label="Send">
          {busy ? <Loader2 className="size-4 animate-spin" /> : <ArrowUp className="size-4" />}
        </button>
      </form>
    </div>
  );
}
