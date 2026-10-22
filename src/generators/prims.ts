import { Grid } from "../grid.js";
import { MazeGenerator } from "./base.js";
import { carve, DC, DR, openCell, randBelow } from "./util.js";

/** Randomized Prim's, frontier-cell variant. */
export class Prims extends MazeGenerator {
  constructor(h: number, w: number) {
    super(h, w);
  }

  generate(): Grid {
    const { h, w } = this;
    const g = Grid.forCells(h, w);
    // 0 = unseen, 1 = in frontier, 2 = visited.
    const state = new Uint8Array(h * w);
    const frontier: number[] = [];
    const addNeighbors = (i: number, j: number): void => {
      for (let d = 0; d < 4; d++) {
        const ni = i + DR[d];
        const nj = j + DC[d];
        if (ni < 0 || ni >= h || nj < 0 || nj >= w) continue;
        const n = ni * w + nj;
        if (state[n] === 0) {
          state[n] = 1;
          frontier.push(n);
        }
      }
    };
    const start = randBelow(h * w);
    state[start] = 2;
    openCell(g, (start / w) | 0, start % w);
    addNeighbors((start / w) | 0, start % w);
    const opts = new Int32Array(4);
    while (frontier.length > 0) {
      const k = randBelow(frontier.length);
      const cur = frontier[k];
      frontier[k] = frontier[frontier.length - 1];
      frontier.pop();
      state[cur] = 2;
      const i = (cur / w) | 0;
      const j = cur % w;
      let m = 0;
      for (let d = 0; d < 4; d++) {
        const ni = i + DR[d];
        const nj = j + DC[d];
        if (ni >= 0 && ni < h && nj >= 0 && nj < w && state[ni * w + nj] === 2) opts[m++] = d;
      }
      const d = opts[randBelow(m)];
      carve(g, i, j, i + DR[d], j + DC[d]);
      addNeighbors(i, j);
    }
    return g;
  }
}
