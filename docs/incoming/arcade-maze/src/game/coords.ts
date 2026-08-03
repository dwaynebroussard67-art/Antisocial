import { COLS, ROWS } from "./maze";
import type { Dir } from "./types";

export function toWorld(row: number, col: number) {
  return { x: col - (COLS - 1) / 2, z: row - (ROWS - 1) / 2 };
}

const DIR_VEC_3D: Record<Dir, { dx: number; dz: number }> = {
  right: { dx: 1, dz: 0 },
  left: { dx: -1, dz: 0 },
  down: { dx: 0, dz: 1 },
  up: { dx: 0, dz: -1 },
  none: { dx: 1, dz: 0 },
};

export function dirAngle3D(dir: Dir): number {
  const { dx, dz } = DIR_VEC_3D[dir];
  return Math.atan2(-dz, dx);
}

export { COLS, ROWS };
