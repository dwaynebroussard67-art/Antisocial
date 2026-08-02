"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type Site = "antisocial" | "misfit";

interface Member {
  id: number;
  handle: string;
  displayName: string;
  tier: string;
  banned: boolean;
}

interface ChapelMessage {
  id: number;
  site: Site;
  memberId: number | null;
  threadId: number | null;
  body: string;
  isSystem: boolean;
  hidden: boolean;
  createdAt: string;
  handle: string | null;
  displayName: string | null;
}

const SITE_LABEL: Record<Site, string> = {
  antisocial: "Antisocial — The Chapel",
  misfit: "Misfit Ministries — Sacred Ground",
};

export default function ChapelClient() {
  const [site, setSite] = useState<Site>("antisocial");
  const [members, setMembers] = useState<Member[]>([]);
  const [asMemberId, setAsMemberId] = useState<number | "">("");
  const [messages, setMessages] = useState<ChapelMessage[]>([]);
  const [text, setText] = useState("");
  const [lastOutcome, setLastOutcome] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/api/chapel/members")
      .then((r) => r.json())
      .then((d) => {
        setMembers(d.members ?? []);
        if (d.members?.length) setAsMemberId(d.members[1]?.id ?? d.members[0].id);
      });
  }, []);

  async function loadMessages() {
    const res = await fetch(`/api/chapel/messages?site=${site}`);
    const data = await res.json();
    setMessages(data.messages ?? []);
  }

  useEffect(() => {
    loadMessages();
    const interval = setInterval(loadMessages, 3000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [site]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  const currentMember = useMemo(
    () => members.find((m) => m.id === asMemberId) ?? null,
    [members, asMemberId],
  );

  async function send() {
    if (!text.trim()) return;
    setError(null);
    const res = await fetch("/api/chapel/messages", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ site, memberId: asMemberId || null, text }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "Something went wrong.");
      return;
    }
    setText("");
    setLastOutcome(
      data.nura ? `stage=${data.nura.stage} flag=${data.nura.flag} action=${data.nura.action}${data.nura.quiet ? " (quiet mode)" : ""}` : null,
    );
    loadMessages();
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-3xl flex-col gap-4 px-6 py-8">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">{SITE_LABEL[site]}</h1>
        <div className="flex gap-2 rounded-lg border border-neutral-800 p-1 text-sm">
          <button
            className={`rounded-md px-3 py-1 ${site === "antisocial" ? "bg-orange-700 text-white" : "text-neutral-400"}`}
            onClick={() => setSite("antisocial")}
          >
            Antisocial
          </button>
          <button
            className={`rounded-md px-3 py-1 ${site === "misfit" ? "bg-orange-700 text-white" : "text-neutral-400"}`}
            onClick={() => setSite("misfit")}
          >
            Misfit Ministries
          </button>
        </div>
      </div>

      <p className="text-xs text-neutral-500">
        {site === "antisocial"
          ? "The good nun: loose, warm, playful. Kids get to be kids."
          : "The iron fist: sacred ground. Reverence is the baseline."}
      </p>

      <div className="flex-1 space-y-2 overflow-y-auto rounded-xl border border-neutral-800 bg-neutral-900/60 p-4">
        {messages.length === 0 && (
          <p className="text-sm text-neutral-500">No messages yet. Say something below.</p>
        )}
        {messages.map((m) => (
          <div key={m.id} className={`rounded-lg px-3 py-2 text-sm ${m.isSystem ? "bg-orange-950/40 border border-orange-900/50" : "bg-neutral-800/60"}`}>
            <div className="flex items-center gap-2 text-xs text-neutral-400">
              <span className="font-semibold text-neutral-200">
                {m.isSystem ? "Nura" : m.displayName ?? "unknown"}
              </span>
              {m.isSystem && <span className="rounded bg-orange-800/50 px-1.5 py-0.5 text-[10px] text-orange-200">guardian</span>}
              <span>{new Date(m.createdAt).toLocaleTimeString()}</span>
            </div>
            <p className="mt-1 text-neutral-100">{m.body}</p>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      <div className="space-y-2 rounded-xl border border-neutral-800 bg-neutral-900 p-3">
        <div className="flex items-center gap-2 text-xs text-neutral-400">
          <span>Posting as:</span>
          <select
            className="rounded-md border border-neutral-700 bg-neutral-950 px-2 py-1 text-neutral-100"
            value={asMemberId}
            onChange={(e) => setAsMemberId(Number(e.target.value))}
          >
            {members.map((m) => (
              <option key={m.id} value={m.id} disabled={m.banned}>
                {m.displayName} (@{m.handle}) {m.banned ? "— access revoked" : ""}
              </option>
            ))}
          </select>
          {currentMember?.banned && (
            <span className="text-red-400">This member&apos;s access has been revoked.</span>
          )}
        </div>
        <div className="flex gap-2">
          <input
            className="flex-1 rounded-md border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm outline-none focus:border-orange-600"
            placeholder={`Say something to ${SITE_LABEL[site]}... try "@handle" to target someone`}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && send()}
          />
          <button
            onClick={send}
            className="rounded-md bg-orange-700 px-4 py-2 text-sm font-medium text-white hover:bg-orange-600"
          >
            Send
          </button>
        </div>
        {error && <p className="text-xs text-red-400">{error}</p>}
        {lastOutcome && <p className="text-xs text-neutral-500">Nura: {lastOutcome}</p>}
      </div>
    </div>
  );
}
