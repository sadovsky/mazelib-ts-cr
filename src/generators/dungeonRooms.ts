import { AssertionError, ValueError } from "../errors.js";
import { Grid, OPEN, WALL } from "../grid.js";
import { MazeGenerator } from "./base.js";
import { huntAndKill, isKeyword, randBelow } from "./util.js";

/** A room: inclusive top-left and bottom-right corners in grid coordinates. */
export type Room = [[number, number], [number, number]];

export interface DungeonRoomsOptions {
  rooms?: readonly Room[] | null;
  /** Pre-built grid (1 = wall); its shape overrides h and w. Copied at construction. */
  grid?: Grid | null;
  /** "random" (default) or "serpentine" (trimmed, case-insensitive). */
  huntOrder?: string | null;
}

function deriveSize(h: number, w: number, grid: Grid | null | undefined): [number, number] {
  if (grid) return [Math.floor((grid.rows - 1) / 2), Math.floor((grid.cols - 1) / 2)];
  if (h < 0 || w < 0) throw new ValueError("negative dimensions are not allowed");
  return [h, w];
}

function isInt(v: unknown): v is number {
  return typeof v === "number" && Number.isInteger(v);
}

/**
 * Hunt-and-kill maze grown around pre-carved rooms, followed by a pass that
 * reconnects any separate open components.
 */
export class DungeonRooms extends MazeGenerator {
  readonly rooms: readonly Room[];
  readonly huntOrder: "random" | "serpentine";
  private readonly base: Grid | null;

  constructor(h: number, w: number, options: DungeonRoomsOptions = {}) {
    const [dh, dw] = deriveSize(h, w, options.grid);
    super(dh, dw);
    this.base = options.grid ? options.grid.clone() : null;
    this.rooms = options.rooms ? options.rooms.map((r) => r) : [];
    this.huntOrder = isKeyword(options.huntOrder, "serpentine") ? "serpentine" : "random";
  }

  generate(): Grid {
    const { h, w, rows: H, cols: W } = this;
    let g: Grid;
    if (this.base) {
      // Use the supplied grid's top-left (2h+1) x (2w+1) region.
      g = new Grid(H, W, WALL);
      for (let r = 0; r < H; r++) {
        for (let c = 0; c < W; c++) g.set(r, c, this.base.get(r, c) ? WALL : OPEN);
      }
    } else {
      g = new Grid(H, W, WALL);
    }
    for (const room of this.rooms) this.carveRoom(g, room);

    // Visited = open cells (room squares and anything pre-carved).
    const visited = new Uint8Array(h * w);
    const unvisited: number[] = [];
    for (let i = 0; i < h; i++) {
      for (let j = 0; j < w; j++) {
        if (g.get(2 * i + 1, 2 * j + 1) === OPEN) visited[i * w + j] = 1;
        else unvisited.push(i * w + j);
      }
    }
    if (unvisited.length === 0) {
      throw new AssertionError("no walled cell left to start the maze from");
    }
    const start = unvisited[randBelow(unvisited.length)];
    visited[start] = 1;
    const si = (start / w) | 0;
    const sj = start % w;
    g.set(2 * si + 1, 2 * sj + 1, OPEN);
    huntAndKill(g, h, w, visited, si, sj, this.huntOrder === "serpentine");
    this.reconnect(g);
    return g;
  }

  /** Open an inclusive rectangle plus one door; malformed or out-of-range rooms are skipped. */
  private carveRoom(g: Grid, room: unknown): void {
    if (!Array.isArray(room) || room.length !== 2) return;
    const [a, b] = room as unknown[];
    if (!Array.isArray(a) || !Array.isArray(b) || a.length !== 2 || b.length !== 2) return;
    const [r1, c1] = a as unknown[];
    const [r2, c2] = b as unknown[];
    if (!isInt(r1) || !isInt(c1) || !isInt(r2) || !isInt(c2)) return;
    const { rows: H, cols: W } = this;
    // SLOPFORK-Q: rooms touching the outer frame are skipped too, so the frame stays walled.
    if (r1 > r2 || c1 > c2 || r1 < 1 || c1 < 1 || r2 > H - 2 || c2 > W - 2) return;
    for (let r = r1; r <= r2; r++) {
      for (let c = c1; c <= c2; c++) g.set(r, c, OPEN);
    }
    if (r1 % 2 === 0 || c1 % 2 === 0 || r2 % 2 === 0 || c2 % 2 === 0) return;
    // Door candidates: cell-aligned perimeter slots on sides not against the frame.
    const doors: [number, number][] = [];
    if (r1 - 1 > 0) for (let c = c1; c <= c2; c += 2) doors.push([r1 - 1, c]);
    if (r2 + 1 < H - 1) for (let c = c1; c <= c2; c += 2) doors.push([r2 + 1, c]);
    if (c1 - 1 > 0) for (let r = r1; r <= r2; r += 2) doors.push([r, c1 - 1]);
    if (c2 + 1 < W - 1) for (let r = r1; r <= r2; r += 2) doors.push([r, c2 + 1]);
    if (doors.length === 0) return;
    const [dr, dc] = doors[randBelow(doors.length)];
    g.set(dr, dc, OPEN);
  }

  /** Merge open components by opening wall slots between cells of different components. */
  private reconnect(g: Grid): void {
    const { rows: H, cols: W } = this;
    const comp = new Int32Array(H * W).fill(-1);
    const queue = new Int32Array(H * W);
    let ncomp = 0;
    for (let p = 0; p < H * W; p++) {
      if (g.data[p] !== OPEN || comp[p] >= 0) continue;
      let head = 0;
      let tail = 0;
      queue[tail++] = p;
      comp[p] = ncomp;
      while (head < tail) {
        const q = queue[head++];
        const r = (q / W) | 0;
        const c = q % W;
        const ns = [r > 0 ? q - W : -1, r < H - 1 ? q + W : -1, c > 0 ? q - 1 : -1, c < W - 1 ? q + 1 : -1];
        for (const n of ns) {
          if (n >= 0 && g.data[n] === OPEN && comp[n] < 0) {
            comp[n] = ncomp;
            queue[tail++] = n;
          }
        }
      }
      ncomp++;
    }
    if (ncomp <= 1) return;
    // Union-find over components; consider candidate slots in random order.
    const parent = Int32Array.from({ length: ncomp }, (_, i) => i);
    const find = (x: number): number => {
      while (parent[x] !== x) {
        parent[x] = parent[parent[x]];
        x = parent[x];
      }
      return x;
    };
    const slots: [number, number, number][] = []; // slot index, side A, side B
    for (let r = 1; r < H - 1; r++) {
      for (let c = 1; c < W - 1; c++) {
        if ((r + c) % 2 === 0 || g.get(r, c) !== WALL) continue;
        const [pa, pb] = r % 2 === 1 ? [r * W + c - 1, r * W + c + 1] : [(r - 1) * W + c, (r + 1) * W + c];
        if (comp[pa] < 0 || comp[pb] < 0 || comp[pa] === comp[pb]) continue;
        slots.push([r * W + c, comp[pa], comp[pb]]);
      }
    }
    for (let i = slots.length - 1; i > 0; i--) {
      const j = randBelow(i + 1);
      const t = slots[i];
      slots[i] = slots[j];
      slots[j] = t;
    }
    let left = ncomp - 1;
    for (const [s, ca, cb] of slots) {
      if (left === 0) break;
      const ra = find(ca);
      const rb = find(cb);
      if (ra === rb) continue;
      parent[ra] = rb;
      g.data[s] = OPEN;
      left--;
    }
  }
}
