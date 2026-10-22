import { Grid } from "../grid.js";
import { MazeGenerator } from "./base.js";
import { carve, openCell, randBelow } from "./util.js";

export type BinaryTreeSkew = "NW" | "NE" | "SW" | "SE";

export interface BinaryTreeOptions {
  /** One of NW, NE, SW, SE (exact match). Anything else: chosen at random once, at construction. */
  skew?: string | null;
}

const SKEWS: readonly BinaryTreeSkew[] = ["NW", "NE", "SW", "SE"];

/** The vertical and horizontal step (row delta, column delta) each skew opens toward. */
const DIRS: Record<BinaryTreeSkew, [number, number]> = {
  NW: [1, -1], // south or west
  NE: [1, 1], // south or east
  SW: [-1, -1], // north or west
  SE: [-1, 1], // north or east
};

/** Binary tree maze: every cell opens one of two fixed directions. */
export class BinaryTree extends MazeGenerator {
  readonly skew: BinaryTreeSkew;

  constructor(h: number, w: number, options: BinaryTreeOptions = {}) {
    super(h, w);
    const s = options.skew;
    this.skew =
      typeof s === "string" && (SKEWS as readonly string[]).includes(s)
        ? (s as BinaryTreeSkew)
        : SKEWS[randBelow(4)];
  }

  generate(): Grid {
    const { h, w } = this;
    const g = Grid.forCells(h, w);
    const [dv, dh] = DIRS[this.skew];
    for (let i = 0; i < h; i++) {
      for (let j = 0; j < w; j++) {
        const vi = i + dv;
        const hj = j + dh;
        const canV = vi >= 0 && vi < h;
        const canH = hj >= 0 && hj < w;
        if (canV && canH) {
          if (randBelow(2) === 0) carve(g, i, j, vi, j);
          else carve(g, i, j, i, hj);
        } else if (canV) {
          carve(g, i, j, vi, j);
        } else if (canH) {
          carve(g, i, j, i, hj);
        } else {
          openCell(g, i, j);
        }
      }
    }
    return g;
  }
}
