import { cacheLife, cacheTag } from "next/cache";
import { createPublicClient } from "@/lib/supabase/public";
import { defaultBusiness, type Business } from "@/lib/business-defaults";

export { defaultBusiness, type Business };

/** Cached; Admin → Business calls updateTag("business") on save, so changes show straight away. */
export async function getBusiness(): Promise<Business> {
  "use cache";
  cacheLife("hours");
  cacheTag("business");
  try {
    const { data } = await createPublicClient().from("business_settings").select("phone, whatsapp, email, address").maybeSingle();
    return data ?? defaultBusiness;
  } catch {
    return defaultBusiness;
  }
}
