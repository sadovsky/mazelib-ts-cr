import { describe, expect, it } from "vitest";
import {
  AssertionError,
  BacktrackingSolver,
  Chain,
  Collision,
  Grid,
  PyRandom,
  RandomMouse,
  ShortestPath,
  ShortestPaths,
  Tremaux,
  createSolver,
  pruneSolutions,
  setSeed,
  type Cell,
  type MazeSolver,
} from "../src/index.js";

const PRIMS3 = ["#######", "#.....#", "#.#####", "#...#.#", "#.###.#", "#.....#", "#######"];
const CA6 = [
  "#############",
  "#...........#",
  "#.###.###.###",
  "#.#...#.#...#",
  "#.#.###.###.#",
  "#.#.#.......#",
  "###.#####.###",
  "#.......#...#",
  "###.###.###.#",
  "#.#.......#.#",
  "#.#######.#.#",
  "#.........#.#",
  "#############",
];

/** Shortest steps over open positions (end may be a wall), like the goldens checker. */
function best(g: Grid, s: Cell, e: Cell): number {
  const seen = new Set<string>([s.join()]);
  let frontier: Cell[] = [s];
  for (let d = 1; frontier.length > 0; d++) {
    const next: Cell[] = [];
    for (const [r, c] of frontier) {
      for (const [dr, dc] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
        const p: Cell = [r + dr, c + dc];
        if (!g.inBounds(p[0], p[1]) || seen.has(p.join())) continue;
        if (p[0] === e[0] && p[1] === e[1]) return d;
        if (g.isWall(p[0], p[1])) continue;
        seen.add(p.join());
        next.push(p);
      }
    }
    frontier = next;
  }
  return -1;
}

function valid(g: Grid, s: Cell, e: Cell, path: Cell[]): boolean {
  const seq = [s, ...path, e];
  for (const p of path) if (!g.inBounds(p[0], p[1]) || g.isWall(p[0], p[1])) return false;
  for (let i = 1; i < seq.length; i++) {
    if (Math.abs(seq[i][0] - seq[i - 1][0]) + Math.abs(seq[i][1] - seq[i - 1][1]) !== 1) return false;
  }
  return true;
}

/** A perfect maze carved by a randomised DFS, independent of the generators module. */
function perfectMaze(h: number, w: number, seed: number): Grid {
  const r = new PyRandom(seed);
  const g = Grid.forCells(h, w);
  const stack: Cell[] = [[1, 1]];
  g.set(1, 1, 0);
  while (stack.length) {
    const [cr, cc] = stack[stack.length - 1];
    const opts: Cell[] = [];
    for (const [dr, dc] of [[-2, 0], [2, 0], [0, -2], [0, 2]]) {
      const nr = cr + dr;
      const nc = cc + dc;
      if (nr > 0 && nr < g.rows - 1 && nc > 0 && nc < g.cols - 1 && g.isWall(nr, nc)) opts.push([nr, nc]);
    }
    if (!opts.length) {
      stack.pop();
      continue;
    }
    const [nr, nc] = opts[r.randbelow(opts.length)];
    g.set((cr + nr) / 2, (cc + nc) / 2, 0);
    g.set(nr, nc, 0);
    stack.push([nr, nc]);
  }
  return g;
}

const ALL: [string, () => MazeSolver][] = [
  ["BacktrackingSolver", () => new BacktrackingSolver()],
  ["Chain", () => new Chain()],
  ["Chain/left", () => new Chain("left")],
  ["Collision", () => new Collision()],
  ["RandomMouse", () => new RandomMouse()],
  ["ShortestPath", () => new ShortestPath()],
  ["ShortestPaths", () => new ShortestPaths()],
  ["Tremaux", () => new Tremaux()],
];

