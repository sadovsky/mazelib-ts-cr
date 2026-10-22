import { rng } from "../rng.js";
import { Grid } from "../grid.js";
import { MazeGenerator } from "./base.js";
import { openCell } from "./util.js";

/** Randomized Kruskal's: shuffled interior wall slots joined with union-find. */
export class Kruskal extends MazeGenerator {
  constructor(h: number, w: number) {
    super(h, w);
  }

  generate(): Grid {
    const { h, w } = this;
    const g = Grid.forCells(h, w);
    for (let i = 0; i < h; i++) for (let j = 0; j < w; j++) openCell(g, i, j);
    // Edge e < h*(w-1): horizontal joint between (i, j) and (i, j+1); else vertical.
    const nh = h * (w - 1);
    const edges = Array.from({ length: nh + (h - 1) * w }, (_, e) => e);
    rng.np.shuffle(edges);
    const parent = Int32Array.from({ length: h * w }, (_, i) => i);
    const find = (x: number): number => {
      while (parent[x] !== x) {
        parent[x] = parent[parent[x]];
        x = parent[x];
      }
      return x;
    };
    let trees = h * w;
    for (const e of edges) {
      if (trees === 1) break;
      let a: number;
      let b: number;
      if (e < nh) {
        const i = Math.floor(e / (w - 1));
        const j = e % (w - 1);
        a = i * w + j;
        b = a + 1;
      } else {
        a = e - nh;
        b = a + w;
      }
      const ra = find(a);
      const rb = find(b);
      if (ra === rb) continue;
      parent[ra] = rb;
      trees--;
      const ai = (a / w) | 0;
      const aj = a % w;
      const bi = (b / w) | 0;
      const bj = b % w;
      g.set(ai + bi + 1, aj + bj + 1, 0);
    }
    return g;
  }
}
