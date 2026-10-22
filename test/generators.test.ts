import { describe, expect, it } from "vitest";
import {
  AssertionError,
  BinaryTree,
  CellularAutomaton,
  createGenerator,
  DungeonRooms,
  Ellers,
  GENERATOR_NAMES,
  Grid,
  setSeed,
  TrivialMaze,
  ValueError,
} from "../src/index.js";

interface Props {
  borderWalls: boolean;
  postsWalls: boolean;
  cellsOpen: boolean;
  connected: boolean;
  acyclic: boolean;
}

function props(g: Grid): Props {
  const H = g.rows;
  const W = g.cols;
  let borderWalls = true;
  let postsWalls = true;
  let cellsOpen = true;
  for (let r = 0; r < H; r++) {
    for (let c = 0; c < W; c++) {
      const wall = g.isWall(r, c);
      if ((r === 0 || c === 0 || r === H - 1 || c === W - 1) && !wall) borderWalls = false;
      if (r % 2 === 0 && c % 2 === 0 && !wall) postsWalls = false;
      if (r % 2 === 1 && c % 2 === 1 && wall) cellsOpen = false;
    }
  }
  let open = 0;
  let edges = 0;
  for (let r = 0; r < H; r++) {
    for (let c = 0; c < W; c++) {
      if (g.isWall(r, c)) continue;
      open++;
      if (r + 1 < H && !g.isWall(r + 1, c)) edges++;
      if (c + 1 < W && !g.isWall(r, c + 1)) edges++;
    }
  }
  const seen = new Uint8Array(H * W);
  let comps = 0;
  for (let p = 0; p < H * W; p++) {
    if (g.data[p] !== 0 || seen[p]) continue;
    comps++;
    const stack = [p];
    seen[p] = 1;
    while (stack.length) {
      const q = stack.pop()!;
      const r = Math.floor(q / W);
      const c = q % W;
      for (const [nr, nc] of [[r - 1, c], [r + 1, c], [r, c - 1], [r, c + 1]]) {
        if (nr < 0 || nc < 0 || nr >= H || nc >= W) continue;
        const n = nr * W + nc;
        if (g.data[n] === 0 && !seen[n]) {
          seen[n] = 1;
          stack.push(n);
        }
      }
    }
  }
  return { borderWalls, postsWalls, cellsOpen, connected: comps === 1, acyclic: edges === open - comps };
}

const PERFECT_VARIANTS: [string, Record<string, unknown>][] = [
  ["AldousBroder", {}],
  ["BacktrackingGenerator", {}],
  ["BinaryTree", {}],
  ["BinaryTree", { skew: "NW" }],
  ["BinaryTree", { skew: "NE" }],
  ["BinaryTree", { skew: "SW" }],
  ["BinaryTree", { skew: "SE" }],
  ["Division", {}],
  ["Ellers", {}],
  ["Ellers", { xskew: 0.1, yskew: 0.9 }],
  ["Ellers", { xskew: 0.9, yskew: 0.1 }],
  ["GrowingTree", {}],
  ["GrowingTree", { backtrack_chance: 0.0 }],
  ["GrowingTree", { backtrack_chance: 0.5 }],
  ["HuntAndKill", {}],
  ["HuntAndKill", { hunt_order: "serpentine" }],
  ["Kruskal", {}],
  ["Prims", {}],
  ["Sidewinder", {}],
  ["Sidewinder", { skew: 0.1 }],
  ["Sidewinder", { skew: 0.9 }],
  ["TrivialMaze", {}],
  ["TrivialMaze", { maze_type: " SERPENTINE " }],
  ["Wilsons", {}],
  ["Wilsons", { hunt_order: "serpentine" }],
];

const SIZES: [number, number][] = [[3, 3], [3, 5], [5, 3], [4, 7], [12, 17], [30, 41]];

