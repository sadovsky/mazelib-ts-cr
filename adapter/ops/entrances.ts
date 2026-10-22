import { NotImplementedError } from "../../src/index.js";
import type { OpHandler } from "./types.js";

export const entrancesOp: OpHandler = () => {
  throw new NotImplementedError("entrances");
};
