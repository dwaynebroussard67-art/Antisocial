import { useCallback, useEffect, useRef, useState } from "react";
import { useGatheredLightSession } from "@/game/useGatheredLightSession";

export interface GatheredLightSkinConfig {
  id: "street" | "block" | "crib";
  /** Warm, human name shown on the waiting/complete screens. */
  name: string;
  background: string;
  backgroundPosition?: string;
  figure1: string;
  figure2: string;
  flame: string;
  /** Optional extra CSS filter applied to player 2's figure/flame for variety. */
  player2Filter?: string;
}

const COLORS = {
  void: "#0A0A0A",
  ember: "#D4712A",
  gold: "#C9A227",
  cream: "#F2E8D5",
  charcoal: "#1C1A17",
};

function makeCode() {
  const alphabet = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
  let out = "";
  for (let i = 0; i < 5; i++) out += alphabet[Math.floor(Math.random() * alphabet.length)];
  return out;
}

export default function GatheredLight({
  skin,
  onExitToArcade,
}: {
  skin: GatheredLightSkinConfig;
  onExitToArcade: () => void;
}) {
  const [mode, setMode] = useState<"choose" | "solo" | "duo">("choose");
  const [code, setCode] = useState(() => makeCode());
  const [joinInput, setJoinInput] = useState("");
  const [committedCode, setCommittedCode] = useState<string | null>(null);

  const active = mode !== "choose" && committedCode !== null;

  const session = useGatheredLightSession({
    skin: skin.id,
    code: committedCode ?? code,
    desiredMode: mode === "solo" ? "solo" : "duo",
  });

  const stageRef = useRef<HTMLDivElement | null>(null);
  const dragState = useRef<{ dragging: boolean; lastY: number }>({ dragging: false, lastY: 0 });

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    dragState.current = { dragging: true, lastY: e.clientY };
    (e.target as Element).setPointerCapture?.(e.pointerId);
  }, []);

  const onPointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!dragState.current.dragging) return;
      const dy = e.clientY - dragState.current.lastY;
      dragState.current.lastY = e.clientY;
      session.move(dy / 140);
    },
    [session]
  );

  const onPointerUp = useCallback(() => {
    dragState.current.dragging = false;
  }, []);

  const holdInterval = useRef<number | null>(null);
  const startHold = (dir: 1 | -1) => {
    session.move(dir * 0.06);
    holdInterval.current = window.setInterval(() => session.move(dir * 0.06), 90);
  };
  const stopHold = () => {
    if (holdInterval.current) window.clearInterval(holdInterval.current);
    holdInterval.current = null;
  };
  useEffect(() => () => stopHold(), []);

  const startDuo = () => {
    setMode("duo");
    setCommittedCode(code);
  };
  const joinDuo = () => {
    const clean = joinInput.trim().toUpperCase();
    if (!clean) return;
    setMode("duo");
    setCommittedCode(clean);
  };
  const startSolo = () => {
    setMode("solo");
    setCommittedCode("solo-" + code);
  };

  const restartToChoose = () => {
    setMode("choose");
    setCommittedCode(null);
    setCode(makeCode());
    setJoinInput("");
  };

  return (
    <div
      className="relative w-full overflow-hidden rounded-3xl border shadow-2xl"
      style={{ borderColor: "#2a2622", background: COLORS.void, aspectRatio: "16 / 10" }}
    >
      {!active && (
        <ChooseScreen
          skin={skin}
          code={code}
          joinInput={joinInput}
          setJoinInput={setJoinInput}
          onStartDuo={startDuo}
          onJoinDuo={joinDuo}
          onStartSolo={startSolo}
          onExitToArcade={onExitToArcade}
        />
      )}

      {active && session.connection === "duo-waiting" && (
        <WaitingScreen skin={skin} code={committedCode ?? code} onBack={restartToChoose} />
      )}

      {active && session.connection === "duo-offline" && (
        <OfflineScreen onSolo={startSolo} onBack={restartToChoose} />
      )}

      {active && (session.connection === "duo-active" || session.connection === "solo") && (
        <PlayScreen
          skin={skin}
          state={session.state}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          stageRef={stageRef}
          startHold={startHold}
          stopHold={stopHold}
          solo={session.connection === "solo"}
        />
      )}

      {active && session.state.status === "complete" && (
        <CompleteScreen
          onRest={() => {
            session.reset();
            restartToChoose();
          }}
        />
      )}
    </div>
  );
}

