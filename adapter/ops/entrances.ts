import { Maze } from "../../src/index.js";
import { decodeGrid } from "./codec.js";
import type { OpHandler } from "./types.js";

export const entrancesOp: OpHandler = (args) => {
  const m = new Maze();
  m.grid = decodeGrid(args.grid);
  m.generateEntrances(args.start_outer !== false, args.end_outer !== false);
  return { start: m.start, end: m.end };
};
