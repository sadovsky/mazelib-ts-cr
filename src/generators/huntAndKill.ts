import { Grid } from "../grid.js";
import { MazeGenerator } from "./base.js";
import { huntAndKill, isKeyword, openCell, randBelow } from "./util.js";

export interface HuntAndKillOptions {
  /** "random" (default) or "serpentine" (trimmed, case-insensitive). */
  huntOrder?: string | null;
}

/**
 * Hunt-and-kill. The random hunt probes h*w random cells and then finishes
 * with a reading-order scan, so every cell is always visited.
 */
export class HuntAndKill extends MazeGenerator {
  readonly huntOrder: "random" | "serpentine";

  constructor(h: number, w: number, options: HuntAndKillOptions = {}) {
    super(h, w);
    this.huntOrder = isKeyword(options.huntOrder, "serpentine") ? "serpentine" : "random";
  }

  generate(): Grid {
    const { h, w } = this;
    const g = Grid.forCells(h, w);
    const visited = new Uint8Array(h * w);
    const i = randBelow(h);
    const j = randBelow(w);
    visited[i * w + j] = 1;
    openCell(g, i, j);
    huntAndKill(g, h, w, visited, i, j, this.huntOrder === "serpentine");
    return g;
  }
}
