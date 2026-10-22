import { AssertionError } from "../errors.js";
import type { Cell, Grid } from "../grid.js";
import { cellOf } from "./graph.js";

/** A solution path: the cells strictly between start and end. */
export type Path = Cell[];

function cellKey(p: Cell): number {
  return p[0] * 4294967296 + p[1];
}

function sameCell(a: Cell, b: Cell): boolean {
  return a[0] === b[0] && a[1] === b[1];
}

/**
 * Clean one raw path (solvers.md "prune_solutions"): loop erasure (jump to the
 * last occurrence of each emitted entry) when it has more than two entries, then
 * drop a leading `start` and a trailing `end` when more than one entry remains.
 */
export function prunePath(path: readonly Cell[], start: Cell, end: Cell): Path {
  let out: Cell[];
  if (path.length > 2) {
    const last = new Map<number, number>();
    for (let i = 0; i < path.length; i++) last.set(cellKey(path[i]), i);
    out = [];
    let i = 0;
    while (i < path.length) {
      const p = path[i];
      out.push([p[0], p[1]]);
      i = (last.get(cellKey(p)) as number) + 1;
    }
  } else {
    out = path.map((p) => [p[0], p[1]] as Cell);
  }
  if (out.length > 1) {
    if (sameCell(out[0], start)) out.shift();
    if (out.length > 0 && sameCell(out[out.length - 1], end)) out.pop();
  }
  return out;
}

/** Prune every path independently; keeps list length and order. */
export function pruneSolutions(solutions: readonly (readonly Cell[])[], start: Cell, end: Cell): Path[] {
  return solutions.map((p) => prunePath(p, start, end));
}

function checkCell(grid: Grid, p: Cell | null | undefined, what: string): void {
  if (p === null || p === undefined || !Array.isArray(p) || p.length < 2) {
    throw new AssertionError(`solve() needs a ${what} position`);
  }
  const [r, c] = p;
  if (!Number.isInteger(r) || !Number.isInteger(c) || r < 0 || r >= grid.rows || c < 0 || c >= grid.cols) {
    throw new AssertionError(`solve(): ${what} (${r}, ${c}) lies beyond the ${grid.rows}x${grid.cols} grid`);
  }
}

/**
 * Base class for maze solvers. `solve` must not modify `grid` and returns a
 * list of solution paths (see .slopfork/spec/solvers.md).
 */
export abstract class MazeSolver {
  /** Start and end of the most recent `solve` call, used by `pruneSolutions`. */
  protected lastStart: Cell | null = null;
  protected lastEnd: Cell | null = null;

  abstract solve(grid: Grid, start: Cell, end: Cell): Path[];

  /** Loop-erase each path and strip the entrances of the most recent `solve`. */
  pruneSolutions(solutions: readonly (readonly Cell[])[]): Path[] {
    if (this.lastStart === null || this.lastEnd === null) {
      return solutions.map((p) => p.map((q) => [q[0], q[1]] as Cell));
    }
    return pruneSolutions(solutions, this.lastStart, this.lastEnd);
  }

  /** Shared input validation; records start/end for `pruneSolutions`. */
  protected validate(grid: Grid | null | undefined, start: Cell | null | undefined, end: Cell | null | undefined): void {
    if (grid === null || grid === undefined) throw new AssertionError("solve() needs a grid");
    checkCell(grid, start, "start");
    checkCell(grid, end, "end");
    this.lastStart = [start![0], start![1]];
    this.lastEnd = [end![0], end![1]];
  }

  /**
   * Convert a full walk (start ... end, flat indices) into a raw path. The
   * start and end are kept only when they are open positions (inner
   * entrances), mirroring how the walkers report their trails.
   */
  protected walkToPath(grid: Grid, walk: readonly number[]): Path {
    let lo = 0;
    let hi = walk.length;
    if (hi > 0 && grid.data[walk[0]] !== 0) lo = 1;
    if (hi > lo && grid.data[walk[hi - 1]] !== 0) hi -= 1;
    const out: Path = [];
    for (let i = lo; i < hi; i++) out.push(cellOf(grid, walk[i]));
    return out;
  }
}

export type SolverParams = Record<string, unknown>;
