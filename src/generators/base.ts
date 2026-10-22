import { AssertionError } from "../errors.js";
import type { Grid } from "../grid.js";

/**
 * Base class for maze generators. `h`/`w` count cells; the grid built by
 * `generate()` has `2h+1` rows and `2w+1` columns.
 */
export abstract class MazeGenerator {
  readonly h: number;
  readonly w: number;
  readonly rows: number;
  readonly cols: number;

  constructor(h: number, w: number) {
    if (!(h >= 3 && w >= 3)) {
      throw new AssertionError("mazes cannot be smaller than 3x3");
    }
    this.h = h;
    this.w = w;
    this.rows = 2 * h + 1;
    this.cols = 2 * w + 1;
  }

  /** Build and return a fresh grid. */
  abstract generate(): Grid;
}

/** Constructor-style params as they arrive from the adapter (`snake_case` keys, JSON values). */
export type GeneratorParams = Record<string, unknown>;
