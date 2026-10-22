# Feature inventory and parity matrix

Source: github.com/john-science/mazelib@56cd88294a36746bbd324c2c9f7e4ab26095deb3 (mazelib 0.9.17, MIT) · Target: TypeScript (Node 22, ESM, idiomatic) · Mode: cleanroom · Compare profile: `cr`

Status: `todo` → `spec` → `building` → `verified@Lx` (or `deviates` with a note).

Rows are leaves-first. Public names follow the Python API (`snake_case` methods, `CamelCase` classes); the TS port uses camelCase equivalents with a mapping table in the README. Goldens op that exercises each row is given in parentheses.

| # | Module / feature | Public surface | Depends on | Level | Status | Level reached | Deviations |
|---|---|---|---|---|---|---|---|
| 1 | RNG: Python-`random`-compatible stream | MT19937 seeded like CPython 3.13 `random.seed(int)`; `random()`, `randrange(stop)` / `(start, stop[, step])` incl. ranges above 2^32, `randint(a, b)`, `choice(seq)`, `shuffle(list)`; raises `ValueError` on empty range (op `rng`) | — | L2 | todo | — | |
| 2 | RNG: NumPy-legacy-`RandomState`-compatible stream | MT19937 seeded like `numpy.random.seed(int)` (rejects seeds outside 0..2^32-1 with `ValueError`); in-place `shuffle` of a sequence (op `rng`, `np_shuffle`) | — | L2 | todo | — | |
| 3 | Grid model and JSON encoding | Rectangular 0/1 grid (1 = wall), `(2h+1) x (2w+1)` for an `h x w`-cell maze; odd/odd positions are cells, mixed-parity positions are walls between cells; cell = `(row, col)`; goldens encode rows as strings of `#`/`.` | — | L1 | todo | — | Target uses a `Grid` class over `Uint8Array` instead of a NumPy `int8` array |
| 4 | Generator contract | Constructor takes cell rows then cell columns positionally; asserts both are at least 3 (`AssertionError`); `generate()` returns a fresh grid with a solid outer border (op `generate`, invalid sizes) | 1, 2, 3 | L2 | todo | — | |
| 5 | Generator: AldousBroder | `AldousBroder(h, w)`; perfect maze by random walk | 4 | L2 | todo | — | |
| 6 | Generator: BacktrackingGenerator | `BacktrackingGenerator(h, w)`; perfect maze by randomized depth-first carving | 4 | L2 | todo | — | |
| 7 | Generator: BinaryTree | `BinaryTree(h, w, skew=None)`; skew one of `NW`/`NE`/`SW`/`SE`; when omitted, a skew is drawn at construction time | 4 | L2 | todo | — | |
| 8 | Generator: CellularAutomaton | `CellularAutomaton(h, w, complexity=1.0, density=1.0)`; not necessarily perfect (loops, unreachable areas possible) | 4 | L2 | todo | — | |
| 9 | Generator: Division | `Division(h, w)`; recursive division, perfect maze | 4 | L2 | todo | — | |
| 10 | Generator: DungeonRooms | `DungeonRooms` with cell rows/cols plus optional `rooms`, optional starting `grid`, and `hunt_order` (default `random`); carves given rooms (or starts from a supplied grid whose shape overrides h/w), then fills the remainder Hunt-and-Kill style and reconnects; `hunt_order` `random` or `serpentine` (unknown values fall back to `random`); does not apply the 3x3 minimum check, a negative size raises `ValueError`; can raise `AssertionError` when the supplied grid cannot be completed | 4 | L2 | todo | — | |
| 11 | Generator: Ellers | `Ellers(h, w, xskew=0.5, yskew=0.5)`; row-by-row set merging, perfect maze | 4 | L2 | todo | — | Original crashes (`OverflowError`) on some inputs, e.g. 12x17 with `xskew=0.9` (see KNOWN_BUGS.json); port must return a valid maze |
| 12 | Generator: GrowingTree | `GrowingTree(h, w, backtrack_chance=1.0)`; probability of choosing the newest vs a random active cell | 4 | L2 | todo | — | |
| 13 | Generator: HuntAndKill | `HuntAndKill(h, w, hunt_order="random")`; `random` or `serpentine` hunt phase | 4 | L2 | todo | — | |
| 14 | Generator: Kruskal | `Kruskal(h, w)`; randomized Kruskal over shuffled walls, perfect maze | 4 | L2 | todo | — | |
| 15 | Generator: Prims | `Prims(h, w)`; randomized Prim's, perfect maze | 4 | L2 | todo | — | |
| 16 | Generator: Sidewinder | `Sidewinder(h, w, skew=0.5)`; perfect maze | 4 | L2 | todo | — | |
| 17 | Generator: TrivialMaze | `TrivialMaze(h, w, maze_type="spiral")`; `spiral` or `serpentine` (unknown falls back to `spiral`) | 4 | L2 | todo | — | |
| 18 | Generator: Wilsons | `Wilsons(h, w, hunt_order="random")`; loop-erased random walks, perfect maze | 4 | L2 | todo | — | |
| 19 | Solver contract | `solve(grid, start, end)` returns a list of solution paths, each the cells strictly between start and end; validates grid present, entrances set and inside the grid (`AssertionError`); public `prune_solutions(solutions)` removes loops/dead-end excursions and duplicates (op `solve`, `prune` flag) | 1, 2, 3 | L2 | todo | — | |
| 20 | Solver: BacktrackingSolver | `BacktrackingSolver()`; random walk with backtracking | 19 | L2 | todo | — | |
| 21 | Solver: Chain | `Chain(turn="right")`; `right` or `left` wall-follower guided along a straight chain toward the goal | 19 | L2 | todo | — | |
| 22 | Solver: Collision | `Collision()`; flood from start, paths that collide are resolved | 19 | L2 | todo | — | Original crashes (`TypeError`) on mazes with loops/rooms (CellularAutomaton, DungeonRooms; see KNOWN_BUGS.json); port must return a valid result |
| 23 | Solver: RandomMouse | `RandomMouse()`; random walk until the end is reached | 19 | L2 | todo | — | |
| 24 | Solver: ShortestPath | `ShortestPath()`; breadth-first, returns shortest solution(s); asserts on an invalid maze (start with no open neighbour) | 19 | L2 | todo | — | Original sometimes returns no solution where one exists (recorded as behavior, not a crash); check `invariants.json` for what the `cr` profile requires |
| 25 | Solver: ShortestPaths | `ShortestPaths()`; breadth-first, all shortest solutions; asserts on invalid maze / no solution | 19 | L2 | todo | — | |
| 26 | Solver: Tremaux | `Tremaux()`; Trémaux marking | 19 | L2 | todo | — | |
| 27 | Transmuter contract | `transmute(grid, start, end)` mutates the grid in place; result must stay solvable (op `transmute`) | 1, 2, 3 | L2 | todo | — | |
| 28 | Transmuter: CuldeSacFiller | `CuldeSacFiller()`; closes off loops that form culs-de-sac | 27 | L2 | todo | — | |
| 29 | Transmuter: DeadEndFiller | `DeadEndFiller(iterations=1)`; fills dead ends (never filling start/end) | 27 | L2 | todo | — | |
| 30 | Transmuter: Perturbation | `Perturbation(repeat=1, new_walls=1)`; adds random walls then repairs the maze to perfect again | 27, 4 | L2 | todo | — | |
| 31 | Maze facade: core | `Maze(seed=None)`; static `Maze.set_seed(seed)` seeds both RNG streams; attributes `generator`, `grid`, `start`, `end`, `transmuters`, `solver`, `solutions`, `prune` (default true); `generate()` (asserts a generator is set; clears start/end/solutions), `transmute()` (asserts a grid exists), `solve()` (asserts solver and entrances; prunes when `prune`) | 1, 2, 4, 19, 27 | L2 | todo | — | |
| 32 | Maze facade: entrances | `generate_entrances(start_outer=True, end_outer=True)`; outer entrances lie on the border opposite each other, inner ones on cells; start and end never equal or adjacent (op `entrances`) | 31 | L2 | todo | — | |
| 33 | Maze facade: string rendering | `tostring(entrances=False, solutions=False)`, `str(maze)` / `repr(maze)` = both overlays on; `#` wall, space open, `S`/`E`/`+` overlays (first solution only); empty string when no grid (op `tostring`, exact under `cr`) | 31 | L2 | todo | — | |
| 34 | Maze facade: Monte Carlo | `generate_monte_carlo`: params `repeat`, `entrances` (default 3), `difficulty` (default 1.0), `reducer` (default: path length); generate `repeat` mazes, keep the hardest of `entrances` entrance pairs per maze, rank by reducer, pick by difficulty; asserts `0 <= difficulty <= 1` (op `monte_carlo`) | 31, 32 | L2 | todo | — | |
| 35 | Adapter (target only) | `adapter/adapter.ts`, JSON lines per goldens `PROTOCOL.md`; maps target errors to Python exception class names | all | L2 | todo | — | |

