import { Grid } from "../grid.js";
import { MazeGenerator } from "./base.js";
import { carve, DC, DR, openCell, randBelow, randFloat } from "./util.js";

export interface GrowingTreeOptions {
  /** Probability of picking the newest active cell (else a random one). Not clamped. Default 1.0. */
  backtrackChance?: number | null;
}

/** Growing tree: mixes recursive-backtracker (newest) and random-cell selection. */
export class GrowingTree extends MazeGenerator {
  readonly backtrackChance: number;

  constructor(h: number, w: number, options: GrowingTreeOptions = {}) {
    super(h, w);
    this.backtrackChance = options.backtrackChance ?? 1.0;
  }

  generate(): Grid {
    const { h, w } = this;
    const g = Grid.forCells(h, w);
    const visited = new Uint8Array(h * w);
    const active: number[] = [];
    const start = randBelow(h * w);
    visited[start] = 1;
    openCell(g, (start / w) | 0, start % w);
    active.push(start);
    const opts = new Int32Array(4);
    const p = this.backtrackChance;
    while (active.length > 0) {
      let idx: number;
      if (p >= 1) idx = active.length - 1;
      else if (p <= 0) idx = randBelow(active.length);
      else idx = randFloat() < p ? active.length - 1 : randBelow(active.length);
      const cur = active[idx];
      const i = (cur / w) | 0;
      const j = cur % w;
      let k = 0;
      for (let d = 0; d < 4; d++) {
        const ni = i + DR[d];
        const nj = j + DC[d];
        if (ni >= 0 && ni < h && nj >= 0 && nj < w && !visited[ni * w + nj]) opts[k++] = d;
      }
      if (k === 0) {
        active.splice(idx, 1);
        continue;
      }
      const d = opts[randBelow(k)];
      const ni = i + DR[d];
      const nj = j + DC[d];
      carve(g, i, j, ni, nj);
      visited[ni * w + nj] = 1;
      active.push(ni * w + nj);
    }
    return g;
  }
}
