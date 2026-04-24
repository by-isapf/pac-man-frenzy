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

const FONT_DISPLAY =
  "'Segoe UI', system-ui, -apple-system, 'Helvetica Neue', sans-serif";
const FONT_MONO = "ui-monospace, 'JetBrains Mono', SFMono-Regular, Menlo, monospace";

const COLORS = {
  bg: "#05050f",
  surface: "rgba(20,25,55,0.55)",
  surfaceBorder: "rgba(96,165,250,0.25)",
  accent: "#fbbf24", // amber/yellow
  accent2: "#60a5fa", // blue
  accent3: "#f472b6", // pink
  text: "#f1f5f9",
  textDim: "#94a3b8",
  textFaint: "#64748b",
};

function Index() {
  const [playerName, setPlayerName] = useState<string | null>(null);
  const [selfId] = useState(() => genId());

  return (
    <div
      style={{
        minHeight: "100vh",
        background: `
          radial-gradient(circle at 20% 0%, rgba(96,165,250,0.18) 0%, transparent 45%),
          radial-gradient(circle at 80% 100%, rgba(244,114,182,0.12) 0%, transparent 45%),
          linear-gradient(180deg, #07071a 0%, ${COLORS.bg} 100%)
        `,
        color: COLORS.text,
        fontFamily: FONT_DISPLAY,
        padding: "24px 16px 40px",
      }}
    >
      <Header />
      {!playerName ? (
        <Lobby onJoin={(name) => setPlayerName(name)} />
      ) : (
        <Game selfId={selfId} name={playerName} />
      )}
    </div>
  );
}

