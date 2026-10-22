/**
 * Random-walk style solvers: BacktrackingSolver, RandomMouse, Tremaux, Chain.
 * All walk on open grid positions with 4-adjacency (the end may be a wall).
 * Each first checks reachability, so it returns `[]` instead of looping
 * forever when the end cannot be reached, and each is bounded in steps.
 */
import type { Cell, Grid } from "../grid.js";
import { rng } from "../rng.js";
import { MazeSolver, type Path } from "./base.js";
import { distance, idx, neighbours, randomDfsWalk, step, walkable } from "./graph.js";

/** Randomised depth-first search that backs up along its trail only at dead ends. */
export class BacktrackingSolver extends MazeSolver {
  solve(grid: Grid, start: Cell, end: Cell): Path[] {
    this.validate(grid, start, end);
    const s = idx(grid, start);
    const t = idx(grid, end);
    const walk = randomDfsWalk(grid, s, t);
    return walk === null ? [] : [this.walkToPath(grid, walk)];
  }
}

/**
 * Random mouse: moves to a uniformly chosen walkable neighbour (going back is
 * allowed). After a step budget it finishes with a backtracking robot from
 * wherever it stands, so it always terminates.
 */
export class RandomMouse extends MazeSolver {
  solve(grid: Grid, start: Cell, end: Cell): Path[] {
    this.validate(grid, start, end);
    const s = idx(grid, start);
    const t = idx(grid, end);
    if (s !== t && distance(grid, s, t) < 0) return [];
    let open = 0;
    for (let i = 0; i < grid.data.length; i++) if (grid.data[i] === 0) open++;
    const budget = 8 * (open + 2);
    const walk: number[] = [s];
    let cur = s;
    for (let n = 0; n < budget && cur !== t; n++) {
      const nb = neighbours(grid, cur, t);
      if (nb.length === 0) break;
      cur = nb.length === 1 ? nb[0] : nb[rng.py.randbelow(nb.length)];
      walk.push(cur);
    }
    if (cur !== t) {
      const rest = randomDfsWalk(grid, cur, t);
      if (rest === null) return [];
      for (let i = 1; i < rest.length; i++) walk.push(rest[i]);
    }
    return [this.walkToPath(grid, walk)];
  }
}

/**
 * Trémaux's algorithm with passage marks: never take a passage marked twice,
 * prefer unmarked passages (chosen at random), turn back when a new passage
 * leads to an already visited position, and otherwise retreat along the
 * passage by which the position was first entered. Each passage is walked at
 * most twice, so the walk is bounded.
 */
export class Tremaux extends MazeSolver {
  solve(grid: Grid, start: Cell, end: Cell): Path[] {
    this.validate(grid, start, end);
    const s = idx(grid, start);
    const t = idx(grid, end);
    const n = grid.rows * grid.cols;
    const marks = new Uint8Array(n * 4);
    const visited = new Uint8Array(n);
    const entry = new Int8Array(n).fill(-1);
    const walk: number[] = [s];
    visited[s] = 1;
    let cur = s;
    let bounce = -1; // direction to turn back along, or -1
    const limit = 8 * n + 8;
    for (let k = 0; k < limit && cur !== t; k++) {
      let d = -1;
      if (bounce >= 0) {
        d = bounce;
      } else {
        const fresh: number[] = [];
        for (let e = 0; e < 4; e++) {
          const j = step(grid, cur, e);
          if (j >= 0 && marks[cur * 4 + e] === 0 && walkable(grid, j, t)) fresh.push(e);
        }
        if (fresh.length > 0) d = fresh.length === 1 ? fresh[0] : fresh[rng.py.randbelow(fresh.length)];
        else d = entry[cur];
      }
      if (d < 0) return []; // back at the start with every passage used: unreachable
      const j = step(grid, cur, d);
      const back = (d + 2) % 4;
      marks[cur * 4 + d]++;
      marks[j * 4 + back]++;
      const m = marks[cur * 4 + d];
      if (!visited[j]) {
        visited[j] = 1;
        entry[j] = back;
        bounce = -1;
      } else {
        bounce = m === 1 ? back : -1;
      }
      cur = j;
      walk.push(cur);
    }
    if (cur !== t) return [];
    // Always report the start first (like the original Trémaux trail).
    const path = this.walkToPath(grid, walk);
    if (grid.data[s] !== 0) path.unshift([start[0], start[1]]);
    return [path];
  }
}

/**
 * Chain: follow a straight-ish guide line of points from the start toward the
 * end, taking the direct route between consecutive points when it is open and
 * otherwise sending backtracking robots (one per open direction) and keeping
 * the shortest robot route.
 */
