import { THEMES, type LevelId } from "../game/themes";

interface Props {
  onSelect: (id: LevelId) => void;
  cleared: Record<LevelId, boolean>;
}

const CARD_ORDER: LevelId[] = ["streets", "block", "crib"];

const CARD_STYLES: Record<LevelId, string> = {
  streets: "from-indigo-950 via-blue-950 to-black border-blue-500/40",
  block: "from-slate-950 via-indigo-950 to-purple-950 border-fuchsia-500/40",
  crib: "from-neutral-950 via-red-950 to-amber-950 border-amber-500/40",
};

const TIER_LABELS: Record<LevelId, string> = {
  streets: "The Streets",
  block: "The Block",
  crib: "The Crib",
};

export default function LevelSelect({ onSelect, cleared }: Props) {
  return (
    <div className="flex min-h-screen w-full flex-col items-center overflow-y-auto bg-[radial-gradient(circle_at_top,_#1a1a2e,_#000000)] px-4 py-10 text-white sm:py-16">
      <div className="mb-8 text-center sm:mb-12">
        <div className="mb-2 text-4xl sm:text-6xl">🕹️💰</div>
        <h1 className="bg-gradient-to-r from-yellow-300 via-amber-200 to-yellow-400 bg-clip-text text-3xl font-extrabold tracking-tight text-transparent sm:text-5xl">
          ANTISOCIAL ARCADE
        </h1>
        <p className="mx-auto mt-3 max-w-2xl text-sm leading-relaxed text-white/60 sm:text-base">
          Three tiers. Three versions. Start with the 2D run on The Streets, level up to the full 3D experience on The Block, then unlock the exclusive Crib edition.
        </p>
      </div>

      <div className="grid w-full max-w-6xl grid-cols-1 gap-6 sm:grid-cols-3">
        {CARD_ORDER.map((id, i) => {
          const t = THEMES[id];
          return (
            <button
              key={id}
              onClick={() => onSelect(id)}
              aria-label={`Play ${TIER_LABELS[id]}: ${t.name}`}
              className={`group relative flex min-h-[330px] flex-col overflow-hidden rounded-2xl border bg-gradient-to-br p-6 text-left shadow-xl transition hover:-translate-y-1 hover:shadow-2xl ${CARD_STYLES[id]}`}
            >
              <div className="absolute right-4 top-4 text-3xl opacity-80">{t.emoji}</div>
              <div className="mb-1 text-xs font-bold uppercase tracking-widest text-white/50">
                {TIER_LABELS[id]} · Level {i + 1}
              </div>
              <div className="mb-1 text-2xl font-extrabold">{t.name}</div>
              <div className="mb-4 text-sm font-semibold uppercase tracking-wide" style={{ color: t.colors.hudAccent }}>
                {t.subtitle}
              </div>
              <p className="mb-6 flex-1 text-sm leading-relaxed text-white/70">{t.tagline}</p>
              <div className="mb-4 flex flex-wrap gap-2 text-xs text-white/60">
                <span className="rounded-full bg-white/10 px-2 py-1">🕹️ {t.playerLabel}</span>
                <span className="rounded-full bg-white/10 px-2 py-1">
                  {id === "crib" ? "🚓" : "🎯"} {t.ghostLabel}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="rounded-md border border-white/30 bg-white/10 px-4 py-2 text-sm font-bold tracking-wide group-hover:bg-white/20">
                  Play →
                </span>
                {cleared[id] && (
                  <span className="rounded-full bg-emerald-500/20 px-2 py-1 text-xs font-bold text-emerald-300">
                    ✓ Cleared
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>

      <div className="mt-10 max-w-2xl text-center text-xs text-white/40 sm:text-sm">
        Controls: Arrow keys / WASD to move · Space or P to pause · Touch controls appear automatically on mobile.
      </div>
    </div>
  );
}
