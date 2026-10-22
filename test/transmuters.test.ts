import { describe, expect, it } from "vitest";
import { CuldeSacFiller, DeadEndFiller, Grid, Perturbation, createTransmuter, setSeed } from "../src/index.js";

const PRIMS3 = ["#######", "#.....#", "#.#####", "#...#.#", "#.###.#", "#.....#", "#######"];

function openCount(g: Grid): number {
  let n = 0;
  for (const v of g.data) if (v === 0) n++;
  return n;
}

function perfect(g: Grid): boolean {
  let open = 0;
  let edges = 0;
  let first = -1;
  for (let r = 0; r < g.rows; r++)
    for (let c = 0; c < g.cols; c++) {
      if (g.isWall(r, c)) continue;
      open++;
      if (first < 0) first = r * g.cols + c;
      if (c + 1 < g.cols && !g.isWall(r, c + 1)) edges++;
      if (r + 1 < g.rows && !g.isWall(r + 1, c)) edges++;
    }
  const seen = new Set([first]);
  const q = [first];
  while (q.length) {
    const i = q.pop()!;
    const r = Math.floor(i / g.cols);
    const c = i % g.cols;
    for (const [nr, nc] of [[r - 1, c], [r + 1, c], [r, c - 1], [r, c + 1]]) {
      const j = nr * g.cols + nc;
      if (g.inBounds(nr, nc) && !g.isWall(nr, nc) && !seen.has(j)) {
        seen.add(j);
        q.push(j);
      }
    }
  }
  return seen.size === open && edges === open - 1;
}

describe("CuldeSacFiller", () => {
  it("leaves a perfect maze unchanged", () => {
    const g = Grid.fromStrings(PRIMS3);
    new CuldeSacFiller().transmute(g, [3, 0], [1, 6]);
    expect(g.toStrings()).toEqual(PRIMS3);
  });
  it("fills a loop hanging off one junction", () => {
    // Ring (1,5)-(1,7)-(3,7)-(3,5)-(1,5) touches the rest only at junction (1,5).
    const rows = ["#########", "#.......#", "#.###.#.#", "#.#.#...#", "#.#######", "#.......#", "#########"];
    const g = Grid.fromStrings(rows);
    new CuldeSacFiller().transmute(g, [5, 0], [5, 8]);
    expect(openCount(g)).toBeLessThan(openCount(Grid.fromStrings(rows)));
    expect(g.get(1, 7)).toBe(1);
  });
});

describe("DeadEndFiller", () => {
  it("fills one dead end per iteration (spec examples)", () => {
    const g = Grid.fromStrings(PRIMS3);
    new DeadEndFiller(1).transmute(g, [3, 0], [1, 6]);
    expect(g.toStrings()).toEqual(["#######", "#.....#", "#.#####", "#.###.#", "#.###.#", "#.....#", "#######"]);
    const g3 = Grid.fromStrings(PRIMS3);
    new DeadEndFiller(3).transmute(g3, [3, 0], [1, 6]);
    expect(g3.toStrings()).toEqual(["#######", "#.....#", "#.#####", "#.#####", "#.#####", "#...###", "#######"]);
  });
  it("iterations <= 0 means up to 100; 0.5 truncates to nothing", () => {
    expect(new DeadEndFiller(0).iterations).toBe(100);
    expect(new DeadEndFiller(-3).iterations).toBe(100);
    const g = Grid.fromStrings(PRIMS3);
    new DeadEndFiller(0.5).transmute(g, [3, 0], [1, 6]);
    expect(g.toStrings()).toEqual(PRIMS3);
  });
  it("restores entrances and never touches the border", () => {
    const g = Grid.fromStrings(PRIMS3);
    new DeadEndFiller(0).transmute(g, [3, 0], [1, 6]);
    expect(g.get(3, 0)).toBe(1);
    expect(g.get(1, 6)).toBe(1);
    expect(perfect(g)).toBe(true);
  });
});

describe("Perturbation", () => {
  it("keeps a perfect maze perfect and the border intact", () => {
    for (let seed = 0; seed < 20; seed++) {
      setSeed(seed);
      const g = Grid.fromStrings(PRIMS3);
      new Perturbation(3, 2).transmute(g, [3, 0], [1, 6]);
      expect(perfect(g)).toBe(true);
      expect(g.toStrings()[0]).toBe("#######");
      expect(g.toStrings()[6]).toBe("#######");
    }
  });
  it("reconnects a disconnected grid with new_walls=0", () => {
    setSeed(0);
    const g = Grid.fromStrings(["#######", "#.#.#.#", "#######"]);
    createTransmuter("Perturbation", { new_walls: 0 }).transmute(g, [1, 0], [1, 6]);
    expect(g.toStrings()).toEqual(["#######", "#.....#", "#######"]);
  });
});
