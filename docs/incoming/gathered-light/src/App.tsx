import { useState } from "react";
import StreetGatheredLight from "@/game/skins/StreetGatheredLight";
import BlockGatheredLight from "@/game/skins/BlockGatheredLight";
import CribGatheredLight from "@/game/skins/CribGatheredLight";
import { isOnlineConfigured } from "@/lib/supabaseClient";

type SkinId = "street" | "block" | "crib";

const SKINS: { id: SkinId; label: string; blurb: string }[] = [
  { id: "street", label: "The Street", blurb: "An open path, quiet and plain." },
  { id: "block", label: "The Block", blurb: "Close quarters, a dying fire's glow." },
  { id: "crib", label: "The Crib", blurb: "A painted forest, mythic and soft." },
];

export default function App() {
  const [skin, setSkin] = useState<SkinId>("street");
  const [entered, setEntered] = useState(false);

  return (
    <div
      className="min-h-screen w-full"
      style={{
        background:
          "radial-gradient(circle at 50% 0%, #1c1a17 0%, #0a0a0a 60%, #0a0a0a 100%)",
        color: "#F2E8D5",
      }}
    >
      <div className="mx-auto flex max-w-3xl flex-col items-center gap-8 px-4 py-10 sm:py-16">
        <header className="flex flex-col items-center gap-4 text-center">
          <img
            src="/assets/games/gathered_light/title-card.png"
            alt="The Gathered Light"
            className="w-full max-w-md rounded-2xl border shadow-2xl"
            style={{ borderColor: "#2a2622" }}
          />
          <p className="max-w-lg text-sm leading-relaxed" style={{ color: "#c9c2b6" }}>
            A small, quiet arcade game for two. No scores, no losing — just two flames, one
            shared path, and the practice of staying close enough that the light between you
            keeps growing.
          </p>
          {!isOnlineConfigured && (
            <p
              className="rounded-full border px-4 py-1 text-xs"
              style={{ borderColor: "#3a352d", color: "#C9A227" }}
            >
              Two-device play needs a Supabase connection &mdash; practice solo works right now.
            </p>
          )}
        </header>

        <nav className="flex w-full flex-wrap justify-center gap-2">
          {SKINS.map((s) => (
            <button
              key={s.id}
              onClick={() => {
                setSkin(s.id);
                setEntered(true);
              }}
              className="rounded-full border px-4 py-2 text-sm transition"
              style={{
                borderColor: skin === s.id && entered ? "#D4712A" : "#3a352d",
                background: skin === s.id && entered ? "#D4712A22" : "transparent",
                color: skin === s.id && entered ? "#D4712A" : "#F2E8D5",
              }}
            >
              {s.label}
            </button>
          ))}
        </nav>

        {!entered && (
          <div className="grid w-full grid-cols-1 gap-3 sm:grid-cols-3">
            {SKINS.map((s) => (
              <button
                key={s.id}
                onClick={() => {
                  setSkin(s.id);
                  setEntered(true);
                }}
                className="rounded-2xl border p-4 text-left transition hover:border-[#C9A227]"
                style={{ borderColor: "#2a2622", background: "#141210" }}
              >
                <p className="font-serif text-lg" style={{ color: "#F2E8D5" }}>
                  {s.label}
                </p>
                <p className="mt-1 text-xs" style={{ color: "#a79c8b" }}>
                  {s.blurb}
                </p>
              </button>
            ))}
          </div>
        )}

        {entered && (
          <div className="w-full">
            {skin === "street" && <StreetGatheredLight onExitToArcade={() => setEntered(false)} />}
            {skin === "block" && <BlockGatheredLight onExitToArcade={() => setEntered(false)} />}
            {skin === "crib" && <CribGatheredLight onExitToArcade={() => setEntered(false)} />}
          </div>
        )}

        <footer className="pt-4 text-center text-[11px] leading-relaxed opacity-50">
          <p>Stay close. Keep the light. This is what belonging looks like.</p>
        </footer>
      </div>
    </div>
  );
}
