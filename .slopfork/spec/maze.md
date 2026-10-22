# Spec: maze

Provenance: documented (mazelib `docs/API.md`, README) plus derived-from-source (cleanroom spec-writer) and observed (goldens `entrances`, `tostring`, `monte_carlo`, `solve` ops; `checkers/invariants.py`). · Audit: see AUDIT.md

## Purpose
`Maze` is the user-facing object that holds one rectangular maze and runs the pipeline. A generator builds the walls. Optional transmuters reshape them. `generate_entrances` picks a start and an end. A solver finds routes between them. `tostring` renders the result as text. `generate_monte_carlo` produces many mazes and keeps one of a chosen difficulty. The object also owns seeding of both random streams (see rng.md).

## Public interface
Python names as documented. The TS port uses camelCase equivalents (e.g. `setSeed`, `generateEntrances`, `generateMonteCarlo`, `toString`) and lists the mapping in the README.

- Constructor `Maze(seed: optional<int> = null)`.
- Static `set_seed(seed: optional<int>)`.
- Attributes (all public, read/write):
  - `generator: optional<Generator>` (initially null)
  - `grid: optional<grid<bool>>` (null)
  - `start: optional<cell>` (null)
  - `end: optional<cell>` (null)
  - `transmuters: list<Transmuter>` (empty)
  - `solver: optional<Solver>` (null)
  - `solutions: optional<list<path>>` (null)
  - `prune: bool` (true)
- `generate() -> void`
- `generate_entrances(start_outer: bool = true, end_outer: bool = true) -> void`
- `transmute() -> void`
- `solve() -> void`
- `tostring(entrances: bool = false, solutions: bool = false) -> string`
- String conversion (Python `str(maze)` / `repr(maze)`) = `tostring(true, true)`.
- `generate_monte_carlo(repeat: int, entrances: int = 3, difficulty: float = 1.0, reducer: function(path) -> number = path length) -> void`

Collaborator contracts the facade relies on:
- Generator: `generate() -> grid` (fresh grid each call).
- Transmuter: `transmute(grid, start, end)` mutates grid in place. start/end may be null for transmuters that don't need them.
- Solver: `solve(grid, start, end) -> list<path>` and `prune_solutions(list<path>) -> list<path>`.

## Behavior

### Construction and seeding
1. `Maze(seed)` sets every attribute to its initial value listed above, then calls `set_seed(seed)`.
2. `set_seed(seed)`: if seed is null, do nothing. Otherwise seed the Py stream, then the Np stream, with the same integer. Full rules, including the ValueError for seeds outside 0 .. 2^32-1, are in rng.md (Behavior 20-21). Seeding is global (it affects every algorithm object, not just this maze).
3. The goldens adapter mirrors this. It constructs `Maze()` without a seed and calls `set_seed(case.seed)` before building any generator/solver/transmuter, but only when `seed` is present and non-null. Seeding happens before construction because some constructors draw randomness (e.g. BinaryTree without a skew).

### generate
4. Precondition: `generator` is set, else AssertionError.
5. `grid` becomes the generator's new grid. `start`, `end` and `solutions` are reset to null. `transmuters`, `solver`, `prune` are untouched. Transmuters are **not** run automatically.