## Cross-cutting decisions
| Concern | Source behavior | Target strategy |
|---|---|---|
| Randomness / RNG | Two independent MT19937 streams: Python `random` and NumPy legacy global `RandomState`. `Maze(seed)` / `Maze.set_seed` seeds both (only when seed is not None). Per module: **Python random only**: BinaryTree, Division, Ellers, Sidewinder, Wilsons, Maze entrances. **NumPy random only**: Kruskal, Collision, ShortestPath, ShortestPaths, CuldeSacFiller, DeadEndFiller. **Both**: AldousBroder, BacktrackingGenerator, CellularAutomaton, DungeonRooms, GrowingTree, HuntAndKill, Prims, TrivialMaze, BacktrackingSolver, Chain, RandomMouse, Tremaux, Perturbation. Monte Carlo inherits whatever its generator/solver use. | Implement both streams bit-compatibly (public library behavior; checked exactly by the `rng` op). How algorithms consume them is the port's own design, since `cr` checks generate/solve/transmute/entrances/monte_carlo by invariants only. |
| Numeric types | Grids are NumPy `int8` arrays of 0/1; coordinates are Python ints; skews/chances are floats; seeds may exceed 2^32 (Python accepts, NumPy rejects). One generator overflows `int8` internally on larger mazes (bug). | `Uint8Array` grid; JS `number` for coordinates; 32-bit unsigned math for MT19937; BigInt where `randrange` spans exceed 2^32 or seeds exceed 2^32. |
| Errors | Invalid input is reported with `AssertionError` (sizes below 3x3, missing generator/solver/grid/entrances, entrances outside the grid, difficulty out of [0,1], invalid maze for the shortest-path solvers, unfinishable DungeonRooms grid). `ValueError` from the RNG layer (empty `randrange`, out-of-range NumPy seed) and from a negative DungeonRooms size. Observed crashes (`OverflowError` in Ellers, `TypeError` in Collision) are bugs, not contract. Error messages are never compared. | Throw typed errors whose names map to `AssertionError` / `ValueError`; return valid results on KNOWN_BUGS cases. |
| I/O, time, concurrency | None in the library: pure in-memory, single-threaded, no files, no clock. Only output is the string rendering. | Same; adapter does stdin/stdout JSON lines. |

