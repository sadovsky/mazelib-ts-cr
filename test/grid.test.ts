import { describe, expect, it } from "vitest";
import { Grid, ValueError } from "../src/index.js";

const PRIMS = ["#######", "#.....#", "#.#####", "#...#.#", "#.###.#", "#.....#", "#######"];

describe("Grid", () => {
  it("round-trips the JSON encoding", () => {
    const g = Grid.fromStrings(PRIMS);
    expect(g.rows).toBe(7);
    expect(g.cols).toBe(7);
    expect(g.toStrings()).toEqual(PRIMS);
  });

  it("indexes row-major with 1 = wall", () => {
    const g = Grid.fromStrings(PRIMS);
    expect(g.get(1, 2)).toBe(0);
    expect(g.isWall(3, 4)).toBe(true);
    expect(g.isWall(2, 2)).toBe(true);
    expect(g.data[1 * 7 + 1]).toBe(0);
  });

  it("maps non-# characters to open", () => {
    const g = Grid.fromStrings(["#x ", "..#"]);
    expect(g.toStrings()).toEqual(["#..", "..#"]);
  });

  it("forCells gives (2h+1) x (2w+1) all walls", () => {
    const g = Grid.forCells(3, 5);
    expect([g.height, g.width]).toEqual([7, 11]);
    expect(g.data.every((v) => v === 1)).toBe(true);
  });

  it("clone is independent", () => {
    const g = Grid.fromStrings(PRIMS);
    const h = g.clone();
    h.set(1, 1, 1);
    expect(g.get(1, 1)).toBe(0);
    expect(g.equals(h)).toBe(false);
  });

  it("rejects values other than 0/1 on output", () => {
    const g = new Grid(1, 1, 0);
    g.set(0, 0, 2);
    expect(() => g.toStrings()).toThrow(ValueError);
  });
});
