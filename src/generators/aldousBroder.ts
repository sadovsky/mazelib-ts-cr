import { Grid } from "../grid.js";
import { MazeGenerator } from "./base.js";
import { carve, DC, DR, openCell, randBelow } from "./util.js";

/**
 * Aldous-Broder random walk. This variant steps to a uniformly random
 * unvisited neighbor when one exists (otherwise to a random neighbor), which
 * keeps it fast on large mazes at the cost of exact uniformity.
 */
export class AldousBroder extends MazeGenerator {
  constructor(h: number, w: number) {
    super(h, w);
  }

  generate(): Grid {
    const { h, w } = this;
    const g = Grid.forCells(h, w);
    const visited = new Uint8Array(h * w);
    let i = randBelow(h);
    let j = randBelow(w);
    visited[i * w + j] = 1;
    openCell(g, i, j);
    let remaining = h * w - 1;
    const fresh = new Int32Array(4);
    const all = new Int32Array(4);
    while (remaining > 0) {
      let nf = 0;
      let na = 0;
      for (let d = 0; d < 4; d++) {
        const ni = i + DR[d];
        const nj = j + DC[d];
        if (ni < 0 || ni >= h || nj < 0 || nj >= w) continue;
        all[na++] = d;
        if (!visited[ni * w + nj]) fresh[nf++] = d;
      }
      if (nf > 0) {
        const d = fresh[randBelow(nf)];
        const ni = i + DR[d];
        const nj = j + DC[d];
        carve(g, i, j, ni, nj);
        visited[ni * w + nj] = 1;
        remaining--;
        i = ni;
        j = nj;
      } else {
        const d = all[randBelow(na)];
        i += DR[d];
        j += DC[d];
      }
    }
    return g;
  }
}
