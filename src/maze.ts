/**
 * The `Maze` facade: holds one grid and runs the generate / transmute /
 * entrances / solve pipeline, renders text, and does Monte Carlo selection.
 * See `.slopfork/spec/maze.md`.
 */
import { AssertionError, IndexError } from "./errors.js";
import type { Cell, Grid } from "./grid.js";
import { rng, setSeed } from "./rng.js";
import type { MazeGenerator } from "./generators/base.js";
import type { MazeSolver, Path } from "./solvers/base.js";
import type { MazeTransmuter } from "./transmuters/base.js";

/** Options for {@link Maze.tostring}. Both default to false. */
export interface TostringOptions {
  entrances?: boolean;
  solutions?: boolean;
}

/** Ranking function for Monte Carlo selection; receives a record's first solution path. */
export type PathReducer = (path: Path) => number;

const defaultReducer: PathReducer = (path) => path.length;

type Side = 0 | 1 | 2 | 3; // north, south, west, east
const OPPOSITE: readonly Side[] = [1, 0, 3, 2];

/**
 * Loop-erase a path and strip the endpoints (solvers.md "prune_solutions").
 * Used only when the solver object does not provide its own `pruneSolutions`.
 */
export function prunePathFallback(p: readonly Cell[], start: Cell, end: Cell): Path {
  let out: Path = p.map(([r, c]) => [r, c] as Cell);
  if (p.length > 2) {
    const last = new Map<string, number>();
    p.forEach(([r, c], i) => last.set(`${r},${c}`, i));
    out = [];
    let i = 0;
    while (i < p.length) {
      const [r, c] = p[i];
      out.push([r, c]);
      i = (last.get(`${r},${c}`) as number) + 1;
    }
  }
  if (out.length > 1) {
    if (out[0][0] === start[0] && out[0][1] === start[1]) out.shift();
    const z = out[out.length - 1];
    if (out.length > 0 && z[0] === end[0] && z[1] === end[1]) out.pop();
  }
  return out;
}

interface McRecord {
  grid: Grid;
  start: Cell;
  end: Cell;
  solutions: Path[];
}

export class Maze {
  generator: MazeGenerator | null = null;
  grid: Grid | null = null;
  start: Cell | null = null;
  end: Cell | null = null;
  transmuters: MazeTransmuter[] = [];
  solver: MazeSolver | null = null;
  solutions: Path[] | null = null;
  prune = true;

  constructor(seed: number | bigint | null = null) {
    Maze.setSeed(seed);
  }

  /** Seed both global random streams (no-op for null). */
  static setSeed(seed: number | bigint | null | undefined): void {
    setSeed(seed);
  }

  /** Build a fresh grid with the generator; clears start, end and solutions. */
  generate(): void {
    if (this.generator === null) throw new AssertionError("generate() needs a generator");
    this.grid = this.generator.generate();
    this.start = null;
    this.end = null;
    this.solutions = null;
  }

  /** Apply each transmuter, in order, to the grid in place. */
  transmute(): void {
    if (this.grid === null) throw new AssertionError("no grid: call generate() first");
    for (const t of this.transmuters) {
      // Transmuters that need start/end validate them themselves; others ignore them.
      t.transmute(this.grid, this.start as Cell, this.end as Cell);
    }
  }

  /** Pick a start and end (Py stream only); the grid is not modified. */
  generateEntrances(startOuter = true, endOuter = true): void {
    if (this.grid === null) throw new AssertionError("no grid: call generate() first");
    const H = this.grid.rows;
    const W = this.grid.cols;
    for (;;) {
      let s: Cell;
      let e: Cell;
      if (startOuter && endOuter) {
        const side = rng.py.randrange(4) as Side;
        s = outerOn(side, H, W);
        e = outerOn(OPPOSITE[side], H, W);
      } else if (!startOuter && !endOuter) {
        s = innerCell(H, W);
        do {
          e = innerCell(H, W);
        } while (e[0] === s[0] && e[1] === s[1]);
      } else if (startOuter) {
        s = outerOn(rng.py.randrange(4) as Side, H, W);
        e = innerCell(H, W);
      } else {
        e = outerOn(rng.py.randrange(4) as Side, H, W);
        s = innerCell(H, W);
      }
      if (Math.abs(s[0] - e[0]) + Math.abs(s[1] - e[1]) >= 2) {
        this.start = s;
        this.end = e;
        return;
      }
    }
  }

