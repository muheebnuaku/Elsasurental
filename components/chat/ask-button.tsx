"use client";

import { MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { openChat } from "@/components/chat/chat-widget";

/** Opens the assistant with a question already asked. */
export function AskButton({ message, children, className }: { message: string; children: React.ReactNode; className?: string }) {
  return (
    <Button type="button" variant="outline" size="xl" className={className} onClick={() => openChat(message)}>
      <MessageCircle /> {children}
    </Button>
  );
}