function ChooseScreen({
  skin,
  code,
  joinInput,
  setJoinInput,
  onStartDuo,
  onJoinDuo,
  onStartSolo,
  onExitToArcade,
}: {
  skin: GatheredLightSkinConfig;
  code: string;
  joinInput: string;
  setJoinInput: (v: string) => void;
  onStartDuo: () => void;
  onJoinDuo: () => void;
  onStartSolo: () => void;
  onExitToArcade: () => void;
}) {
  return (
    <div
      className="flex h-full w-full flex-col items-center justify-center gap-5 p-6 text-center"
      style={{
        backgroundImage: `linear-gradient(180deg, rgba(10,10,10,0.55), rgba(10,10,10,0.85)), url(${skin.background})`,
        backgroundSize: "cover",
        backgroundPosition: skin.backgroundPosition ?? "center",
      }}
    >
      <p className="text-xs uppercase tracking-[0.35em]" style={{ color: COLORS.gold }}>
        {skin.name}
      </p>
      <h2 className="text-2xl font-serif" style={{ color: COLORS.cream }}>
        The Gathered Light
      </h2>
      <p className="max-w-sm text-sm" style={{ color: "#c9c2b6" }}>
        Two people, one small flame each. Stay close on the path and the light grows. Play with
        someone on another device, or practice the walk alone first.
      </p>

      <div className="mt-2 flex w-full max-w-sm flex-col gap-3">
        <button
          onClick={onStartDuo}
          className="rounded-full px-5 py-3 text-sm font-medium shadow-lg transition hover:brightness-110"
          style={{ background: COLORS.ember, color: COLORS.void }}
        >
          Start a session &middot; share code&nbsp;
          <span className="font-mono tracking-widest">{code}</span>
        </button>

        <div className="flex items-center gap-2">
          <input
            value={joinInput}
            onChange={(e) => setJoinInput(e.target.value)}
            placeholder="Enter a partner's code"
            className="w-full rounded-full border px-4 py-2 text-center text-sm tracking-widest outline-none"
            style={{ borderColor: "#3a352d", background: "#151310", color: COLORS.cream }}
            maxLength={8}
          />
          <button
            onClick={onJoinDuo}
            className="shrink-0 rounded-full border px-4 py-2 text-sm"
            style={{ borderColor: COLORS.gold, color: COLORS.gold }}
          >
            Join
          </button>
        </div>

        <button
          onClick={onStartSolo}
          className="rounded-full border px-5 py-3 text-sm transition hover:bg-white/5"
          style={{ borderColor: "#3a352d", color: COLORS.cream }}
        >
          Practice solo
        </button>

        <button onClick={onExitToArcade} className="mt-1 text-xs underline opacity-60" style={{ color: COLORS.cream }}>
          back to arcade
        </button>
      </div>
    </div>
  );
}

function WaitingScreen({
  skin,
  code,
  onBack,
}: {
  skin: GatheredLightSkinConfig;
  code: string;
  onBack: () => void;
}) {
  return (
    <div
      className="flex h-full w-full flex-col items-center justify-center gap-4 p-6 text-center"
      style={{
        backgroundImage: `linear-gradient(180deg, rgba(10,10,10,0.6), rgba(10,10,10,0.9)), url(${skin.background})`,
        backgroundSize: "cover",
        backgroundPosition: skin.backgroundPosition ?? "center",
      }}
    >
      <div className="h-3 w-3 animate-pulse rounded-full" style={{ background: COLORS.ember }} />
      <p className="text-lg" style={{ color: COLORS.cream }}>
        Waiting for another player&hellip;
      </p>
      <p className="text-sm" style={{ color: "#a79c8b" }}>
        Share this code with them &mdash; it works from any device.
      </p>
      <p className="font-mono text-3xl tracking-[0.4em]" style={{ color: COLORS.gold }}>
        {code}
      </p>
      <button onClick={onBack} className="mt-4 text-xs underline opacity-70" style={{ color: COLORS.cream }}>
        cancel and go back
      </button>
    </div>
  );
}

