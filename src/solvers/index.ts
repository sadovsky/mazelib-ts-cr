import { ValueError } from "../errors.js";
import type { MazeSolver, SolverParams } from "./base.js";
import { Collision, ShortestPath, ShortestPaths } from "./shortest.js";
import { BacktrackingSolver, Chain, RandomMouse, Tremaux } from "./walkers.js";

export * from "./base.js";
export { Collision, ShortestPath, ShortestPaths, MAX_SHORTEST_PATHS } from "./shortest.js";
export { BacktrackingSolver, Chain, RandomMouse, Tremaux } from "./walkers.js";

/** Build a solver from its Python class name and protocol params (see PROTOCOL.md). */
export function createSolver(algo: string, params: SolverParams = {}): MazeSolver {
  switch (algo) {
    case "BacktrackingSolver":
      return new BacktrackingSolver();
    case "Chain":
      return new Chain(typeof params.turn === "string" ? params.turn : "right");
    case "Collision":
      return new Collision();
    case "RandomMouse":
      return new RandomMouse();
    case "ShortestPath":
      return new ShortestPath();
    case "ShortestPaths":
      return new ShortestPaths();
    case "Tremaux":
      return new Tremaux();
    default:
      throw new ValueError(`unknown solver ${algo}`);
  }
}
