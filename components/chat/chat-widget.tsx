"use client";

import { useEffect, useRef, useState } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { ArrowUp, CalendarCheck, Loader2, MessageCircle, Phone, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { WhatsAppIcon } from "@/components/site/whatsapp-icon";
import { cn } from "@/lib/utils";
import { whatsappLink } from "@/lib/format";
import { track } from "@/lib/analytics/client";

export const OPEN_CHAT_EVENT = "elsasu:open-chat";
/** Fired whenever the chat opens or closes (detail: { open }). */
export const CHAT_STATE_EVENT = "elsasu:chat-state";

/** Open the assistant from anywhere, optionally with a first message. */
export function openChat(message?: string) {
  window.dispatchEvent(new CustomEvent(OPEN_CHAT_EVENT, { detail: { message } }));
}

const suggestions = [
  "How much from Accra to Cape Coast for 12 people?",
  "Airport pick-up this Saturday, 6 of us",
  "Do you do weddings?",
  "What's your cancellation policy?",
];

export function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  // Conversation id is created on the first send (never during server prerender).
  const conversationId = useRef<string | null>(null);
  const [transport] = useState(
    () =>
      new DefaultChatTransport({
        api: "/api/ai/chat",
        prepareSendMessagesRequest: ({ messages }) => ({
          body: { id: (conversationId.current ??= crypto.randomUUID()), messages },
        }),
      }),
  );
  const { messages, sendMessage, status, error } = useChat({ transport });
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const busy = status === "submitted" || status === "streaming";

  useEffect(() => {
    const onOpen = (e: Event) => {
      setOpen(true);
      track("chat_opened", { from: window.location.pathname });
      const msg = (e as CustomEvent<{ message?: string }>).detail?.message;
      if (msg) sendMessage({ text: msg });
    };
    window.addEventListener(OPEN_CHAT_EVENT, onOpen);
    return () => window.removeEventListener(OPEN_CHAT_EVENT, onOpen);
  }, [sendMessage]);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, status]);

  useEffect(() => {
    window.dispatchEvent(new CustomEvent(CHAT_STATE_EVENT, { detail: { open } }));
    if (open) setTimeout(() => inputRef.current?.focus(), 50);
  }, [open]);

  function send(text: string) {
    const t = text.trim();
    if (!t || busy) return;
    sendMessage({ text: t });
    setInput("");
  }

  return (
    <>
      {open && (
        <div
          role="dialog"
          aria-label="Booking assistant"
          className="fixed inset-0 z-50 flex flex-col bg-background animate-in fade-in slide-in-from-bottom-4 duration-200 sm:inset-auto sm:right-6 sm:bottom-6 sm:h-[min(640px,calc(100vh-6rem))] sm:w-[400px] sm:overflow-hidden sm:rounded-3xl sm:border sm:shadow-2xl"
        >
          <header className="flex items-center gap-3 border-b bg-brand-ink px-4 py-3 pt-[max(0.75rem,env(safe-area-inset-top))] text-white">
            <span className="relative grid size-10 place-items-center rounded-full bg-brand-orange font-semibold text-brand-ink">
              A
              <span className="absolute -right-0.5 -bottom-0.5 size-3 rounded-full border-2 border-brand-ink bg-success" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="font-semibold">Ama · Elsasu assistant</p>
              <p className="text-xs text-white/60">Quotes & bookings, any time</p>
            </div>
            <Button variant="ghost" size="icon-lg" className="text-white hover:bg-white/10 hover:text-white" onClick={() => setOpen(false)} aria-label="Close">
              <X className="size-5" />
            </Button>
          </header>

          <div ref={listRef} className="flex-1 space-y-4 overflow-y-auto overscroll-contain p-4" aria-live="polite">
            <Bubble role="assistant">
              Akwaaba! 👋 I&apos;m Ama. Tell me where you&apos;re going, when, and how many people, and I&apos;ll get you an exact price in seconds.
            </Bubble>
            {messages.length === 0 && (
              <div className="flex flex-wrap gap-2 pt-1">
                {suggestions.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => send(s)}
                    className="rounded-full border bg-card px-3 py-2 text-left text-sm transition-colors hover:border-brand-orange hover:bg-brand-orange/5"
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}
            {messages.map((m) => (
              <MessageView key={m.id} message={m} />
            ))}
            {status === "submitted" && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <TypingDots /> Ama is typing…
              </div>
            )}
            {error && (
              <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-3 text-sm">
                <p>Sorry, I can&apos;t answer right now. Our team can help on WhatsApp.</p>
                <a href={whatsappLink("Hi Elsasu, I'd like help with a booking.")} target="_blank" rel="noopener noreferrer" className="mt-2 inline-flex items-center gap-1.5 font-semibold text-[#128C4B]">
                  <WhatsAppIcon className="size-4" /> Chat on WhatsApp
                </a>
              </div>
            )}
          </div>

          <form
            className="border-t bg-background p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]"
            onSubmit={(e) => {
              e.preventDefault();
              send(input);
            }}
          >
            <div className="flex items-end gap-2 rounded-2xl border bg-card p-1.5 focus-within:ring-3 focus-within:ring-ring/40">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    send(input);
                  }
                }}
                rows={1}
                maxLength={1000}
                placeholder="e.g. 10 of us to Aburi on Sunday…"
                aria-label="Message"
                className="max-h-32 min-h-10 flex-1 resize-none bg-transparent px-2.5 py-2 text-base outline-none placeholder:text-muted-foreground"
              />
              <Button type="submit" size="icon-lg" variant="accent" className="size-10 rounded-xl" disabled={!input.trim() || busy} aria-label="Send">
                {busy ? <Loader2 className="animate-spin" /> : <ArrowUp />}
              </Button>
            </div>
            <p className="mt-2 text-center text-[11px] text-muted-foreground">
              Automated assistant. Never share your MoMo PIN or card details in chat.
            </p>
          </form>
        </div>
      )}
    </>
  );
}

