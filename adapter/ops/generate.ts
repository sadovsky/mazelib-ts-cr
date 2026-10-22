import { NotImplementedError } from "../../src/index.js";
import type { OpHandler } from "./types.js";

export const generateOp: OpHandler = () => {
  throw new NotImplementedError("generate");
};
