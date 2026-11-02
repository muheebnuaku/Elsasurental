"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Camera, Loader2, PenLine } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Sets a form field by name inside `root` (inputs, selects, textareas) and briefly highlights it.
 * Returns true when the field exists and got a value.
 */
export function setField(root: HTMLElement | null, name: string, value: string | number | null | undefined) {
  if (!root || value === null || value === undefined || value === "") return false;
  const el = root.querySelector<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>(`[name="${name}"]`);
  if (!el) return false;
  if (el instanceof HTMLSelectElement && ![...el.options].some((o) => o.value === String(value))) return false;
  el.value = String(value);
  el.dispatchEvent(new Event("input", { bubbles: true }));
  el.classList.add("ring-3", "ring-brand-orange/40", "border-brand-orange");
  setTimeout(() => el.classList.remove("ring-3", "ring-brand-orange/40", "border-brand-orange"), 1600);
  return true;
}

/**
 * "Fill with AI": the admin describes something in their own words; `onFill` asks the model and fills
 * the form. Optional `onPhoto` reads an uploaded photo instead. Nothing is saved until they press Save.
 */
export function AiFillBox({
  placeholder,
  onFill,
  onPhoto,
  photoReady,
}: {
  placeholder: string;
  onFill: (text: string) => Promise<string | null>; // returns an error message, or null when filled
  onPhoto?: () => Promise<string | null>;
  photoReady?: boolean;
}) {
  const [text, setText] = useState("");
  const [busy, setBusy] = useState<"text" | "photo" | null>(null);

  async function run(kind: "text" | "photo") {
    setBusy(kind);
    const error = kind === "photo" && onPhoto ? await onPhoto() : await onFill(text);
    setBusy(null);
    if (error) toast.error(error);
    else toast.success("Filled in. Check the details, then save.");
  }

  return (
    <div className="rounded-xl border border-brand-orange/30 bg-brand-orange/5 p-3">
      <p className="text-xs font-semibold text-brand-orange-text">Fill with AI</p>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={2}
        maxLength={1000}
        placeholder={placeholder}
        className="mt-1.5 w-full resize-none rounded-lg border border-input bg-background px-2.5 py-2 text-sm outline-none focus-visible:border-brand-orange focus-visible:ring-3 focus-visible:ring-brand-orange/25"
      />
      <div className="mt-2 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => run("text")}
          disabled={busy !== null || text.trim().length < 3}
          className={cn("inline-flex h-8 items-center gap-1.5 rounded-lg bg-brand-ink px-3 text-xs font-semibold text-white disabled:opacity-50 dark:bg-white dark:text-brand-ink")}
        >
          {busy === "text" ? <Loader2 className="size-3.5 animate-spin" /> : <PenLine className="size-3.5" />} Fill the form
        </button>
        {onPhoto && (
          <button
            type="button"
            onClick={() => run("photo")}
            disabled={busy !== null || !photoReady}
            title={photoReady ? "Read the plate, colour and model from the first photo" : "Add a photo below first"}
            className="inline-flex h-8 items-center gap-1.5 rounded-lg border bg-background px-3 text-xs font-semibold disabled:opacity-50"
          >
            {busy === "photo" ? <Loader2 className="size-3.5 animate-spin" /> : <Camera className="size-3.5" />} Read from photo
          </button>
        )}
      </div>
    </div>
  );
}
