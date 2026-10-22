import { NotImplementedError } from "../../src/index.js";
import type { OpHandler } from "./types.js";

export const solveOp: OpHandler = () => {
  throw new NotImplementedError("solve");
};
