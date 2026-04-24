import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { RealtimeChannel } from "@supabase/supabase-js";
import {
  createInitialState,
  setPlayerDir,
  spawnPlayer,
  removePlayer,
  step,
} from "./engine";
import type { Direction, GameState, RoomMsg } from "./types";

const ROOM = "pacman-room-v1";
const TICK_MS = 120;        // host tick rate (~8/s)
const BROADCAST_MS = 100;   // state broadcasts (~10/s)

export interface ActionLog {
  ts: number;
  playerId: string;
  name: string;
  action: string;
  position: { col: number; row: number };
}

export function useMultiplayer(selfId: string, name: string) {
  const [state, setState] = useState<GameState | null>(null);
  const [hostId, setHostId] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);
  const [logs, setLogs] = useState<ActionLog[]>([]);

  const channelRef = useRef<RealtimeChannel | null>(null);
  const hostStateRef = useRef<GameState | null>(null);
  const isHostRef = useRef(false);
  const tickIntervalRef = useRef<number | null>(null);
  const bcastIntervalRef = useRef<number | null>(null);
  const lastStateAtRef = useRef<number>(0);

  // helper to push log entries
  const pushLog = (entry: ActionLog) => {
    setLogs((prev) => {
      const next = [entry, ...prev];
      return next.slice(0, 50);
    });
  };

  useEffect(() => {
    if (!selfId || !name) return;

    const channel = supabase.channel(ROOM, {
      config: { presence: { key: selfId }, broadcast: { self: true } },
    });
    channelRef.current = channel;

    const becomeHost = () => {
      if (isHostRef.current) return;
      isHostRef.current = true;
      const s = createInitialState(selfId);
      // spawn all currently-present players
      const presence = channel.presenceState() as Record<string, Array<{ name: string }>>;
      for (const [pid, metas] of Object.entries(presence)) {
        const meta = metas[0];
        spawnPlayer(s, pid, meta?.name ?? `lb-${pid.slice(0, 4)}`);
      }
      hostStateRef.current = s;
      setHostId(selfId);

      tickIntervalRef.current = window.setInterval(() => {
        const cur = hostStateRef.current;
        if (!cur) return;
        const events = step(cur);
        for (const ev of events) {
          if (ev.type === "pellet" || ev.type === "power" || ev.type === "ghost-eaten" || ev.type === "player-died" || ev.type === "win") {
            const p = ev.playerId ? cur.players[ev.playerId] : undefined;
            if (p) {
              pushLog({
                ts: Date.now(),
                playerId: p.id,
                name: p.name,
                action: ev.type,
                position: { col: p.col, row: p.row },
              });
            }
          }
        }
      }, TICK_MS);

      bcastIntervalRef.current = window.setInterval(() => {
        const cur = hostStateRef.current;
        if (!cur) return;
        channel.send({
          type: "broadcast",
          event: "state",
          payload: { type: "state", state: cur, ts: Date.now() } as RoomMsg,
        });
      }, BROADCAST_MS);
    };

    const electHost = () => {
      const presence = channel.presenceState() as Record<string, Array<{ joinedAt: number }>>;
      const entries = Object.entries(presence).map(([id, metas]) => ({
        id,
        joinedAt: metas[0]?.joinedAt ?? Date.now(),
      }));
      if (entries.length === 0) return;
      entries.sort((a, b) => a.joinedAt - b.joinedAt || a.id.localeCompare(b.id));
      const newHostId = entries[0].id;
      setHostId(newHostId);
      if (newHostId === selfId) becomeHost();
    };

    channel
      .on("presence", { event: "sync" }, () => {
        // re-elect host if needed
        if (!isHostRef.current) electHost();
        // if we're host, sync players list (add new, remove gone)
        if (isHostRef.current && hostStateRef.current) {
          const s = hostStateRef.current;
          const presence = channel.presenceState() as Record<string, Array<{ name: string }>>;
          const presentIds = new Set(Object.keys(presence));
          for (const pid of Object.keys(s.players)) {
            if (!presentIds.has(pid)) removePlayer(s, pid);
          }
          for (const [pid, metas] of Object.entries(presence)) {
            if (!s.players[pid]) {
              spawnPlayer(s, pid, metas[0]?.name ?? `lb-${pid.slice(0, 4)}`);
            }
          }
        }
      })
      .on("presence", { event: "join" }, ({ key, newPresences }) => {
        if (isHostRef.current && hostStateRef.current) {
          const meta = newPresences[0] as { name?: string } | undefined;
          spawnPlayer(hostStateRef.current, key, meta?.name ?? `lb-${key.slice(0, 4)}`);
        }
      })
      .on("presence", { event: "leave" }, ({ key }) => {
        if (isHostRef.current && hostStateRef.current) {
          removePlayer(hostStateRef.current, key);
        }
      })
      .on("broadcast", { event: "input" }, ({ payload }) => {
        const msg = payload as RoomMsg;
        if (msg.type !== "input") return;
        if (isHostRef.current && hostStateRef.current) {
          if (!hostStateRef.current.players[msg.playerId]) {
            spawnPlayer(hostStateRef.current, msg.playerId, msg.name);
          }
          setPlayerDir(hostStateRef.current, msg.playerId, msg.dir);
          // also log this action (mimics SQS visibility)
          pushLog({
            ts: msg.ts,
            playerId: msg.playerId,
            name: msg.name,
            action: `move:${msg.dir}`,
            position: {
              col: hostStateRef.current.players[msg.playerId]?.col ?? 0,
              row: hostStateRef.current.players[msg.playerId]?.row ?? 0,
            },
          });
        }
      })
      .on("broadcast", { event: "state" }, ({ payload }) => {
        const msg = payload as RoomMsg;
        if (msg.type !== "state") return;
        lastStateAtRef.current = Date.now();
        setState(msg.state);
        setHostId(msg.state.hostId);
      });

    channel.subscribe(async (status) => {
      if (status === "SUBSCRIBED") {
        await channel.track({ name, joinedAt: Date.now() });
        setConnected(true);
        // wait a tick, then elect host
        window.setTimeout(electHost, 400);
      }
    });

    // safety: if no host broadcasts received in 3s, try host election
    const watchdog = window.setInterval(() => {
      if (isHostRef.current) return;
      const since = Date.now() - lastStateAtRef.current;
      if (since > 3000) electHost();
    }, 1500);

    return () => {
      window.clearInterval(watchdog);
      if (tickIntervalRef.current) window.clearInterval(tickIntervalRef.current);
      if (bcastIntervalRef.current) window.clearInterval(bcastIntervalRef.current);
      channel.unsubscribe();
      supabase.removeChannel(channel);
      channelRef.current = null;
      isHostRef.current = false;
      hostStateRef.current = null;
    };
  }, [selfId, name]);

  const sendInput = (dir: Direction) => {
    const ch = channelRef.current;
    if (!ch) return;
    const msg: RoomMsg = { type: "input", playerId: selfId, name, dir, ts: Date.now() };
    ch.send({ type: "broadcast", event: "input", payload: msg });
  };

  return { state, hostId, connected, sendInput, isHost: isHostRef.current, logs };
}
