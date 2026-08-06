import { useCallback, useEffect, useRef, useState } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { supabase, isOnlineConfigured } from "@/lib/supabaseClient";
import {
  createInitialState,
  movePlayer,
  reconcile,
  startSession,
  stepGhost,
  tick,
  type GatheredLightState,
  type PlayerId,
} from "@/game/gatheredLightEngine";

export type ConnectionMode = "idle" | "solo" | "duo-waiting" | "duo-active" | "duo-offline";

interface UseGatheredLightSessionOptions {
  skin: "street" | "block" | "crib";
  code: string;
  /** The mode the player chose from the arcade: play with a partner, or alone. */
  desiredMode: "solo" | "duo";
}

function makeLocalId() {
  return Math.random().toString(36).slice(2, 10);
}

const LOG_EVERY_MS = 2200;
const BROADCAST_EVERY_MS = 90;

/**
 * Manages a single Gathered Light session — solo practice, or a two-device
 * online session synced through Supabase Realtime (broadcast for live
 * position, postgres row for authoritative resume/log/complete state).
 * Skins never touch this hook's internals — they only render its output.
 */
export function useGatheredLightSession({ skin, code, desiredMode }: UseGatheredLightSessionOptions) {
  const [state, setState] = useState<GatheredLightState>(() => createInitialState("solo"));
  const [role, setRole] = useState<PlayerId>("player1");
  const [connection, setConnection] = useState<ConnectionMode>("idle");
  const [partnerPresent, setPartnerPresent] = useState(false);

  const stateRef = useRef(state);
  stateRef.current = state;
  const connectionRef = useRef(connection);
  connectionRef.current = connection;
  const roleRef = useRef(role);
  roleRef.current = role;

  const sessionRowId = useRef<string | null>(null);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const localIdRef = useRef(makeLocalId());
  const lastLogAt = useRef(0);
  const lastBroadcastAt = useRef(0);
  const rafRef = useRef<number | null>(null);
  const lastTickAt = useRef<number>(Date.now());

  // ---- Bootstrap: solo practice or online duo session ----
  useEffect(() => {
    if (desiredMode === "solo") {
      setConnection("solo");
      setState(startSession(createInitialState("solo")));
      return;
    }

    if (!isOnlineConfigured || !supabase) {
      setConnection("duo-offline");
      return;
    }

    let cancelled = false;
    setConnection("duo-waiting");
    setState(createInitialState("duo"));

    async function bootstrap() {
      const { data: existing } = await supabase!
        .from("game_sessions")
        .select("*")
        .eq("code", code)
        .maybeSingle();

      let row = existing;
      if (!row) {
        const { data: created, error } = await supabase!
          .from("game_sessions")
          .insert({ code, skin, status: "waiting", mode: "duo" })
          .select("*")
          .maybeSingle();
        if (error) {
          if (!cancelled) setConnection("duo-offline");
          return;
        }
        row = created;
      }
      if (cancelled || !row) return;
      sessionRowId.current = row.id;
      void supabase!.from("gather_light_interactions").insert({
        session_id: row.id,
        player_id: localIdRef.current,
        event: "join",
      });

      const channel = supabase!.channel(`gathered_light:${code}`, {
        config: { presence: { key: localIdRef.current } },
      });
      channelRef.current = channel;

      channel
        .on("broadcast", { event: "position" }, ({ payload }) => {
          if (payload.from === localIdRef.current) return;
          const otherRole: PlayerId = roleRef.current === "player1" ? "player2" : "player1";
          setState((s) => ({ ...s, [otherRole]: { y: payload.y, updatedAt: Date.now() } } as GatheredLightState));
        })
        .on("broadcast", { event: "state" }, ({ payload }) => {
          if (payload.from === localIdRef.current) return;
          setState((s) => reconcile(s, payload.state));
        })
        .on("presence", { event: "sync" } as any, () => {
          const presenceState = channel.presenceState();
          const ids = Object.keys(presenceState).sort();
          const amHost = ids[0] === localIdRef.current;
          setRole(amHost ? "player1" : "player2");
          const bothPresent = ids.length > 1;
          setPartnerPresent(bothPresent);
          setConnection((c) => {
            if (bothPresent) {
              if (c === "duo-waiting") {
                setState((s) => (s.status === "waiting" ? startSession(s) : s));
                return "duo-active";
              }
              return c;
            }
            return c === "duo-active" ? "duo-waiting" : c;
          });
        })
        .subscribe(async (status) => {
          if (status === "SUBSCRIBED") {
            await channel.track({ joinedAt: Date.now() });
          }
        });
    }

    bootstrap();
    return () => {
      cancelled = true;
      if (channelRef.current) {
        supabase?.removeChannel(channelRef.current);
        channelRef.current = null;
      }
      sessionRowId.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code, skin, desiredMode]);

  // ---- Local simulation loop (runs identically for solo + duo) ----
  useEffect(() => {
    lastTickAt.current = Date.now();
    let cancelled = false;

    function frame() {
      if (cancelled) return;
      const now = Date.now();
      const dt = Math.min(0.25, (now - lastTickAt.current) / 1000);
      lastTickAt.current = now;

      setState((s) => {
        let next = s;
        if (next.mode === "solo") next = stepGhost(next, dt, now);
        return tick(next, dt);
      });

      if (connectionRef.current === "duo-active" && roleRef.current === "player1" && channelRef.current) {
        if (now - lastBroadcastAt.current > BROADCAST_EVERY_MS) {
          lastBroadcastAt.current = now;
          channelRef.current.send({
            type: "broadcast",
            event: "state",
            payload: {
              from: localIdRef.current,
              state: {
                gatheredLight: stateRef.current.gatheredLight,
                pathProgress: stateRef.current.pathProgress,
                status: stateRef.current.status,
                distance: stateRef.current.distance,
                isClose: stateRef.current.isClose,
              },
            },
          });
        }
      }

      if (isOnlineConfigured && supabase && sessionRowId.current) {
        if (now - lastLogAt.current > LOG_EVERY_MS) {
          lastLogAt.current = now;
          const s = stateRef.current;
          void supabase.from("gather_light_interactions").insert({
            session_id: sessionRowId.current,
            player_id: localIdRef.current,
            player1_y: s.player1.y,
            player2_y: s.player2.y,
            distance: s.distance,
            gathered_light: s.gatheredLight,
            path_progress: s.pathProgress,
            event: s.status === "complete" ? "complete" : "tick",
          });
          void supabase
            .from("game_sessions")
            .update({
              status: s.status,
              gathered_light: s.gatheredLight,
              path_progress: s.pathProgress,
              player1_y: s.player1.y,
              player2_y: s.player2.y,
              completed_at: s.status === "complete" ? new Date().toISOString() : null,
            })
            .eq("id", sessionRowId.current);
        }
      }

      rafRef.current = requestAnimationFrame(frame);
    }

    rafRef.current = requestAnimationFrame(frame);
    return () => {
      cancelled = true;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  const myRole = (): PlayerId => (connectionRef.current.startsWith("duo") ? roleRef.current : "player1");

  const move = useCallback((deltaY: number) => {
    const r = myRole();
    setState((s) => movePlayer(s, r, deltaY));
    broadcastPosition(r);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setMyPosition = useCallback((y: number) => {
    const r = myRole();
    setState((s) => ({ ...s, [r]: { y, updatedAt: Date.now() } } as GatheredLightState));
    broadcastPosition(r, y);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function broadcastPosition(r: PlayerId, explicitY?: number) {
    if (connectionRef.current !== "duo-active" || !channelRef.current) return;
    const now = Date.now();
    if (now - lastBroadcastAt.current <= BROADCAST_EVERY_MS) return;
    lastBroadcastAt.current = now;
    channelRef.current.send({
      type: "broadcast",
      event: "position",
      payload: { from: localIdRef.current, y: explicitY ?? stateRef.current[r].y },
    });
  }

  const reset = useCallback(() => {
    setState(createInitialState(connectionRef.current === "solo" ? "solo" : "duo"));
  }, []);

  return {
    state,
    role,
    connection,
    partnerPresent,
    isOnlineConfigured,
    move,
    setMyPosition,
    reset,
    myRole: myRole(),
  };
}
