// Pac-Man maze. 0 = empty, 1 = wall, 2 = pellet, 3 = power pellet, 4 = spawn
// Width 19, Height 21. Symmetric, classic-ish layout.
export const MAZE_RAW: string[] = [
  "1111111111111111111",
  "1222222221222222221",
  "1211112121212111121",
  "1311112121212111131",
  "1222222222222222221",
  "1211121111121112121",
  "1222121222121222121",
  "1112121211121211121",
  "0012122222222221200",
  "1112121211111211121",
  "1222121222221212221",
  "1211121211121212121",
  "1222222221222222221",
  "1211112121212111121",
  "1322222222422222231",
  "1212111121211112121",
  "1222121222121212221",
  "1112121211121211121",
  "1222222222222222221",
  "1211111111111111121",
  "1111111111111111111",
];

export const COLS = MAZE_RAW[0].length; // 19
export const ROWS = MAZE_RAW.length;    // 21
export const TILE = 24;                 // px per tile

export type Cell = 0 | 1 | 2 | 3 | 4;

export function buildGrid(): Cell[][] {
  return MAZE_RAW.map((row) =>
    row.split("").map((c) => Number(c) as Cell),
  );
}

export function isWall(grid: Cell[][], col: number, row: number): boolean {
  if (row < 0 || row >= ROWS) return true;
  // horizontal tunnel wrap
  if (col < 0 || col >= COLS) return false;
  return grid[row][col] === 1;
}

export function totalPellets(grid: Cell[][]): number {
  let n = 0;
  for (const row of grid) for (const c of row) if (c === 2 || c === 3) n++;
  return n;
}

export const SPAWN_POINTS: Array<{ col: number; row: number }> = [
  { col: 1, row: 1 },
  { col: 17, row: 1 },
  { col: 1, row: 19 },
  { col: 17, row: 19 },
];

export const GHOST_SPAWNS: Array<{ col: number; row: number }> = [
  { col: 9, row: 8 },
  { col: 8, row: 14 },
  { col: 10, row: 14 },
];
