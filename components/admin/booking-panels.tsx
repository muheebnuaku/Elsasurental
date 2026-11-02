"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Copy, Loader2, Play, Flag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { WhatsAppIcon } from "@/components/site/whatsapp-icon";
import { ActionForm, SubmitButton, fieldCls } from "@/components/admin/ui";
import {
  adminCancel, advanceStatus, assignBooking, createPaymentLink, recordManualPayment, saveAdminNotes,
} from "@/lib/actions/admin-bookings";
import { formatMoney } from "@/lib/format";

type Option = { id: string; label: string; busy: boolean };

export function DispatchForm({ refCode, vans, drivers, vehicleId, driverId, locked }: {
  refCode: string; vans: Option[]; drivers: Option[]; vehicleId: string | null; driverId: string | null; locked: boolean;
}) {
  return (
    <ActionForm action={assignBooking} className="space-y-2.5">
      {(pending) => (
        <>
          <input type="hidden" name="ref" value={refCode} />
          <label className="block text-xs font-medium text-muted-foreground">
            Van
            <select name="vehicleId" defaultValue={vehicleId ?? ""} disabled={locked} className={`${fieldCls} mt-1`}>
              <option value="">— not assigned —</option>
              {vans.map((v) => <option key={v.id} value={v.id} disabled={v.busy}>{v.label}{v.busy ? " (busy)" : ""}</option>)}
            </select>
          </label>
          <label className="block text-xs font-medium text-muted-foreground">
            Driver
            <select name="driverId" defaultValue={driverId ?? ""} disabled={locked} className={`${fieldCls} mt-1`}>
              <option value="">— not assigned —</option>
              {drivers.map((d) => <option key={d.id} value={d.id} disabled={d.busy}>{d.label}{d.busy ? " (busy)" : ""}</option>)}
            </select>
          </label>
          {!locked && <SubmitButton pending={pending} className="w-full">Save assignment</SubmitButton>}
        </>
      )}
    </ActionForm>
  );
}

export function StatusButtons({ refCode, status }: { refCode: string; status: string }) {
  const [pending, start] = useTransition();
  const go = (to: "in_progress" | "completed") =>
    start(async () => {
      const r = await advanceStatus(refCode, to);
      if (r.ok) toast.success(r.message);
      else toast.error(r.message);
    });
  if (status === "confirmed" || status === "assigned") {
    return <Button variant="default" size="lg" className="h-9 w-full rounded-lg" disabled={pending} onClick={() => go("in_progress")}>{pending ? <Loader2 className="animate-spin" /> : <Play />} Start trip</Button>;
  }
  if (status === "in_progress") {
    return <Button variant="default" size="lg" className="h-9 w-full rounded-lg" disabled={pending} onClick={() => go("completed")}>{pending ? <Loader2 className="animate-spin" /> : <Flag />} Complete trip</Button>;
  }
  return null;
}

export function PaymentPanel({ refCode, balance, phone, active }: { refCode: string; balance: number; phone: string; active: boolean }) {
  const [link, setLink] = useState<string | null>(null);
  const [pending, start] = useTransition();
  if (!active || balance <= 0) return null;
  return (
    <div className="space-y-3">
      <ActionForm action={recordManualPayment} className="grid grid-cols-[1fr_auto] gap-2">
        {(p) => (
          <>
            <input type="hidden" name="ref" value={refCode} />
            <input name="amount" type="number" step="0.01" min="0.01" max={balance} defaultValue={balance} aria-label="Amount received" className={fieldCls} />
            <select name="method" defaultValue="cash" aria-label="Method" className={fieldCls}>
              <option value="cash">Cash</option>
              <option value="momo">MoMo (direct)</option>
              <option value="bank_transfer">Bank transfer</option>
            </select>
            <SubmitButton pending={p} variant="outline" className="col-span-2">Record payment received</SubmitButton>
          </>
        )}
      </ActionForm>
      <div className="border-t pt-3">
        {link ? (
          <div className="flex gap-2">
            <Button variant="outline" size="lg" className="h-9 flex-1 rounded-lg" onClick={() => navigator.clipboard.writeText(link).then(() => toast.success("Link copied"))}><Copy /> Copy link</Button>
            <Button asChild size="lg" className="h-9 flex-1 rounded-lg bg-[#25D366] text-white hover:bg-[#1fb857]">
              <a href={`https://wa.me/${phone.replace(/\D/g, "")}?text=${encodeURIComponent(`Hi, please pay for your Elsasu booking ${refCode} here: ${link}`)}`} target="_blank" rel="noopener noreferrer"><WhatsAppIcon className="size-4" /> Send</a>
            </Button>
          </div>
        ) : (
          <Button variant="outline" size="lg" className="h-9 w-full rounded-lg" disabled={pending} onClick={() => start(async () => {
            const r = await createPaymentLink(refCode);
            if (r.ok && r.url) setLink(r.url);
            else toast.error(r.message);
          })}>
            {pending && <Loader2 className="animate-spin" />} Create Paystack payment link ({formatMoney(balance)} due)
          </Button>
        )}
      </div>
    </div>
  );
}

export function CancelPanel({ refCode, policyRefund, paid }: { refCode: string; policyRefund: number; paid: number }) {
  const [mode, setMode] = useState<"policy" | "full" | "none">("policy");
  const [reason, setReason] = useState("");
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const refund = mode === "full" ? paid : mode === "none" ? 0 : policyRefund;
  if (!open) return <button type="button" onClick={() => setOpen(true)} className="text-sm font-medium text-destructive hover:underline">Cancel booking…</button>;
  return (
    <div className="space-y-2">
      <select value={mode} onChange={(e) => setMode(e.target.value as typeof mode)} className={fieldCls} aria-label="Refund">
        <option value="policy">Refund per policy ({formatMoney(policyRefund)})</option>
        <option value="full">Full refund ({formatMoney(paid)}) — Elsasu cancelled</option>
        <option value="none">No refund</option>
      </select>
      <input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Reason (shown in records)" className={fieldCls} />
      <div className="flex gap-2">
        <Button variant="destructive" size="lg" className="h-9 flex-1 rounded-lg" disabled={pending} onClick={() => start(async () => {
          const r = await adminCancel(refCode, mode, reason);
          if (r.ok) toast.success(r.message);
          else toast.error(r.message);
          if (r.ok) setOpen(false);
        })}>
          {pending && <Loader2 className="animate-spin" />} Cancel{refund > 0 ? ` & refund ${formatMoney(refund)}` : ""}
        </Button>
        <Button variant="outline" size="lg" className="h-9 rounded-lg" onClick={() => setOpen(false)}>Keep</Button>
      </div>
    </div>
  );
}

export function NotesForm({ refCode, notes }: { refCode: string; notes: string }) {
  const [value, setValue] = useState(notes);
  const [pending, start] = useTransition();
  return (
    <div className="space-y-2">
      <textarea value={value} onChange={(e) => setValue(e.target.value)} rows={3} placeholder="Private notes for the team" className={`${fieldCls} h-auto py-2`} />
      <Button variant="outline" size="lg" className="h-9 rounded-lg" disabled={pending || value === notes} onClick={() => start(async () => {
        const r = await saveAdminNotes(refCode, value);
        if (r.ok) toast.success(r.message);
        else toast.error(r.message);
      })}>
        {pending && <Loader2 className="animate-spin" />} Save notes
      </Button>
    </div>
  );
}