describe("generators", () => {
  for (const [algo, params] of PERFECT_VARIANTS) {
    it(`${algo} ${JSON.stringify(params)} builds perfect mazes`, () => {
      for (const [h, w] of SIZES) {
        for (let seed = 0; seed < 4; seed++) {
          setSeed(seed);
          const g = createGenerator(algo, h, w, params).generate();
          expect([g.rows, g.cols]).toEqual([2 * h + 1, 2 * w + 1]);
          expect(props(g)).toEqual({ borderWalls: true, postsWalls: true, cellsOpen: true, connected: true, acyclic: true });
        }
      }
    });
  }

  it("CellularAutomaton is connected with open cells", () => {
    for (const opts of [{}, { complexity: 0.5, density: 0.5 }, { complexity: 2.0, density: 0.2 }]) {
      for (const [h, w] of SIZES) {
        for (let seed = 0; seed < 4; seed++) {
          setSeed(seed);
          const p = props(new CellularAutomaton(h, w, opts).generate());
          expect(p.borderWalls && p.cellsOpen && p.connected).toBe(true);
        }
      }
    }
  });

  it("DungeonRooms is connected with and without rooms", () => {
    for (const [h, w] of SIZES) {
      for (let seed = 0; seed < 4; seed++) {
        setSeed(seed);
        const plain = props(new DungeonRooms(h, w, { huntOrder: seed % 2 ? "serpentine" : "random" }).generate());
        expect(plain).toMatchObject({ borderWalls: true, postsWalls: true, cellsOpen: true, connected: true });
        const rooms: [[number, number], [number, number]][] = [[[3, 3], [5, 5]], [[0, 0], [99, 99]], [[2, 2], [4, 4]]];
        const p = props(new DungeonRooms(h, w, { rooms }).generate());
        expect(p).toMatchObject({ borderWalls: true, cellsOpen: true, connected: true });
      }
    }
  });

  it("DungeonRooms takes its size from a supplied grid and restarts from it", () => {
    const base = Grid.forCells(4, 6);
    for (let r = 1; r <= 5; r++) for (let c = 1; c <= 5; c++) base.set(r, c, 0);
    setSeed(3);
    const gen = new DungeonRooms(0, 0, { grid: base });
    expect([gen.h, gen.w]).toEqual([4, 6]);
    for (let k = 0; k < 2; k++) {
      const g = gen.generate();
      expect([g.rows, g.cols]).toEqual([9, 13]);
      expect(g.get(3, 3)).toBe(0);
      expect(props(g).connected).toBe(true);
    }
    const full = Grid.forCells(3, 3, 0);
    expect(() => new DungeonRooms(3, 3, { grid: full }).generate()).toThrow(AssertionError);
  });

  it("validates sizes", () => {
    for (const algo of GENERATOR_NAMES) {
      for (const [h, w] of [[1, 1], [2, 2], [2, 5], [5, 2], [0, 3]]) {
        expect(() => createGenerator(algo, h, w, {})).toThrow(AssertionError);
      }
      const kind = algo === "DungeonRooms" ? ValueError : AssertionError;
      expect(() => createGenerator(algo, -1, 4, {})).toThrow(kind);
    }
  });

  it("BinaryTree keeps a random skew per object and matches exact skews only", () => {
    setSeed(5);
    const bt = new BinaryTree(5, 5, { skew: "nw" });
    expect(["NW", "NE", "SW", "SE"]).toContain(bt.skew);
    const s = bt.skew;
    bt.generate();
    expect(bt.skew).toBe(s);
    expect(new BinaryTree(5, 5, { skew: "SE" }).skew).toBe("SE");
  });

  it("BinaryTree NW opens the bottom row and left column", () => {
    setSeed(1);
    const g = new BinaryTree(4, 6, { skew: "NW" }).generate();
    for (let c = 1; c < g.cols - 1; c++) expect(g.get(g.rows - 2, c)).toBe(0);
    for (let r = 1; r < g.rows - 1; r++) expect(g.get(r, 1)).toBe(0);
  });

  it("Ellers handles wide mazes without overflow and clamps skews", () => {
    setSeed(0);
    const e = new Ellers(40, 60, { xskew: 1.7, yskew: -2 });
    expect([e.xskew, e.yskew]).toEqual([1, 0]);
    expect(props(new Ellers(12, 17, { xskew: 0.9, yskew: 0.1 }).generate()).acyclic).toBe(true);
    expect(props(e.generate())).toMatchObject({ connected: true, acyclic: true });
  });

  it("TrivialMaze produces one of the two documented orientations", () => {
    const seen = new Set<string>();
    for (let seed = 0; seed < 16; seed++) {
      setSeed(seed);
      seen.add(new TrivialMaze(3, 5, { mazeType: "spiral" }).generate().toStrings().join("\n"));
    }
    expect(seen).toEqual(
      new Set([
        ["###########", "#.........#", "#########.#", "#.......#.#", "#.#######.#", "#.........#", "###########"].join("\n"),
        ["###########", "#.#.......#", "#.#.#####.#", "#.#.....#.#", "#.#######.#", "#.........#", "###########"].join("\n"),
      ]),
    );
  });

  it("is seeded through the shared streams and returns fresh grids", () => {
    for (const algo of GENERATOR_NAMES) {
      setSeed(11);
      const a = createGenerator(algo, 6, 7, {}).generate().toStrings();
      setSeed(11);
      const gen = createGenerator(algo, 6, 7, {});
      const b = gen.generate();
      expect(b.toStrings()).toEqual(a);
      expect(gen.generate()).not.toBe(b);
    }
  });

  it("large Wilsons and AldousBroder mazes are fast", () => {
    setSeed(2);
    const t = Date.now();
    expect(props(createGenerator("Wilsons", 100, 100, {}).generate()).acyclic).toBe(true);
    expect(props(createGenerator("AldousBroder", 100, 100, {}).generate()).connected).toBe(true);
    expect(Date.now() - t).toBeLessThan(5000);
  });
});
