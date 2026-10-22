# mazelib-ts-cr

An independent clean-room TypeScript implementation of the [mazelib](https://github.com/john-science/mazelib) API: maze generators, solvers and transmuters, plus the `Maze` facade. Not affiliated with mazelib (see `NOTICE`).

It was built with the [slopfork](https://github.com/sadovsky/slopfork) process in **cleanroom** mode. A spec-writer agent read the original and wrote behavioural specs (`.slopfork/spec/`, leak-audited). The implementation was written only from those specs and the shared goldens ([slopfork-mazelib-goldens](https://github.com/sadovsky/slopfork-mazelib-goldens)). See `.slopfork/REPORT.md` for parity and provenance.

- Node 22+, ESM, TypeScript `strict`, zero runtime dependencies.
- The RNG layer is bit-compatible with CPython's `random` (MT19937) and NumPy's legacy `RandomState`. The algorithms are this port's own designs, so a seeded maze is a valid maze of the same kind but not the same maze as Python's.

## Usage

```ts
import { Maze, Prims, ShortestPaths, DeadEndFiller } from "mazelib-ts-cr";

const m = new Maze(42);               // seeds both RNG streams
m.generator = new Prims(10, 15);      // 10 x 15 cells -> 21 x 31 grid
m.generate();
m.generateEntrances();                // outer start/end on opposite sides
m.transmuters = [new DeadEndFiller(2)];
m.transmute();
m.solver = new ShortestPaths();
m.solve();
console.log(m.toString());            // '#' walls, 'S'/'E', '+' first solution
```

Grids are `Grid` objects (a row-major `Uint8Array`, `1` = wall, `0` = open) with `get`, `set`, `isWall`, `clone`, `Grid.fromStrings` and `toStrings`. Cells are `[row, col]` tuples.

## Python → TypeScript mapping

| Python (mazelib) | TypeScript |
|---|---|
| `Maze(seed=None)` | `new Maze(seed?)` |
| `Maze.set_seed(seed)` | `Maze.setSeed(seed)` (also `setSeed` from the package root) |
| `m.generator`, `m.grid`, `m.start`, `m.end`, `m.transmuters`, `m.solver`, `m.solutions`, `m.prune` | same names |
| `m.generate()` / `m.transmute()` / `m.solve()` | same names |
| `m.generate_entrances(start_outer=True, end_outer=True)` | `m.generateEntrances(startOuter = true, endOuter = true)` |
| `m.generate_monte_carlo(repeat, entrances=3, difficulty=1.0, reducer=len)` | `m.generateMonteCarlo(repeat, entrances = 3, difficulty = 1.0, reducer = (p) => p.length)` |
| `m.tostring(entrances=False, solutions=False)` | `m.tostring({ entrances, solutions })` |
| `str(m)` / `repr(m)` | `m.toString()` / `String(m)` |
| NumPy `int8` grid | `Grid` (`Uint8Array`) |
| `AldousBroder(h, w)` | `new AldousBroder(h, w)` |
| `BacktrackingGenerator(h, w)` | `new BacktrackingGenerator(h, w)` |
| `BinaryTree(h, w, skew=None)` | `new BinaryTree(h, w, { skew })` |
| `CellularAutomaton(h, w, complexity=1.0, density=1.0)` | `new CellularAutomaton(h, w, { complexity, density })` |
| `Division(h, w)` | `new Division(h, w)` |
| `DungeonRooms(h, w, rooms=None, grid=None, hunt_order='random')` | `new DungeonRooms(h, w, { rooms, grid, huntOrder })` |
| `Ellers(h, w, xskew=0.5, yskew=0.5)` | `new Ellers(h, w, { xskew, yskew })` |
| `GrowingTree(h, w, backtrack_chance=1.0)` | `new GrowingTree(h, w, { backtrackChance })` |
| `HuntAndKill(h, w, hunt_order='random')` | `new HuntAndKill(h, w, { huntOrder })` |
| `Kruskal(h, w)` / `Prims(h, w)` | `new Kruskal(h, w)` / `new Prims(h, w)` |
| `Sidewinder(h, w, skew=0.5)` | `new Sidewinder(h, w, { skew })` |
| `TrivialMaze(h, w, maze_type='spiral')` | `new TrivialMaze(h, w, { mazeType })` |
| `Wilsons(h, w, hunt_order='random')` | `new Wilsons(h, w, { huntOrder })` |
| `BacktrackingSolver()`, `Collision()`, `RandomMouse()`, `ShortestPath()`, `ShortestPaths()`, `Tremaux()` | `new BacktrackingSolver()` etc. |
| `Chain(turn='right')` | `new Chain(turn = "right")` |
| `solver.solve(grid, start, end)` | `solver.solve(grid, start, end)` |
| `solver.prune_solutions(solutions)` | `solver.pruneSolutions(solutions)` or `pruneSolutions(solutions, start, end)` |
| `CuldeSacFiller()` | `new CuldeSacFiller()` |
| `DeadEndFiller(iterations=1)` | `new DeadEndFiller(iterations = 1)` |
| `Perturbation(repeat=1, new_walls=1)` | `new Perturbation(repeat = 1, newWalls = 1)` |
| `AssertionError` / `ValueError` / `IndexError` | exported classes with the same `name` |

There are also name-based factories: `createGenerator(name, h, w, params)`, `createSolver(name, params)` and `createTransmuter(name, params)`. They take the Python class names and snake_case params, as the adapter uses them.

## Differences from the original

- The original crashes on some valid inputs; this port returns valid results there instead: Ellers with high `xskew` on larger mazes (an `int8` overflow), and Collision on mazes with loops or rooms.
- `ShortestPath` always returns a shortest path when one exists. The original sometimes returns none, for example with inner entrances.
- Seeded output is reproducible within this port but differs from Python's, because each algorithm uses the RNG in its own way.

The full list is in `.slopfork/features.md`.

## Checks

```
npx tsc --noEmit
npx vitest run
```

Goldens (with `../slopfork-mazelib-goldens` cloned next to this repo):

```
H=.claude/skills/slopfork/scripts/diff_harness.py
G=../slopfork-mazelib-goldens
python3 $H compare --batch --profile cr --cases $G/cases/<set>.jsonl --expected $G/expected/<set>.jsonl --cmd "npx tsx adapter/adapter.ts"
python3 $H check   --batch --profile cr --cases $G/cases/<set>.jsonl --cmd "npx tsx adapter/adapter.ts" --checker "python3 $G/checkers/invariants.py"
```

CI (`.github/workflows/ci.yml`) runs all of these on every push.

## License

MIT. The original mazelib is MIT, © 2014 John Stilley; this is an independent re-implementation of its API.
