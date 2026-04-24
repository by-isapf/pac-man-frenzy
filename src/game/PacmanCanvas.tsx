import { useEffect, useRef } from "react";
import { COLS, ROWS, TILE, buildGrid } from "./maze";
import type { GameState } from "./types";

interface Props {
  state: GameState | null;
  selfId: string;
}

// Aesthetic palette — neon arcade
const BG_TOP = "#0a0a23";
const BG_BOT = "#000010";
const WALL_FILL = "#0f1d4a";
const WALL_GLOW = "#3b82f6";
const WALL_INNER = "#60a5fa";
const PELLET = "#fef3c7";
const POWER = "#fbbf24";

interface Visual {
  col: number;
  row: number;
  dir: string;
}
type VisMap = Record<string, Visual>;

export function PacmanCanvas({ state, selfId }: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const gridRef = useRef(buildGrid());
  const mouthRef = useRef(0);
  const stateRef = useRef<GameState | null>(state);
  const visPlayersRef = useRef<VisMap>({});
  const visGhostsRef = useRef<VisMap>({});
  const wallPathRef = useRef<Path2D | null>(null);

  // keep latest state without re-running the RAF effect
  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  // pre-build the wall path once
  useEffect(() => {
    const grid = gridRef.current;
    const p = new Path2D();
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        if (grid[r][c] === 1) {
          p.rect(c * TILE + 2, r * TILE + 2, TILE - 4, TILE - 4);
        }
      }
    }
    wallPathRef.current = p;
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let raf = 0;
    let last = performance.now();

    const draw = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      mouthRef.current = (mouthRef.current + dt * 9) % (Math.PI * 2);

      // background gradient
      const grad = ctx.createLinearGradient(0, 0, 0, canvas.height);
      grad.addColorStop(0, BG_TOP);
      grad.addColorStop(1, BG_BOT);
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // walls (single path with glow — much cheaper than per-cell rect)
      const wallPath = wallPathRef.current;
      if (wallPath) {
        ctx.save();
        ctx.shadowColor = WALL_GLOW;
        ctx.shadowBlur = 10;
        ctx.fillStyle = WALL_FILL;
        ctx.fill(wallPath);
        ctx.restore();
        ctx.strokeStyle = WALL_INNER;
        ctx.lineWidth = 1.5;
        ctx.stroke(wallPath);
      }

      const s = stateRef.current;
      if (!s) {
        ctx.fillStyle = "#cbd5e1";
        ctx.font = "14px ui-monospace, monospace";
        ctx.textAlign = "center";
        ctx.fillText("Conectando à sala...", canvas.width / 2, canvas.height / 2);
        raf = requestAnimationFrame(draw);
        return;
      }

      // pellets
      ctx.fillStyle = PELLET;
      for (const idx of s.pellets) {
        const c = idx % COLS;
        const r = Math.floor(idx / COLS);
        ctx.beginPath();
        ctx.arc(c * TILE + TILE / 2, r * TILE + TILE / 2, 2.5, 0, Math.PI * 2);
        ctx.fill();
      }

      // power pellets — pulsing with glow
      const pulse = 5 + Math.sin(mouthRef.current * 2.5) * 1.8;
      ctx.save();
      ctx.shadowColor = POWER;
      ctx.shadowBlur = 14;
      ctx.fillStyle = POWER;
      for (const idx of s.powerPellets) {
        const c = idx % COLS;
        const r = Math.floor(idx / COLS);
        ctx.beginPath();
        ctx.arc(c * TILE + TILE / 2, r * TILE + TILE / 2, pulse, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();

      // smoothing factor (snappier when far, gentle when close)
      const lerp = 1 - Math.pow(0.001, dt);

      // ghosts (interpolated)
      for (const g of s.ghosts) {
        const v = (visGhostsRef.current[g.id] ??= { col: g.col, row: g.row, dir: g.dir });
        v.col += (g.col - v.col) * lerp;
        v.row += (g.row - v.row) * lerp;

        const x = v.col * TILE + TILE / 2;
        const y = v.row * TILE + TILE / 2;
        const scared = Date.now() < g.scaredUntil;
        const body = scared ? "#1d4ed8" : g.color;

        ctx.save();
        ctx.shadowColor = body;
        ctx.shadowBlur = 12;
        ctx.fillStyle = body;
        ctx.beginPath();
        ctx.arc(x, y, TILE / 2 - 2, Math.PI, 0);
        ctx.lineTo(x + TILE / 2 - 2, y + TILE / 2 - 1);
        // wavy bottom
        const wob = Math.sin(mouthRef.current * 3) * 1.5;
        ctx.lineTo(x + 4, y + TILE / 2 - 4 + wob);
        ctx.lineTo(x, y + TILE / 2 - 1);
        ctx.lineTo(x - 4, y + TILE / 2 - 4 - wob);
        ctx.lineTo(x - TILE / 2 + 2, y + TILE / 2 - 1);
        ctx.closePath();
        ctx.fill();
        ctx.restore();

        // eyes
        ctx.fillStyle = "#fff";
        ctx.beginPath();
        ctx.arc(x - 4, y - 2, 3, 0, Math.PI * 2);
        ctx.arc(x + 4, y - 2, 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = scared ? "#fff" : "#0a0a23";
        ctx.beginPath();
        ctx.arc(x - 4, y - 2, 1.6, 0, Math.PI * 2);
        ctx.arc(x + 4, y - 2, 1.6, 0, Math.PI * 2);
        ctx.fill();
      }

      // players (interpolated)
      for (const p of Object.values(s.players)) {
        const v = (visPlayersRef.current[p.id] ??= { col: p.col, row: p.row, dir: p.dir });
        // handle teleport (tunnel wrap) — snap if far
        if (Math.abs(p.col - v.col) > 4) v.col = p.col;
        if (Math.abs(p.row - v.row) > 4) v.row = p.row;
        v.col += (p.col - v.col) * lerp;
        v.row += (p.row - v.row) * lerp;
        v.dir = p.dir;

        const x = v.col * TILE + TILE / 2;
        const y = v.row * TILE + TILE / 2;
        const moving = p.dir !== "none";
        const mouth = moving ? Math.abs(Math.sin(mouthRef.current)) * 0.55 + 0.05 : 0.05;
        let rot = 0;
        if (p.dir === "left") rot = Math.PI;
        else if (p.dir === "up") rot = -Math.PI / 2;
        else if (p.dir === "down") rot = Math.PI / 2;

        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(rot);
        ctx.shadowColor = p.color;
        ctx.shadowBlur = 14;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(0, 0, TILE / 2 - 2, mouth, Math.PI * 2 - mouth);
        ctx.lineTo(0, 0);
        ctx.closePath();
        ctx.fill();
        ctx.restore();

        // self ring
        if (p.id === selfId) {
          ctx.strokeStyle = "rgba(255,255,255,0.85)";
          ctx.lineWidth = 1.5;
          ctx.setLineDash([3, 3]);
          ctx.beginPath();
          ctx.arc(x, y, TILE / 2 + 1, 0, Math.PI * 2);
          ctx.stroke();
          ctx.setLineDash([]);
        }

        // name tag with chip
        const tag = p.name;
        ctx.font = "600 9px ui-monospace, monospace";
        const tw = ctx.measureText(tag).width + 6;
        const ty = y - TILE / 2 - 8;
        ctx.fillStyle = "rgba(10,10,35,0.85)";
        ctx.fillRect(x - tw / 2, ty - 7, tw, 11);
        ctx.fillStyle = p.id === selfId ? "#fde68a" : "#e2e8f0";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(tag, x, ty - 1);
      }

      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [selfId]);

  return (
    <canvas
      ref={canvasRef}
      width={COLS * TILE}
      height={ROWS * TILE}
      style={{
        display: "block",
        width: "100%",
        maxWidth: COLS * TILE,
        height: "auto",
        margin: "0 auto",
        borderRadius: 14,
        border: "1px solid rgba(96,165,250,0.35)",
        boxShadow:
          "0 0 0 1px rgba(96,165,250,0.15), 0 20px 60px -20px rgba(59,130,246,0.55), inset 0 0 60px rgba(59,130,246,0.08)",
        background: "#000010",
      }}
    />
  );
}
