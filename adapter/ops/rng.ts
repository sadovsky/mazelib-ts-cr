import { rng, ValueError } from "../../src/index.js";
import type { OpHandler } from "./types.js";

function int(v: unknown): number {
  if (typeof v !== "number" || !Number.isInteger(v)) {
    throw new TypeError(`expected an integer argument, got ${JSON.stringify(v)}`);
  }
  return v;
}

function range(n: number): number[] {
  return Array.from({ length: n }, (_, i) => i);
}

export const rngOp: OpHandler = (args) => {
  const calls = args.calls as unknown[][];
  const out: unknown[] = [];
  for (const call of calls) {
    const [name, ...rest] = call;
    switch (name) {
      case "random":
        out.push(rng.py.random());
        break;
      case "randrange":
        if (rest.length === 1) out.push(rng.py.randrange(int(rest[0])));
        else if (rest.length === 2) out.push(rng.py.randrange(int(rest[0]), int(rest[1])));
        else if (rest.length === 3) out.push(rng.py.randrange(int(rest[0]), int(rest[1]), int(rest[2])));
        else throw new TypeError("randrange takes 1 to 3 arguments");
        break;
      case "randint":
        out.push(rng.py.randint(int(rest[0]), int(rest[1])));
        break;
      case "choice":
        out.push(rng.py.choice(range(int(rest[0]))));
        break;
      case "shuffle": {
        const x = range(int(rest[0]));
        rng.py.shuffle(x);
        out.push(x);
        break;
      }
      case "np_shuffle": {
        const x = range(int(rest[0]));
        rng.np.shuffle(x);
        out.push(x);
        break;
      }
      default:
        throw new ValueError(`unknown rng call ${JSON.stringify(name)}`);
    }
  }
  return { out };
};
