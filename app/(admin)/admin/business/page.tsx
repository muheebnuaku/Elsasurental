import type { Metadata } from "next";
import { connection } from "next/server";
import { Panel } from "@/components/admin/ui";
import { BusinessForm } from "@/components/admin/business-form";
import { createClient } from "@/lib/supabase/server";
import { defaultBusiness } from "@/lib/business-defaults";

export const metadata: Metadata = { title: "Business · Admin", robots: { index: false } };

export default async function BusinessAdminPage() {
  await connection();
  const supabase = await createClient();
  const { data } = await supabase.from("business_settings").select("phone, whatsapp, email, address").maybeSingle();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Business details</h1>
        <p className="text-sm text-muted-foreground">How customers reach you. Changes show on the website, receipts, texts and the booking assistant straight away.</p>
      </div>
      <Panel title="Contact">
        <BusinessForm business={data ?? defaultBusiness} />
      </Panel>
    </div>
  );
}
