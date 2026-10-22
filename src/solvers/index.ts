// STUB owned by the solvers builder: export every solver class, pruneSolutions, and fill in the factory.
import { ValueError } from "../errors.js";
import type { MazeSolver, SolverParams } from "./base.js";

export * from "./base.js";

/** Build a solver from its Python class name and protocol params (see PROTOCOL.md). */
export function createSolver(algo: string, params: SolverParams = {}): MazeSolver {
  void params;
  throw new ValueError(`unknown solver ${algo}`);
}
