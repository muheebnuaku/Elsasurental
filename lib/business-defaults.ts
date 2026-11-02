import { site } from "@/lib/site";

/** Contact details the owner edits in Admin → Business. */
export type Business = { phone: string; whatsapp: string; email: string; address: string };

/** Used until the database answers (and if it can't), so the site always shows a way to reach us. */
export const defaultBusiness: Business = {
  phone: site.phone,
  whatsapp: site.whatsapp,
  email: site.email,
  address: site.address,
};