function Header() {
  return (
    <header
      style={{
        textAlign: "center",
        marginBottom: 24,
        maxWidth: 1100,
        margin: "0 auto 24px",
      }}
    >
      <div
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 8,
          padding: "4px 12px",
          borderRadius: 999,
          background: "rgba(96,165,250,0.1)",
          border: `1px solid ${COLORS.surfaceBorder}`,
          fontSize: 11,
          color: COLORS.accent2,
          letterSpacing: 1.5,
          textTransform: "uppercase",
          marginBottom: 12,
        }}
      >
        <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#22c55e" }} />
        Tempo real · Demo AWS
      </div>
      <h1
        style={{
          fontSize: 38,
          fontWeight: 900,
          margin: 0,
          background: `linear-gradient(135deg, ${COLORS.accent} 0%, ${COLORS.accent3} 100%)`,
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
          letterSpacing: -1,
          lineHeight: 1.1,
        }}
      >
        lb-PACMAN
      </h1>
      <p style={{ color: COLORS.textDim, margin: "8px 0 0", fontSize: 14, fontWeight: 500 }}>
        Multiplayer arcade · até 4 jogadores simultâneos
      </p>
    </header>
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
        maxWidth: 480,
        margin: "32px auto",
        padding: 28,
        background: COLORS.surface,
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        border: `1px solid ${COLORS.surfaceBorder}`,
        borderRadius: 18,
        boxShadow: "0 30px 80px -20px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.03) inset",
      }}
    >
      <h2 style={{ marginTop: 0, marginBottom: 6, fontSize: 22, fontWeight: 700, color: COLORS.text }}>
        Entrar na sala
      </h2>
      <p style={{ color: COLORS.textDim, fontSize: 13, marginTop: 0, lineHeight: 1.5 }}>
        Seu nome recebe o prefixo <code style={{ color: COLORS.accent, background: "rgba(251,191,36,0.1)", padding: "1px 6px", borderRadius: 4 }}>lb-</code> automaticamente. Compartilhe esta URL para jogar com seus colegas.
      </p>

      <label
        style={{
          display: "block",
          fontSize: 11,
          fontWeight: 600,
          color: COLORS.accent2,
          marginTop: 18,
          marginBottom: 6,
          letterSpacing: 1,
          textTransform: "uppercase",
        }}
      >
        Nome do jogador
      </label>
      <div
        style={{
          display: "flex",
          alignItems: "stretch",
          background: "rgba(0,0,0,0.4)",
          border: `1px solid ${COLORS.surfaceBorder}`,
          borderRadius: 10,
          overflow: "hidden",
        }}
      >
        <span
          style={{
            display: "flex",
            alignItems: "center",
            padding: "0 14px",
            background: "rgba(96,165,250,0.12)",
            color: COLORS.accent,
            fontWeight: 700,
            fontFamily: FONT_MONO,
            fontSize: 14,
            borderRight: `1px solid ${COLORS.surfaceBorder}`,
          }}
        >
          lb-
        </span>
        <input
          autoFocus
          value={rawName}
          onChange={(e) => setRawName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleJoin()}
          placeholder="seu_nome"
          maxLength={16}
          style={{
            flex: 1,
            padding: "12px 14px",
            border: "none",
            background: "transparent",
            color: COLORS.text,
            fontFamily: FONT_MONO,
            fontSize: 15,
            outline: "none",
          }}
        />
      </div>
      <p style={{ fontSize: 12, color: COLORS.textFaint, marginTop: 8, minHeight: 18 }}>
        Identificador final:{" "}
        <strong style={{ color: COLORS.accent, fontFamily: FONT_MONO }}>
          {playerName || "—"}
        </strong>
      </p>

      <button
        onClick={handleJoin}
        disabled={!playerName}
        style={{
          width: "100%",
          marginTop: 8,
          padding: "14px",
          borderRadius: 10,
          border: "none",
          background: playerName
            ? `linear-gradient(135deg, ${COLORS.accent} 0%, #f59e0b 100%)`
            : "rgba(71,85,105,0.5)",
          color: playerName ? "#1a1a2e" : "#94a3b8",
          fontWeight: 800,
          fontSize: 15,
          letterSpacing: 1,
          cursor: playerName ? "pointer" : "not-allowed",
          textTransform: "uppercase",
          boxShadow: playerName
            ? "0 10px 30px -10px rgba(251,191,36,0.6)"
            : "none",
          transition: "transform 0.15s, box-shadow 0.15s",
        }}
        onMouseEnter={(e) => {
          if (playerName) e.currentTarget.style.transform = "translateY(-1px)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = "translateY(0)";
        }}
      >
        Entrar no jogo →
      </button>

      <div
        style={{
          marginTop: 22,
          padding: 14,
          background: "rgba(0,0,0,0.25)",
          borderRadius: 10,
          border: `1px solid rgba(96,165,250,0.15)`,
        }}
      >
        <div
          style={{
            fontSize: 11,
            color: COLORS.accent2,
            fontWeight: 600,
            letterSpacing: 1,
            textTransform: "uppercase",
            marginBottom: 8,
          }}
        >
          Como jogar
        </div>
        <ul style={{ margin: 0, padding: 0, listStyle: "none", fontSize: 13, color: COLORS.textDim, lineHeight: 1.7 }}>
          <li>↑ ↓ ← → ou W A S D para mover</li>
          <li>● Coma todas as bolinhas para vencer</li>
          <li>◉ Bolinhas grandes deixam fantasmas vulneráveis</li>
          <li>★ Maior pontuação ao final vence</li>
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
  const remaining = state ? state.pellets.length + state.powerPellets.length : 0;

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "minmax(0, 1fr) 320px",
        gap: 20,
        maxWidth: 1140,
        margin: "0 auto",
      }}
    >
      <div>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 12,
            padding: "10px 14px",
            borderRadius: 10,
            background: COLORS.surface,
            backdropFilter: "blur(8px)",
            border: `1px solid ${COLORS.surfaceBorder}`,
            fontSize: 13,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ color: COLORS.textDim }}>Jogador</span>
            <strong style={{ color: COLORS.accent, fontFamily: FONT_MONO }}>{name}</strong>
            {hostId === selfId && (
              <span
                style={{
                  fontSize: 10,
                  padding: "2px 8px",
                  borderRadius: 999,
                  background: "rgba(251,191,36,0.15)",
                  color: COLORS.accent,
                  fontWeight: 700,
                  letterSpacing: 1,
                }}
              >
                HOST
              </span>
            )}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6, color: COLORS.textDim, fontSize: 12 }}>
            <span
              style={{
                width: 8,
                height: 8,
                borderRadius: "50%",
                background: connected ? "#22c55e" : "#fbbf24",
                boxShadow: connected ? "0 0 8px #22c55e" : "0 0 8px #fbbf24",
              }}
            />
            {connected ? "conectado" : "conectando..."}
          </div>
        </div>

        <PacmanCanvas state={state} selfId={selfId} />

        <p
          style={{
            fontSize: 12,
            color: COLORS.textFaint,
            textAlign: "center",
            marginTop: 12,
          }}
        >
          Setas / WASD para mover · O host (primeiro a entrar) executa a lógica do jogo
        </p>
      </div>

      <aside style={{ display: "flex", flexDirection: "column", gap: 14, minWidth: 0 }}>
        <Panel title="Placar" icon="🏆">
          {players.length === 0 ? (
            <p style={{ color: COLORS.textFaint, fontSize: 13, margin: 0 }}>Aguardando jogadores...</p>
          ) : (
            <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
              {players.map((p, i) => (
                <li
                  key={p.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    padding: "8px 0",
                    borderBottom:
                      i < players.length - 1 ? `1px solid rgba(96,165,250,0.12)` : "none",
                  }}
                >
                  <span
                    style={{
                      width: 10,
                      height: 10,
                      borderRadius: "50%",
                      background: p.color,
                      flexShrink: 0,
                      boxShadow: `0 0 8px ${p.color}`,
                    }}
                  />
                  <span
                    style={{
                      flex: 1,
                      color: p.id === selfId ? COLORS.accent : COLORS.text,
                      fontWeight: p.id === selfId ? 700 : 500,
                      fontSize: 13,
                      fontFamily: FONT_MONO,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {p.name}
                  </span>
                  <strong
                    style={{
                      color: COLORS.accent,
                      fontVariantNumeric: "tabular-nums",
                      fontSize: 14,
                    }}
                  >
                    {p.score}
                  </strong>
                </li>
              ))}
            </ul>
          )}
          {state && (
            <div
              style={{
                marginTop: 12,
                paddingTop: 10,
                borderTop: `1px solid rgba(96,165,250,0.12)`,
                fontSize: 11,
                color: COLORS.textFaint,
                display: "flex",
                justifyContent: "space-between",
              }}
            >
              <span>Bolinhas restantes</span>
              <strong style={{ color: COLORS.accent2 }}>{remaining}</strong>
            </div>
          )}
          {state?.winnerId && (
            <div
              style={{
                marginTop: 12,
                padding: "10px 12px",
                background: `linear-gradient(135deg, ${COLORS.accent}, #f59e0b)`,
                color: "#1a1a2e",
                borderRadius: 8,
                fontWeight: 800,
                textAlign: "center",
                fontSize: 13,
              }}
            >
              🎉 Vencedor: {state.players[state.winnerId]?.name}
            </div>
          )}
        </Panel>

        <Panel title="Fila SQS" icon="📨" subtitle="ações em tempo real">
          <div
            style={{
              maxHeight: 280,
              overflowY: "auto",
              fontSize: 11,
              fontFamily: FONT_MONO,
              margin: "-4px -4px 0",
              padding: "0 4px",
            }}
          >
            {logs.length === 0 ? (
              <p style={{ color: COLORS.textFaint, margin: 0, fontFamily: FONT_DISPLAY }}>
                Nenhuma mensagem ainda.
              </p>
            ) : (
              logs.map((l, i) => (
                <div
                  key={`${l.ts}-${i}`}
                  style={{
                    padding: "5px 6px",
                    borderBottom: `1px solid rgba(96,165,250,0.08)`,
                    color: COLORS.textDim,
                    display: "flex",
                    gap: 6,
                    alignItems: "baseline",
                  }}
                >
                  <span style={{ color: COLORS.textFaint, fontSize: 10 }}>
                    {new Date(l.ts).toLocaleTimeString().slice(0, 8)}
                  </span>
                  <span style={{ color: COLORS.accent, fontWeight: 700 }}>{l.name}</span>
                  <span style={{ color: COLORS.accent2, flex: 1 }}>{l.action}</span>
                  <span style={{ color: COLORS.textFaint, fontSize: 10 }}>
                    ({l.position.col},{l.position.row})
                  </span>
                </div>
              ))
            )}
          </div>
        </Panel>

        <Panel title="Sobre" icon="ℹ️">
          <p style={{ fontSize: 12, color: COLORS.textDim, margin: 0, lineHeight: 1.6 }}>
            Versão jogável usando WebSocket realtime. Para a versão acadêmica oficial com{" "}
            <strong style={{ color: COLORS.accent }}>AWS EC2 + SQS</strong>, veja a pasta{" "}
            <code style={{ color: COLORS.accent, background: "rgba(251,191,36,0.1)", padding: "1px 5px", borderRadius: 4 }}>
              backend/
            </code>{" "}
            no projeto.
          </p>
        </Panel>
      </aside>
    </div>
  );
}

function Panel({
  title,
  icon,
  subtitle,
  children,
}: {
  title: string;
  icon?: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <section
      style={{
        background: COLORS.surface,
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        border: `1px solid ${COLORS.surfaceBorder}`,
        borderRadius: 14,
        padding: 16,
        boxShadow: "0 20px 50px -20px rgba(0,0,0,0.5)",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "baseline",
          justifyContent: "space-between",
          marginBottom: 12,
        }}
      >
        <h3
          style={{
            margin: 0,
            fontSize: 13,
            color: COLORS.text,
            fontWeight: 700,
            letterSpacing: 0.5,
            display: "flex",
            alignItems: "center",
            gap: 6,
          }}
        >
          {icon && <span>{icon}</span>}
          {title}
        </h3>
        {subtitle && (
          <span
            style={{
              fontSize: 10,
              color: COLORS.textFaint,
              textTransform: "uppercase",
              letterSpacing: 1,
            }}
          >
            {subtitle}
          </span>
        )}
      </div>
      {children}
    </section>
  );
}
