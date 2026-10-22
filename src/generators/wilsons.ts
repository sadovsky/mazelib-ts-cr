import { Grid } from "../grid.js";
import { MazeGenerator } from "./base.js";
import { carve, DC, DR, isKeyword, openCell, randBelow } from "./util.js";

export interface WilsonsOptions {
  /** "random" (default) or "serpentine" (trimmed, case-insensitive): how walk starts are picked. */
  huntOrder?: string | null;
}

/** Wilson's algorithm: loop-erased random walks (uniform spanning tree). */
export class Wilsons extends MazeGenerator {
  readonly huntOrder: "random" | "serpentine";

  constructor(h: number, w: number, options: WilsonsOptions = {}) {
    super(h, w);
    this.huntOrder = isKeyword(options.huntOrder, "serpentine") ? "serpentine" : "random";
  }

  generate(): Grid {
    const { h, w } = this;
    const n = h * w;
    const g = Grid.forCells(h, w);
    const inTree = new Uint8Array(n);
    const exit = new Int8Array(n); // last exit direction of each cell on the current walk
    const root = randBelow(n);
    inTree[root] = 1;
    openCell(g, (root / w) | 0, root % w);
    let remaining = n - 1;
    let scan = 0;
    const opts = new Int32Array(4);
    while (remaining > 0) {
      let start: number;
      if (this.huntOrder === "serpentine") {
        while (inTree[scan]) scan++;
        start = scan;
      } else {
        do start = randBelow(n);
        while (inTree[start]);
      }
      // Random walk until the tree is hit, remembering the last exit from each cell.
      let cur = start;
      while (!inTree[cur]) {
        const i = (cur / w) | 0;
        const j = cur % w;
        let k = 0;
        for (let d = 0; d < 4; d++) {
          const ni = i + DR[d];
          const nj = j + DC[d];
          if (ni >= 0 && ni < h && nj >= 0 && nj < w) opts[k++] = d;
        }
        const d = opts[randBelow(k)];
        exit[cur] = d;
        cur = (i + DR[d]) * w + (j + DC[d]);
      }
      // Follow the exits from the start: that is the loop-erased path.
      cur = start;
      while (!inTree[cur]) {
        const i = (cur / w) | 0;
        const j = cur % w;
        const d = exit[cur];
        const ni = i + DR[d];
        const nj = j + DC[d];
        carve(g, i, j, ni, nj);
        inTree[cur] = 1;
        remaining--;
        cur = ni * w + nj;
      }
    }
    return g;
  }
}
