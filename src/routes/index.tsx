import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { PacmanCanvas } from "@/game/PacmanCanvas";
import { useMultiplayer } from "@/game/useMultiplayer";
import type { Direction } from "@/game/types";

export const Route = createFileRoute("/")({
  component: Index,
  ssr: false,
  head: () => ({
    meta: [
      { title: "lb-PacMan Multiplayer — 4 jogadores em tempo real" },
      {
        name: "description",
        content:
          "Jogo Pac-Man multiplayer para 4 jogadores via navegador. Demo acadêmica com fila de mensagens e estado global em tempo real.",
      },
    ],
  }),
});

function genId(): string {
  const k = "pm-self-id";
  let v = typeof window !== "undefined" ? localStorage.getItem(k) : null;
  if (!v) {
    v = Math.random().toString(36).slice(2, 10);
    if (typeof window !== "undefined") localStorage.setItem(k, v);
  }
  return v;
}

function Index() {
  const [playerName, setPlayerName] = useState<string | null>(null);
  const [selfId] = useState(() => genId());

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "radial-gradient(ellipse at top, #0a0a2e 0%, #000010 60%)",
        color: "#fff",
        fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
        padding: "16px",
      }}
    >
      <header style={{ textAlign: "center", marginBottom: 16 }}>
        <h1
          style={{
            fontSize: 32,
            fontWeight: 800,
            margin: 0,
            color: "#FFEB3B",
            textShadow: "0 0 12px rgba(255,235,59,0.5)",
            letterSpacing: 2,
          }}
        >
          lb-PACMAN MULTIPLAYER
        </h1>
        <p style={{ color: "#93c5fd", margin: "6px 0 0", fontSize: 13 }}>
          4 jogadores · Tempo real · Demo acadêmica AWS
        </p>
      </header>

      {!playerName ? (
        <Lobby onJoin={(name) => setPlayerName(name)} />
      ) : (
        <Game selfId={selfId} name={playerName} />
      )}
    </div>
  );
}

function Lobby({ onJoin }: { onJoin: (name: string) => void }) {
  const [rawName, setRawName] = useState("");
  const playerName = useMemo(() => {
    const clean = rawName.trim().replace(/\s+/g, "_").replace(/[^a-zA-Z0-9_-]/g, "");
    return clean ? `lb-${clean}` : "";
  }, [rawName]);
  const handleJoin = () => {
    if (playerName) onJoin(playerName);
  };
  return (
    <div
      style={{
        maxWidth: 460,
        margin: "40px auto",
        padding: 24,
        background: "rgba(30,58,138,0.25)",
        border: "1px solid rgba(59,130,246,0.4)",
        borderRadius: 12,
      }}
    >
      <h2 style={{ marginTop: 0, color: "#FFEB3B" }}>Entrar na sala</h2>
      <p style={{ color: "#cbd5e1", fontSize: 13 }}>
        Seu nome será prefixado automaticamente com <code>lb-</code>. Compartilhe esta URL com seus colegas para jogar juntos.
      </p>
      <label style={{ display: "block", fontSize: 12, color: "#93c5fd", marginBottom: 4 }}>
        Nome do jogador
      </label>
      <div style={{ display: "flex", gap: 8 }}>
        <span
          style={{
            background: "#1e3a8a",
            padding: "10px 12px",
            borderRadius: 8,
            color: "#FFEB3B",
            fontWeight: 700,
          }}
        >
          lb-
        </span>
        <input
          autoFocus
          value={rawName}
          onChange={(e) => setRawName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleJoin()}
          placeholder="SEU_NOME"
          maxLength={16}
          style={{
            flex: 1,
            padding: "10px 12px",
            borderRadius: 8,
            border: "1px solid #3b82f6",
            background: "#000020",
            color: "#fff",
            fontFamily: "inherit",
            fontSize: 16,
          }}
        />
      </div>
      <p style={{ fontSize: 12, color: "#94a3b8", marginTop: 8, minHeight: 16 }}>
        Identificador final: <strong style={{ color: "#FFEB3B" }}>{playerName || "—"}</strong>
      </p>
      <button
        onClick={handleJoin}
        disabled={!playerName}
        style={{
          width: "100%",
          marginTop: 12,
          padding: "12px",
          borderRadius: 8,
          border: "none",
          background: playerName ? "#FFEB3B" : "#475569",
          color: "#000",
          fontWeight: 800,
          fontSize: 16,
          cursor: playerName ? "pointer" : "not-allowed",
        }}
      >
        ENTRAR NO JOGO
      </button>

      <div style={{ marginTop: 20, fontSize: 12, color: "#94a3b8" }}>
        <strong style={{ color: "#93c5fd" }}>Como jogar:</strong>
        <ul style={{ margin: "6px 0 0 18px", padding: 0 }}>
          <li>Use as setas (ou WASD) para mover</li>
          <li>Coma todas as bolinhas para vencer</li>
          <li>Bolinhas grandes deixam fantasmas vulneráveis</li>
          <li>Maior pontuação ao final vence</li>
        </ul>
      </div>
    </div>
  );
}