function OfflineScreen({ onSolo, onBack }: { onSolo: () => void; onBack: () => void }) {
  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-4 p-6 text-center" style={{ background: COLORS.void }}>
      <p className="text-lg" style={{ color: COLORS.cream }}>
        Two-device play isn't connected yet.
      </p>
      <p className="max-w-sm text-sm" style={{ color: "#a79c8b" }}>
        This session needs a live connection to reach another device. You can still practice the
        walk solo right now.
      </p>
      <div className="mt-2 flex gap-3">
        <button onClick={onSolo} className="rounded-full px-5 py-2 text-sm" style={{ background: COLORS.ember, color: COLORS.void }}>
          Practice solo
        </button>
        <button onClick={onBack} className="rounded-full border px-5 py-2 text-sm" style={{ borderColor: "#3a352d", color: COLORS.cream }}>
          Back
        </button>
      </div>
    </div>
  );
}

function CompleteScreen({ onRest }: { onRest: () => void }) {
  return (
    <div
      className="absolute inset-0 flex flex-col items-center justify-center gap-4 p-6 text-center"
      style={{ background: `radial-gradient(circle at 50% 45%, ${COLORS.gold}33, ${COLORS.void} 75%)` }}
    >
      <div className="h-14 w-14 rounded-full" style={{ boxShadow: `0 0 60px 20px ${COLORS.gold}88`, background: COLORS.cream }} />
      <h3 className="text-2xl font-serif" style={{ color: COLORS.cream }}>
        You kept the light together.
      </h3>
      <p className="text-sm" style={{ color: COLORS.gold }}>
        This is what belonging looks like.
      </p>
      <button
        onClick={onRest}
        className="mt-3 rounded-full px-6 py-2 text-sm font-medium"
        style={{ background: COLORS.ember, color: COLORS.void }}
      >
        Rest
      </button>
    </div>
  );
}