## Source tests (L1)
| Source test | Target test | Status |
|---|---|---|
| generators: abstract constructor (size checks / base generator behavior) | | todo |
| generators: aldous_broder (valid perfect maze, shape, borders) | | todo |
| generators: backtracking_generator | | todo |
| generators: binary_tree (each skew) | | todo |
| generators: cellular_automaton | | todo |
| generators: division | | todo |
| generators: dungeon_rooms_grid (from a supplied grid) | | todo |
| generators: dungeon_reconnect_maze (reconnecting a disconnected grid) | | todo |
| generators: dungeon_rooms_random_rooms | | todo |
| generators: dungeon_rooms_serpentine_rooms | | todo |
| generators: ellers | | todo |
| generators: growing_tree | | todo |
| generators: hunt_and_kill_random_order | | todo |
| generators: hunt_and_kill_serpentine_order | | todo |
| generators: kruskal | | todo |
| generators: prims | | todo |
| generators: sidewinder | | todo |
| generators: trivial_maze_spiral | | todo |
| generators: trivial_maze_serpentine | | todo |
| generators: wilsons_random_order | | todo |
| generators: wilsons_serpentine_order | | todo |
| maze: grid_size (grid dimensions from cell counts) | | todo |
| maze: inner_entrances | | todo |
| maze: outer_entrances | | todo |
| maze: generator_wipe (regenerate clears entrances/solutions) | | todo |
| maze: monte_carlo | | todo |
| maze: monte_carlo_reducer (custom reducer) | | todo |
| maze: maze_to_string (rendering with/without overlays) | | todo |
| maze: invalid_inputs (assertions on bad usage) | | todo |
| maze: set_seed (same seed gives same maze) | | todo |
| solvers: prune_solution | | todo |
| solvers: backtracking_solver | | todo |
| solvers: chain | | todo |
| solvers: collision | | todo |
| solvers: random_mouse | | todo |
| solvers: shortest_path | | todo |
| solvers: shortest_paths | | todo |
| solvers: tremaux | | todo |
| transmuters: cul_de_sac_filler | | todo |
| transmuters: dead_end_filler | | todo |
| transmuters: perturbation | | todo |