  /** Run the solver from start to end; prunes when `prune` is true. */
  solve(): void {
    if (this.solver === null) throw new AssertionError("solve() needs a solver");
    if (this.start === null || this.end === null) throw new AssertionError("solve() needs start and end cells");
    if (this.grid === null) throw new AssertionError("no grid: call generate() first");
    const { rows, cols } = this.grid;
    for (const [r, c] of [this.start, this.end]) {
      if (!(r >= 0 && r < rows && c >= 0 && c < cols)) {
        throw new AssertionError("start and end must lie inside the maze");
      }
    }
    let sols = this.solver.solve(this.grid, this.start, this.end);
    if (this.prune) sols = this.pruneWith(this.solver, sols, this.start, this.end);
    this.solutions = sols;
  }

  private pruneWith(solver: MazeSolver, sols: Path[], start: Cell, end: Cell): Path[] {
    const own = (solver as unknown as { pruneSolutions?: (s: Path[]) => Path[] }).pruneSolutions;
    if (typeof own === "function") return own.call(solver, sols);
    return sols.map((p) => prunePathFallback(p, start, end));
  }

  /** Text rendering; see maze.md Behavior 22-28. */
  tostring(opts: TostringOptions = {}): string {
    const g = this.grid;
    if (g === null) return "";
    const rows: string[][] = [];
    for (let r = 0; r < g.rows; r++) {
      const row: string[] = new Array(g.cols);
      for (let c = 0; c < g.cols; c++) row[c] = g.isWall(r, c) ? "#" : " ";
      rows.push(row);
    }
    if (opts.entrances && this.start !== null && this.end !== null) {
      rows[this.start[0]][this.start[1]] = "S";
      rows[this.end[0]][this.end[1]] = "E";
    }
    if (opts.solutions && this.solutions !== null && this.solutions.length > 0) {
      for (const [r, c] of this.solutions[0]) rows[r][c] = "+";
    }
    return rows.map((row) => row.join("")).join("\n");
  }

  /** Same as `tostring({ entrances: true, solutions: true })`. */
  toString(): string {
    return this.tostring({ entrances: true, solutions: true });
  }

  /**
   * Generate `repeat` mazes, try `entrances` outer/outer entrance pairs on each,
   * keep the trial with the most solutions, then pick by difficulty among mazes
   * ranked ascending by `reducer(firstSolution)`.
   */
  generateMonteCarlo(repeat: number, entrances = 3, difficulty = 1.0, reducer: PathReducer = defaultReducer): void {
    if (!(difficulty >= 0.0 && difficulty <= 1.0)) {
      throw new AssertionError("difficulty must lie in [0, 1]");
    }
    const records: McRecord[] = [];
    for (let i = 0; i < repeat; i++) {
      this.generate();
      let best: McRecord | null = null;
      for (let j = 0; j < entrances; j++) {
        this.generateEntrances();
        this.solve();
        const sols = this.solutions as Path[];
        if (best === null || sols.length > best.solutions.length) {
          best = { grid: this.grid as Grid, start: this.start as Cell, end: this.end as Cell, solutions: sols };
        }
      }
      if (best === null) throw new IndexError("generate_monte_carlo needs at least one entrance trial");
      records.push(best);
    }
    if (records.length === 0) throw new IndexError("generate_monte_carlo needs repeat >= 1");
    const keyed = records.map((rec, idx) => {
      if (rec.solutions.length === 0) throw new IndexError("a Monte Carlo trial found no solution");
      return { rec, idx, key: reducer(rec.solutions[0]) };
    });
    keyed.sort((a, b) => (a.key < b.key ? -1 : a.key > b.key ? 1 : a.idx - b.idx));
    const chosen = keyed[Math.floor((keyed.length - 1) * difficulty)].rec;
    this.grid = chosen.grid;
    this.start = chosen.start;
    this.end = chosen.end;
    this.solutions = chosen.solutions;
  }
}

/** Number of odd indices in 1..n-2. */
function oddCount(n: number): number {
  return Math.max(0, Math.floor((n - 1) / 2));
}

function oddIndex(n: number): number {
  return 1 + 2 * rng.py.randrange(oddCount(n));
}

function outerOn(side: Side, H: number, W: number): Cell {
  switch (side) {
    case 0:
      return [0, oddIndex(W)];
    case 1:
      return [H - 1, oddIndex(W)];
    case 2:
      return [oddIndex(H), 0];
    default:
      return [oddIndex(H), W - 1];
  }
}

function innerCell(H: number, W: number): Cell {
  return [oddIndex(H), oddIndex(W)];
}
