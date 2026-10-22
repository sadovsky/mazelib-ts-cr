import { ValueError } from "../errors.js";
import type { MazeTransmuter, TransmuterParams } from "./base.js";
import { CuldeSacFiller, DeadEndFiller } from "./fillers.js";
import { Perturbation } from "./perturbation.js";

export * from "./base.js";
export { CuldeSacFiller, DeadEndFiller } from "./fillers.js";
export { Perturbation } from "./perturbation.js";

function num(v: unknown, dflt: number): number {
  return typeof v === "number" ? v : dflt;
}

/** Build a transmuter from its Python class name and protocol params (see PROTOCOL.md). */
export function createTransmuter(algo: string, params: TransmuterParams = {}): MazeTransmuter {
  switch (algo) {
    case "CuldeSacFiller":
      return new CuldeSacFiller();
    case "DeadEndFiller":
      return new DeadEndFiller(num(params.iterations, 1));
    case "Perturbation":
      return new Perturbation(num(params.repeat, 1), num(params.new_walls ?? params.newWalls, 1));
    default:
      throw new ValueError(`unknown transmuter ${algo}`);
  }
}
