/**
 * Dispatch table: op name -> handler. Each op lives in `adapter/ops/<op>.ts`.
 */
import type { OpHandler } from "./types.js";
import { rngOp } from "./rng.js";
import { generateOp } from "./generate.js";
import { entrancesOp } from "./entrances.js";
import { solveOp } from "./solve.js";
import { transmuteOp } from "./transmute.js";
import { tostringOp } from "./tostring.js";
import { monteCarloOp } from "./monte_carlo.js";

export const ops: Record<string, OpHandler> = {
  rng: rngOp,
  generate: generateOp,
  entrances: entrancesOp,
  solve: solveOp,
  transmute: transmuteOp,
  tostring: tostringOp,
  monte_carlo: monteCarloOp,
};
