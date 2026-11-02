"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { toast } from "sonner";
import { Film, ImagePlus, Loader2, X } from "lucide-react";
import { ActionForm, SubmitButton, fieldCls } from "@/components/admin/ui";
import { saveDriver, saveVehicle } from "@/lib/actions/admin-catalog";
import { createClient } from "@/lib/supabase/client";

export type VanTypeOpt = { id: string; name: string };
export type VehicleRow = {
  id: string; type_id: string; name: string; plate: string; status: string; current_mileage: number;
  year: number | null; colour: string | null; features: string[]; photos: string[]; videos: string[];
};

/** Uploads to a public storage bucket (admins only, enforced by storage RLS) and returns public URLs. */
function useUploader(bucket: "vehicle-photos" | "vehicle-videos") {
  const [busy, setBusy] = useState(false);
  async function upload(files: FileList | null): Promise<string[]> {
    if (!files?.length) return [];
    setBusy(true);
    const supabase = createClient();
    const urls: string[] = [];
    for (const f of Array.from(files)) {
      const ext = f.name.split(".").pop()?.toLowerCase() ?? "bin";
      const path = `${crypto.randomUUID()}.${ext}`;
      const { error } = await supabase.storage.from(bucket).upload(path, f, { contentType: f.type, upsert: false });
      if (error) toast.error(`${f.name}: ${error.message}`);
      else urls.push(supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl);
    }
    setBusy(false);
    return urls;
  }
  return { busy, upload };
}

export function VehicleForm({ vehicle, types, onSaved }: { vehicle?: VehicleRow; types: VanTypeOpt[]; onSaved?: () => void }) {
  const [photos, setPhotos] = useState<string[]>(vehicle?.photos ?? []);
  const [videos, setVideos] = useState<string[]>(vehicle?.videos ?? []);
  const photoUp = useUploader("vehicle-photos");
  const videoUp = useUploader("vehicle-videos");
  const photoInput = useRef<HTMLInputElement>(null);
  const videoInput = useRef<HTMLInputElement>(null);

  return (
    <ActionForm action={saveVehicle} onDone={(r) => r.ok && onSaved?.()} className="space-y-2.5">
      {(pending) => (
        <>
          <input type="hidden" name="id" value={vehicle?.id ?? ""} />
          <input type="hidden" name="photos" value={JSON.stringify(photos)} />
          <input type="hidden" name="videos" value={JSON.stringify(videos)} />
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            <label className="text-xs font-medium text-muted-foreground">Name<input name="name" required defaultValue={vehicle?.name} className={`${fieldCls} mt-1`} /></label>
            <label className="text-xs font-medium text-muted-foreground">Plate<input name="plate" required defaultValue={vehicle?.plate} className={`${fieldCls} mt-1 uppercase`} /></label>
            <label className="text-xs font-medium text-muted-foreground">Size
              <select name="type_id" defaultValue={vehicle?.type_id ?? types[0]?.id} className={`${fieldCls} mt-1`}>{types.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}</select>
            </label>
            <label className="text-xs font-medium text-muted-foreground">Status
              <select name="status" defaultValue={vehicle?.status ?? "available"} className={`${fieldCls} mt-1`}>
                <option value="available">Available</option><option value="on_trip">On a trip</option><option value="maintenance">Maintenance</option><option value="inactive">Inactive (hidden)</option>
              </select>
            </label>
            <label className="text-xs font-medium text-muted-foreground">Mileage (km)<input name="current_mileage" type="number" min={0} defaultValue={vehicle?.current_mileage ?? 0} className={`${fieldCls} mt-1`} /></label>
            <label className="text-xs font-medium text-muted-foreground">Year<input name="year" type="number" min={1990} max={2100} defaultValue={vehicle?.year ?? ""} className={`${fieldCls} mt-1`} /></label>
            <label className="text-xs font-medium text-muted-foreground">Colour<input name="colour" defaultValue={vehicle?.colour ?? ""} className={`${fieldCls} mt-1`} /></label>
            <label className="col-span-2 text-xs font-medium text-muted-foreground">Features (comma separated)<input name="features" defaultValue={vehicle?.features.join(", ")} placeholder="Air conditioning, USB charging" className={`${fieldCls} mt-1`} /></label>
          </div>

          <div>
            <p className="text-xs font-medium text-muted-foreground">Photos (first = cover on the website)</p>
            <div className="mt-1 flex flex-wrap gap-2">
              {photos.map((src, i) => (
                <div key={src} className="relative size-16 overflow-hidden rounded-lg border">
                  <Image src={src} alt="" fill sizes="64px" className="object-cover" />
                  {i === 0 && <span className="absolute bottom-0 left-0 bg-brand-orange px-1 text-[9px] font-bold text-brand-ink">COVER</span>}
                  <button type="button" aria-label="Remove photo" onClick={() => setPhotos((p) => p.filter((x) => x !== src))} className="absolute top-0.5 right-0.5 grid size-5 place-items-center rounded-full bg-black/60 text-white"><X className="size-3" /></button>
                </div>
              ))}
              <button type="button" onClick={() => photoInput.current?.click()} className="grid size-16 place-items-center rounded-lg border border-dashed text-muted-foreground hover:bg-muted" aria-label="Add photos">
                {photoUp.busy ? <Loader2 className="size-5 animate-spin" /> : <ImagePlus className="size-5" />}
              </button>
              <input ref={photoInput} type="file" accept="image/jpeg,image/png,image/webp" multiple hidden onChange={async (e) => { const u = await photoUp.upload(e.target.files); setPhotos((p) => [...p, ...u]); e.target.value = ""; }} />
            </div>
          </div>
          <div>
            <p className="text-xs font-medium text-muted-foreground">Videos (short walk-arounds, max 50 MB)</p>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-xs">
              {videos.map((src) => (
                <span key={src} className="inline-flex items-center gap-1 rounded-full border px-2 py-1"><Film className="size-3.5" /> video
                  <button type="button" aria-label="Remove video" onClick={() => setVideos((v) => v.filter((x) => x !== src))}><X className="size-3" /></button>
                </span>
              ))}
              <button type="button" onClick={() => videoInput.current?.click()} className="inline-flex items-center gap-1 rounded-full border border-dashed px-2.5 py-1 hover:bg-muted">
                {videoUp.busy ? <Loader2 className="size-3.5 animate-spin" /> : <Film className="size-3.5" />} Add video
              </button>
              <input ref={videoInput} type="file" accept="video/mp4,video/webm,video/quicktime" hidden onChange={async (e) => { const u = await videoUp.upload(e.target.files); setVideos((v) => [...v, ...u]); e.target.value = ""; }} />
            </div>
          </div>
          <SubmitButton pending={pending || photoUp.busy || videoUp.busy}>{vehicle ? "Save van" : "Add van"}</SubmitButton>
        </>
      )}
    </ActionForm>
  );
}

