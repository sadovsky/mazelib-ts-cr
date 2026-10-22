import type { Cell, Grid } from "../grid.js";

/** Base class for transmuters: they modify `grid` in place (see .slopfork/spec/transmuters.md). */
export abstract class MazeTransmuter {
  abstract transmute(grid: Grid, start: Cell, end: Cell): void;
}

export type TransmuterParams = Record<string, unknown>;
