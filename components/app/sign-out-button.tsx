"use client";

import { LogOut } from "lucide-react";
import { signOut } from "@/lib/actions/account";
import { resetIdentity } from "@/lib/analytics/client";

/** Signs out and forgets the analytics identity (shared phones and office PCs). */
export function SignOutButton() {
  return (
    <form action={signOut} onSubmit={() => resetIdentity()}>
      <button type="submit" className="grid size-9 place-items-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground" aria-label="Sign out" title="Sign out">
        <LogOut className="size-4" />
      </button>
    </form>
  );
}
