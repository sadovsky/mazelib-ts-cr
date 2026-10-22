import { NotImplementedError } from "../../src/index.js";
import type { OpHandler } from "./types.js";

export const transmuteOp: OpHandler = () => {
  throw new NotImplementedError("transmute");
};
