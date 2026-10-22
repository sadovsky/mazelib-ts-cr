import { Grid } from "../grid.js";
import { MazeGenerator } from "./base.js";
import { carve, DC, DR, isKeyword, randBelow } from "./util.js";

export interface TrivialMazeOptions {
  /** "spiral" (default) or "serpentine" (trimmed, case-insensitive). */
  mazeType?: string | null;
}

/** Unicursal mazes: an inward spiral or a boustrophedon snake, in one of two orientations. */
export class TrivialMaze extends MazeGenerator {
  readonly mazeType: "spiral" | "serpentine";

  constructor(h: number, w: number, options: TrivialMazeOptions = {}) {
    super(h, w);
    this.mazeType = isKeyword(options.mazeType, "serpentine") ? "serpentine" : "spiral";
  }

  generate(): Grid {
    const flip = randBelow(2) === 0;
    return this.mazeType === "serpentine" ? this.serpentine(flip) : this.spiral(flip);
  }

  private serpentine(vertical: boolean): Grid {
    const { h, w } = this;
    const g = Grid.forCells(h, w);
    if (vertical) {
      for (let j = 0; j < w; j++) {
        for (let i = 0; i + 1 < h; i++) carve(g, i, j, i + 1, j);
        if (j + 1 < w) {
          const i = j % 2 === 0 ? 0 : h - 1;
          carve(g, i, j, i, j + 1);
        }
      }
    } else {
      for (let i = 0; i < h; i++) {
        for (let j = 0; j + 1 < w; j++) carve(g, i, j, i, j + 1);
        if (i + 1 < h) {
          const j = i % 2 === 0 ? 0 : w - 1;
          carve(g, i, j, i + 1, j);
        }
      }
    }
    return g;
  }

  /** Spiral from the top-left cell: clockwise starting east, or counter-clockwise starting south. */
  private spiral(leftFirst: boolean): Grid {
    const { h, w } = this;
    const g = Grid.forCells(h, w);
    const visited = new Uint8Array(h * w);
    // Direction indices into DR/DC: 0 N, 1 E, 2 S, 3 W. Clockwise is +1.
    let d = leftFirst ? 2 : 1;
    const turn = leftFirst ? 3 : 1;
    let i = 0;
    let j = 0;
    visited[0] = 1;
    g.set(1, 1, 0);
    const free = (dir: number): boolean => {
      const ni = i + DR[dir];
      const nj = j + DC[dir];
      return ni >= 0 && ni < h && nj >= 0 && nj < w && !visited[ni * w + nj];
    };
    for (;;) {
      if (!free(d)) {
        d = (d + turn) % 4;
        if (!free(d)) break;
      }
      const ni = i + DR[d];
      const nj = j + DC[d];
      carve(g, i, j, ni, nj);
      visited[ni * w + nj] = 1;
      i = ni;
      j = nj;
    }
    return g;
  }
}
