/**
 * Position-level graph helpers shared by the solvers and transmuters.
 *
 * Positions are encoded as flat indices `r * cols + c`. The walkable graph is
 * the set of open positions with 4-adjacency; a designated `target` position
 * is walkable even when it is a wall (outer entrances are border walls). This
 * matches how the goldens checker measures reachability and distance.
 */
import type { Cell, Grid } from "../grid.js";
import { rng } from "../rng.js";

/** Row/column offsets, clockwise from north. */
export const DR = [-1, 0, 1, 0] as const;
export const DC = [0, 1, 0, -1] as const;

export function idx(g: Grid, p: Cell): number {
  return p[0] * g.cols + p[1];
}

export function cellOf(g: Grid, i: number): Cell {
  return [Math.floor(i / g.cols), i % g.cols];
}

/** Neighbour of `i` in direction `d`, or -1 when outside the grid. */
export function step(g: Grid, i: number, d: number): number {
  const r = Math.floor(i / g.cols) + DR[d];
  const c = (i % g.cols) + DC[d];
  if (r < 0 || r >= g.rows || c < 0 || c >= g.cols) return -1;
  return r * g.cols + c;
}

/** True when `i` may be entered: open, or the target. */
export function walkable(g: Grid, i: number, target: number): boolean {
  return i === target || g.data[i] === 0;
}

/** Walkable neighbours of `i`, in direction order. */
export function neighbours(g: Grid, i: number, target: number): number[] {
  const out: number[] = [];
  for (let d = 0; d < 4; d++) {
    const j = step(g, i, d);
    if (j >= 0 && walkable(g, j, target)) out.push(j);
  }
  return out;
}

/**
 * Breadth-first distances from `src` (always included, wall or not) over open
 * positions plus `target`. The target is not expanded further. Unreached = -1.
 */
export function bfs(g: Grid, src: number, target: number): Int32Array {
  const dist = new Int32Array(g.rows * g.cols).fill(-1);
  const queue = new Int32Array(g.rows * g.cols + 1);
  let head = 0;
  let tail = 0;
  dist[src] = 0;
  queue[tail++] = src;
  while (head < tail) {
    const cur = queue[head++];
    if (cur === target && cur !== src) continue;
    for (let d = 0; d < 4; d++) {
      const j = step(g, cur, d);
      if (j < 0 || dist[j] !== -1 || !walkable(g, j, target)) continue;
      dist[j] = dist[cur] + 1;
      queue[tail++] = j;
    }
  }
  return dist;
}

/** Shortest number of steps from `s` to `t`, or -1 when unreachable. */
export function distance(g: Grid, s: number, t: number): number {
  if (s === t) return 0;
  return bfs(g, s, t)[t];
}

/**
 * Up to `cap` distinct shortest walks from `s` to `t`, each listing every
 * position from `s` to `t` inclusive. Empty when unreachable.
 */
export function shortestWalks(g: Grid, s: number, t: number, cap: number): number[][] {
  const ds = bfs(g, s, t);
  const best = ds[t];
  if (best < 0) return [];
  if (s === t) return [[s]];
  const dt = bfs(g, t, s);
  const out: number[][] = [];
  // Iterative DFS over the shortest-path DAG; `dirs[k]` is the next direction to try at walk[k].
  const walk: number[] = [s];
  const dirs: number[] = [0];
  while (walk.length > 0 && out.length < cap) {
    const k = walk.length - 1;
    const cur = walk[k];
    if (cur === t) {
      out.push(walk.slice());
      walk.pop();
      dirs.pop();
      continue;
    }
    let advanced = false;
    while (dirs[k] < 4) {
      const d = dirs[k]++;
      const j = step(g, cur, d);
      if (j < 0) continue;
      if (ds[j] !== ds[cur] + 1 || dt[j] < 0 || ds[j] + dt[j] !== best) continue;
      if (j !== t && g.data[j] !== 0) continue;
      walk.push(j);
      dirs.push(0);
      advanced = true;
      break;
    }
    if (!advanced) {
      walk.pop();
      dirs.pop();
    }
  }
  return out;
}

/**
 * Randomised depth-first walk from `s` to `t` (a "backtracking robot"): at
 * each step it moves to a random unvisited walkable neighbour, and steps back
 * along its own trail when there is none. Returns every position walked, `s`
 * and `t` inclusive, or null when `t` is not reachable. At most ~2N steps.
 */
export function randomDfsWalk(g: Grid, s: number, t: number, firstDir = -1): number[] | null {
  const visited = new Uint8Array(g.rows * g.cols);
  const stack: number[] = [s];
  const walk: number[] = [s];
  visited[s] = 1;
  if (firstDir >= 0 && s !== t) {
    const j = step(g, s, firstDir);
    if (j >= 0 && walkable(g, j, t)) {
      visited[j] = 1;
      stack.push(j);
      walk.push(j);
    }
  }
  while (stack.length > 0) {
    const cur = stack[stack.length - 1];
    if (cur === t) return walk;
    const cand: number[] = [];
    for (let d = 0; d < 4; d++) {
      const j = step(g, cur, d);
      if (j >= 0 && !visited[j] && walkable(g, j, t)) cand.push(j);
    }
    if (cand.length > 0) {
      const nxt = cand.length === 1 ? cand[0] : cand[rng.py.randbelow(cand.length)];
      visited[nxt] = 1;
      stack.push(nxt);
      walk.push(nxt);
    } else {
      stack.pop();
      if (stack.length > 0) walk.push(stack[stack.length - 1]);
    }
  }
  return null;
}

/** Number of open positions and of 4-connected components among them. */
export function componentLabels(g: Grid): { labels: Int32Array; count: number } {
  const n = g.rows * g.cols;
  const labels = new Int32Array(n).fill(-1);
  const queue = new Int32Array(n);
  let count = 0;
  for (let i = 0; i < n; i++) {
    if (g.data[i] !== 0 || labels[i] !== -1) continue;
    let head = 0;
    let tail = 0;
    queue[tail++] = i;
    labels[i] = count;
    while (head < tail) {
      const cur = queue[head++];
      for (let d = 0; d < 4; d++) {
        const j = step(g, cur, d);
        if (j >= 0 && g.data[j] === 0 && labels[j] === -1) {
          labels[j] = count;
          queue[tail++] = j;
        }
      }
    }
    count++;
  }
  return { labels, count };
}

/** Open area is one connected, acyclic component (same definition as the checker). */
export function isPerfect(g: Grid): boolean {
  let open = 0;
  let edges = 0;
  for (let r = 0; r < g.rows; r++) {
    for (let c = 0; c < g.cols; c++) {
      if (g.get(r, c) !== 0) continue;
      open++;
      if (c + 1 < g.cols && g.get(r, c + 1) === 0) edges++;
      if (r + 1 < g.rows && g.get(r + 1, c) === 0) edges++;
    }
  }
  if (open === 0) return false;
  return componentLabels(g).count === 1 && edges === open - 1;
}