export class Chain extends MazeSolver {
  readonly turn: "right" | "left";

  constructor(turn: string = "right") {
    super();
    this.turn = turn === "left" ? "left" : "right";
  }

  solve(grid: Grid, start: Cell, end: Cell): Path[] {
    this.validate(grid, start, end);
    const s = idx(grid, start);
    const t = idx(grid, end);
    if (s !== t && distance(grid, s, t) < 0) return [];
    const targets = this.guideLine(grid, start, end);
    const walk: number[] = [s];
    let cur = s;
    for (const p of targets) {
      if (cur === t) break;
      const q = idx(grid, p);
      if (q === cur || !walkable(grid, q, t)) continue;
      const direct = this.directRoute(grid, cur, q, t);
      if (direct !== null) {
        for (const x of direct) walk.push(x);
        cur = q;
        continue;
      }
      if (distance(grid, cur, q) < 0) continue; // skip guide points that cannot be reached
      const route = this.robots(grid, cur, q);
      if (route === null) continue;
      for (let i = 1; i < route.length; i++) walk.push(route[i]);
      cur = q;
    }
    if (cur !== t) {
      const rest = randomDfsWalk(grid, cur, t);
      if (rest === null) return [];
      for (let i = 1; i < rest.length; i++) walk.push(rest[i]);
    }
    return [this.walkToPath(grid, walk)];
  }

  /** Guide points: inward start, then steps of two toward the end, then the end. */
  private guideLine(grid: Grid, start: Cell, end: Cell): Cell[] {
    let [r, c] = start;
    if (r === 0) r = 1;
    else if (r === grid.rows - 1) r = grid.rows - 2;
    else if (c === 0) c = 1;
    else if (c === grid.cols - 1) c = grid.cols - 2;
    const out: Cell[] = [[r, c]];
    const arrived = (rr: number, cc: number): boolean =>
      (rr === end[0] && Math.abs(cc - end[1]) <= 1) || (cc === end[1] && Math.abs(rr - end[0]) <= 1);
    let guard = grid.rows + grid.cols + 4;
    while (!arrived(r, c) && guard-- > 0) {
      const dr = end[0] - r;
      const dc = end[1] - c;
      const nr = Math.abs(dr) > 1 ? r + 2 * Math.sign(dr) : r;
      const nc = Math.abs(dc) > 1 ? c + 2 * Math.sign(dc) : c;
      if (nr === r && nc === c) break;
      if (nr < 0 || nr >= grid.rows || nc < 0 || nc >= grid.cols) break;
      r = nr;
      c = nc;
      out.push([r, c]);
    }
    out.push([end[0], end[1]]);
    return out;
  }

  /** Positions after `a` up to and including `b` along an open L/straight route, or null. */
  private directRoute(grid: Grid, a: number, b: number, t: number): number[] | null {
    const ar = Math.floor(a / grid.cols);
    const ac = a % grid.cols;
    const br = Math.floor(b / grid.cols);
    const bc = b % grid.cols;
    const tryRoute = (rowFirst: boolean): number[] | null => {
      const out: number[] = [];
      let r = ar;
      let c = ac;
      const moveRow = (): boolean => {
        while (r !== br) {
          r += Math.sign(br - r);
          const i = r * grid.cols + c;
          if (!walkable(grid, i, t)) return false;
          out.push(i);
        }
        return true;
      };
      const moveCol = (): boolean => {
        while (c !== bc) {
          c += Math.sign(bc - c);
          const i = r * grid.cols + c;
          if (!walkable(grid, i, t)) return false;
          out.push(i);
        }
        return true;
      };
      const ok = rowFirst ? moveRow() && moveCol() : moveCol() && moveRow();
      if (!ok) return null;
      // Only the final position may be the end when it is a wall.
      for (let k = 0; k < out.length - 1; k++) if (grid.data[out[k]] !== 0) return null;
      return out;
    };
    return tryRoute(true) ?? tryRoute(false);
  }

  /** Launch one backtracking robot per open direction from `a`; keep the shortest route to `b`. */
  private robots(grid: Grid, a: number, b: number): number[] | null {
    const order = this.turn === "left" ? [0, 3, 2, 1] : [0, 1, 2, 3];
    let best: number[] | null = null;
    for (const d of order) {
      const j = step(grid, a, d);
      if (j < 0 || !walkable(grid, j, b)) continue;
      const route = randomDfsWalk(grid, a, b, d);
      if (route !== null && (best === null || route.length < best.length)) best = route;
    }
    return best ?? randomDfsWalk(grid, a, b);
  }
}

