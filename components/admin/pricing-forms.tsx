"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { ActionForm, SubmitButton, fieldCls } from "@/components/admin/ui";
import { createPromo, saveAddon, saveDestination, savePricingRule, togglePromo } from "@/lib/actions/admin-catalog";
import { cn } from "@/lib/utils";

const num = `${fieldCls} tabular-nums`;
const Cell = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <label className="text-[11px] font-medium text-muted-foreground">{label}<div className="mt-0.5">{children}</div></label>
);

export type RuleRow = { id: string; trip: string; base_price: number; included_km: number; included_hours: number; extra_km_rate: number; extra_hour_rate: number; night_surcharge_pct: number };

export function PricingRuleForm({ rule }: { rule: RuleRow }) {
  return (
    <ActionForm action={savePricingRule} className="grid grid-cols-3 items-end gap-2 border-b py-2.5 last:border-b-0 sm:grid-cols-[1.3fr_repeat(6,1fr)_auto]">
      {(pending) => (
        <>
          <input type="hidden" name="id" value={rule.id} />
          <p className="col-span-3 text-sm font-semibold sm:col-span-1 sm:self-center">{rule.trip}</p>
          <Cell label="Base GH₵"><input name="base_price" type="number" step="0.01" min={0} defaultValue={rule.base_price} className={num} /></Cell>
          <Cell label="Incl. km"><input name="included_km" type="number" min={0} defaultValue={rule.included_km} className={num} /></Cell>
          <Cell label="Incl. hours"><input name="included_hours" type="number" step="0.5" min={0} defaultValue={rule.included_hours} className={num} /></Cell>
          <Cell label="Extra /km"><input name="extra_km_rate" type="number" step="0.01" min={0} defaultValue={rule.extra_km_rate} className={num} /></Cell>
          <Cell label="Extra /hour"><input name="extra_hour_rate" type="number" step="0.01" min={0} defaultValue={rule.extra_hour_rate} className={num} /></Cell>
          <Cell label="Night %"><input name="night_surcharge_pct" type="number" step="1" min={0} max={100} defaultValue={rule.night_surcharge_pct} className={num} /></Cell>
          <SubmitButton pending={pending} variant="outline" className="col-span-3 sm:col-span-1">Save</SubmitButton>
        </>
      )}
    </ActionForm>
  );
}

export type DestRow = { id: string; name: string; region: string; price_8_seater: number; price_14_seater: number; est_hours: number; distance_km: number | null; image_url: string | null; active: boolean };

export function DestinationForm({ dest }: { dest?: DestRow }) {
  return (
    <ActionForm action={saveDestination} className="grid grid-cols-2 items-end gap-2 border-b py-2.5 last:border-b-0 sm:grid-cols-4 lg:grid-cols-[1.2fr_1fr_repeat(4,0.8fr)_1.6fr_auto_auto]">
      {(pending) => (
        <>
          <input type="hidden" name="id" value={dest?.id ?? ""} />
          <Cell label="Name"><input name="name" required defaultValue={dest?.name} className={fieldCls} /></Cell>
          <Cell label="Region"><input name="region" required defaultValue={dest?.region} className={fieldCls} /></Cell>
          <Cell label="8-seater GH₵"><input name="price_8_seater" type="number" step="0.01" min={0} required defaultValue={dest?.price_8_seater} className={num} /></Cell>
          <Cell label="14-seater GH₵"><input name="price_14_seater" type="number" step="0.01" min={0} required defaultValue={dest?.price_14_seater} className={num} /></Cell>
          <Cell label="Hours each way"><input name="est_hours" type="number" step="0.25" min={0.25} required defaultValue={dest?.est_hours} className={num} /></Cell>
          <Cell label="Km"><input name="distance_km" type="number" min={0} defaultValue={dest?.distance_km ?? ""} className={num} /></Cell>
          <Cell label="Photo URL"><input name="image_url" type="url" defaultValue={dest?.image_url ?? ""} placeholder="https://…" className={fieldCls} /></Cell>
          <label className="flex h-9 items-center gap-1.5 text-sm"><input type="checkbox" name="active" defaultChecked={dest?.active ?? true} /> On</label>
          <SubmitButton pending={pending} variant="outline">{dest ? "Save" : "Add"}</SubmitButton>
        </>
      )}
    </ActionForm>
  );
}

export type AddonRow = { id: string; name: string; price: number; unit: string; active: boolean };

export function AddonForm({ addon }: { addon: AddonRow }) {
  return (
    <ActionForm action={saveAddon} className="grid grid-cols-[1fr_7rem_auto_auto] items-end gap-2 border-b py-2.5 last:border-b-0">
      {(pending) => (
        <>
          <input type="hidden" name="id" value={addon.id} />
          <Cell label={`Name (${addon.unit.replace("per_", "per ")})`}><input name="name" required defaultValue={addon.name} className={fieldCls} /></Cell>
          <Cell label="Price GH₵"><input name="price" type="number" step="0.01" min={0} defaultValue={addon.price} className={num} /></Cell>
          <label className="flex h-9 items-center gap-1.5 text-sm"><input type="checkbox" name="active" defaultChecked={addon.active} /> On</label>
          <SubmitButton pending={pending} variant="outline">Save</SubmitButton>
        </>
      )}
    </ActionForm>
  );
}

export type PromoRow = { id: string; code: string; type: string; value: number; used_count: number; max_uses: number | null; valid_to: string | null; active: boolean };

export function PromoList({ promos }: { promos: PromoRow[] }) {
  const [pending, start] = useTransition();
  return (
    <div className="space-y-3">
      {promos.length > 0 && (
        <ul className="divide-y rounded-xl border text-sm">
          {promos.map((p) => (
            <li key={p.id} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2">
              <span>
                <span className="font-mono font-semibold">{p.code}</span>{" "}
                <span className="text-muted-foreground">
                  {p.type === "percent" ? `${p.value}% off` : `GH₵${p.value} off`} · used {p.used_count}{p.max_uses ? `/${p.max_uses}` : ""}{p.valid_to ? ` · until ${p.valid_to.slice(0, 10)}` : ""}
                </span>
              </span>
              <button
                type="button"
                disabled={pending}
                onClick={() => start(async () => {
                  const r = await togglePromo(p.id, !p.active);
                  if (r.ok) toast.success(r.message);
                  else toast.error(r.message);
                })}
                className={cn("rounded-full px-2.5 py-1 text-xs font-medium", p.active ? "bg-success/15 text-success" : "bg-muted text-muted-foreground")}
              >
                {p.active ? "On" : "Off"}
              </button>
            </li>
          ))}
        </ul>
      )}
      <ActionForm action={createPromo} className="grid grid-cols-2 items-end gap-2 sm:grid-cols-[1.2fr_1fr_0.8fr_0.8fr_1fr_auto]">
        {(pendingForm) => (
          <>
            <Cell label="New code"><input name="code" required placeholder="EASTER10" className={`${fieldCls} uppercase`} /></Cell>
            <Cell label="Type"><select name="type" className={fieldCls}><option value="percent">% off</option><option value="fixed">GH₵ off</option></select></Cell>
            <Cell label="Value"><input name="value" type="number" step="0.01" min={0.01} required className={num} /></Cell>
            <Cell label="Max uses"><input name="max_uses" type="number" min={1} className={num} /></Cell>
            <Cell label="Valid until"><input name="valid_to" type="date" className={fieldCls} /></Cell>
            <SubmitButton pending={pendingForm} variant="outline">Create</SubmitButton>
          </>
        )}
      </ActionForm>
    </div>
  );
}
