import { createSolver } from "../../src/index.js";
import { decodeCell, decodeGrid, encodePaths, params } from "./codec.js";
import type { OpHandler } from "./types.js";

export const solveOp: OpHandler = (args) => {
  const solver = createSolver(String(args.algo), params(args.params));
  const grid = decodeGrid(args.grid);
  let sols = solver.solve(grid, decodeCell(args.start), decodeCell(args.end));
  if (args.prune) sols = solver.pruneSolutions(sols);
  return { solutions: encodePaths(sols) };
};
