import { ValueError } from "../errors.js";
import { Grid } from "../grid.js";
import type { GeneratorParams, MazeGenerator } from "./base.js";
import { AldousBroder } from "./aldousBroder.js";
import { BacktrackingGenerator } from "./backtrackingGenerator.js";
import { BinaryTree } from "./binaryTree.js";
import { CellularAutomaton } from "./cellularAutomaton.js";
import { Division } from "./division.js";
import { DungeonRooms, type Room } from "./dungeonRooms.js";
import { Ellers } from "./ellers.js";
import { GrowingTree } from "./growingTree.js";
import { HuntAndKill } from "./huntAndKill.js";
import { Kruskal } from "./kruskal.js";
import { Prims } from "./prims.js";
import { Sidewinder } from "./sidewinder.js";
import { TrivialMaze } from "./trivialMaze.js";
import { Wilsons } from "./wilsons.js";

export * from "./base.js";
export * from "./aldousBroder.js";
export * from "./backtrackingGenerator.js";
export * from "./binaryTree.js";
export * from "./cellularAutomaton.js";
export * from "./division.js";
export * from "./dungeonRooms.js";
export * from "./ellers.js";
export * from "./growingTree.js";
export * from "./huntAndKill.js";
export * from "./kruskal.js";
export * from "./prims.js";
export * from "./sidewinder.js";
export * from "./trivialMaze.js";
export * from "./wilsons.js";

/** Names of all generators, as in the Python API. */
export const GENERATOR_NAMES = [
  "AldousBroder",
  "BacktrackingGenerator",
  "BinaryTree",
  "CellularAutomaton",
  "Division",
  "DungeonRooms",
  "Ellers",
  "GrowingTree",
  "HuntAndKill",
  "Kruskal",
  "Prims",
  "Sidewinder",
  "TrivialMaze",
  "Wilsons",
] as const;

function num(v: unknown): number | null {
  return typeof v === "number" ? v : null;
}

function str(v: unknown): string | null {
  return typeof v === "string" ? v : null;
}

function grid(v: unknown): Grid | null {
  if (v instanceof Grid) return v;
  if (Array.isArray(v)) return Grid.fromStrings(v as string[]);
  return null;
}

/**
 * Build a generator from its Python class name and protocol params
 * (snake_case keys; null or missing means the default). See PROTOCOL.md.
 */
export function createGenerator(algo: string, h: number, w: number, params: GeneratorParams = {}): MazeGenerator {
  const p = params ?? {};
  switch (algo) {
    case "AldousBroder":
      return new AldousBroder(h, w);
    case "BacktrackingGenerator":
      return new BacktrackingGenerator(h, w);
    case "BinaryTree":
      return new BinaryTree(h, w, { skew: str(p.skew) });
    case "CellularAutomaton":
      return new CellularAutomaton(h, w, { complexity: num(p.complexity), density: num(p.density) });
    case "Division":
      return new Division(h, w);
    case "DungeonRooms":
      return new DungeonRooms(h, w, {
        rooms: Array.isArray(p.rooms) ? (p.rooms as Room[]) : null,
        grid: grid(p.grid),
        huntOrder: str(p.hunt_order),
      });
    case "Ellers":
      return new Ellers(h, w, { xskew: num(p.xskew), yskew: num(p.yskew) });
    case "GrowingTree":
      return new GrowingTree(h, w, { backtrackChance: num(p.backtrack_chance) });
    case "HuntAndKill":
      return new HuntAndKill(h, w, { huntOrder: str(p.hunt_order) });
    case "Kruskal":
      return new Kruskal(h, w);
    case "Prims":
      return new Prims(h, w);
    case "Sidewinder":
      return new Sidewinder(h, w, { skew: num(p.skew) });
    case "TrivialMaze":
      return new TrivialMaze(h, w, { mazeType: str(p.maze_type) });
    case "Wilsons":
      return new Wilsons(h, w, { huntOrder: str(p.hunt_order) });
    default:
      throw new ValueError(`unknown generator ${algo}`);
  }
}
