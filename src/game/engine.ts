import {
  buildGrid,
  COLS,
  ROWS,
  isWall,
  SPAWN_POINTS,
  GHOST_SPAWNS,
  type Cell,
} from "./maze";
import type { Direction, GameState, Ghost, Player } from "./types";

export const PLAYER_COLORS = ["#FFEB3B", "#FF5722", "#00BCD4", "#E91E63"];
const GHOST_COLORS = ["#FF0000", "#FFB8FF", "#00FFFF"];
const POWER_DURATION_MS = 6000;

export function createInitialState(hostId: string): GameState {
  const grid = buildGrid();
  const pellets: number[] = [];
  const powerPellets: number[] = [];
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const v = grid[r][c];
      if (v === 2) pellets.push(r * COLS + c);
      if (v === 3) powerPellets.push(r * COLS + c);
    }
  }
  const ghosts: Ghost[] = GHOST_SPAWNS.map((s, i) => ({
    id: `ghost-${i}`,
    col: s.col,
    row: s.row,
    dir: "left" as Direction,
    color: GHOST_COLORS[i % GHOST_COLORS.length],
    scaredUntil: 0,
  }));
  return {
    tick: 0,
    hostId,
    players: {},
    ghosts,
    pellets,
    powerPellets,
    startedAt: Date.now(),
    winnerId: null,
  };
}

export function spawnPlayer(state: GameState, id: string, name: string): void {
  if (state.players[id]) return;
  const idx = Object.keys(state.players).length % SPAWN_POINTS.length;
  const sp = SPAWN_POINTS[idx];
  state.players[id] = {
    id,
    name,
    col: sp.col,
    row: sp.row,
    dir: "none",
    nextDir: "none",
    score: 0,
    alive: true,
    color: PLAYER_COLORS[idx],
    joinedAt: Date.now(),
  };
}

export function removePlayer(state: GameState, id: string): void {
  delete state.players[id];
}

export function setPlayerDir(state: GameState, id: string, dir: Direction): void {
  const p = state.players[id];
  if (!p) return;
  p.nextDir = dir;
}

function dirDelta(d: Direction): [number, number] {
  switch (d) {
    case "up": return [0, -1];
    case "down": return [0, 1];
    case "left": return [-1, 0];
    case "right": return [1, 0];
    default: return [0, 0];
  }
}

function wrapCol(c: number): number {
  if (c < 0) return COLS - 1;
  if (c >= COLS) return 0;
  return c;
}

let cachedGrid: Cell[][] | null = null;
function grid(): Cell[][] {
  if (!cachedGrid) cachedGrid = buildGrid();
  return cachedGrid;
}

function tryMove(col: number, row: number, dir: Direction): { col: number; row: number } | null {
  const [dc, dr] = dirDelta(dir);
  const nc = wrapCol(col + dc);
  const nr = row + dr;
  if (isWall(grid(), nc, nr)) return null;
  return { col: nc, row: nr };
}

function chooseGhostDir(g: Ghost, target: { col: number; row: number }): Direction {
  const opts: Direction[] = ["up", "down", "left", "right"];
  const opposite: Record<Direction, Direction> = {
    up: "down", down: "up", left: "right", right: "left", none: "none",
  };
  const candidates = opts.filter((d) => {
    if (d === opposite[g.dir]) return false;
    return tryMove(g.col, g.row, d) !== null;
  });
  const list = candidates.length > 0 ? candidates : opts.filter((d) => tryMove(g.col, g.row, d) !== null);
  if (list.length === 0) return "none";
  // pick the one that minimizes manhattan distance to target (with some randomness)
  list.sort((a, b) => {
    const ma = tryMove(g.col, g.row, a)!;
    const mb = tryMove(g.col, g.row, b)!;
    const da = Math.abs(ma.col - target.col) + Math.abs(ma.row - target.row);
    const db = Math.abs(mb.col - target.col) + Math.abs(mb.row - target.row);
    return da - db;
  });
  // 80% greedy, 20% random
  if (Math.random() < 0.2) return list[Math.floor(Math.random() * list.length)];
  return list[0];
}

