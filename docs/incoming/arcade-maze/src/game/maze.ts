// Shared maze layout used by every level of the game.
// Legend:
//  #  wall
//  .  dot (small pellet)
//  o  power pellet
//  -  ghost house gate (walkable)
//     (space) walkable empty cell (ghost house floor / tunnel mouth)

export const RAW_MAZE = [
  "###############",
  "#o....#.#....o#",
  "#.###.#.#.###.#",
  "#.............#",
  "#.###.###.###.#",
  "#.............#",
  "#.###.#.#.###.#",
  "#.....#-#.....#",
  " .....   ..... ",
  "#.....###.....#",
  "#.###.#.#.###.#",
  "#.............#",
  "#.###.###.###.#",
  "#.............#",
  "#.###.#.#.###.#",
  "#o....#.#....o#",
  "###############",
];

export const COLS = RAW_MAZE[0].length;
export const ROWS = RAW_MAZE.length;

export type CellType = "wall" | "empty" | "dot" | "pellet";

export function buildGrid(): CellType[][] {
  return RAW_MAZE.map((row) =>
    row.split("").map((ch): CellType => {
      if (ch === "#") return "wall";
      if (ch === ".") return "dot";
      if (ch === "o") return "pellet";
      return "empty"; // space or gate
    })
  );
}

export function isWalkable(grid: CellType[][], row: number, col: number): boolean {
  const wrappedCol = ((col % COLS) + COLS) % COLS;
  if (row < 0 || row >= ROWS) return false;
  return grid[row][wrappedCol] !== "wall";
}

export const PLAYER_START = { row: 13, col: 7 };
export const GHOST_HOUSE_CENTER = { row: 8, col: 7 };
export const GHOST_EXIT = { row: 6, col: 7 };

export const GHOST_STARTS = [
  { row: 8, col: 6 },
  { row: 8, col: 7 },
  { row: 8, col: 8 },
  { row: 8, col: 7 },
];

export const SCATTER_CORNERS = [
  { row: 1, col: 13 },
  { row: 1, col: 1 },
  { row: 15, col: 13 },
  { row: 15, col: 1 },
];

export function countPellets(grid: CellType[][]): number {
  let n = 0;
  for (const row of grid) {
    for (const cell of row) {
      if (cell === "dot" || cell === "pellet") n++;
    }
  }
  return n;
}