function Bubble({ role, children }: { role: "user" | "assistant"; children: React.ReactNode }) {
  return (
    <div className={cn("flex", role === "user" ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "max-w-[85%] rounded-2xl px-3.5 py-2.5 text-[15px] leading-relaxed whitespace-pre-wrap",
          role === "user" ? "rounded-br-md bg-brand-ink text-white dark:bg-white dark:text-brand-ink" : "rounded-bl-md bg-muted",
        )}
      >
        {children}
      </div>
    </div>
  );
}

type QuoteOut = { total?: string; deposit?: string; vans?: string[]; lines?: string[]; available?: boolean; notes?: string[]; bookingLink?: string; error?: string };
type BookingOut = { bookingLink?: string; whatsapp?: string; total?: string; deposit?: string; error?: string };
type HandoffOut = { whatsapp?: string; phone?: string };

const toolLabels: Record<string, string> = {
  get_quote: "Calculating your price…",
  check_availability: "Checking which vans are free…",
  list_destinations: "Looking up destinations…",
  search_knowledge_base: "Checking our policies…",
  prepare_booking: "Preparing your booking…",
  handoff_to_human: "Connecting you with the team…",
};

function MessageView({ message }: { message: UIMessage }) {
  return (
    <>
      {message.parts.map((part, i) => {
        if (part.type === "text") {
          return part.text.trim() ? (
            <Bubble key={i} role={message.role === "user" ? "user" : "assistant"}>
              <RichText text={part.text} />
            </Bubble>
          ) : null;
        }
        if (!part.type.startsWith("tool-")) return null;
        const name = part.type.slice(5);
        const p = part as { state?: string; output?: unknown };
        if (p.state !== "output-available") {
          return (
            <div key={i} className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" /> {toolLabels[name] ?? "Working…"}
            </div>
          );
        }
        if (name === "get_quote") return <QuoteCard key={i} q={p.output as QuoteOut} />;
        if (name === "prepare_booking") return <BookingCard key={i} b={p.output as BookingOut} />;
        if (name === "handoff_to_human") return <HandoffCard key={i} h={p.output as HandoffOut} />;
        return null;
      })}
    </>
  );
}

