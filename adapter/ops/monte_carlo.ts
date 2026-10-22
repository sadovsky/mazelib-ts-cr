import { Maze, createGenerator, createSolver } from "../../src/index.js";
import { encodeGrid, encodePaths, params } from "./codec.js";
import type { OpHandler } from "./types.js";

interface GenSpec {
  algo: string;
  h: number;
  w: number;
  params?: Record<string, unknown> | null;
}

interface SolverSpec {
  algo: string;
  params?: Record<string, unknown> | null;
}

export const monteCarloOp: OpHandler = (args) => {
  const m = new Maze();
  const difficulty = args.difficulty === undefined ? 1.0 : (args.difficulty as number);
  const entrances = args.entrances === undefined ? 3 : (args.entrances as number);
  const g = args.generator as GenSpec;
  const s = args.solver as SolverSpec;
  m.generator = createGenerator(g.algo, g.h, g.w, params(g.params));
  m.solver = createSolver(s.algo, params(s.params));
  m.generateMonteCarlo(args.repeat as number, entrances, difficulty);
  return {
    grid: encodeGrid(m.grid!),
    start: m.start,
    end: m.end,
    solutions: encodePaths(m.solutions ?? []),
  };
};
