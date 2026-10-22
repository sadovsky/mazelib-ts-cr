/**
 * Breadth-first solvers: Collision, ShortestPath, ShortestPaths. Distances are
 * measured over open positions with 4-adjacency (the end may be a wall), so
 * every returned path is a true shortest path even on grids with open corners.
 */
import { AssertionError } from "../errors.js";
import type { Cell, Grid } from "../grid.js";
import { MazeSolver, type Path } from "./base.js";
import { cellOf, idx, neighbours, shortestWalks } from "./graph.js";

/** Upper bound on the number of equal-length paths returned. */
export const MAX_SHORTEST_PATHS = 32;

function inner(grid: Grid, walk: readonly number[]): Path {
  const out: Path = [];
  for (let i = 1; i < walk.length - 1; i++) out.push(cellOf(grid, walk[i]));
  return out;
}

/**
 * Collision: floods from both entrances (two breadth-first fronts); the
 * positions where the fronts meet at equal total distance form the shortest
 * routes. Returns every shortest path (up to a cap), or `[]` when unreachable.
 */
export class Collision extends MazeSolver {
  solve(grid: Grid, start: Cell, end: Cell): Path[] {
    this.validate(grid, start, end);
    const walks = shortestWalks(grid, idx(grid, start), idx(grid, end), MAX_SHORTEST_PATHS);
    return walks.map((w) => inner(grid, w));
  }
}

function assertStartHasExit(grid: Grid, start: Cell, end: Cell): void {
  const s = idx(grid, start);
  if (neighbours(grid, s, idx(grid, end)).length === 0) {
    throw new AssertionError("the start position has no open neighbour");
  }
}

/** One shortest path, or `[]` when the end is unreachable. */
export class ShortestPath extends MazeSolver {
  solve(grid: Grid, start: Cell, end: Cell): Path[] {
    this.validate(grid, start, end);
    assertStartHasExit(grid, start, end);
    const walks = shortestWalks(grid, idx(grid, start), idx(grid, end), 1);
    return walks.map((w) => inner(grid, w));
  }
}

/**
 * All shortest paths (up to a cap), shortest first. Raises AssertionError when
 * no solution exists.
 */
export class ShortestPaths extends MazeSolver {
  solve(grid: Grid, start: Cell, end: Cell): Path[] {
    this.validate(grid, start, end);
    assertStartHasExit(grid, start, end);
    const walks = shortestWalks(grid, idx(grid, start), idx(grid, end), MAX_SHORTEST_PATHS);
    if (walks.length === 0) throw new AssertionError("no solution found");
    return walks.map((w) => inner(grid, w));
  }
}
