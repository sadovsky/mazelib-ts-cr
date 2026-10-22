import { Grid } from "../grid.js";
import { MazeGenerator } from "./base.js";
import { carve, DC, DR, openCell, randBelow } from "./util.js";

/** Recursive backtracker (randomized depth-first search) with an explicit stack. */
export class BacktrackingGenerator extends MazeGenerator {
  constructor(h: number, w: number) {
    super(h, w);
  }

  generate(): Grid {
    const { h, w } = this;
    const g = Grid.forCells(h, w);
    const visited = new Uint8Array(h * w);
    const stack = new Int32Array(h * w);
    let top = 0;
    const start = randBelow(h * w);
    visited[start] = 1;
    openCell(g, (start / w) | 0, start % w);
    stack[top++] = start;
    const opts = new Int32Array(4);
    while (top > 0) {
      const cur = stack[top - 1];
      const i = (cur / w) | 0;
      const j = cur % w;
      let k = 0;
      for (let d = 0; d < 4; d++) {
        const ni = i + DR[d];
        const nj = j + DC[d];
        if (ni >= 0 && ni < h && nj >= 0 && nj < w && !visited[ni * w + nj]) opts[k++] = d;
      }
      if (k === 0) {
        top--;
        continue;
      }
      const d = opts[randBelow(k)];
      const ni = i + DR[d];
      const nj = j + DC[d];
      carve(g, i, j, ni, nj);
      visited[ni * w + nj] = 1;
      stack[top++] = ni * w + nj;
    }
    return g;
  }
}