function QuoteCard({ q }: { q: QuoteOut }) {
  if (q.error || !q.total) return null;
  return (
    <div className="overflow-hidden rounded-2xl border bg-card shadow-sm">
      <div className="flex items-end justify-between gap-3 bg-brand-ink px-4 py-3 text-white">
        <div>
          <p className="text-xs text-white/60">{q.vans?.join(" + ")}</p>
          <p className="text-2xl font-bold tabular-nums">{q.total}</p>
        </div>
        <p className="text-right text-xs text-white/70">
          Deposit<br />
          <span className="text-sm font-semibold text-brand-orange-text">{q.deposit?.split(" (")[0]}</span>
        </p>
      </div>
      <ul className="space-y-1 px-4 py-3 text-sm text-muted-foreground">
        {q.lines?.map((l) => <li key={l}>{l}</li>)}
      </ul>
      {q.available === false && <p className="px-4 pb-2 text-sm font-medium text-destructive">Vans may be fully booked then.</p>}
      {q.bookingLink && (
        <div className="px-4 pb-4">
          <Button asChild variant="accent" size="xl" className="h-11 w-full">
            <a href={q.bookingLink}><CalendarCheck data-icon="inline-start" /> Book this trip</a>
          </Button>
        </div>
      )}
    </div>
  );
}

function BookingCard({ b }: { b: BookingOut }) {
  if (b.error || !b.bookingLink) return null;
  return (
    <div className="space-y-2 rounded-2xl border bg-card p-4 shadow-sm">
      <p className="text-sm font-semibold">Ready to book · {b.total}</p>
      <Button asChild variant="accent" size="xl" className="h-11 w-full">
        <a href={b.bookingLink}><CalendarCheck data-icon="inline-start" /> Continue to booking</a>
      </Button>
      {b.whatsapp && (
        <Button asChild variant="outline" size="xl" className="h-11 w-full">
          <a href={b.whatsapp} target="_blank" rel="noopener noreferrer"><WhatsAppIcon className="size-5" /> Book on WhatsApp</a>
        </Button>
      )}
    </div>
  );
}

function HandoffCard({ h }: { h: HandoffOut }) {
  return (
    <div className="flex gap-2">
      {h.whatsapp && (
        <Button asChild size="xl" className="h-11 flex-1 bg-[#25D366] text-white hover:bg-[#1fb857]">
          <a href={h.whatsapp} target="_blank" rel="noopener noreferrer"><WhatsAppIcon className="size-5" /> WhatsApp</a>
        </Button>
      )}
      {h.phone && (
        <Button asChild variant="outline" size="xl" className="h-11 flex-1">
          <a href={`tel:${h.phone}`}><Phone /> Call</a>
        </Button>
      )}
    </div>
  );
}

/** Minimal formatting: **bold** and links. */
function RichText({ text }: { text: string }) {
  const parts = text.split(/(\*\*[^*]+\*\*|https?:\/\/[^\s)]+)/g);
  return (
    <>
      {parts.map((p, i) => {
        if (p.startsWith("**") && p.endsWith("**")) return <strong key={i}>{p.slice(2, -2)}</strong>;
        if (/^https?:\/\//.test(p)) {
          return (
            <a key={i} href={p} className="font-medium underline underline-offset-2" target={p.includes("wa.me") ? "_blank" : undefined} rel="noopener noreferrer">
              {p.includes("/book?") ? "Open booking" : p.includes("wa.me") ? "WhatsApp" : p}
            </a>
          );
        }
        return <span key={i}>{p}</span>;
      })}
    </>
  );
}

function TypingDots() {
  return (
    <span className="flex gap-1" aria-hidden>
      {[0, 150, 300].map((d) => (
        <span key={d} className="size-1.5 animate-bounce rounded-full bg-muted-foreground" style={{ animationDelay: `${d}ms` }} />
      ))}
    </span>
  );
}

export function ChatLauncherButton({ className, children }: { className?: string; children?: React.ReactNode }) {
  return (
    <button type="button" onClick={() => openChat()} className={className}>
      {children ?? <MessageCircle />}
    </button>
  );
}
