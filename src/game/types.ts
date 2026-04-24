export type Direction = "up" | "down" | "left" | "right" | "none";

export interface Player {
  id: string;        // session id
  name: string;      // lb-NOME
  col: number;
  row: number;
  dir: Direction;
  nextDir: Direction;
  score: number;
  alive: boolean;
  color: string;     // hex
  joinedAt: number;
}

export interface Ghost {
  id: string;
  col: number;
  row: number;
  dir: Direction;
  color: string;
  scaredUntil: number; // timestamp ms
}

export interface GameState {
  tick: number;
  hostId: string;
  players: Record<string, Player>;
  ghosts: Ghost[];
  pellets: number[]; // flat indices remaining (row*COLS+col)
  powerPellets: number[];
  startedAt: number;
  winnerId: string | null;
}

export interface InputMsg {
  type: "input";
  playerId: string;
  name: string;
  dir: Direction;
  ts: number;
}

export interface StateMsg {
  type: "state";
  state: GameState;
  ts: number;
}

export interface JoinMsg {
  type: "join";
  playerId: string;
  name: string;
  ts: number;
}

export type RoomMsg = InputMsg | StateMsg | JoinMsg;
