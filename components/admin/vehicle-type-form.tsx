"use client";

import { useRef } from "react";
import { useRouter } from "next/navigation";
import { aiFillVehicleType } from "@/lib/actions/admin-ai";
import { AiFillBox, setField } from "@/components/admin/ai-fill";
import { ActionForm, SubmitButton, fieldCls } from "@/components/admin/ui";
import { saveVehicleType } from "@/lib/actions/admin-catalog";

export type VehicleTypeRow = {
  id: string; name: string; category: string; seats: number; luggage_capacity: number;
  description: string | null; sort_order: number; active: boolean;
};

const label = "text-xs font-medium text-muted-foreground";

/** Edit a vehicle type, or create one (its prices start as a copy of `copyOptions`' choice). */
export function VehicleTypeForm({ type, copyOptions }: { type?: VehicleTypeRow; copyOptions?: { id: string; name: string }[] }) {
  const router = useRouter();
  const fieldsRef = useRef<HTMLDivElement>(null);

  async function fill(text: string) {
    // An existing type: give the model its real details and only take the new description back,
    // so typical figures never overwrite the real seats or bags.
    const brief = type
      ? `Vehicle type: ${type.name}, ${type.seats} seats, ${type.luggage_capacity} bags, ${type.category}. Current description: ${type.description ?? "none"}. Request: ${text}`
      : text;
    const r = await aiFillVehicleType(brief);
    if (!r.ok) return r.message;
    const root = fieldsRef.current;
    if (!type) {
      setField(root, "name", r.data.name);
      setField(root, "category", r.data.category);
      setField(root, "seats", r.data.seats);
      setField(root, "luggage_capacity", r.data.luggageCapacity);
    }
    setField(root, "description", r.data.description);
    return null;
  }

  return (
    <ActionForm
      action={saveVehicleType}
      onDone={(r) => { if (r.ok && !type && r.id) router.push(`/admin/vehicles/${r.id}`); }}
      className="space-y-3"
    >
      {(pending) => (
        <>
          <input type="hidden" name="id" value={type?.id ?? ""} />
          <AiFillBox
            placeholder={type ? "Tell the AI what to change, e.g. write a warmer description for weddings and VIP airport pick-ups" : "Describe it, e.g. Toyota Land Cruiser V8 for VIP airport runs and long trips up north"}
            onFill={fill}
          />
          <div ref={fieldsRef} className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
            <label className={`${label} col-span-2`}>Name on the website
              <input name="name" required defaultValue={type?.name} placeholder="e.g. Toyota Land Cruiser" className={`${fieldCls} mt-1`} />
            </label>
            <label className={label}>Category
              <select name="category" defaultValue={type?.category ?? "suv"} className={`${fieldCls} mt-1`}>
                <option value="van">Van (suggested by group size)</option>
                <option value="suv">SUV (customer chooses it)</option>
              </select>
            </label>
            <label className={label}>Order on the website
              <input name="sort_order" type="number" min={0} max={999} defaultValue={type?.sort_order ?? 10} className={`${fieldCls} mt-1`} />
            </label>
            <label className={label}>Passenger seats
              <input name="seats" type="number" min={1} max={60} required defaultValue={type?.seats ?? 7} className={`${fieldCls} mt-1`} />
            </label>
            <label className={label}>Large bags
              <input name="luggage_capacity" type="number" min={0} max={60} required defaultValue={type?.luggage_capacity ?? 4} className={`${fieldCls} mt-1`} />
            </label>
            {!type && copyOptions && copyOptions.length > 0 && (
              <label className={`${label} col-span-2`}>Start prices from
                <select name="copy_from" defaultValue={copyOptions[copyOptions.length - 1]?.id} className={`${fieldCls} mt-1`}>
                  {copyOptions.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
                </select>
              </label>
            )}
            <label className={`${label} col-span-2 sm:col-span-4`}>Description
              <textarea name="description" rows={2} maxLength={400} defaultValue={type?.description ?? ""} placeholder="Who it's for and what makes it special." className={`${fieldCls} mt-1 h-auto py-2`} />
            </label>
          </div>
          <div className="flex flex-wrap items-center gap-4">
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="active" defaultChecked={type?.active ?? true} /> Show on the website</label>
            <SubmitButton pending={pending}>{type ? "Save changes" : "Add vehicle type"}</SubmitButton>
          </div>
        </>
      )}
    </ActionForm>
  );
}