export interface StepEvent {
  type: "pellet" | "power" | "ghost-eaten" | "player-died" | "win";
  playerId?: string;
  ghostId?: string;
}

export function step(state: GameState): StepEvent[] {
  const events: StepEvent[] = [];
  state.tick++;

  // move players
  for (const p of Object.values(state.players)) {
    if (!p.alive) continue;
    // try preferred next dir
    if (p.nextDir !== "none") {
      const m = tryMove(p.col, p.row, p.nextDir);
      if (m) { p.dir = p.nextDir; }
    }
    if (p.dir !== "none") {
      const m = tryMove(p.col, p.row, p.dir);
      if (m) { p.col = m.col; p.row = m.row; }
    }
    // pellet collection
    const idx = p.row * COLS + p.col;
    const pi = state.pellets.indexOf(idx);
    if (pi >= 0) {
      state.pellets.splice(pi, 1);
      p.score += 10;
      events.push({ type: "pellet", playerId: p.id });
    }
    const ppi = state.powerPellets.indexOf(idx);
    if (ppi >= 0) {
      state.powerPellets.splice(ppi, 1);
      p.score += 50;
      const until = Date.now() + POWER_DURATION_MS;
      for (const g of state.ghosts) g.scaredUntil = until;
      events.push({ type: "power", playerId: p.id });
    }
  }

  // move ghosts (every 2 ticks to be slower than players)
  if (state.tick % 2 === 0) {
    const playersArr = Object.values(state.players).filter((p) => p.alive);
    for (const g of state.ghosts) {
      const scared = Date.now() < g.scaredUntil;
      // target: nearest player; if scared, flee
      let target = { col: 9, row: 10 };
      if (playersArr.length > 0) {
        let best = playersArr[0];
        let bd = Infinity;
        for (const p of playersArr) {
          const d = Math.abs(p.col - g.col) + Math.abs(p.row - g.row);
          if (d < bd) { bd = d; best = p; }
        }
        target = scared
          ? { col: g.col + (g.col - best.col), row: g.row + (g.row - best.row) }
          : { col: best.col, row: best.row };
      }
      g.dir = chooseGhostDir(g, target);
      const m = tryMove(g.col, g.row, g.dir);
      if (m) { g.col = m.col; g.row = m.row; }
    }
  }

  // collisions
  for (const p of Object.values(state.players)) {
    if (!p.alive) continue;
    for (const g of state.ghosts) {
      if (g.col === p.col && g.row === p.row) {
        if (Date.now() < g.scaredUntil) {
          // eat ghost: respawn it, score
          p.score += 200;
          const sp = GHOST_SPAWNS[Math.floor(Math.random() * GHOST_SPAWNS.length)];
          g.col = sp.col; g.row = sp.row; g.scaredUntil = 0;
          events.push({ type: "ghost-eaten", playerId: p.id, ghostId: g.id });
        } else {
          // die: lose 100 pts, respawn
          p.score = Math.max(0, p.score - 100);
          const idx = Object.keys(state.players).indexOf(p.id) % SPAWN_POINTS.length;
          const sp = SPAWN_POINTS[idx];
          p.col = sp.col; p.row = sp.row; p.dir = "none"; p.nextDir = "none";
          events.push({ type: "player-died", playerId: p.id });
        }
      }
    }
  }

  // win condition: all pellets gone
  if (state.pellets.length === 0 && state.powerPellets.length === 0 && !state.winnerId) {
    let winner: Player | null = null;
    for (const p of Object.values(state.players)) {
      if (!winner || p.score > winner.score) winner = p;
    }
    if (winner) {
      state.winnerId = winner.id;
      events.push({ type: "win", playerId: winner.id });
    }
  }

  return events;
}
