import { NotImplementedError } from "../../src/index.js";
import type { OpHandler } from "./types.js";

export const tostringOp: OpHandler = () => {
  throw new NotImplementedError("tostring");
};
