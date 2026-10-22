# Feature inventory and parity matrix

Source: github.com/john-science/mazelib@56cd88294a36746bbd324c2c9f7e4ab26095deb3 (mazelib 0.9.17, MIT) · Target: TypeScript (Node 22, ESM, idiomatic) · Mode: cleanroom · Compare profile: `cr`

Status: `todo` → `spec` → `building` → `verified@Lx` (or `deviates` with a note).

Rows are leaves-first. Public names follow the Python API (`snake_case` methods, `CamelCase` classes); the TS port uses camelCase equivalents with a mapping table in the README. Goldens op that exercises each row is given in parentheses.

| # | Module / feature | Public surface | Depends on | Level | Status | Level reached | Deviations |
|---|---|---|---|---|---|---|---|
| 1 | RNG: Python-`random`-compatible stream | MT19937 seeded like CPython 3.13 `random.seed(int)`; `random()`, `randrange(stop)` / `(start, stop[, step])` incl. ranges above 2^32, `randint(a, b)`, `choice(seq)`, `shuffle(list)`; raises `ValueError` on empty range (op `rng`) | — | L2 | verified@L2 | rng 63/63 exact | None (bit-exact incl. randrange spans up to 2^40 via BigInt) |
| 2 | RNG: NumPy-legacy-`RandomState`-compatible stream | MT19937 seeded like `numpy.random.seed(int)` (rejects seeds outside 0..2^32-1 with `ValueError`); in-place `shuffle` of a sequence (op `rng`, `np_shuffle`) | — | L2 | verified@L2 | rng 63/63 exact | None. Port adds an Np `randint(low, high)` helper not covered by spec/goldens (Q1; design choice) |
| 3 | Grid model and JSON encoding | Rectangular 0/1 grid (1 = wall), `(2h+1) x (2w+1)` for an `h x w`-cell maze; odd/odd positions are cells, mixed-parity positions are walls between cells; cell = `(row, col)`; goldens encode rows as strings of `#`/`.` | — | L1 | verified@L1 | L1 (test/grid.test.ts) | Intentional: `Grid` class over `Uint8Array` (row-major) instead of a NumPy `int8` array |
| 4 | Generator contract | Constructor takes cell rows then cell columns positionally; asserts both are at least 3 (`AssertionError`); `generate()` returns a fresh grid with a solid outer border (op `generate`, invalid sizes) | 1, 2, 3 | L2 | verified@L2 | generate 1572/1572 inv (84 exact error cases) | None |
| 5 | Generator: AldousBroder | `AldousBroder(h, w)`; perfect maze by random walk | 4 | L2 | verified@L2 | generate inv | RNG (port design): Py stream only (cr: algorithm RNG use is the port's own design; original used both streams) |
| 6 | Generator: BacktrackingGenerator | `BacktrackingGenerator(h, w)`; perfect maze by randomized depth-first carving | 4 | L2 | verified@L2 | generate inv | RNG (port design): Py stream only (original used both) |
| 7 | Generator: BinaryTree | `BinaryTree(h, w, skew=None)`; skew one of `NW`/`NE`/`SW`/`SE`; when omitted, a skew is drawn at construction time | 4 | L2 | verified@L2 | generate inv | RNG (port design): Py stream only; skew drawn at construction when omitted, as in the original |
| 8 | Generator: CellularAutomaton | `CellularAutomaton(h, w, complexity=1.0, density=1.0)`; not necessarily perfect (loops, unreachable areas possible) | 4 | L2 | verified@L2 | generate inv | RNG (port design): Py stream only (original used both) |
| 9 | Generator: Division | `Division(h, w)`; recursive division, perfect maze | 4 | L2 | verified@L2 | generate inv | RNG (port design): Py stream only |
| 10 | Generator: DungeonRooms | `DungeonRooms` with cell rows/cols plus optional `rooms`, optional starting `grid`, and `hunt_order` (default `random`); carves given rooms (or starts from a supplied grid whose shape overrides h/w), then fills the remainder Hunt-and-Kill style and reconnects; `hunt_order` `random` or `serpentine` (unknown values fall back to `random`); does not apply the 3x3 minimum check, a negative size raises `ValueError`; can raise `AssertionError` when the supplied grid cannot be completed | 4 | L2 | verified@L2 | generate inv | RNG (port design): Py stream only (original used both). Q2: rooms touching the outer frame are skipped entirely (`// SLOPFORK-Q:` in dungeonRooms.ts). Random hunt falls back to a systematic scan so every cell is always visited (original could leave cells unvisited). No-walled-cell check is deterministic (original: 2*H*W random probes) -> AssertionError, also when a room covers the whole interior |
| 11 | Generator: Ellers | `Ellers(h, w, xskew=0.5, yskew=0.5)`; row-by-row set merging, perfect maze | 4 | L2 | verified@L2 | generate inv (incl. 8 KNOWN_BUGS cases) | Intentional (KNOWN_BUGS fix): no `OverflowError` on e.g. 12x17 xskew=0.9; set labels are plain integers, valid perfect maze at any size (probed 40x60, 50x80). Skews clamped. RNG (port design): Py stream only |
| 12 | Generator: GrowingTree | `GrowingTree(h, w, backtrack_chance=1.0)`; probability of choosing the newest vs a random active cell | 4 | L2 | verified@L2 | generate inv | RNG (port design): Py stream only (original used both) |
| 13 | Generator: HuntAndKill | `HuntAndKill(h, w, hunt_order="random")`; `random` or `serpentine` hunt phase | 4 | L2 | verified@L2 | generate inv | RNG (port design): Py stream only (original used both). Random hunt falls back to a systematic scan (guaranteed completion) |
| 14 | Generator: Kruskal | `Kruskal(h, w)`; randomized Kruskal over shuffled walls, perfect maze | 4 | L2 | verified@L2 | generate inv | RNG (port design): Np stream only (`shuffle` of wall list), matching the original's stream |
| 15 | Generator: Prims | `Prims(h, w)`; randomized Prim's, perfect maze | 4 | L2 | verified@L2 | generate inv | RNG (port design): Py stream only (original used both) |
| 16 | Generator: Sidewinder | `Sidewinder(h, w, skew=0.5)`; perfect maze | 4 | L2 | verified@L2 | generate inv | RNG (port design): Py stream only |
| 17 | Generator: TrivialMaze | `TrivialMaze(h, w, maze_type="spiral")`; `spiral` or `serpentine` (unknown falls back to `spiral`) | 4 | L2 | verified@L2 | generate inv | RNG (port design): Py stream only (original used both) |
| 18 | Generator: Wilsons | `Wilsons(h, w, hunt_order="random")`; loop-erased random walks, perfect maze | 4 | L2 | verified@L2 | generate inv | RNG (port design): Py stream only |
| 19 | Solver contract | `solve(grid, start, end)` returns a list of solution paths, each the cells strictly between start and end; validates grid present, entrances set and inside the grid (`AssertionError`); public `prune_solutions(solutions)` removes loops/dead-end excursions and duplicates (op `solve`, `prune` flag) | 1, 2, 3 | L2 | verified@L2 | solve 384/384 inv | Unreachable end: all solvers terminate (random walkers return `[]`; original's walkers never terminate). ShortestPaths still raises AssertionError there, per spec |
| 20 | Solver: BacktrackingSolver | `BacktrackingSolver()`; random walk with backtracking | 19 | L2 | verified@L2 | solve inv | RNG (port design): Py stream only (original used both) |
| 21 | Solver: Chain | `Chain(turn="right")`; `right` or `left` wall-follower guided along a straight chain toward the goal | 19 | L2 | verified@L2 | solve inv | RNG (port design): Py stream only (original used both) |
| 22 | Solver: Collision | `Collision()`; flood from start, paths that collide are resolved | 19 | L2 | verified@L2 | solve inv (incl. KNOWN_BUGS cases) | Intentional (KNOWN_BUGS fix): no `TypeError` on mazes with loops/rooms; returns valid shortest paths (capped at `MAX_SHORTEST_PATHS` = 32). Deterministic (no RNG; original used Np). Distances over open positions with 4-adjacency |
| 23 | Solver: RandomMouse | `RandomMouse()`; random walk until the end is reached | 19 | L2 | verified@L2 | solve inv | RNG (port design): Py stream only (original used both) |
| 24 | Solver: ShortestPath | `ShortestPath()`; breadth-first, returns shortest solution(s); asserts on an invalid maze (start with no open neighbour) | 19 | L2 | verified@L2 | solve inv | Intentional: always returns the shortest path when the end is reachable, where the original sometimes returned none. Deterministic BFS (no RNG; original used Np) |
| 25 | Solver: ShortestPaths | `ShortestPaths()`; breadth-first, all shortest solutions; asserts on invalid maze / no solution | 19 | L2 | verified@L2 | solve inv | Deterministic BFS (no RNG; original used Np). Port returns only equal-length shortest paths (original may also return longer ones; spec allows either), capped at 32 (`MAX_SHORTEST_PATHS` in src/solvers/shortest.ts; design choice, no golden or invariant requires more) |
| 26 | Solver: Tremaux | `Tremaux()`; Trémaux marking | 19 | L2 | verified@L2 | solve inv | RNG (port design): Py stream only (original used both) |
| 27 | Transmuter contract | `transmute(grid, start, end)` mutates the grid in place; result must stay solvable (op `transmute`) | 1, 2, 3 | L2 | verified@L2 | transmute 120/120 inv | None |
| 28 | Transmuter: CuldeSacFiller | `CuldeSacFiller()`; closes off loops that form culs-de-sac | 27 | L2 | verified@L2 | transmute inv | Deterministic (no RNG; original used Np) |
| 29 | Transmuter: DeadEndFiller | `DeadEndFiller(iterations=1)`; fills dead ends (never filling start/end) | 27 | L2 | verified@L2 | transmute inv | Deterministic (no RNG; original used Np) |
| 30 | Transmuter: Perturbation | `Perturbation(repeat=1, new_walls=1)`; adds random walls then repairs the maze to perfect again | 27, 4 | L2 | verified@L2 | transmute inv | RNG (port design): Py stream only (original used both) |
| 31 | Maze facade: core | `Maze(seed=None)`; static `Maze.set_seed(seed)` seeds both RNG streams; attributes `generator`, `grid`, `start`, `end`, `transmuters`, `solver`, `solutions`, `prune` (default true); `generate()` (asserts a generator is set; clears start/end/solutions), `transmute()` (asserts a grid exists), `solve()` (asserts solver and entrances; prunes when `prune`) | 1, 2, 4, 19, 27 | L2 | verified@L2 | entrances/monte_carlo/tostring pass; vitest | None |
| 32 | Maze facade: entrances | `generate_entrances(start_outer=True, end_outer=True)`; outer entrances lie on the border opposite each other, inner ones on cells; start and end never equal or adjacent (op `entrances`) | 31 | L2 | verified@L2 | entrances 200/200 inv | Py stream (as original); exact positions differ by design (cr: invariant) |
| 33 | Maze facade: string rendering | `tostring(entrances=False, solutions=False)`, `str(maze)` / `repr(maze)` = both overlays on; `#` wall, space open, `S`/`E`/`+` overlays (first solution only); empty string when no grid (op `tostring`, exact under `cr`) | 31 | L2 | verified@L2 | tostring 20/20 exact | None |
| 34 | Maze facade: Monte Carlo | `generate_monte_carlo`: params `repeat`, `entrances` (default 3), `difficulty` (default 1.0), `reducer` (default: path length); generate `repeat` mazes, keep the hardest of `entrances` entrance pairs per maze, rank by reducer, pick by difficulty; asserts `0 <= difficulty <= 1` (op `monte_carlo`) | 31, 32 | L2 | verified@L2 | monte_carlo 37/37 inv (1 exact error case) | None beyond inherited generator/solver RNG use |
| 35 | Adapter (target only) | `adapter/adapter.ts`, JSON lines per goldens `PROTOCOL.md`; maps target errors to Python exception class names | all | L2 | verified@L2 | all 7 sets compare+check pass | Error mapping by class name (`AssertionError`, `ValueError`) |

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
| generators: abstract constructor (size checks / base generator behavior) | test/generators.test.ts: "validates sizes" | covered |
| generators: aldous_broder (valid perfect maze, shape, borders) | test/generators.test.ts: "AldousBroder {} builds perfect mazes" | covered |
| generators: backtracking_generator | test/generators.test.ts: "BacktrackingGenerator {} builds perfect mazes" | covered |
| generators: binary_tree (each skew) | test/generators.test.ts: "BinaryTree ... builds perfect mazes" (each skew), "BinaryTree NW opens the bottom row and left column", "BinaryTree keeps a random skew per object" | covered |
| generators: cellular_automaton | test/generators.test.ts: "CellularAutomaton is connected with open cells" | covered |
| generators: division | test/generators.test.ts: "Division {} builds perfect mazes" | covered |
| generators: dungeon_rooms_grid (from a supplied grid) | test/generators.test.ts: "DungeonRooms takes its size from a supplied grid and restarts from it" | covered |
| generators: dungeon_reconnect_maze (reconnecting a disconnected grid) | test/generators.test.ts: "DungeonRooms is connected with and without rooms" (reconnection is exercised via rooms; no dedicated disconnected-grid test) | partial |
| generators: dungeon_rooms_random_rooms | test/generators.test.ts: "DungeonRooms is connected with and without rooms" | covered |
| generators: dungeon_rooms_serpentine_rooms | test/generators.test.ts: "DungeonRooms is connected with and without rooms" (alternates serpentine by seed) | covered |
| generators: ellers | test/generators.test.ts: "Ellers ... builds perfect mazes", "Ellers handles wide mazes without overflow and clamps skews" | covered |
| generators: growing_tree | test/generators.test.ts: "GrowingTree ... builds perfect mazes" | covered |
| generators: hunt_and_kill_random_order | test/generators.test.ts: "HuntAndKill {} builds perfect mazes" | covered |
| generators: hunt_and_kill_serpentine_order | test/generators.test.ts: "HuntAndKill {"hunt_order":"serpentine"} builds perfect mazes" | covered |
| generators: kruskal | test/generators.test.ts: "Kruskal {} builds perfect mazes" | covered |
| generators: prims | test/generators.test.ts: "Prims {} builds perfect mazes" | covered |
| generators: sidewinder | test/generators.test.ts: "Sidewinder ... builds perfect mazes" | covered |
| generators: trivial_maze_spiral | test/generators.test.ts: "TrivialMaze {} builds perfect mazes", "TrivialMaze produces one of the two documented orientations" | covered |
| generators: trivial_maze_serpentine | test/generators.test.ts: "TrivialMaze {"maze_type":" SERPENTINE "} builds perfect mazes" | covered |
| generators: wilsons_random_order | test/generators.test.ts: "Wilsons {} builds perfect mazes" | covered |
| generators: wilsons_serpentine_order | test/generators.test.ts: "Wilsons {"hunt_order":"serpentine"} builds perfect mazes" | covered |
| maze: grid_size (grid dimensions from cell counts) | test/grid.test.ts: "forCells gives (2h+1) x (2w+1) all walls" | covered |
| maze: inner_entrances | test/maze.test.ts: generateEntrances "satisfies postconditions for ii/io/oi" | covered |
| maze: outer_entrances | test/maze.test.ts: generateEntrances "satisfies postconditions for oo" | covered |
| maze: generator_wipe (regenerate clears entrances/solutions) | test/maze.test.ts: "generate resets entrances and solutions" | covered |
| maze: monte_carlo | test/maze.test.ts: generateMonteCarlo "orders by reducer: 0.0 easiest, 1.0 hardest", "rejects out-of-range difficulty before generating" | covered |
| maze: monte_carlo_reducer (custom reducer) | test/maze.test.ts: generateMonteCarlo "uses a custom reducer" | covered |
| maze: maze_to_string (rendering with/without overlays) | test/maze.test.ts: tostring (5 tests) | covered |
| maze: invalid_inputs (assertions on bad usage) | test/maze.test.ts: "generate/transmute/solve assert", generateEntrances "asserts without a grid" | covered |
| maze: set_seed (same seed gives same maze) | test/maze.test.ts: "is deterministic under a seed and keeps solutions"; test/rng.test.ts: setSeed (3 tests) | covered |
| solvers: prune_solution | test/solvers.test.ts: pruneSolutions (3 tests); test/maze.test.ts: "erases loops and strips endpoints" | covered |
| solvers: backtracking_solver | test/solvers.test.ts: "BacktrackingSolver: ..." (3 per-solver tests) | covered |
| solvers: chain | test/solvers.test.ts: "Chain...: ..." (per-solver tests, both turns), "createSolver maps names and Chain turn" | covered |
| solvers: collision | test/solvers.test.ts: "Collision: ...", "Collision returns all shortest paths on the CellularAutomaton known-bug grid" | covered |
| solvers: random_mouse | test/solvers.test.ts: "RandomMouse: ..." (per-solver tests) | covered |
| solvers: shortest_path | test/solvers.test.ts: "ShortestPath: ..." (per-solver tests) | covered |
| solvers: shortest_paths | test/solvers.test.ts: "ShortestPaths: ..." (per-solver tests) | covered |
| solvers: tremaux | test/solvers.test.ts: "Tremaux: ..." (per-solver tests) | covered |
| transmuters: cul_de_sac_filler | test/transmuters.test.ts: CuldeSacFiller (2 tests) | covered |
| transmuters: dead_end_filler | test/transmuters.test.ts: DeadEndFiller (3 tests) | covered |
| transmuters: perturbation | test/transmuters.test.ts: Perturbation (2 tests) | covered |
