// STUB owned by the solvers/transmuters builder: export every transmuter class and fill in the factory.
import { ValueError } from "../errors.js";
import type { MazeTransmuter, TransmuterParams } from "./base.js";

export * from "./base.js";

/** Build a transmuter from its Python class name and protocol params (see PROTOCOL.md). */
export function createTransmuter(algo: string, params: TransmuterParams = {}): MazeTransmuter {
  void params;
  throw new ValueError(`unknown transmuter ${algo}`);
}