describe("pruneSolutions", () => {
  it("loop-erases and strips entrances (spec example 1 -> 2)", () => {
    const raw: Cell[] = [
      [3, 1], [4, 1], [5, 1], [5, 2], [5, 3], [5, 4], [5, 5], [4, 5], [3, 5], [4, 5], [5, 5], [5, 4], [5, 3],
      [5, 2], [5, 1], [4, 1], [3, 1], [3, 2], [3, 3], [3, 2], [3, 1], [2, 1], [1, 1], [1, 2], [1, 3], [1, 4], [1, 5],
    ];
    expect(pruneSolutions([raw], [3, 0], [1, 6])).toEqual([[[3, 1], [2, 1], [1, 1], [1, 2], [1, 3], [1, 4], [1, 5]]]);
  });
  it("strips inner start and end", () => {
    const raw: Cell[] = [[5, 3], [5, 2], [5, 1], [5, 2], [5, 3], [5, 2], [5, 1], [4, 1], [3, 1]];
    expect(pruneSolutions([raw], [5, 3], [3, 1])).toEqual([[[5, 2], [5, 1], [4, 1]]]);
  });
  it("handles short and empty inputs", () => {
    expect(pruneSolutions([], [0, 1], [2, 1])).toEqual([]);
    expect(pruneSolutions([[[1, 1], [1, 2]]], [1, 1], [1, 2])).toEqual([[]]);
    expect(pruneSolutions([[[1, 1]]], [1, 1], [1, 2])).toEqual([[[1, 1]]]);
  });
});

describe("solvers", () => {
  const g = Grid.fromStrings(PRIMS3);
  for (const [name, make] of ALL) {
    it(`${name}: pruned result on Prims3x3 is the unique route`, () => {
      setSeed(0);
      const s = make();
      const sols = s.pruneSolutions(s.solve(g, [3, 0], [1, 6]));
      expect(sols[0]).toEqual([[3, 1], [2, 1], [1, 1], [1, 2], [1, 3], [1, 4], [1, 5]]);
      expect(g.toStrings()).toEqual(PRIMS3);
    });

    it(`${name}: valid non-empty first solution on random perfect mazes`, () => {
      for (let seed = 0; seed < 15; seed++) {
        const m = perfectMaze(8, 11, seed);
        const start: Cell = [0, 1 + 2 * (seed % 11)];
        const end: Cell = [m.rows - 1, m.cols - 2 - 2 * (seed % 5)];
        setSeed(seed);
        const s = make();
        const sols = s.pruneSolutions(s.solve(m, start, end));
        expect(sols.length).toBeGreaterThan(0);
        expect(valid(m, start, end, sols[0])).toBe(true);
        expect(sols[0].length).toBe(best(m, start, end) - 1); // perfect maze: unique simple route
      }
    });

    it(`${name}: valid on a grid with loops, inner entrances`, () => {
      const m = Grid.fromStrings(CA6);
      setSeed(1);
      const s = make();
      const sols = s.pruneSolutions(s.solve(m, [3, 9], [9, 7]));
      expect(sols.length).toBeGreaterThan(0);
      for (const p of sols) expect(valid(m, [3, 9], [9, 7], p)).toBe(true);
    });
  }

  it("Collision returns all shortest paths on the CellularAutomaton known-bug grid", () => {
    const m = Grid.fromStrings(CA6);
    const sols = new Collision().solve(m, [3, 9], [9, 7]);
    expect(sols.length).toBe(2);
    for (const p of sols) {
      expect(p.length).toBe(19);
      expect(valid(m, [3, 9], [9, 7], p)).toBe(true);
    }
  });

  it("walkers terminate with [] when the end is unreachable", () => {
    const m = Grid.fromStrings(["#######", "#...#.#", "#######"]);
    for (const make of [() => new BacktrackingSolver(), () => new RandomMouse(), () => new Tremaux(), () => new Chain(), () => new Collision(), () => new ShortestPath()]) {
      expect(make().solve(m, [1, 1], [1, 5])).toEqual([]);
    }
    expect(() => new ShortestPaths().solve(m, [1, 1], [1, 5])).toThrow(AssertionError);
  });

  it("validates positions", () => {
    expect(() => new BacktrackingSolver().solve(g, [3, 0], [1, 7])).toThrow(AssertionError);
    expect(() => new Collision().solve(g, [-1, 0], [1, 6])).toThrow(AssertionError);
    expect(() => new ShortestPath().solve(Grid.fromStrings(["###", "###", "###"]), [1, 1], [1, 2])).not.toThrow();
    expect(() => new ShortestPath().solve(Grid.fromStrings(["####", "####", "####"]), [1, 1], [1, 3])).toThrow(AssertionError);
  });

  it("createSolver maps names and Chain turn", () => {
    expect(createSolver("Chain", { turn: "bogus" })).toBeInstanceOf(Chain);
    expect((createSolver("Chain", { turn: "bogus" }) as Chain).turn).toBe("right");
    expect((createSolver("Chain", { turn: "left" }) as Chain).turn).toBe("left");
    expect(() => createSolver("Nope")).toThrow();
  });
});
