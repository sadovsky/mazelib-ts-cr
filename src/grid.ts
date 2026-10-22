/**
 * Maze grid: a rectangular row-major array of bytes, 1 = wall, 0 = open.
 * A maze of h x w cells is a grid of (2h+1) x (2w+1). See `.slopfork/spec/grid.md`.
 */

import { ValueError } from "./errors.js";

/** A grid position `[row, col]`. */
export type Cell = [number, number];

export const WALL = 1;
export const OPEN = 0;

export class Grid {
  readonly rows: number;
  readonly cols: number;
  readonly data: Uint8Array;

  /** New grid of the given shape, every position set to `fill` (default wall). */
  constructor(rows: number, cols: number, fill: number = WALL) {
    if (!Number.isInteger(rows) || !Number.isInteger(cols) || rows < 0 || cols < 0) {
      throw new ValueError(`invalid grid shape ${rows} x ${cols}`);
    }
    this.rows = rows;
    this.cols = cols;
    this.data = new Uint8Array(rows * cols);
    if (fill !== 0) this.data.fill(fill);
  }

  /** Alias of `rows`. */
  get height(): number {
    return this.rows;
  }

  /** Alias of `cols`. */
  get width(): number {
    return this.cols;
  }

  /** Grid for a maze of h x w cells: (2h+1) x (2w+1), all walls by default. */
  static forCells(h: number, w: number, fill: number = WALL): Grid {
    return new Grid(2 * h + 1, 2 * w + 1, fill);
  }

  get(r: number, c: number): number {
    return this.data[r * this.cols + c];
  }

  set(r: number, c: number, v: number): void {
    this.data[r * this.cols + c] = v;
  }

  /** True when the position holds a non-zero value. */
  isWall(r: number, c: number): boolean {
    return this.data[r * this.cols + c] !== 0;
  }

  /** True when (r, c) lies inside the grid. */
  inBounds(r: number, c: number): boolean {
    return r >= 0 && r < this.rows && c >= 0 && c < this.cols;
  }

  fill(v: number): this {
    this.data.fill(v);
    return this;
  }

  clone(): Grid {
    const g = new Grid(this.rows, this.cols, 0);
    g.data.set(this.data);
    return g;
  }

  /** Alias of `clone`. */
  copy(): Grid {
    return this.clone();
  }

  equals(other: Grid): boolean {
    if (other.rows !== this.rows || other.cols !== this.cols) return false;
    for (let i = 0; i < this.data.length; i++) {
      if (this.data[i] !== other.data[i]) return false;
    }
    return true;
  }

  /** Parse the JSON encoding: `#` is wall, any other character is open. */
  static fromStrings(lines: readonly string[]): Grid {
    const rows = lines.length;
    const cols = rows > 0 ? lines[0].length : 0;
    const g = new Grid(rows, cols, 0);
    for (let r = 0; r < rows; r++) {
      const line = lines[r];
      if (line.length !== cols) throw new ValueError("grid rows have different lengths");
      for (let c = 0; c < cols; c++) {
        if (line.charCodeAt(c) === 35 /* '#' */) g.data[r * cols + c] = WALL;
      }
    }
    return g;
  }

  /** Serialize to the JSON encoding: `#` for 1, `.` for 0; other values are an error. */
  toStrings(): string[] {
    const out: string[] = [];
    for (let r = 0; r < this.rows; r++) {
      let s = "";
      for (let c = 0; c < this.cols; c++) {
        const v = this.data[r * this.cols + c];
        if (v === 1) s += "#";
        else if (v === 0) s += ".";
        else throw new ValueError(`grid value ${v} at (${r}, ${c}) is not 0 or 1`);
      }
      out.push(s);
    }
    return out;
  }
}
