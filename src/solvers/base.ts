import type { Cell, Grid } from "../grid.js";

/** A solution path: the cells strictly between start and end. */
export type Path = Cell[];

/**
 * Base class for maze solvers. `solve` must not modify `grid` and returns a
 * list of solution paths (see .slopfork/spec/solvers.md).
 */
export abstract class MazeSolver {
  abstract solve(grid: Grid, start: Cell, end: Cell): Path[];
}

export type SolverParams = Record<string, unknown>;
