import { Grid, OPEN, WALL } from "../grid.js";
import { MazeGenerator } from "./base.js";
import { randBelow } from "./util.js";

export interface CellularAutomatonOptions {
  /** Wall walk length; values <= 1 are scaled by (h + w). Default 1.0. */
  complexity?: number | null;
  /** Number of wall seeds; values <= 1 are scaled by (h * w). Default 1.0. */
  density?: number | null;
}

/**
 * Random wall-growing generator on the lattice of posts. Walls only grow
 * into posts that are still open, so every wall structure is a tree and the
 * open region stays connected; cells are never filled. Loops are expected.
 */
export class CellularAutomaton extends MazeGenerator {
  readonly complexity: number;
  readonly density: number;

  constructor(h: number, w: number, options: CellularAutomatonOptions = {}) {
    super(h, w);
    this.complexity = options.complexity ?? 1.0;
    this.density = options.density ?? 1.0;
  }

  generate(): Grid {
    const { h, w, rows: H, cols: W } = this;
    const g = new Grid(H, W, OPEN);
    for (let c = 0; c < W; c++) {
      g.set(0, c, WALL);
      g.set(H - 1, c, WALL);
    }
    for (let r = 0; r < H; r++) {
      g.set(r, 0, WALL);
      g.set(r, W - 1, WALL);
    }
    // Scaled values are computed locally; the options themselves never change.
    const complexity = Math.floor(this.complexity <= 1 ? this.complexity * (h + w) : this.complexity);
    const density = Math.floor(this.density <= 1 ? this.density * (h * w) : this.density);
    const seeds = 2 * density;
    // Posts sit at grid (2a, 2b) for a in 0..h, b in 0..w.
    const nbr = new Int32Array(8);
    for (let s = 0; s < seeds; s++) {
      let a: number;
      let b: number;
      if (s < density) {
        // A post on the outer frame.
        if (randBelow(2) === 0) {
          a = randBelow(2) * h;
          b = randBelow(w + 1);
        } else {
          a = randBelow(h + 1);
          b = randBelow(2) * w;
        }
      } else {
        a = randBelow(h + 1);
        b = randBelow(w + 1);
      }
      g.set(2 * a, 2 * b, WALL);
      for (let step = 0; step < complexity; step++) {
        let k = 0;
        if (a > 0 && g.get(2 * a - 2, 2 * b) === OPEN) { nbr[k++] = a - 1; nbr[k++] = b; }
        if (a < h && g.get(2 * a + 2, 2 * b) === OPEN) { nbr[k++] = a + 1; nbr[k++] = b; }
        if (b > 0 && g.get(2 * a, 2 * b - 2) === OPEN) { nbr[k++] = a; nbr[k++] = b - 1; }
        if (b < w && g.get(2 * a, 2 * b + 2) === OPEN) { nbr[k++] = a; nbr[k++] = b + 1; }
        if (k === 0) break;
        const pick = randBelow(k / 2) * 2;
        const na = nbr[pick];
        const nb = nbr[pick + 1];
        g.set(2 * na, 2 * nb, WALL);
        g.set(a + na, b + nb, WALL); // the wall slot between the two posts
        a = na;
        b = nb;
      }
    }
    return g;
  }
}
