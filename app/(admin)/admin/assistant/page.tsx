import type { Metadata } from "next";
import { AdminAssistant } from "@/components/admin/admin-assistant";

export const metadata: Metadata = { title: "Assistant · Admin", robots: { index: false } };

export default function AdminAssistantPage() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Assistant</h1>
        <p className="text-sm text-muted-foreground">Quick answers from your live data, and drafts for customer messages.</p>
      </div>
      <AdminAssistant />
    </div>
  );
}
