import { Maze } from "../../src/index.js";
import { decodeGrid, decodeOptionalCell, decodePaths } from "./codec.js";
import type { OpHandler } from "./types.js";

export const tostringOp: OpHandler = (args) => {
  const m = new Maze();
  m.grid = args.grid === null || args.grid === undefined ? null : decodeGrid(args.grid);
  m.start = decodeOptionalCell(args.start);
  m.end = decodeOptionalCell(args.end);
  m.solutions = args.solutions === null || args.solutions === undefined ? null : decodePaths(args.solutions);
  return { text: m.tostring({ entrances: args.entrances === true, solutions: args.show_solutions === true }) };
};
