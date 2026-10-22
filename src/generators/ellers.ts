import { Grid } from "../grid.js";
import { MazeGenerator } from "./base.js";
import { carve, openCell, randBelow, randFloat } from "./util.js";

export interface EllersOptions {
  /** Probability of horizontal joins, clamped to [0, 1]. Default 0.5. */
  xskew?: number | null;
  /** Probability of extra vertical joins, clamped to [0, 1]. Default 0.5. */
  yskew?: number | null;
}

function clamp01(v: number): number {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}

/**
 * Eller's algorithm: row-by-row set merging. Set labels are plain 32-bit
 * integers (no small-width overflow at any maze size).
 */
export class Ellers extends MazeGenerator {
  readonly xskew: number;
  readonly yskew: number;

  constructor(h: number, w: number, options: EllersOptions = {}) {
    super(h, w);
    this.xskew = clamp01(options.xskew ?? 0.5);
    this.yskew = clamp01(options.yskew ?? 0.5);
  }

  generate(): Grid {
    const { h, w } = this;
    const g = Grid.forCells(h, w);
    let row = new Int32Array(w); // 0 = no set yet
    let next = new Int32Array(w);
    let fresh = 1;
    const relabel = (from: number, to: number): void => {
      for (let j = 0; j < w; j++) if (row[j] === from) row[j] = to;
    };
    for (let i = 0; i < h; i++) {
      for (let j = 0; j < w; j++) {
        if (row[j] === 0) row[j] = fresh++;
        openCell(g, i, j);
      }
      if (i === h - 1) {
        for (let j = 0; j + 1 < w; j++) {
          if (row[j] !== row[j + 1]) {
            carve(g, i, j, i, j + 1);
            relabel(row[j + 1], row[j]);
          }
        }
        break;
      }
      for (let j = 0; j + 1 < w; j++) {
        if (row[j] !== row[j + 1] && randFloat() < this.xskew) {
          carve(g, i, j, i, j + 1);
          relabel(row[j + 1], row[j]);
        }
      }
      next.fill(0);
      // Every set gets one guaranteed downward passage from a random member.
      const members = new Map<number, number[]>();
      for (let j = 0; j < w; j++) {
        const m = members.get(row[j]);
        if (m) m.push(j);
        else members.set(row[j], [j]);
      }
      for (const [label, cols] of members) {
        const j = cols[randBelow(cols.length)];
        next[j] = label;
        carve(g, i, j, i + 1, j);
      }
      // Other cells go down with probability yskew.
      for (let j = 0; j < w; j++) {
        if (next[j] !== 0) continue;
        if (randFloat() < this.yskew) {
          next[j] = row[j];
          carve(g, i, j, i + 1, j);
        }
      }
      const t = row;
      row = next;
      next = t;
    }
    return g;
  }
}
