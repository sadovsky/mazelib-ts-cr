/**
 * Perturbation: add random walls across open passages, then reopen walls
 * until the open area is one connected region again.
 */
import type { Cell, Grid } from "../grid.js";
import { rng } from "../rng.js";
import { componentLabels, step } from "../solvers/graph.js";
import { MazeTransmuter } from "./base.js";

export class Perturbation extends MazeTransmuter {
  readonly repeat: number;
  readonly newWalls: number;

  constructor(repeat: number = 1, newWalls: number = 1) {
    super();
    this.repeat = Math.max(0, Math.trunc(Number(repeat)) || 0);
    this.newWalls = Math.max(0, Math.trunc(Number(newWalls)) || 0);
  }

  transmute(grid: Grid, _start: Cell, _end: Cell): void {
    void _start;
    void _end;
    for (let k = 0; k < this.repeat; k++) {
      for (let w = 0; w < this.newWalls; w++) this.addWall(grid);
      reconnect(grid);
    }
  }

  /** Close one open interior wall slot chosen at random; gives up after 2*H*W failed draws. */
  private addWall(grid: Grid): void {
    const H = grid.rows;
    const W = grid.cols;
    if (H < 3 || W < 3) return;
    const limit = 2 * H * W;
    for (let tries = 0; tries <= limit; tries++) {
      const r = rng.py.randrange(1, H - 1);
      let c: number;
      if (r % 2 === 0) c = rng.py.randrange(1, W - 1, 2);
      else if (W >= 4) c = rng.py.randrange(2, W - 1, 2);
      else continue;
      if (grid.get(r, c) === 0) {
        grid.set(r, c, 1);
        return;
      }
    }
  }
}

/**
 * Merge all open components by opening interior walls. Preferred openings are
 * wall slots (one odd, one even coordinate) with exactly two open neighbours in
 * different components, which merge two components without creating a loop;
 * otherwise any interior wall touching two components is used. Stops when the
 * open area is connected or nothing more can be joined.
 */
export function reconnect(grid: Grid): void {
  for (;;) {
    const { labels, count } = componentLabels(grid);
    if (count <= 1) return;
    const strict: number[] = [];
    const loose: number[] = [];
    for (let r = 1; r < grid.rows - 1; r++) {
      for (let c = 1; c < grid.cols - 1; c++) {
        const i = r * grid.cols + c;
        if (grid.data[i] === 0) continue;
        const seen: number[] = [];
        let openNb = 0;
        for (let d = 0; d < 4; d++) {
          const j = step(grid, i, d);
          if (j < 0 || grid.data[j] !== 0) continue;
          openNb++;
          if (!seen.includes(labels[j])) seen.push(labels[j]);
        }
        if (seen.length < 2) continue;
        loose.push(i);
        if (openNb === 2 && (r + c) % 2 === 1) strict.push(i);
      }
    }
    const pool = strict.length > 0 ? strict : loose;
    if (pool.length === 0) return;
    grid.data[pool[rng.py.randbelow(pool.length)]] = 0;
  }
}
