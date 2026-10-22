import { Grid } from "../grid.js";
import { MazeGenerator } from "./base.js";
import { carve, randBelow, randFloat } from "./util.js";

export interface SidewinderOptions {
  /** Probability of closing a run (north-south bias when high). Not clamped. Default 0.5. */
  skew?: number | null;
}

/** Sidewinder: an open top corridor, then runs that each open one passage north. */
export class Sidewinder extends MazeGenerator {
  readonly skew: number;

  constructor(h: number, w: number, options: SidewinderOptions = {}) {
    super(h, w);
    this.skew = options.skew ?? 0.5;
  }

  generate(): Grid {
    const { h, w } = this;
    const g = Grid.forCells(h, w);
    for (let j = 0; j + 1 < w; j++) carve(g, 0, j, 0, j + 1);
    for (let i = 1; i < h; i++) {
      let runStart = 0;
      for (let j = 0; j < w; j++) {
        g.set(2 * i + 1, 2 * j + 1, 0);
        if (j < w - 1 && randFloat() < 1 - this.skew) {
          carve(g, i, j, i, j + 1);
        } else {
          const k = runStart + randBelow(j - runStart + 1);
          carve(g, i, k, i - 1, k);
          runStart = j + 1;
        }
      }
    }
    return g;
  }
}
