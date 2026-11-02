"use client";

import { ActionForm, SubmitButton, fieldCls } from "@/components/admin/ui";
import { saveBusiness } from "@/lib/actions/admin-business";
import { formatGhanaPhone } from "@/lib/phone";
import type { Business } from "@/lib/business-defaults";

const fields: { name: keyof Business; label: string; hint: string; type: string; autoComplete: string }[] = [
  { name: "phone", label: "Phone (calls)", hint: "Shown on the website, receipts and texts.", type: "tel", autoComplete: "tel" },
  { name: "whatsapp", label: "WhatsApp number", hint: "Every WhatsApp button opens a chat with this number.", type: "tel", autoComplete: "tel" },
  { name: "email", label: "Email", hint: "For customer questions and receipts.", type: "email", autoComplete: "email" },
  { name: "address", label: "Address", hint: "Shown in the footer, receipts and terms.", type: "text", autoComplete: "street-address" },
];

export function BusinessForm({ business }: { business: Business }) {
  return (
    <ActionForm action={saveBusiness} className="grid gap-4 sm:grid-cols-2">
      {(pending) => (
        <>
          {fields.map((f) => (
            <label key={f.name} className="space-y-1">
              <span className="text-sm font-medium">{f.label}</span>
              <input
                name={f.name}
                type={f.type}
                autoComplete={f.autoComplete}
                required
                defaultValue={f.type === "tel" ? formatGhanaPhone(business[f.name]) : business[f.name]}
                className={`${fieldCls} h-10`}
              />
              <span className="block text-xs text-muted-foreground">{f.hint}</span>
            </label>
          ))}
          <div className="sm:col-span-2">
            <SubmitButton pending={pending}>Save details</SubmitButton>
          </div>
        </>
      )}
    </ActionForm>
  );
}
