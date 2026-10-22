import { createGenerator } from "../../src/index.js";
import { encodeGrid, params } from "./codec.js";
import type { OpHandler } from "./types.js";

/** `generate`: args `{algo, h, w, params}` -> `{grid}`. */
export const generateOp: OpHandler = (args) => {
  const gen = createGenerator(String(args.algo), args.h as number, args.w as number, params(args.params));
  return { grid: encodeGrid(gen.generate()) };
};
