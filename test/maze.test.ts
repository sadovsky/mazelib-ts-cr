import { describe, expect, it } from "vitest";
import {
  AssertionError,
  Grid,
  Maze,
  MazeGenerator,
  MazeSolver,
  MazeTransmuter,
  pruneSolutions,
  type Cell,
  type Path,
} from "../src/index.js";

const PRIMS = ["#######", "#.....#", "#.#####", "#...#.#", "#.###.#", "#.....#", "#######"];
const ROUTE: Cell[] = [
  [3, 1],
  [2, 1],
  [1, 1],
  [1, 2],
  [1, 3],
  [1, 4],
  [1, 5],
];

/** Fake generator: always the fixed 3x3-cell Prims grid. */
class FixedGenerator extends MazeGenerator {
  calls = 0;
  constructor() {
    super(3, 3);
  }
  generate(): Grid {
    this.calls++;
    return Grid.fromStrings(PRIMS);
  }
}

/** Fake solver: BFS shortest path (start/end treated as passable), endpoints excluded. */
class BfsSolver extends MazeSolver {
  solve(grid: Grid, start: Cell, end: Cell): Path[] {
    const key = (r: number, c: number) => r * grid.cols + c;
    const prev = new Map<number, number>();
    const q: Cell[] = [start];
    prev.set(key(...start), -1);
    while (q.length) {
      const [r, c] = q.shift()!;
      if (r === end[0] && c === end[1]) break;
      for (const [dr, dc] of [
        [1, 0],
        [-1, 0],
        [0, 1],
        [0, -1],
      ]) {
        const nr = r + dr;
        const nc = c + dc;
        if (!grid.inBounds(nr, nc) || prev.has(key(nr, nc))) continue;
        const isEnd = nr === end[0] && nc === end[1];
        if (!isEnd && grid.isWall(nr, nc)) continue;
        prev.set(key(nr, nc), key(r, c));
        q.push([nr, nc]);
      }
    }
    if (!prev.has(key(...end))) return [];
    const path: Path = [];
    let k = prev.get(key(...end))!;
    while (k !== key(...start)) {
      path.unshift([Math.floor(k / grid.cols), k % grid.cols]);
      k = prev.get(k)!;
    }
    return [path];
  }
}

class FillTransmuter extends MazeTransmuter {
  transmute(grid: Grid): void {
    grid.set(1, 1, 1);
  }
}

function legal(c: Cell, outer: boolean, H: number, W: number): boolean {
  const [r, col] = c;
  if (!(r >= 0 && r < H && col >= 0 && col < W)) return false;
  const border = r === 0 || r === H - 1 || col === 0 || col === W - 1;
  if (outer) return border && (((r === 0 || r === H - 1) && col % 2 === 1) || ((col === 0 || col === W - 1) && r % 2 === 1));
  return r % 2 === 1 && col % 2 === 1 && !border;
}

describe("Maze construction", () => {
  it("starts empty with prune on", () => {
    const m = new Maze();
    expect(m.generator).toBeNull();
    expect(m.grid).toBeNull();
    expect(m.start).toBeNull();
    expect(m.end).toBeNull();
    expect(m.solutions).toBeNull();
    expect(m.transmuters).toEqual([]);
    expect(m.prune).toBe(true);
  });
});

describe("tostring", () => {
  const make = () => {
    const m = new Maze();
    m.grid = Grid.fromStrings(PRIMS);
    m.start = [3, 0];
    m.end = [1, 6];
    m.solutions = [ROUTE];
    return m;
  };

  it("returns '' with no grid", () => {
    expect(new Maze().tostring({ entrances: true, solutions: true })).toBe("");
  });

  it("renders walls only by default", () => {
    expect(make().tostring()).toBe("#######\n#     #\n# #####\n#   # #\n# ### #\n#     #\n#######");
  });

  it("renders both overlays via toString", () => {
    expect(String(make())).toBe("#######\n#+++++E\n#+#####\nS+  # #\n# ### #\n#     #\n#######");
  });

  it("draws + without entrances and nothing for an empty list", () => {
    const m = make();
    expect(m.tostring({ solutions: true }).split("\n")[1]).toBe("#+++++#");
    m.solutions = [];
    expect(m.tostring({ solutions: true })).toBe(m.tostring());
  });

  it("skips S/E unless both are set", () => {
    const m = make();
    m.end = null;
    expect(m.tostring({ entrances: true })).toBe(m.tostring());
  });
});

