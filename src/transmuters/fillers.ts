/**
 * CuldeSacFiller and DeadEndFiller. Both only add walls, and both verify each
 * fill against the start-to-end shortest distance (and perfection, when the
 * input was perfect) before keeping it, so the route is never cut or lengthened.
 */
import type { Cell, Grid } from "../grid.js";
import { distance, idx, isPerfect } from "../solvers/graph.js";
import { MazeTransmuter } from "./base.js";

const DR = [-1, 0, 1, 0];
const DC = [0, 1, 0, -1];

/** Connected neighbour cells of cell (r, c): two away, slot and cell both open. */
function linkedCells(grid: Grid, r: number, c: number): Cell[] {
  const out: Cell[] = [];
  for (let d = 0; d < 4; d++) {
    const nr = r + 2 * DR[d];
    const nc = c + 2 * DC[d];
    if (nr < 0 || nr >= grid.rows || nc < 0 || nc >= grid.cols) continue;
    if (grid.get(r + DR[d], c + DC[d]) === 0 && grid.get(nr, nc) === 0) out.push([nr, nc]);
  }
  return out;
}

function withinOne(p: Cell, q: Cell): boolean {
  return (p[0] === q[0] && Math.abs(p[1] - q[1]) <= 1) || (p[1] === q[1] && Math.abs(p[0] - q[0]) <= 1);
}

function inBounds(grid: Grid, p: Cell): boolean {
  return p[0] >= 0 && p[0] < grid.rows && p[1] >= 0 && p[1] < grid.cols;
}

/** Start-to-end distance on the grid as it is (end may be a wall); -1 if unreachable or out of bounds. */
function routeLength(grid: Grid, start: Cell, end: Cell): number {
  if (!inBounds(grid, start) || !inBounds(grid, end)) return -1;
  return distance(grid, idx(grid, start), idx(grid, end));
}

/**
 * Cul-de-sac filler: a cell with exactly two passages whose two corridor walks
 * reach the same junction lies on a loop hanging off that junction; filling the
 * cell breaks the loop. Fills that would change the route length are skipped.
 */
export class CuldeSacFiller extends MazeTransmuter {
  transmute(grid: Grid, start: Cell, end: Cell): void {
    if (isPerfect(grid)) return; // no loops: nothing to fill
    const before = routeLength(grid, start, end);
    for (let r = 1; r < grid.rows; r += 2) {
      for (let c = 1; c < grid.cols; c += 2) {
        if (grid.get(r, c) !== 0) continue;
        const here: Cell = [r, c];
        if (withinOne(here, start) || withinOne(here, end)) continue;
        const links = linkedCells(grid, r, c);
        if (links.length !== 2) continue;
        const a = this.corridorEnd(grid, here, links[0]);
        const b = this.corridorEnd(grid, here, links[1]);
        if (a === null || b === null || a[0] !== b[0] || a[1] !== b[1]) continue;
        grid.set(r, c, 1);
        if (before >= 0 && routeLength(grid, start, end) !== before) grid.set(r, c, 0);
      }
    }
  }

  /** Follow corridor cells from `from` through `first` to the first non-corridor cell. */
  private corridorEnd(grid: Grid, from: Cell, first: Cell): Cell | null {
    let prev = from;
    let cur = first;
    const limit = grid.rows * grid.cols;
    for (let k = 0; k < limit; k++) {
      if (cur[0] === from[0] && cur[1] === from[1]) return prev; // isolated ring
      const links = linkedCells(grid, cur[0], cur[1]);
      if (links.length !== 2) return cur;
      const next = links[0][0] === prev[0] && links[0][1] === prev[1] ? links[1] : links[0];
      prev = cur;
      cur = next;
    }
    return null;
  }
}

/**
 * Dead-end filler: each iteration walls off the first dead-end cell (fewer
 * than two passages) in row-major order, together with its four orthogonal
 * neighbours. Cells within one of the start or end are exempt.
 */
export class DeadEndFiller extends MazeTransmuter {
  readonly iterations: number;

  constructor(iterations: number = 1) {
    super();
    const n = Number(iterations);
    this.iterations = n > 0 ? Math.trunc(n) : 100;
  }

  transmute(grid: Grid, start: Cell, end: Cell): void {
    const perfectBefore = isPerfect(grid);
    const before = routeLength(grid, start, end);
    const sIn = inBounds(grid, start);
    const eIn = inBounds(grid, end);
    const sv = sIn ? grid.get(start[0], start[1]) : 0;
    const ev = eIn ? grid.get(end[0], end[1]) : 0;
    const restore = (): void => {
      if (sIn) grid.set(start[0], start[1], sv);
      if (eIn) grid.set(end[0], end[1], ev);
    };
    const openEntrances = (): void => {
      if (sIn) grid.set(start[0], start[1], 0);
      if (eIn) grid.set(end[0], end[1], 0);
    };
    const acceptable = (): boolean => {
      restore();
      const ok = routeLength(grid, start, end) === before && (!perfectBefore || isPerfect(grid));
      openEntrances();
      return ok;
    };
    const isEntrance = (r: number, c: number): boolean =>
      (r === start[0] && c === start[1]) || (r === end[0] && c === end[1]);

    openEntrances();
    for (let it = 0; it < this.iterations; it++) {
      let filled = false;
      for (let r = 1; r < grid.rows - 1 && !filled; r += 2) {
        for (let c = 1; c < grid.cols - 1 && !filled; c += 2) {
          if (grid.get(r, c) !== 0) continue;
          const here: Cell = [r, c];
          if (withinOne(here, start) || withinOne(here, end)) continue;
          if (linkedCells(grid, r, c).length >= 2) continue;
          const saved: [number, number, number][] = [[r, c, grid.get(r, c)]];
          grid.set(r, c, 1);
          for (let d = 0; d < 4; d++) {
            const nr = r + DR[d];
            const nc = c + DC[d];
            if (nr <= 0 || nr >= grid.rows - 1 || nc <= 0 || nc >= grid.cols - 1) continue; // never touch the border
            if (isEntrance(nr, nc)) continue;
            saved.push([nr, nc, grid.get(nr, nc)]);
            grid.set(nr, nc, 1);
          }
          if (acceptable()) filled = true;
          else for (const [sr, sc, v] of saved) grid.set(sr, sc, v);
        }
      }
      if (!filled) break;
    }
    restore();
  }
}
