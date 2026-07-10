"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import styles from "./signal.module.css";
import { MemberPicker, type PickedMember } from "./member-picker";

type Tier = "street" | "block" | "crib" | "pit";
type RoomType = "direct" | "group" | "protected" | "mission" | "prayer" | "witness";

const TYPE_LABELS: Record<RoomType, string> = {
  direct: "Direct — just the two of you",
  group: "Group",
  prayer: "Prayer",
  protected: "Protected",
  mission: "Mission",
  witness: "Witness",
};

// Mirrors canCreateRoom in lib/signal/permissions.ts, kept in sync by hand
// so the form only offers types the viewer's tier can actually create —
// the server still enforces this, this is just so nobody hits a 403 for
// picking an option that was never going to work.
function allowedTypes(tier: Tier): RoomType[] {
  const base: RoomType[] = ["direct"];
  if (tier !== "street") base.push("group", "prayer");
  if (tier === "crib" || tier === "pit") base.push("protected", "mission", "witness");
  return base;
}

function slugify(name: string) {
  return (
    name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "") || "room"
  );
}

export function NewRoomForm({ viewerTier }: { viewerTier: Tier }) {
  const router = useRouter();
  const types = allowedTypes(viewerTier);
  const [name, setName] = useState("");
  const [type, setType] = useState<RoomType>(types[0]);
  const [trustFloor, setTrustFloor] = useState<Tier>("street");
  const [members, setMembers] = useState<PickedMember[]>([]);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    const trimmed = name.trim();
    if (!trimmed || pending) return;
    if (type === "direct" && members.length !== 1) {
      setError("Pick exactly one person for a direct room.");
      return;
    }
    setPending(true);
    setError(null);
    try {
      const res = await fetch("/api/signal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: trimmed,
          slug: `${slugify(trimmed)}-${Date.now()}`,
          type,
          trustFloor,
          memberIds: members.map((m) => m.id),
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setError(data?.error ?? "Couldn't create that room.");
        return;
      }
      router.push(`/signal/rooms/${data.room.id}`);
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  return (
    <div className={styles.composer}>
      <label className={styles.label}>
        Room name
        <input
          className={styles.input}
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="What is this room for?"
        />
      </label>

      <label className={styles.label}>
        Type
        <select className={styles.select} value={type} onChange={(e) => setType(e.target.value as RoomType)}>
          {types.map((t) => (
            <option key={t} value={t}>
              {TYPE_LABELS[t]}
            </option>
          ))}
        </select>
      </label>

      <label className={styles.label}>
        Trust floor — who this room is open to
        <select className={styles.select} value={trustFloor} onChange={(e) => setTrustFloor(e.target.value as Tier)}>
          <option value="street">Street</option>
          <option value="block">Block</option>
          <option value="crib">Crib</option>
          <option value="pit">Pit</option>
        </select>
      </label>

      <label className={styles.label}>
        {type === "direct" ? "Who with" : "Invite members (optional)"}
        <MemberPicker
          selected={members}
          onChange={setMembers}
          max={type === "direct" ? 1 : undefined}
        />
      </label>

      {error ? <p className={styles.error}>{error}</p> : null}

      <div className={styles.controls}>
        <button className={styles.sendBtn} onClick={submit} disabled={pending || !name.trim()}>
          {pending ? "Creating…" : "Create room"}
        </button>
      </div>
    </div>
  );
}
