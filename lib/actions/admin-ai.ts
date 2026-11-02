"use server";

import { generateText, Output, type UserContent } from "ai";
import { z } from "zod";
import { requireAdmin } from "@/lib/admin/guard";
import { aiConfigured, chatModel, chatProviderOptions } from "@/lib/ai/provider";
import { reportError } from "@/lib/observability";

// AI that FILLS admin forms from a description or a photo. It never saves: the admin checks the
// fields and presses Save, which runs the normal validated action.

export type AiFill<T> = { ok: true; data: T } | { ok: false; message: string };

const offline = { ok: false as const, message: "AI isn't set up yet (OPENAI_API_KEY)." };
const failed = { ok: false as const, message: "Couldn't read that. Try adding a bit more detail." };

// ── One vehicle (plate, colour…) ─────────────────────────────────────
const vehicleFill = z.object({
  name: z.string().nullable().describe('Short display name, e.g. "Toyota Highlander" or "Black Highlander 2022"'),
  plate: z.string().nullable().describe("Ghana number plate in capitals, e.g. GR 4521-22; null if not given or not readable"),
  typeId: z.string().nullable().describe("id of the matching vehicle type from the list, or null"),
  year: z.number().int().nullable(),
  colour: z.string().nullable(),
  mileageKm: z.number().int().nullable(),
  features: z.array(z.string()).describe("Short features a passenger would care about, e.g. Air conditioning, Leather seats, USB charging"),
});
export type VehicleFill = z.infer<typeof vehicleFill>;

/** Only photos in our own public storage bucket may be sent to the model (no arbitrary URLs). */
function ownPhoto(url: string | undefined) {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  return url && base && url.startsWith(`${base}/storage/v1/object/public/vehicle-photos/`) ? url : undefined;
}

export async function aiFillVehicle(input: {
  text: string;
  photoUrl?: string;
  types: { id: string; name: string; seats: number; category: string }[];
}): Promise<AiFill<VehicleFill>> {
  await requireAdmin();
  if (!aiConfigured()) return offline;
  const text = input.text.trim().slice(0, 1000);
  const photo = ownPhoto(input.photoUrl);
  if (!text && !photo) return { ok: false, message: "Describe the vehicle, or add a photo first." };

  try {
    // Send the photo's bytes (from our own storage) rather than its URL.
    let image: { data: Uint8Array; type: string } | null = null;
    if (photo) {
      const res = await fetch(photo, { signal: AbortSignal.timeout(15_000) });
      if (!res.ok) return { ok: false, message: "Couldn't open that photo. Try uploading it again." };
      image = { data: new Uint8Array(await res.arrayBuffer()), type: res.headers.get("content-type") ?? "image/jpeg" };
    }
    const content: UserContent = [
      { type: "text", text: text || "Fill in what you can see in this photo of one of our vehicles." },
      ...(image ? [{ type: "image" as const, image: image.data, mediaType: image.type }] : []),
    ];
    const { output } = await generateText({
      model: chatModel(),
      providerOptions: chatProviderOptions,
      output: Output.object({ schema: vehicleFill }),
      instructions: `You fill in a fleet form for Elsasu Rentals (Ghana), a chauffeur-driven van and SUV hire company.
Vehicle types (id: name, seats, category): ${input.types.map((t) => `${t.id}: ${t.name}, ${t.seats} seats, ${t.category}`).join("; ")}.
Pick typeId from that list by matching the vehicle (e.g. a Toyota Highlander or Acura MDX is a 7-seat SUV; a Hiace with 14 seats is the 14-seater).
From a photo: read the number plate only if clearly legible, give the colour, and the make/model if recognisable. Never invent a plate, year or mileage: use null when unsure.`,
      messages: [{ role: "user", content }],
    });
    return { ok: true, data: output };
  } catch (e) {
    reportError("ai.fill-vehicle", e);
    return failed;
  }
}

// ── A vehicle type (what the website sells) ──────────────────────────
const typeFill = z.object({
  name: z.string().describe('Name shown on the website, e.g. "Toyota Land Cruiser" or "7-Seater SUV"'),
  category: z.enum(["van", "suv"]),
  seats: z.number().int().min(1).max(60).describe("Passenger seats, not counting the driver"),
  luggageCapacity: z.number().int().min(0).max(60).describe("Large suitcases it holds"),
  description: z.string().describe("1–2 warm, specific sentences for the website (max 300 characters). Always mention it comes with a professional driver."),
});
export type VehicleTypeFill = z.infer<typeof typeFill>;

export async function aiFillVehicleType(text: string): Promise<AiFill<VehicleTypeFill>> {
  await requireAdmin();
  if (!aiConfigured()) return offline;
  const brief = text.trim().slice(0, 600);
  if (brief.length < 3) return { ok: false, message: "Describe the vehicle first." };
  try {
    const { output } = await generateText({
      model: chatModel(),
      providerOptions: chatProviderOptions,
      output: Output.object({ schema: typeFill }),
      instructions: `You set up a vehicle type for Elsasu Rentals, a Ghanaian company hiring minivans and SUVs, always with a professional driver (never self-drive). Customers include visitors from abroad, families, churches and companies.
Use typical figures for the model when the admin doesn't say (e.g. Toyota Land Cruiser: 7 seats, 4 large bags). Category "van" for minivans/buses, "suv" for SUVs and executive cars.
Write the description in plain, warm British/Ghanaian English, no hype words, no emoji.`,
      prompt: brief,
    });
    return { ok: true, data: output };
  } catch (e) {
    reportError("ai.fill-vehicle-type", e);
    return failed;
  }
}