function Game({ selfId, name }: { selfId: string; name: string }) {
  const { state, hostId, connected, sendInput, logs } = useMultiplayer(selfId, name);
  const lastDirRef = useRef<Direction>("none");

  useEffect(() => {
    const map: Record<string, Direction> = {
      ArrowUp: "up", ArrowDown: "down", ArrowLeft: "left", ArrowRight: "right",
      w: "up", s: "down", a: "left", d: "right",
      W: "up", S: "down", A: "left", D: "right",
    };
    const onKey = (e: KeyboardEvent) => {
      const dir = map[e.key];
      if (!dir) return;
      e.preventDefault();
      if (lastDirRef.current === dir) return;
      lastDirRef.current = dir;
      sendInput(dir);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [sendInput]);

  const players = state ? Object.values(state.players).sort((a, b) => b.score - a.score) : [];

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "minmax(0, 1fr) 320px",
        gap: 16,
        maxWidth: 1100,
        margin: "0 auto",
      }}
    >
      <div>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 8,
            fontSize: 12,
            color: "#93c5fd",
          }}
        >
          <span>
            Você: <strong style={{ color: "#FFEB3B" }}>{name}</strong>
          </span>
          <span>
            {connected ? "🟢 conectado" : "🟡 conectando..."}
            {hostId === selfId && " · 👑 host"}
          </span>
        </div>
        <PacmanCanvas state={state} selfId={selfId} />
        <p
          style={{
            fontSize: 11,
            color: "#64748b",
            textAlign: "center",
            marginTop: 8,
          }}
        >
          Setas / WASD para mover · O host (primeiro a entrar) executa a lógica do jogo
        </p>
      </div>

      <aside style={{ display: "flex", flexDirection: "column", gap: 12, minWidth: 0 }}>
        <Panel title="🏆 Placar">
          {players.length === 0 ? (
            <p style={{ color: "#64748b", fontSize: 13, margin: 0 }}>Aguardando jogadores...</p>
          ) : (
            <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
              {players.map((p, i) => (
                <li
                  key={p.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    padding: "6px 0",
                    borderBottom: i < players.length - 1 ? "1px solid rgba(59,130,246,0.2)" : "none",
                  }}
                >
                  <span
                    style={{
                      width: 12,
                      height: 12,
                      borderRadius: "50%",
                      background: p.color,
                      flexShrink: 0,
                    }}
                  />
                  <span
                    style={{
                      flex: 1,
                      color: p.id === selfId ? "#FFEB3B" : "#fff",
                      fontWeight: p.id === selfId ? 700 : 400,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {p.name}
                  </span>
                  <strong style={{ color: "#fde68a" }}>{p.score}</strong>
                </li>
              ))}
            </ul>
          )}
          {state && (
            <div style={{ marginTop: 8, fontSize: 11, color: "#64748b" }}>
              Bolinhas restantes: {state.pellets.length + state.powerPellets.length}
            </div>
          )}
          {state?.winnerId && (
            <div style={{ marginTop: 8, padding: 8, background: "#FFEB3B", color: "#000", borderRadius: 6, fontWeight: 700, textAlign: "center" }}>
              🎉 Vencedor: {state.players[state.winnerId]?.name}
            </div>
          )}
        </Panel>

        <Panel title="📨 Fila de Mensagens (estilo SQS)">
          <div
            style={{
              maxHeight: 280,
              overflowY: "auto",
              fontSize: 11,
              fontFamily: "ui-monospace, monospace",
            }}
          >
            {logs.length === 0 ? (
              <p style={{ color: "#64748b", margin: 0 }}>
                Nenhuma mensagem ainda. As ações dos jogadores aparecem aqui em tempo real.
              </p>
            ) : (
              logs.map((l, i) => (
                <div
                  key={`${l.ts}-${i}`}
                  style={{
                    padding: "4px 6px",
                    borderBottom: "1px solid rgba(59,130,246,0.15)",
                    color: "#cbd5e1",
                  }}
                >
                  <span style={{ color: "#64748b" }}>
                    {new Date(l.ts).toLocaleTimeString()}
                  </span>{" "}
                  <span style={{ color: "#FFEB3B" }}>{l.name}</span>{" "}
                  <span style={{ color: "#93c5fd" }}>{l.action}</span>{" "}
                  <span style={{ color: "#64748b" }}>
                    @ ({l.position.col},{l.position.row})
                  </span>
                </div>
              ))
            )}
          </div>
        </Panel>

        <Panel title="ℹ️ Sobre">
          <p style={{ fontSize: 11, color: "#94a3b8", margin: 0, lineHeight: 1.5 }}>
            Versão jogável usando WebSocket realtime. Para a versão acadêmica oficial com
            <strong style={{ color: "#FFEB3B" }}> AWS EC2 + SQS</strong>, veja a pasta{" "}
            <code style={{ color: "#fde68a" }}>backend/</code> no projeto.
          </p>
        </Panel>
      </aside>
    </div>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section
      style={{
        background: "rgba(30,58,138,0.25)",
        border: "1px solid rgba(59,130,246,0.4)",
        borderRadius: 10,
        padding: 12,
      }}
    >
      <h3 style={{ margin: "0 0 8px", fontSize: 13, color: "#FFEB3B", letterSpacing: 1 }}>
        {title}
      </h3>
      {children}
    </section>
  );
}
