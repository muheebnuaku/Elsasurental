import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { roleHome, safeNext } from "@/lib/auth";

// Google sign-in lands here with ?code=…; swap it for a session cookie, then send the person on.
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get("code");
  const next = safeNext(searchParams.get("next"));

  if (code) {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error && data.user) {
      const { data: profile } = await supabase.from("profiles").select("role").eq("id", data.user.id).maybeSingle();
      return NextResponse.redirect(new URL(next ?? roleHome(profile?.role), origin));
    }
  }

  const back = new URL("/login", origin);
  back.searchParams.set("error", "google");
  if (next) back.searchParams.set("next", next);
  return NextResponse.redirect(back);
}
