/**
 * Internal helpers shared by the generators. Generators mostly work in cell
 * coordinates (i, j) = cell row/column; cell (i, j) lives at grid (2i+1, 2j+1).
 */
import { rng } from "../rng.js";
import { Grid, OPEN } from "../grid.js";

/** Row/column deltas of the four orthogonal directions: N, E, S, W. */
export const DR = [-1, 0, 1, 0] as const;
export const DC = [0, 1, 0, -1] as const;

/** Uniform integer in [0, n) from the shared Py stream. */
export function randBelow(n: number): number {
  return rng.py.randbelow(n);
}

/** Uniform float in [0, 1) from the shared Py stream. */
export function randFloat(): number {
  return rng.py.random();
}

/** Open the cell (i, j). */
export function openCell(g: Grid, i: number, j: number): void {
  g.set(2 * i + 1, 2 * j + 1, OPEN);
}

/** Open both cells (i1, j1), (i2, j2) (orthogonal neighbors) and the wall slot between them. */
export function carve(g: Grid, i1: number, j1: number, i2: number, j2: number): void {
  g.set(2 * i1 + 1, 2 * j1 + 1, OPEN);
  g.set(2 * i2 + 1, 2 * j2 + 1, OPEN);
  g.set(i1 + i2 + 1, j1 + j2 + 1, OPEN);
}

/** Trimmed, case-insensitive match of a string option against `keyword`. */
export function isKeyword(v: unknown, keyword: string): boolean {
  return typeof v === "string" && v.trim().toLowerCase() === keyword;
}

/**
 * Hunt-and-kill over a cell-visited bitmap, carving into `g`.
 * `visited[i*w+j]` is 1 for visited cells; walks only enter unvisited cells.
 * Starts walking from `(si, sj)`, which must already be visited.
 * With `serpentine` the hunt scans in reading order; otherwise it probes h*w
 * random cells and then falls back to a reading-order scan, so every cell
 * reachable from visited territory ends up visited.
 */
export function huntAndKill(
  g: Grid,
  h: number,
  w: number,
  visited: Uint8Array,
  si: number,
  sj: number,
  serpentine: boolean,
): void {
  const n = h * w;
  const opts = new Int32Array(4);

  const unvisitedNeighbors = (i: number, j: number): number => {
    let k = 0;
    for (let d = 0; d < 4; d++) {
      const ni = i + DR[d];
      const nj = j + DC[d];
      if (ni >= 0 && ni < h && nj >= 0 && nj < w && !visited[ni * w + nj]) opts[k++] = d;
    }
    return k;
  };

  let minNew = n; // smallest index visited by the latest walk
  const walk = (i: number, j: number): void => {
    minNew = n;
    for (;;) {
      const k = unvisitedNeighbors(i, j);
      if (k === 0) return;
      const d = opts[randBelow(k)];
      const ni = i + DR[d];
      const nj = j + DC[d];
      carve(g, i, j, ni, nj);
      const idx = ni * w + nj;
      visited[idx] = 1;
      if (idx < minNew) minNew = idx;
      i = ni;
      j = nj;
    }
  };

  const huntable = (idx: number): boolean => {
    if (!visited[idx]) return false;
    return unvisitedNeighbors((idx / w) | 0, idx % w) > 0;
  };

  walk(si, sj);
  let probes = serpentine ? 0 : n;
  // Reading-order scan pointer. Every cell before it is unvisited or has no
  // unvisited neighbor; only cells newly visited by a walk can break that,
  // so after each walk the pointer moves back to the smallest such index.
  let scan = 0;
  for (;;) {
    let found = -1;
    while (probes > 0 && found < 0) {
      probes--;
      const idx = randBelow(n);
      if (huntable(idx)) found = idx;
    }
    if (found < 0) {
      while (scan < n && !huntable(scan)) scan++;
      if (scan >= n) return;
      found = scan;
    }
    walk((found / w) | 0, found % w);
    if (minNew < scan) scan = minNew;
  }
}
