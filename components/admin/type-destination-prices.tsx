"use client";

import { ActionForm, SubmitButton, fieldCls } from "@/components/admin/ui";
import { saveTypeDestinationPrices } from "@/lib/actions/admin-catalog";

/** Fixed same-day-return prices to each destination for ONE vehicle type. Empty = not offered there. */
export function TypeDestinationPrices({ typeId, rows }: { typeId: string; rows: { id: string; name: string; region: string; price: number | null }[] }) {
  return (
    <ActionForm action={saveTypeDestinationPrices} className="space-y-3">
      {(pending) => (
        <>
          <input type="hidden" name="vehicle_type_id" value={typeId} />
          <div className="grid gap-x-4 gap-y-2 sm:grid-cols-2">
            {rows.map((d) => (
              <label key={d.id} className="flex items-center justify-between gap-3 border-b py-1.5 text-sm">
                <span className="min-w-0">
                  <span className="font-medium">{d.name}</span>
                  <span className="ml-1.5 text-xs text-muted-foreground">{d.region}</span>
                </span>
                <span className="flex shrink-0 items-center gap-1.5 text-xs text-muted-foreground">
                  GH₵
                  <input name={`dest:${d.id}`} type="number" min={0} step="0.01" defaultValue={d.price ?? ""} placeholder="—" className={`${fieldCls} w-24 text-right tabular-nums`} />
                </span>
              </label>
            ))}
          </div>
          <SubmitButton pending={pending}>Save destination prices</SubmitButton>
        </>
      )}
    </ActionForm>
  );
}