describe("generateEntrances", () => {
  const H = 7;
  const W = 7;
  for (const [so, eo] of [
    [true, true],
    [true, false],
    [false, true],
    [false, false],
  ] as const) {
    it(`satisfies postconditions for ${so ? "o" : "i"}${eo ? "o" : "i"}`, () => {
      const m = new Maze(0);
      m.grid = Grid.fromStrings(PRIMS);
      for (let i = 0; i < 300; i++) {
        m.generateEntrances(so, eo);
        const s = m.start!;
        const e = m.end!;
        expect(legal(s, so, H, W)).toBe(true);
        expect(legal(e, eo, H, W)).toBe(true);
        expect(Math.abs(s[0] - e[0]) + Math.abs(s[1] - e[1])).toBeGreaterThanOrEqual(2);
        if (so && eo) {
          const opp =
            (s[0] === 0 && e[0] === H - 1) ||
            (s[0] === H - 1 && e[0] === 0) ||
            (s[1] === 0 && e[1] === W - 1) ||
            (s[1] === W - 1 && e[1] === 0);
          expect(opp).toBe(true);
        }
      }
    });
  }

  it("is deterministic under a seed and keeps solutions", () => {
    const a = new Maze(5);
    a.grid = Grid.fromStrings(PRIMS);
    a.solutions = [];
    a.generateEntrances();
    const b = new Maze(5);
    b.grid = Grid.fromStrings(PRIMS);
    b.generateEntrances();
    expect(a.start).toEqual(b.start);
    expect(a.end).toEqual(b.end);
    expect(a.solutions).toEqual([]);
  });

  it("asserts without a grid", () => {
    expect(() => new Maze().generateEntrances()).toThrow(AssertionError);
  });
});

describe("pipeline preconditions", () => {
  it("generate/transmute/solve assert", () => {
    const m = new Maze();
    expect(() => m.generate()).toThrow(AssertionError);
    expect(() => m.transmute()).toThrow(AssertionError);
    expect(() => m.solve()).toThrow(AssertionError);
    m.solver = new BfsSolver();
    m.grid = Grid.fromStrings(PRIMS);
    expect(() => m.solve()).toThrow(AssertionError);
    m.start = [3, 0];
    m.end = [1, 9];
    expect(() => m.solve()).toThrow(AssertionError);
  });

  it("generate resets entrances and solutions", () => {
    const m = new Maze();
    m.generator = new FixedGenerator();
    m.start = [0, 1];
    m.end = [6, 1];
    m.solutions = [];
    m.generate();
    expect(m.grid!.toStrings()).toEqual(PRIMS);
    expect(m.start).toBeNull();
    expect(m.end).toBeNull();
    expect(m.solutions).toBeNull();
  });

  it("transmute applies in place", () => {
    const m = new Maze();
    m.grid = Grid.fromStrings(PRIMS);
    m.transmuters = [new FillTransmuter()];
    m.transmute();
    expect(m.grid.isWall(1, 1)).toBe(true);
  });

  it("solve finds the route", () => {
    const m = new Maze();
    m.grid = Grid.fromStrings(PRIMS);
    m.solver = new BfsSolver();
    m.start = [3, 0];
    m.end = [1, 6];
    m.solve();
    expect(m.solutions).toEqual([ROUTE]);
  });
});

describe("pruneSolutions", () => {
  it("erases loops and strips endpoints", () => {
    const p: Cell[] = [
      [3, 0],
      [3, 1],
      [3, 2],
      [3, 3],
      [3, 2],
      [3, 1],
      [2, 1],
      [1, 6],
    ];
    expect(pruneSolutions([p], [3, 0], [1, 6])).toEqual([
      [
        [3, 1],
        [2, 1],
      ],
    ]);
    expect(pruneSolutions([ROUTE], [3, 0], [1, 6])).toEqual([ROUTE]);
  });
});

describe("generateMonteCarlo", () => {
  const setup = (seed: number) => {
    const m = new Maze(seed);
    m.generator = new FixedGenerator();
    m.solver = new BfsSolver();
    return m;
  };

  it("rejects out-of-range difficulty before generating", () => {
    const m = setup(0);
    for (const d of [1.5, -0.1, NaN]) expect(() => m.generateMonteCarlo(3, 3, d)).toThrow(AssertionError);
    expect((m.generator as FixedGenerator).calls).toBe(0);
  });

  it("orders by reducer: 0.0 easiest, 1.0 hardest", () => {
    for (let seed = 0; seed < 5; seed++) {
      const lo = setup(seed);
      lo.generateMonteCarlo(6, 2, 0.0);
      const hi = setup(seed);
      hi.generateMonteCarlo(6, 2, 1.0);
      expect(lo.solutions![0].length).toBeLessThanOrEqual(hi.solutions![0].length);
      for (const m of [lo, hi]) {
        expect(legal(m.start!, true, 7, 7)).toBe(true);
        expect(legal(m.end!, true, 7, 7)).toBe(true);
        expect(m.solutions!.length).toBeGreaterThan(0);
      }
      expect((lo.generator as FixedGenerator).calls).toBe(6);
    }
  });

  it("uses a custom reducer", () => {
    const m = setup(1);
    m.generateMonteCarlo(5, 1, 1.0, (p) => -p.length);
    const n = setup(1);
    n.generateMonteCarlo(5, 1, 0.0);
    expect(m.solutions![0].length).toBe(n.solutions![0].length);
  });
});