export type DriverRow = { id: string; full_name: string; phone: string; licence_no: string; licence_expiry: string; is_active: boolean };

export function DriverForm({ driver }: { driver?: DriverRow }) {
  return (
    <ActionForm action={saveDriver} className="space-y-2.5">
      {(pending) => (
        <>
          <input type="hidden" name="id" value={driver?.id ?? ""} />
          <div className="grid grid-cols-2 gap-2">
            <label className="text-xs font-medium text-muted-foreground">Full name<input name="full_name" required defaultValue={driver?.full_name} className={`${fieldCls} mt-1`} /></label>
            <label className="text-xs font-medium text-muted-foreground">Phone (sign-in)
              <input name="phone" defaultValue={driver?.phone} disabled={Boolean(driver)} placeholder="024 123 4567" className={`${fieldCls} mt-1`} />
            </label>
            <label className="text-xs font-medium text-muted-foreground">Licence no.<input name="licence_no" required defaultValue={driver?.licence_no} className={`${fieldCls} mt-1`} /></label>
            <label className="text-xs font-medium text-muted-foreground">Licence expiry<input name="licence_expiry" type="date" required defaultValue={driver?.licence_expiry} className={`${fieldCls} mt-1`} /></label>
          </div>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="is_active" defaultChecked={driver?.is_active ?? true} /> Active (can be assigned trips)</label>
          <SubmitButton pending={pending}>{driver ? "Save driver" : "Add driver"}</SubmitButton>
        </>
      )}
    </ActionForm>
  );
}
