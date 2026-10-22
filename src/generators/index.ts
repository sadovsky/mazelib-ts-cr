// STUB owned by the generators builder: export every generator class and fill in the factory.
import { ValueError } from "../errors.js";
import type { GeneratorParams, MazeGenerator } from "./base.js";

export * from "./base.js";

/** Build a generator from its Python class name and protocol params (see PROTOCOL.md). */
export function createGenerator(algo: string, h: number, w: number, params: GeneratorParams = {}): MazeGenerator {
  void h;
  void w;
  void params;
  throw new ValueError(`unknown generator ${algo}`);
}
