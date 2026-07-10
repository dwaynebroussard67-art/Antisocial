"use client";
import { useRouter } from "next/navigation";
import { MessageList } from "./message-list";
import { Composer } from "./composer";

type Message = Parameters<typeof MessageList>[0]["messages"][number];

/**
 * Client half of the room page: owns send + mark via the API routes and
 * refreshes the server-rendered message list on success. Replaces the
 * reconstruction's inline "use server" action passed into a client
 * component — this fetch-and-refresh shape matches the rest of the app
 * (war-game, trivia-widget) and keeps one code path for errors like the
 * canSendInRoom denials, which the composer surfaces to the sender.
 */
export function RoomView({ roomId, messages }: { roomId: string; messages: Message[] }) {
  const router = useRouter();

  async function handleSend(payload: { kind: string; body: string; visibility: string; witnessMode: boolean }) {
    const res = await fetch(`/api/signal/${roomId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => null);
      return data?.error ?? "Couldn't send right now.";
    }
    router.refresh();
    return null;
  }

  async function handleMark(messageId: string, mark: string) {
    await fetch(`/api/signal/${roomId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ markMessageId: messageId, mark }),
    });
    router.refresh();
  }

  return (
    <>
      <MessageList messages={messages} onMark={handleMark} />
      <Composer onSend={handleSend} />
    </>
  );
}