### generate_entrances
6. Uses the current `grid` shape H x W (any shape works, not only generator output). The grid itself is not modified. In particular, outer entrances stay wall positions in the grid. Entrances are not checked for being open. Inner entrances are cell positions, which are open in every generator's output.
7. Draws come from the **Py stream** only.
8. Position classes (with H, W the grid's row and column counts):
   - An **outer** position lies on one of the four sides at a cell-aligned index: North (0, c), South (H-1, c), West (r, 0), East (r, W-1), where c is odd in 1..W-2 and r is odd in 1..H-2. Corners are never chosen.
   - An **inner** position is any cell (r odd in 1..H-2, c odd in 1..W-2).
9. `start_outer = true, end_outer = true`: choose one of the four sides uniformly for the start, and a uniformly random cell-aligned position on it. The end is a uniformly random cell-aligned position on the **opposite** side (North and South are opposite, West and East are opposite). Start and end positions along their sides are independent.
10. `start_outer = false, end_outer = false`: start is a uniformly random cell. End is a uniformly random cell **different from** start (redraw until different).
11. Exactly one of the two outer: the outer endpoint is a uniformly random side and a cell-aligned position on it. The inner endpoint is a uniformly random cell. `start_outer = true, end_outer = false` gives start = outer, end = inner. `start_outer = false, end_outer = true` gives start = inner, end = outer.
12. **Adjacency rule** (all modes): if the Manhattan distance |start.row - end.row| + |start.col - end.col| is less than 2, the whole selection is discarded and redone with the same flags until it is at least 2. In practice this only triggers in the mixed modes, when the inner cell sits right next to the chosen border position (e.g. outer (0, 1) and inner (1, 1)). Outer/outer pairs on opposite sides are always at least H-1 or W-1 apart. Distinct inner cells are always at least 2 apart. The final distribution is therefore the per-mode distribution above, conditioned on non-adjacency.
13. Postconditions (exactly what the goldens checker enforces for the `entrances` op and for the `monte_carlo` result):
    - Both positions are inside the grid.
    - An endpoint requested as outer is on the border, not a corner, and cell-aligned: row 0 or H-1 with an odd column, or column 0 or W-1 with an odd row.
    - An endpoint requested as inner has odd row and odd column and is not on the border.
    - Manhattan distance between start and end >= 2.
    - If both are outer: they are on opposite sides (start row 0 and end row H-1, or vice versa, or start column 0 and end column W-1, or vice versa).
14. Only `start` and `end` are written. `solutions` is **not** cleared.
15. Calling it with no grid: the original crashes with a non-assertion error. Not exercised by the goldens. A port should raise AssertionError.

### transmute
16. Precondition: `grid` is not null, else AssertionError.
17. Applies each transmuter in `transmuters`, in list order, to the same grid object in place, passing the current `start` and `end` (which may be null). An empty list is a no-op. `solutions` is not cleared or recomputed.

### solve
18. Preconditions, in order: `solver` is set (AssertionError otherwise); `start` and `end` are both non-null (AssertionError otherwise).
19. Then the solver itself validates and raises AssertionError if any coordinate of start or end is outside 0..H-1 / 0..W-1. (A null grid makes the original crash with a non-assertion error. Not exercised; a port should raise AssertionError.) Solver-specific assertions (e.g. ShortestPath/ShortestPaths on an invalid maze) are in the solvers spec.
20. `solutions` = solver.solve(grid, start, end). If `prune` is true, `solutions` is replaced by solver.prune_solutions(solutions). The grid passed in is not modified.
21. **Solution path convention** (solver-agnostic): `solutions` is a list of paths. Each path lists grid positions strictly between start and end, in walking order from start toward end. The start and end are never included. Consecutive positions (and start -> first entry, last entry -> end) differ by exactly one step in one axis. Each listed position is open. A path walks through wall slots as well as cells (see grid.md Behavior 10). An empty solutions list means "no solution found". The goldens adapter's `prune` argument maps to this attribute.

### tostring (compared exactly under `cr`)
22. If `grid` is null, return the empty string.
23. Otherwise build one text row per grid row, one character per grid position: `#` for a wall (any non-zero value), a single space for open. Note: a space, not the `.` used in the JSON grid encoding.
24. **Entrance overlay**: only when the `entrances` argument is true **and** both `start` and `end` are non-null. Then the character at start becomes `S`, and after that the character at end becomes `E`. If only one of them is set, neither is drawn. A start of (0, 0) counts as set. Presence means non-null, not non-zero.
25. **Solution overlay**: only when the `solutions` argument is true **and** the `solutions` attribute is non-null **and** non-empty. Then every position in the **first** path only is replaced by `+`. Further paths are ignored. An empty first path draws nothing. This overlay is applied after the entrance overlay, so `+` would overwrite S/E if a path listed them (by convention it never does). The solution overlay does **not** depend on the `entrances` flag or on start/end being set.
26. Rows are joined with a single `\n`. There is **no** trailing newline and no trailing whitespace trimming: rows keep their full width W, including trailing spaces.
27. Overlays replace exactly one character each and never change row lengths. Positions are assumed to be inside the grid. Out-of-range overlay positions are not exercised and are unspecified.
28. Default arguments are both false, so plain `tostring()` shows walls only. String conversion shows both overlays.

### generate_monte_carlo
29. Precondition, checked first, before any generation or random draw: 0.0 <= difficulty <= 1.0, else AssertionError. (NaN fails the check, also AssertionError.) The generator and solver must already be set. Otherwise the generate/solve preconditions above raise AssertionError at first use.
30. Repeat `repeat` times:
    1. Call `generate()` (fresh grid; start/end/solutions reset).
    2. Run `entrances` trials on that same grid. Each trial calls `generate_entrances()` with the defaults (outer/outer), then `solve()` (honoring the `prune` attribute, default true), and records (grid, start, end, solutions).
    3. Keep the trial whose solutions list has the **most paths** (the count of paths, not their length). Ties go to the **earliest** trial.
31. Sort the kept records (one per maze) **ascending** by `reducer(first path of the record's solutions)`, using a stable sort, so equal keys keep generation order. The default reducer is the path length (number of entries).
32. Pick index = floor((number of records - 1) * difficulty). So difficulty 0.0 picks the easiest (smallest key), 1.0 the hardest (largest key), and with 3 records 0.5 picks the middle one.
33. Set `grid`, `start`, `end`, `solutions` from the chosen record. Transmuters are not applied anywhere in this process.
34. The goldens `monte_carlo` op returns grid, start, end, solutions after this call. Under `cr` it is checked by invariants: the grid satisfies the generator's v0 invariants (for parameterless generators; otherwise just shape/alphabet); start/end are legal outer/outer entrances (Behavior 13); solutions is non-empty; and the first path is a valid route strictly between start and end (Behavior 21). A port must therefore make sure every kept record has at least one solution.
35. Degenerate inputs (not in goldens): if the chosen trial has an empty solutions list, the original fails with an IndexError while ranking. `entrances = 0` (with repeat >= 1) fails with ValueError. `repeat = 0` fails with IndexError. Ports may raise any error for these. Not compared.
36. Randomness consumed: whatever the generator, generate_entrances (Py stream) and the solver consume, in that order per trial. Draw order is not part of the `cr` contract.

### Adapter op mapping (for the facade-related ops)
37. `entrances`: new Maze, grid = args.grid, generate_entrances(start_outer, end_outer); return start and end.
38. `solve`: new Maze, grid, start, end from args; solver from algo/params; `prune` from args (default true); solve(); return solutions (a list, possibly empty).
39. `transmute`: new Maze, grid, start, end from args; `transmuters` = [the one transmuter]; transmute(); return the grid.
40. `tostring`: new Maze, grid, start, end, solutions from args (each may be null); return tostring(args.entrances, args.show_solutions). These cases carry no seed and draw no randomness.
41. `monte_carlo`: new Maze; generator from args.generator (algo, h, w, params); solver from args.solver; generate_monte_carlo(repeat, entrances, difficulty) with the default reducer.
42. Any error raised while running an op becomes `{"ok": false, "error": {"kind": <Python exception class name>, "message": ...}}`. Only `kind` is compared.

## Invariants
- After `generate()`: grid non-null, start = end = solutions = null.
- After `generate_entrances(so, eo)`: Behavior 13 postconditions hold.
- After `solve()`: every path in solutions satisfies Behavior 21.
- `tostring` output has exactly H lines (H-1 newline characters), each of exactly W characters, alphabet within {`#`, space, `S`, `E`, `+`}.
- `tostring(false, false)` is independent of start, end and solutions.
- `generate_monte_carlo` leaves grid/start/end/solutions all non-null and mutually consistent (the solutions belong to that grid and those entrances).

## Errors
Error kinds observed in the goldens (messages informational only):

| Condition | Error kind | Contractual message? |
|---|---|---|
| `generate()` with no generator | AssertionError | no |
| `transmute()` with no grid | AssertionError | no |
| `solve()` with no solver | AssertionError | no |
| `solve()` with start or end null | AssertionError | no |
| Solver given start/end outside the grid (null grid: AssertionError recommended, not in goldens) | AssertionError | no |
| `generate_monte_carlo` with difficulty < 0 or > 1 (goldens: `mc/invalid-difficulty`, difficulty 1.5) | AssertionError | no |
| Generator constructed with h < 3 or w < 3 (goldens `gen/<Algo>/invalid/*`: 1x1, 2x2, 2x5, 5x2, 0x3, -1x4, for every generator) | AssertionError | no |
| Exception: DungeonRooms with a negative h or w (goldens `gen/DungeonRooms/invalid/h-1w4`) | ValueError (it fails building its blank grid before the size check; 0x3, 1x1, 2x2, 2x5, 5x2 still give AssertionError) | no |
| `set_seed` / adapter seed outside 0 .. 2^32-1 (goldens: -7, 4294967301) | ValueError | no |
| Py `randrange` empty range (goldens `rng/errors/*`) | ValueError | no |
| `generate_entrances` with no grid (not in goldens) | port: AssertionError recommended | no |

Crashes of the original on valid input (`KNOWN_BUGS.json`: Ellers OverflowError, Collision TypeError) are not contract. Ports must return a valid result there.

## Edge cases
| Input | Expected |
|---|---|
| tostring with grid null | `""` |
| tostring, entrances = true, start and end null, solutions null | walls only |
| tostring, entrances = true, only start set | walls only (no S) |
| tostring, solutions = true, solutions = [] | no `+` |
| tostring, solutions = true, entrances = false | `+` drawn, no S/E |
| generate_entrances on a 3x3-cell grid, mixed mode | retries until the inner cell is not adjacent to the border position |
| generate_entrances inner/inner | start != end always |
| generate_monte_carlo with repeat = 1 | the single maze's kept trial, whatever the difficulty |
| generate_monte_carlo with difficulty exactly 0.0 or 1.0 | allowed (bounds inclusive) |
| `prune = false` | solver's raw solutions are kept unchanged |

## Worked examples
All from the goldens.

**tostring** (`cases/tostring.jsonl`; the grid in all `str/Prims3x3/*` cases is the 7x7 grid shown in grid.md's worked example). Below, `|` marks line starts/ends for readability only. The actual text has no `|`, rows are joined by `\n`, and there is no trailing newline.

1. `str/Prims3x3/oo/e0s0`: start (3,0), end (1,6), solutions = one path, the 7-position route listed in grid.md's worked example, entrances = false, show_solutions = false. Text:
   `#######` / `#     #` / `# #####` / `#   # #` / `# ### #` / `#     #` / `#######`
2. `str/Prims3x3/oo/e0s1` (same, show_solutions = true): `#######` / `#+++++#` / `#+#####` / `#+  # #` / `# ### #` / `#     #` / `#######`
3. `str/Prims3x3/oo/e1s0` (entrances = true, show_solutions = false): `#######` / `#     E` / `# #####` / `S   # #` / `# ### #` / `#     #` / `#######`
4. `str/Prims3x3/oo/e1s1` (both true): `#######` / `#+++++E` / `#+#####` / `S+  # #` / `# ### #` / `#     #` / `#######`
5. `str/Prims3x3/oo/no-entrances`: start, end, solutions all null, both flags true: walls only, identical to example 1.
6. `str/Prims3x3/ii/e1s1`: start (5,3), end (3,1), solutions [] (empty list), both flags true: `#######` / `#     #` / `# #####` / `#E  # #` / `# ### #` / `#  S  #` / `#######`. Empty solutions draw nothing. S and E still drawn.
7. `str/Prims3x3/ii/e0s1`: same but entrances = false: walls only.
8. Exact JSON value of example 4: `"#######\n#+++++E\n#+#####\nS+  # #\n# ### #\n#     #\n#######"`.
9. `str/Prims6x6/ii/e1s0`: 13x13 grid, start (7,11), end (7,9): row 7 renders as `# #   #  E#S#`.

**entrances** (`cases/entrances.jsonl`, `cr` = invariant; the exact positions depend on draw order and are not required). Cases cover Prims 3x3, 3x5, 8x8, 3x9 and DungeonRooms 6x6, each with flags oo / oi / io / ii and seeds 0-9. What must hold is Behavior 13. For a 3x3-cell grid (7x7): legal outer positions are (0,1), (0,3), (0,5), (6,1), (6,3), (6,5), (1,0), (3,0), (5,0), (1,6), (3,6), (5,6). Legal inner positions are the 9 cells (1|3|5, 1|3|5).

**solve convention** (`expected/solve.jsonl`): `solve/BacktrackingSolver/Prims3x3/ii/p/s0`, start (5,3), end (3,1): the path begins (5,2), (5,1), (4,1). It starts one step from start and ends one step from end, with neither endpoint included.

**monte_carlo** (`cases/monte_carlo.jsonl`, `cr` = invariant):
- `mc/Prims/ShortestPath/d0.0/s0`: generator Prims 4x4, solver ShortestPath, repeat 3, entrances 3, difficulty 0.0. The original returned a 9x9 grid, start (3,0), end (5,8), and one solution of 9 positions: (3,1), (3,2), (3,3), (3,4), (3,5), (4,5), (5,5), (5,6), (5,7). Start (3,0) is on the West side and end (5,8) on the East side, which are opposite.
- Across the 36 valid `mc/*` cases, the original always returned exactly one solution path, with outer start/end on opposite sides.
- `mc/invalid-difficulty`: difficulty 1.5 -> AssertionError (no maze generated).

## Open questions
None yet.
