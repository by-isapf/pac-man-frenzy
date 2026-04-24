import { useEffect, useRef } from "react";
import { COLS, ROWS, TILE, buildGrid } from "./maze";
import type { GameState } from "./types";

interface Props {
  state: GameState | null;
  selfId: string;
}

const WALL_COLOR = "#1e3a8a";
const WALL_INNER = "#3b82f6";
const PELLET_COLOR = "#fde68a";
const POWER_COLOR = "#fef3c7";
const BG = "#000010";

export function PacmanCanvas({ state, selfId }: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const gridRef = useRef(buildGrid());
  const mouthRef = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let raf = 0;
    const draw = () => {
      mouthRef.current = (mouthRef.current + 0.15) % (Math.PI * 2);
      ctx.fillStyle = BG;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const grid = gridRef.current;

      // walls
      for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
          if (grid[r][c] === 1) {
            ctx.fillStyle = WALL_COLOR;
            ctx.fillRect(c * TILE, r * TILE, TILE, TILE);
            ctx.fillStyle = WALL_INNER;
            ctx.fillRect(c * TILE + 3, r * TILE + 3, TILE - 6, TILE - 6);
          }
        }
      }

      if (!state) {
        ctx.fillStyle = "#fff";
        ctx.font = "16px monospace";
        ctx.fillText("Aguardando host...", 20, 40);
        raf = requestAnimationFrame(draw);
        return;
      }

      // pellets
      ctx.fillStyle = PELLET_COLOR;
      for (const idx of state.pellets) {
        const c = idx % COLS;
        const r = Math.floor(idx / COLS);
        ctx.beginPath();
        ctx.arc(c * TILE + TILE / 2, r * TILE + TILE / 2, 3, 0, Math.PI * 2);
        ctx.fill();
      }
      // power pellets (pulsing)
      const pulse = 4 + Math.sin(mouthRef.current * 3) * 2;
      ctx.fillStyle = POWER_COLOR;
      for (const idx of state.powerPellets) {
        const c = idx % COLS;
        const r = Math.floor(idx / COLS);
        ctx.beginPath();
        ctx.arc(c * TILE + TILE / 2, r * TILE + TILE / 2, pulse, 0, Math.PI * 2);
        ctx.fill();
      }

      // ghosts
      for (const g of state.ghosts) {
        const x = g.col * TILE + TILE / 2;
        const y = g.row * TILE + TILE / 2;
        const scared = Date.now() < g.scaredUntil;
        ctx.fillStyle = scared ? "#1e40af" : g.color;
        ctx.beginPath();
        ctx.arc(x, y, TILE / 2 - 2, Math.PI, 0);
        ctx.lineTo(x + TILE / 2 - 2, y + TILE / 2 - 2);
        ctx.lineTo(x - TILE / 2 + 2, y + TILE / 2 - 2);
        ctx.closePath();
        ctx.fill();
        // eyes
        ctx.fillStyle = "#fff";
        ctx.beginPath();
        ctx.arc(x - 4, y - 2, 3, 0, Math.PI * 2);
        ctx.arc(x + 4, y - 2, 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#000";
        ctx.beginPath();
        ctx.arc(x - 4, y - 2, 1.5, 0, Math.PI * 2);
        ctx.arc(x + 4, y - 2, 1.5, 0, Math.PI * 2);
        ctx.fill();
      }

      // players
      for (const p of Object.values(state.players)) {
        const x = p.col * TILE + TILE / 2;
        const y = p.row * TILE + TILE / 2;
        const mouth = Math.abs(Math.sin(mouthRef.current)) * 0.5 + 0.05;
        let rot = 0;
        if (p.dir === "left") rot = Math.PI;
        else if (p.dir === "up") rot = -Math.PI / 2;
        else if (p.dir === "down") rot = Math.PI / 2;

        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(rot);
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(0, 0, TILE / 2 - 2, mouth, Math.PI * 2 - mouth);
        ctx.lineTo(0, 0);
        ctx.closePath();
        ctx.fill();
        ctx.restore();

        // outline self
        if (p.id === selfId) {
          ctx.strokeStyle = "#fff";
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(x, y, TILE / 2, 0, Math.PI * 2);
          ctx.stroke();
        }

        // name tag
        ctx.fillStyle = "#fff";
        ctx.font = "bold 9px monospace";
        ctx.textAlign = "center";
        ctx.fillText(p.name, x, y - TILE / 2 - 2);
      }

      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [state, selfId]);

  return (
    <canvas
      ref={canvasRef}
      width={COLS * TILE}
      height={ROWS * TILE}
      style={{
        display: "block",
        margin: "0 auto",
        borderRadius: 8,
        boxShadow: "0 0 40px rgba(59,130,246,0.4)",
      }}
    />
  );
}
