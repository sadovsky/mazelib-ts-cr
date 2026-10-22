import { createTransmuter } from "../../src/index.js";
import { decodeCell, decodeGrid, encodeGrid, params } from "./codec.js";
import type { OpHandler } from "./types.js";

export const transmuteOp: OpHandler = (args) => {
  const t = createTransmuter(String(args.algo), params(args.params));
  const grid = decodeGrid(args.grid);
  t.transmute(grid, decodeCell(args.start), decodeCell(args.end));
  return { grid: encodeGrid(grid) };
};
