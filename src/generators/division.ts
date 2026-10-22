import { Grid, OPEN, WALL } from "../grid.js";
import { MazeGenerator } from "./base.js";
import { randBelow } from "./util.js";

/**
 * Recursive division: bisect open rectangles with straight walls, leaving one
 * cell-aligned gap per wall. Regions are tracked in cell units on an explicit stack.
 */
export class Division extends MazeGenerator {
  constructor(h: number, w: number) {
    super(h, w);
  }

  generate(): Grid {
    const { h, w, rows: H, cols: W } = this;
    const g = new Grid(H, W, OPEN);
    for (let c = 0; c < W; c++) {
      g.set(0, c, WALL);
      g.set(H - 1, c, WALL);
    }
    for (let r = 0; r < H; r++) {
      g.set(r, 0, WALL);
      g.set(r, W - 1, WALL);
    }
    // Interior posts are walls from the start; every cut runs post to post.
    for (let r = 2; r < H - 1; r += 2) {
      for (let c = 2; c < W - 1; c += 2) g.set(r, c, WALL);
    }
    // Stack of regions: [top cell row, left cell col, cell rows, cell cols].
    const stack: number[] = [0, 0, h, w];
    while (stack.length > 0) {
      const cw = stack.pop()!;
      const ch = stack.pop()!;
      const c0 = stack.pop()!;
      const r0 = stack.pop()!;
      if (ch < 2 || cw < 2) continue;
      const horizontal = ch > cw ? true : ch < cw ? false : randBelow(2) === 0;
      if (horizontal) {
        const k = 1 + randBelow(ch - 1); // wall between cell rows r0+k-1 and r0+k
        const gr = 2 * (r0 + k);
        for (let j = 0; j < cw; j++) g.set(gr, 2 * (c0 + j) + 1, WALL);
        g.set(gr, 2 * (c0 + randBelow(cw)) + 1, OPEN);
        stack.push(r0, c0, k, cw, r0 + k, c0, ch - k, cw);
      } else {
        const k = 1 + randBelow(cw - 1);
        const gc = 2 * (c0 + k);
        for (let i = 0; i < ch; i++) g.set(2 * (r0 + i) + 1, gc, WALL);
        g.set(2 * (r0 + randBelow(ch)) + 1, gc, OPEN);
        stack.push(r0, c0, ch, k, r0, c0 + k, ch, cw - k);
      }
    }
    return g;
  }
}