function PlayScreen({
  skin,
  state,
  onPointerDown,
  onPointerMove,
  onPointerUp,
  stageRef,
  startHold,
  stopHold,
  solo,
}: {
  skin: GatheredLightSkinConfig;
  state: ReturnType<typeof useGatheredLightSession>["state"];
  onPointerDown: (e: React.PointerEvent) => void;
  onPointerMove: (e: React.PointerEvent) => void;
  onPointerUp: () => void;
  stageRef: React.RefObject<HTMLDivElement | null>;
  startHold: (dir: 1 | -1) => void;
  stopHold: () => void;
  solo: boolean;
}) {
  const leftPct = 12 + (state.pathProgress / 100) * 68;
  const bandHalf = 20; // percent of stage height either side of centerline

  const glow = 0.35 + (state.gatheredLight / 100) * 0.85;
  const isClose = state.isClose;

  return (
    <div
      ref={stageRef}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      className="relative h-full w-full touch-none select-none"
      style={{
        backgroundImage: `url(${skin.background})`,
        backgroundSize: "cover",
        backgroundPosition: skin.backgroundPosition ?? "center",
      }}
    >
      <div
        className="pointer-events-none absolute inset-0"
        style={{ background: `radial-gradient(circle at ${leftPct}% 50%, ${COLORS.ember}${Math.round(glow * 40).toString(16).padStart(2, "0")}, transparent 60%)` }}
      />

      {/* path progress fill */}
      <div className="absolute left-[10%] right-[10%] top-1/2 h-[3px] -translate-y-1/2 rounded-full" style={{ background: "#00000055" }}>
        <div
          className="h-full rounded-full transition-[width]"
          style={{ width: `${state.pathProgress}%`, background: `linear-gradient(90deg, ${COLORS.ember}, ${COLORS.gold})` }}
        />
      </div>

      {/* player 1 */}
      <PlayerFigure leftPct={leftPct} yPct={50 + state.player1.y * bandHalf} figure={skin.figure1} flame={skin.flame} glow={glow} />
      {/* player 2 */}
      <PlayerFigure
        leftPct={leftPct}
        yPct={50 + state.player2.y * bandHalf}
        figure={skin.figure2}
        flame={skin.flame}
        glow={glow}
        filter={skin.player2Filter}
        ghost={solo}
      />

      {/* helper copy */}
      <div className="absolute left-1/2 top-4 -translate-x-1/2 text-center">
        <p className="text-xs tracking-[0.3em]" style={{ color: isClose ? COLORS.gold : "#8b8377" }}>
          {isClose ? "Stay close. Keep the light." : "Drift back toward them."}
        </p>
        {solo && (
          <p className="mt-1 text-[10px] tracking-[0.25em] opacity-60" style={{ color: COLORS.cream }}>
            practice mode
          </p>
        )}
      </div>

      {/* gathered light bar */}
      <div className="absolute inset-x-6 bottom-5">
        <div className="relative h-4 w-full overflow-hidden rounded-full border" style={{ borderColor: "#3a352d", background: "#151310" }}>
          <div
            className="h-full rounded-full"
            style={{
              width: `${state.gatheredLight}%`,
              background: `linear-gradient(90deg, ${COLORS.ember}, ${COLORS.gold}, ${COLORS.cream})`,
              boxShadow: `0 0 18px 2px ${COLORS.gold}aa`,
            }}
          />
        </div>
        <p className="mt-1 text-center text-[10px] tracking-[0.3em] opacity-70" style={{ color: COLORS.cream }}>
          GATHERED LIGHT
        </p>
      </div>

      {/* one-handed tap controls */}
      <div className="absolute bottom-16 right-4 flex flex-col gap-2">
        <button
          onPointerDown={(e) => {
            e.stopPropagation();
            startHold(-1);
          }}
          onPointerUp={(e) => {
            e.stopPropagation();
            stopHold();
          }}
          onPointerLeave={stopHold}
          className="flex h-10 w-10 items-center justify-center rounded-full border text-lg"
          style={{ borderColor: COLORS.gold, color: COLORS.gold, background: "#00000066" }}
          aria-label="move up"
        >
          ▲
        </button>
        <button
          onPointerDown={(e) => {
            e.stopPropagation();
            startHold(1);
          }}
          onPointerUp={(e) => {
            e.stopPropagation();
            stopHold();
          }}
          onPointerLeave={stopHold}
          className="flex h-10 w-10 items-center justify-center rounded-full border text-lg"
          style={{ borderColor: COLORS.gold, color: COLORS.gold, background: "#00000066" }}
          aria-label="move down"
        >
          ▼
        </button>
      </div>
    </div>
  );
}

function PlayerFigure({
  leftPct,
  yPct,
  figure,
  flame,
  glow,
  filter,
  ghost,
}: {
  leftPct: number;
  yPct: number;
  figure: string;
  flame: string;
  glow: number;
  filter?: string;
  ghost?: boolean;
}) {
  return (
    <div
      className="absolute flex -translate-x-1/2 -translate-y-1/2 flex-col items-center transition-[top,left] duration-150 ease-out"
      style={{ left: `${leftPct}%`, top: `${yPct}%`, opacity: ghost ? 0.55 : 1 }}
    >
      <img
        src={flame}
        alt=""
        className="mb-[-6px] h-5 w-5"
        style={{ filter: `drop-shadow(0 0 ${6 + glow * 10}px ${COLORS.gold}) ${filter ?? ""}`, opacity: 0.6 + glow * 0.4 }}
      />
      <img src={figure} alt="player" className="h-16 w-16 object-contain" style={{ filter }} />
    </div>
  );
}
