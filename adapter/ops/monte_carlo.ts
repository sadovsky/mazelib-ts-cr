import { NotImplementedError } from "../../src/index.js";
import type { OpHandler } from "./types.js";

export const monteCarloOp: OpHandler = () => {
  throw new NotImplementedError("monte_carlo");
};
