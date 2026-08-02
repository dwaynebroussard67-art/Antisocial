import type { Dir } from "../game/types";

interface Props {
  onDirection: (dir: Dir) => void;
  accent: string;
}

export default function TouchControls({ onDirection, accent }: Props) {
  const btn = "flex h-12 w-12 items-center justify-center rounded-full bg-white/10 text-xl text-white active:bg-white/30 border border-white/20";
  return (
    <div className="pointer-events-auto absolute bottom-4 left-1/2 z-10 -translate-x-1/2 select-none sm:hidden">
      <div className="grid grid-cols-3 grid-rows-3 gap-1">
        <div />
        <button className={btn} style={{ boxShadow: `0 0 0 1px ${accent}33` }} onTouchStart={() => onDirection("up")} onClick={() => onDirection("up")}>
          ▲
        </button>
        <div />
        <button className={btn} onTouchStart={() => onDirection("left")} onClick={() => onDirection("left")}>
          ◀
        </button>
        <div className="flex h-12 w-12 items-center justify-center text-white/30">●</div>
        <button className={btn} onTouchStart={() => onDirection("right")} onClick={() => onDirection("right")}>
          ▶
        </button>
        <div />
        <button className={btn} onTouchStart={() => onDirection("down")} onClick={() => onDirection("down")}>
          ▼
        </button>
        <div />
      </div>
    </div>
  );
}
