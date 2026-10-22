# Spec: generators

Provenance: derived-from-source (cleanroom spec-writer), cross-checked against the shared goldens (`cases/generate.jsonl`, `expected/generate.jsonl`, `invariants.json`, `KNOWN_BUGS.json`) and the public docs (`docs/MAZE_GEN_ALGOS.md`). · Audit: see `.slopfork/spec/AUDIT.md`

## Purpose
The 14 maze generators. Each one is configured with a maze size in cells (rows `h`, columns `w`) plus optional algorithm-specific options. Each call to `generate()` returns a new wall/open grid. Under the `cr` profile the generated grids aren't compared exactly. They must satisfy the per-variant invariants listed below, and invalid sizes must raise exactly the listed error kind.

---

## Part 1: The generator contract (shared by all 14)

### Public interface
- Constructor: `Algo(h: int, w: int, ...options)`. All 14 take the size **positionally in the order (h, w)**: rows first, then columns. Options follow, by keyword in the original. In the goldens they are the `params` object of a `generate` case.
- `generate() -> grid<bool>`: returns a freshly built grid. It doesn't keep or reuse the grid from an earlier call. The exceptions are per-object settings fixed at construction (BinaryTree's skew when it was chosen at random, DungeonRooms' supplied grid and rooms), which apply to every call.
- Public read-only facts every generator exposes in the original: `h`, `w` (cell counts) and `H = 2h+1`, `W = 2w+1` (grid dimensions). The Maze facade uses these. A port may expose them under idiomatic names.

### Grid conventions
1. The grid has `H = 2h+1` rows and `W = 2w+1` columns, stored as 0/1: 1 = wall, 0 = open. In the protocol, wall is `#` and open is `.`.
2. **Cells** sit at (odd row, odd column): cell (i, j) is at grid position (2i+1, 2j+1).
3. **Wall slots** between two orthogonally adjacent cells sit at (odd, even) or (even, odd) positions. Opening one joins the two cells.
4. **Posts** sit at (even, even) positions. In a classic maze they're always walls.
5. The outer frame (row 0, row H-1, column 0, column W-1) is always wall for every generator.

### Construction-time validation (all generators)
1. If `h < 3` or `w < 3`, construction fails with **AssertionError**. This includes zero and negative values. The check happens at construction, before `generate()` is ever called.
2. **DungeonRooms only:** if no `grid` is supplied and `h` or `w` is negative, construction fails with **ValueError** instead. In the original, the negative-dimension grid allocation fails before the size check runs. Zero still gives AssertionError. When a `grid` is supplied, `h`/`w` are derived from its shape (see DungeonRooms) and the 3x3 minimum applies to the derived values.
3. Error messages are never compared, only the kind.

The 6 `/invalid/` cases per algorithm are compared **exactly** under `cr` (verified against `expected/generate.jsonl`):

| (h, w) | All generators except DungeonRooms | DungeonRooms |
|---|---|---|
| (1, 1) | AssertionError | AssertionError |
| (2, 2) | AssertionError | AssertionError |
| (2, 5) | AssertionError | AssertionError |
| (5, 2) | AssertionError | AssertionError |
| (0, 3) | AssertionError | AssertionError |
| (-1, 4) | AssertionError | **ValueError** |

All 6 invalid cases use empty `params`.

### String options
- `hunt_order` (HuntAndKill, Wilsons, DungeonRooms) and `maze_type` (TrivialMaze) are matched **case-insensitively after trimming surrounding whitespace**. Only the non-default keyword is recognized (`serpentine` in both cases). Any other string, including unknown ones like `bogus`, gives the default (`random` for `hunt_order`, `spiral` for `maze_type`).
- BinaryTree `skew` is matched **exactly** (case-sensitive) against `NW`, `NE`, `SW`, `SE`. Anything else, including null, lowercase, or unknown strings, means "choose one of the four uniformly at random, once, at construction".
- Numeric options aren't validated. Ellers clamps its two skews to [0, 1]. Sidewinder and GrowingTree use their values as-is, so values outside [0, 1] act like 0 or 1.

### Randomness
- In the adapter, both RNG streams (Python-`random`-compatible and NumPy-legacy-compatible) are seeded **before** the generator is constructed. That matters only for generators that draw at construction (BinaryTree with no valid skew).
- Under `cr`, how and in what order a generator draws from the streams is the port's own design. Exact draw-for-draw parity is **not** required. Use whichever stream suits you. The distributions described below are the intended behavior. The invariants are the contract.
- For information only: in the original, BinaryTree, Division, Ellers, Sidewinder and Wilsons use only the Python stream, and Kruskal uses only the NumPy stream. AldousBroder, BacktrackingGenerator, CellularAutomaton, DungeonRooms, GrowingTree, HuntAndKill, Prims and TrivialMaze use both.

### Invariant vocabulary
These are the property names used in `invariants.json` and checked by `checkers/invariants.py` (definitions from the goldens' `checkers/mazeprops.py`):

| Property | Meaning |
|---|---|
| shape | grid is exactly (2h+1) x (2w+1), all rows the same length |
| alphabet | only wall/open values (`#`/`.`) |
| border_walls | entire outer frame is wall |
| corners_walls | every (even, even) post is wall |
| cells_open | every (odd, odd) cell is open |
| connected | all open squares form a single 4-connected component |
| acyclic | number of open-open orthogonal adjacencies = open squares − components (the open squares form a forest) |
| perfect | connected and acyclic (a spanning tree over the cells, which together with corners_walls and cells_open means a classic perfect maze) |

### Required invariants per variant (`cr`)
Variant `vN` in a case id `gen/<algo>/<vN>/h<h>w<w>/s<seed>` maps to these `params`. Every variant is exercised at sizes (3,3), (3,5), (5,3), (4,7), (8,8), (12,17), with 8 seeds (s0..s7) each.

| Algo / variant | params | Required invariants |
|---|---|---|
| AldousBroder/v0 | {} | PERFECT-SET |
| BacktrackingGenerator/v0 | {} | PERFECT-SET |
| BinaryTree/v0 | {} (random skew) | PERFECT-SET |
| BinaryTree/v1 | skew NW | PERFECT-SET |
| BinaryTree/v2 | skew NE | PERFECT-SET |
| BinaryTree/v3 | skew SW | PERFECT-SET |
| BinaryTree/v4 | skew SE | PERFECT-SET |
| CellularAutomaton/v0 | {} (complexity 1.0, density 1.0) | shape, alphabet, border_walls, cells_open, connected |
| CellularAutomaton/v1 | complexity 0.5, density 0.5 | shape, alphabet, border_walls, cells_open, connected |
| CellularAutomaton/v2 | complexity 2.0, density 0.2 | shape, alphabet, border_walls, cells_open, connected |
| Division/v0 | {} | PERFECT-SET |
| DungeonRooms/v0 | {} (no rooms, random hunt) | shape, alphabet, border_walls, cells_open, connected, corners_walls |
| DungeonRooms/v1 | hunt_order serpentine | shape, alphabet, border_walls, cells_open, connected, corners_walls |
| DungeonRooms/v2 | one room (see below) | shape, alphabet, border_walls, cells_open, connected |
| Ellers/v0 | {} (xskew 0.5, yskew 0.5) | PERFECT-SET |
| Ellers/v1 | xskew 0.1, yskew 0.9 | PERFECT-SET |
| Ellers/v2 | xskew 0.9, yskew 0.1 | PERFECT-SET (including the 8 KNOWN_BUGS cases at 12x17) |
| GrowingTree/v0 | {} (backtrack_chance 1.0) | PERFECT-SET |
| GrowingTree/v1 | backtrack_chance 0.0 | PERFECT-SET |
| GrowingTree/v2 | backtrack_chance 0.5 | PERFECT-SET |
| HuntAndKill/v0 | {} (random hunt) | PERFECT-SET |
| HuntAndKill/v1 | hunt_order serpentine | PERFECT-SET |
| Kruskal/v0 | {} | PERFECT-SET |
| Prims/v0 | {} | PERFECT-SET |
| Sidewinder/v0 | {} (skew 0.5) | PERFECT-SET |
| Sidewinder/v1 | skew 0.1 | PERFECT-SET |
| Sidewinder/v2 | skew 0.9 | PERFECT-SET |
| TrivialMaze/v0 | {} (spiral) | PERFECT-SET |
| TrivialMaze/v1 | maze_type serpentine | PERFECT-SET |
| Wilsons/v0 | {} (random hunt) | PERFECT-SET |
| Wilsons/v1 | hunt_order serpentine | PERFECT-SET |

PERFECT-SET = shape, alphabet, border_walls, corners_walls, cells_open, connected, acyclic, perfect.

DungeonRooms/v2 rooms per size (grid coordinates, inclusive corners `[[r1,c1],[r2,c2]]`):

| size (h, w) | rooms |
|---|---|
| 3x3, 3x5, 5x3 | [[[3,3],[5,5]]] |
| 4x7 | [[[3,5],[5,7]]] |
| 8x8 | [[[5,5],[7,7]]] |
| 12x17 | [[[9,11],[11,13]]] |

### Known bug to fix (KNOWN_BUGS)
`gen/Ellers/v2/h12w17/s0` through `s7`: the original crashes with OverflowError because its per-cell set labels are stored in a signed 8-bit type and exceed 127 on wider/taller mazes with many fresh sets. The port must return a valid **perfect** maze for these cases (the checker requires it not to crash, and the PERFECT-SET applies). Use set labels with no small-width limit.

### Shared output guarantees
- Every generator: shape, alphabet, border_walls.
- Every generator: cells_open (all cells end up open).
- Every generator except CellularAutomaton and DungeonRooms-with-rooms: corners_walls.
- Every generator except CellularAutomaton and DungeonRooms: perfect (spanning tree over cells).
- CellularAutomaton and DungeonRooms: connected, but loops are allowed (and occur).

---

## Part 2: Per-generator specs

### AldousBroder

**Interface.** `AldousBroder(h, w)`. No options.

**Algorithm.** Aldous-Broder (published, 1989/1990): a random walk over the cell graph. It starts at a uniformly random cell. Whenever the walk enters a cell it hasn't visited before, it opens the wall slot it just crossed. It stops when all h·w cells have been visited. The textbook version picks a uniformly random neighbor at each step, which gives a uniform spanning tree. The original prefers an unvisited neighbor (uniformly among those) whenever one exists, and otherwise steps to a uniformly random already-visited neighbor. That speeds it up at the cost of exact uniformity. Either variant is acceptable under `cr`.

**Invariants.** PERFECT-SET.

**Errors.** Size < 3 in either dimension: AssertionError.

**Worked examples** (goldens):

`gen/AldousBroder/v0/h3w3/s0`

    #######
    #.....#
    #.###.#
    #...#.#
    #####.#
    #.....#
    #######

`gen/AldousBroder/v0/h3w5/s1`

    ###########
    #...#...#.#
    #.#.#.#.#.#
    #.#...#.#.#
    #.#.#####.#
    #.#.......#
    ###########

### BacktrackingGenerator

**Interface.** `BacktrackingGenerator(h, w)`. No options.

**Algorithm.** Recursive backtracker (randomized depth-first search). It starts at a uniformly random cell and keeps a stack of the current path. At each step it opens a passage from the top cell to a uniformly random unvisited neighbor and pushes that neighbor. When the top cell has no unvisited neighbor, it pops. It finishes when the stack is empty. Use an explicit stack, not recursion, so large mazes don't overflow the call stack.

**Invariants.** PERFECT-SET. Mazes typically have long, winding corridors and few dead ends.

**Errors.** Size < 3: AssertionError.

**Worked examples:**

`gen/BacktrackingGenerator/v0/h3w5/s0`

    ###########
    #.....#...#
    #.###.###.#
    #...#...#.#
    ###.#####.#
    #.........#
    ###########

`gen/BacktrackingGenerator/v0/h3w3/s1`

    #######
    #...#.#
    ###.#.#
    #...#.#
    #.###.#
    #.....#
    #######

### BinaryTree

**Interface.** `BinaryTree(h, w, skew = null)`, where `skew` is one of `NW`, `NE`, `SW`, `SE`, or null.

**Algorithm.** Binary tree maze. Every cell independently opens exactly one wall slot toward one of two fixed directions set by the skew, chosen uniformly between the two directions that stay inside the frame. If only one of the two stays inside the frame, it's forced. The single cell where neither does opens nothing. The result is always a spanning tree.

**Skew to direction mapping (observed, verified against goldens):**

| skew | each cell opens toward | fully open corridors | cell that opens nothing |
|---|---|---|---|
| NW | down (south) or left (west) | bottom row and left column | bottom-left cell |
| NE | down (south) or right (east) | bottom row and right column | bottom-right cell |
| SW | up (north) or left (west) | top row and left column | top-left cell |
| SE | up (north) or right (east) | top row and right column | top-right cell |

The two corridor sides of each skew are fully open (every wall slot between consecutive cells on that row/column is open). The public docs claim the default is `NW`. In the original, though, a missing or unrecognized skew means one of the four is chosen uniformly at random, **once per generator object at construction**. Repeated `generate()` calls on the same object keep that skew.

**Invariants.** PERFECT-SET for all variants v0 to v4.

**Errors.** Size < 3: AssertionError. A bad skew value is never an error.

**Worked examples:**

`gen/BinaryTree/v1/h3w5/s0` (NW)

    ###########
    #...#.....#
    #.###.#####
    #.......#.#
    #.#######.#
    #.........#
    ###########

`gen/BinaryTree/v4/h3w5/s0` (SE)

    ###########
    #.........#
    #########.#
    #.........#
    #.#.###.#.#
    #.#.#...#.#
    ###########

`gen/BinaryTree/v0/h3w3/s0` (random skew: the right column and the top and bottom rows are full corridors, which fits NE or SE)

    #######
    #.....#
    #####.#
    #.....#
    #####.#
    #.....#
    #######

### CellularAutomaton

**Interface.** `CellularAutomaton(h, w, complexity = 1.0, density = 1.0)` (floats).

**Algorithm.** The docs describe it with the Life-like "Maze" rule family (survival with a small number of live neighbors, birth with exactly three). What the original actually produces is the output of the well-known random **wall-growing** process (the "complexity/density" maze generator popular on Wikipedia/Rosetta-style examples), which works on the lattice of posts:
1. Start with an all-open interior inside a solid wall frame.
2. Scale the parameters by the maze size. If `complexity <= 1` it means `complexity * (h + w)`. If `density <= 1` it means `density * (h * w)`. Values above 1 are absolute counts.
3. Seed `floor(2 * density)` walls. Each seed is a post (even, even). For the first `density` of them the seed is a post on the outer frame (top/bottom or left/right side, each with probability 1/2, then uniform along that side). For the rest it's a uniformly random post anywhere. The seed post becomes wall.
4. From each seed, grow a wall for up to `floor(complexity)` steps. A step moves from the current post to a uniformly random orthogonally adjacent post (distance 2) that is still open, and fills both that post and the wall slot between them. The original only extends when the current post has between 1 and 3 wall posts among its 4 lattice neighbors. Otherwise that step does nothing.

The original rescales its stored parameters in place on the first `generate()`. A port should compute the scaled values without mutating the object, so repeated calls behave the same.

**Why connectivity holds, and what you must preserve.** Walls only ever grow into posts that weren't walls yet. So every wall structure is a tree, either hanging off the frame or floating free, and no wall cycle other than the frame itself can form. That keeps the open region in one piece. Odd-odd cells are never filled, since only posts and wall slots are, so cells_open holds. Any port design must guarantee **connected** and **cells_open**. Loops in the open region, open posts, and open areas wider than one cell are all expected (the docs call the output "imperfect").

**Invariants.** shape, alphabet, border_walls, cells_open, connected for v0 (1.0/1.0), v1 (0.5/0.5), v2 (2.0/0.2). Note that complexity 2.0 is above 1, so it's used as an absolute walk length of 2. Not required: corners_walls, acyclic, perfect.

**Errors.** Size < 3: AssertionError.

**Worked examples:**

`gen/CellularAutomaton/v0/h3w5/s0`

    ###########
    #.........#
    ###.#.###.#
    #.#.#.#.#.#
    #.###.#.#.#
    #.....#...#
    ###########

`gen/CellularAutomaton/v2/h4w7/s0` (sparse; large open areas)

    ###############
    #...#.......#.#
    #...#.###...#.#
    #...#.#.....#.#
    #.#.#.#####.#.#
    #.#...........#
    #.#.#####.###.#
    #.#.........#.#
    ###############

### Division

**Interface.** `Division(h, w)`. No options.

**Algorithm.** Recursive division. Start with a fully open interior (frame walled). Repeatedly take a rectangular open region (in grid units) and bisect it with a straight wall along a wall-slot row or column, then leave exactly one gap in that wall at a cell-aligned position. Recurse on both halves (use an explicit stack). Choosing the cut:
- If the region is taller than it is wide, cut horizontally. If it's wider than tall, cut vertically. If it's square, pick either direction with probability 1/2. This keeps the alternation the docs mention.
- The cut position is uniform among the wall-slot lines strictly inside the region. The gap position is uniform among the cell positions along the cut.
- Stop subdividing a region once it's one cell thick in either direction.

**Invariants.** PERFECT-SET. Mazes show long straight walls (the "biased, skewed" look in the docs).

**Errors.** Size < 3: AssertionError.

**Worked examples:**

`gen/Division/v0/h3w5/s0`

    ###########
    #.#.#.#.#.#
    #.#.#.#.#.#
    #.........#
    #.###.###.#
    #.#.....#.#
    ###########

`gen/Division/v0/h4w7/s1`

    ###############
    #.............#
    #.###.#.#.#.#.#
    #...#.#.#.#.#.#
    #.#####.#####.#
    #...#.#...#...#
    #.###.#.###.###
    #...#.....#...#
    ###############

### DungeonRooms

**Interface.** `DungeonRooms(h, w, rooms = null, grid = null, hunt_order = "random")`.
- `rooms`: `optional<list<room>>`, where each room is a pair of grid coordinates `[[r1, c1], [r2, c2]]`: top-left and bottom-right, **inclusive**, in grid units (not cell units). For clean results, all four numbers should be odd so the room's corners are cells. The room then covers cells and the wall slots and posts between them.
- `grid`: `optional<grid<bool>>`, a pre-built grid (1 = wall, 0 = open). If given, its shape overrides `h`/`w`: `h = (rows − 1) / 2`, `w = (cols − 1) / 2` (integer division). Already-open squares in it, typically pre-carved rooms, are kept. Fully-walled squares are where the maze will be grown. The supplied grid is copied at construction and **each `generate()` restarts from that copy**.
- `hunt_order`: `random` (default) or `serpentine`, with the same matching rules as HuntAndKill.

**Algorithm.** Hunt-and-kill seeded with rooms, followed by a reconnection pass:
1. Start from the base grid: the copy of the supplied grid, or all walls if none was supplied.
2. Carve each room: open every square of the inclusive rectangle. A room that's malformed or reaches outside the grid is skipped silently and never raises. Partial carving of an out-of-range room is unspecified, so the cleanest choice is to skip it entirely. If all four of a room's coordinates are odd, also open one random **door**: a wall slot on the room's perimeter that lines up with a cell, chosen on a side that isn't against the outer frame. Rooms with even coordinates get no door.
3. Choose a random start among the cells that are still walls (unvisited), and open it. If there's no such cell (the supplied grid is already fully open at every cell), fail with **AssertionError**. The original detects this by giving up after 2·H·W random probes. A port should check it deterministically.
4. Run hunt-and-kill over the unvisited cells, exactly as described for HuntAndKill: a random walk carving into unvisited cells, then a hunt for the next visited cell that still has an unvisited neighbor. Room squares count as visited, so walks never carve into rooms.
5. Reconnect: find the connected components of open squares. While there's more than one, open a single wall slot between a cell of one component and an adjacent cell of another, which merges them. Repeat until the whole maze is connected.

**Output.** Connected, cells_open, frame walled. Loops can appear: through room doors plus reconnection, and in the original even without rooms, because its component merging sometimes treats one component as two and opens an extra wall. Without rooms, a perfect maze is also acceptable (v0/v1 don't require acyclic). With rooms, posts inside rooms are open, so corners_walls isn't required.

**Hunt completeness.** The original's random hunt probes a fixed budget of H·W random cells and accepts a small risk of leaving cells unvisited. The goldens require **cells_open** in every case, so the port must guarantee that every cell gets visited. For example, after the random probes, fall back to a systematic scan.

**Invariants.**
- v0 and v1 (no rooms): shape, alphabet, border_walls, cells_open, connected, corners_walls.
- v2 (one room per the table in Part 1): shape, alphabet, border_walls, cells_open, connected.

**Errors.**

| Condition | Error kind |
|---|---|
| no grid, `h < 0` or `w < 0` | ValueError |
| no grid, `0 <= h < 3` or `0 <= w < 3` | AssertionError |
| grid supplied whose derived h or w < 3 | AssertionError |
| grid supplied with no walled cell to start from | AssertionError (at generate time) |
| invalid room entries | none (ignored) |

The golden invalid case (-1, 4) expects ValueError. The other five expect AssertionError.

**Worked examples:**

`gen/DungeonRooms/v2/h3w3/s0`, rooms [[[3,3],[5,5]]]: grid rows 3 to 5, columns 3 to 5 are a solid open block.

    #######
    #.....#
    #.#####
    #.#...#
    #.#...#
    #.....#
    #######

`gen/DungeonRooms/v2/h4w7/s0`, rooms [[[3,5],[5,7]]]

    ###############
    #.............#
    #.###.#######.#
    #...#...#.....#
    ###.#...#######
    #.#.#.....#...#
    #.#.###.#.#.#.#
    #...#...#...#.#
    ###############

`gen/DungeonRooms/v0/h3w5/s0` (no rooms)

    ###########
    #.#...#...#
    #.#.#.#.###
    #...#.#...#
    #.###.###.#
    #...#.....#
    ###########

### Ellers

**Interface.** `Ellers(h, w, xskew = 0.5, yskew = 0.5)` (floats, each clamped to [0, 1]).

**Algorithm.** Eller's algorithm (row-by-row set merging, per the public docs):
1. Process cell rows top to bottom. Every cell in the current row that isn't already in a set gets a fresh set.
2. For every row except the last: for each horizontally adjacent pair of cells, with probability `xskew`, if they're in different sets, open the wall slot between them and merge the sets.
3. For every row except the last: each set present in the row gets **at least one** downward passage, from a uniformly random member cell of that set. Then each other cell in the row additionally gets a downward passage with probability `yskew`. The original applies this extra chance to every column except the last. A port may include the last column too, since it's still a valid Eller's. A cell below a downward passage joins the set above it.
4. Last row: join every adjacent pair of cells that are in different sets (no downward passages).

**Meaning of the skews.** `xskew` is the probability of horizontal joins: high values give long horizontal corridors. `yskew` is the probability of extra vertical joins: high values give long vertical corridors.

**Invariants.** PERFECT-SET for v0 (0.5/0.5), v1 (0.1/0.9) and v2 (0.9/0.1), **including** the 12x17 v2 cases where the original overflows (see KNOWN_BUGS).

**Errors.** Size < 3: AssertionError. Never OverflowError in the port.

**Worked examples:**

`gen/Ellers/v1/h3w5/s0` (xskew 0.1, yskew 0.9: vertical)

    ###########
    #.#.#.#.#.#
    #.#.#.#.#.#
    #.#.#.#.#.#
    #.#.#.#.#.#
    #.........#
    ###########

`gen/Ellers/v2/h3w5/s0` (xskew 0.9, yskew 0.1: horizontal)

    ###########
    #.........#
    #########.#
    #.........#
    ###.#######
    #.........#
    ###########

`gen/Ellers/v0/h3w5/s0`

    ###########
    #.#.#.....#
    #.#.###.###
    #.......#.#
    #.#.###.#.#
    #.#...#...#
    ###########

`gen/Ellers/v2/h12w17/s0`: the original raised OverflowError. The port must return any valid perfect 25x35 grid.

### GrowingTree

**Interface.** `GrowingTree(h, w, backtrack_chance = 1.0)` (float).

**Algorithm.** Growing tree (Jamis Buck's generalization). Keep an active list that starts with one uniformly random cell. At each step, pick a cell from the list: **with probability `backtrack_chance` the most recently added cell** (recursive-backtracker behavior), otherwise **a uniformly random cell from the list** (Prim-like behavior). If the chosen cell has unvisited neighbors, open a passage to a uniformly random one and add it to the list. Otherwise remove the chosen cell from the list. Stop when the list is empty.

**Parameter.** `backtrack_chance` = 1.0 gives a pure recursive backtracker. 0.0 gives a pure random-cell growing tree. Values in between mix the two. It isn't clamped: values ≥ 1 always pick the newest cell, values ≤ 0 always pick at random.

**Invariants.** PERFECT-SET for v0 (1.0), v1 (0.0), v2 (0.5).

**Errors.** Size < 3: AssertionError.

**Worked examples:**

`gen/GrowingTree/v0/h3w5/s0`

    ###########
    #.....#...#
    #.###.#.#.#
    #...#.#.#.#
    #.#.#####.#
    #.#.......#
    ###########

`gen/GrowingTree/v1/h3w5/s0` (backtrack_chance 0.0)

    ###########
    #.#.......#
    #.#.###.#.#
    #...#...#.#
    #.#.#####.#
    #.#.#.....#
    ###########

### HuntAndKill

**Interface.** `HuntAndKill(h, w, hunt_order = "random")`: `random` or `serpentine`.

**Algorithm.** Hunt-and-kill:
1. Open a uniformly random start cell.
2. **Walk (kill) phase:** from the current cell, repeatedly open a passage to a uniformly random unvisited neighbor and move there, until the current cell has no unvisited neighbor.
3. **Hunt phase:** find a visited cell that has at least one unvisited neighbor, and walk from it.
   - `serpentine`: scan cells in reading order (row by row, top to bottom, each row left to right) and take the first visited cell with an unvisited neighbor. When none remains, the maze is complete.
   - `random`: try uniformly random cells, and walk from any that turn out to be visited with an unvisited neighbor (probes that aren't are skipped). The original stops after a fixed budget of H·W probes, which can in rare cases leave cells unvisited. **The port must guarantee completion.** For example, after the random probing phase, finish with a serpentine scan until no unvisited cells remain.
4. Repeat until every cell is visited.

**Invariants.** PERFECT-SET for v0 (random) and v1 (serpentine).

**Errors.** Size < 3: AssertionError. An unknown `hunt_order` falls back to random.

**Worked examples:**

`gen/HuntAndKill/v1/h3w5/s0` (serpentine)

    ###########
    #.........#
    #.#######.#
    #.#.....#.#
    #.#.#####.#
    #...#.....#
    ###########

`gen/HuntAndKill/v0/h3w5/s0` (random)

    ###########
    #.........#
    #.#######.#
    #.#.....#.#
    #.#.#####.#
    #...#.....#
    ###########

### Kruskal

**Interface.** `Kruskal(h, w)`. No options.

**Algorithm.** Randomized Kruskal's. Every cell starts in its own tree. Take all interior wall slots between orthogonally adjacent cells, h·(w−1) horizontal joints plus (h−1)·w vertical ones, in a uniformly random order (a random permutation). For each slot in order, if the two cells it separates are in different trees, open it and merge the trees. Stop when one tree remains. Disjoint-set (union-find) is the expected data structure. The original uses a much slower list scan, which isn't required.

**Invariants.** PERFECT-SET.

**Errors.** Size < 3: AssertionError.

**Worked examples:**

`gen/Kruskal/v0/h3w3/s0`

    #######
    #.....#
    ###.#.#
    #...#.#
    ###.###
    #.....#
    #######

`gen/Kruskal/v0/h3w5/s1`

    ###########
    #...#.#...#
    ###.#.#.#.#
    #.......#.#
    ###.#######
    #.........#
    ###########

### Prims

**Interface.** `Prims(h, w)`. No options.

**Algorithm.** Randomized Prim's (frontier-cell variant). Start from a uniformly random cell. Keep the **frontier**: the set of unvisited cells adjacent to at least one visited cell, with no duplicates. At each step, pick a frontier cell **uniformly at random**, mark it visited, and open the wall slot to **one uniformly random already-visited neighbor** of it. Then add its unvisited neighbors to the frontier. Stop when all h·w cells are visited.

**Invariants.** PERFECT-SET. Typical Prim's look: many short dead ends radiating from the start.

**Errors.** Size < 3: AssertionError.

**Worked examples:**

`gen/Prims/v0/h3w3/s0`

    #######
    #.#.#.#
    #.#.#.#
    #.....#
    #.#.#.#
    #.#.#.#
    #######

`gen/Prims/v0/h3w5/s1`

    ###########
    #.........#
    #.###.###.#
    #.#...#.#.#
    #######.#.#
    #.........#
    ###########

### Sidewinder

**Interface.** `Sidewinder(h, w, skew = 0.5)` (float, not clamped).

**Algorithm.** Sidewinder:
1. The top cell row is one fully open corridor: all of its horizontal wall slots are open.
2. Each later row is processed left to right while building a "run" of consecutive cells. Add the current cell to the run. With probability **`1 − skew`**, and only if the cell isn't the last in the row, open the slot to the east and continue the run. Otherwise, close the run: pick a uniformly random cell from the run, open the slot **north** of it, and start a new empty run. The last cell of each row always closes its run.

**Meaning of skew.** Low skew means eastward carving is likely, giving long horizontal runs (east-west skew). High skew means runs close often, giving many vertical passages (north-south skew). This matches the public docs: below 0.5 is east-west, above 0.5 is north-south.

**Invariants.** PERFECT-SET for v0 (0.5), v1 (0.1), v2 (0.9). The top row is always a full corridor.

**Errors.** Size < 3: AssertionError.

**Worked examples:**

`gen/Sidewinder/v1/h3w5/s0` (skew 0.1)

    ###########
    #.........#
    #######.###
    #.........#
    ###.#######
    #.........#
    ###########

`gen/Sidewinder/v2/h3w5/s0` (skew 0.9)

    ###########
    #.........#
    #.#.#.#.###
    #.#.#.#...#
    #.#.#.#.###
    #.#.#.#...#
    ###########

`gen/Sidewinder/v0/h3w5/s0`

    ###########
    #.........#
    ###.#####.#
    #.....#...#
    #.###.###.#
    #...#...#.#
    ###########

### TrivialMaze

**Interface.** `TrivialMaze(h, w, maze_type = "spiral")`: `spiral` or `serpentine` (trimmed, case-insensitive; anything else gives spiral).

**Randomness.** Each `generate()` makes exactly **one fair binary choice** (probability 1/2 each) of orientation. Given that choice, the output is fully deterministic. So for a given size there are exactly two possible spiral grids and two possible serpentine grids. Under `cr` either orientation is acceptable. Both are unicursal (a single path with no branches) and perfect.

**Spiral.** A single path starts at the top-left cell (grid position (1,1)) and spirals inward, always turning the same way:
- Orientation A ("top-first", clockwise as drawn): go right along the top cell row to the right edge, then down the right column, then left along the bottom, then up the left column, and so on.
- Orientation B ("left-first", counter-clockwise as drawn): go down the left column first, then right along the bottom, then up the right column, then left along the top, and so on.

The path keeps going straight until the next cell in that direction is outside the maze or already on the path, then turns (always clockwise for A, always counter-clockwise for B) and continues. It stops when the current cell has no unvisited neighbor. That happens after all h·w cells are covered. Only the slots between consecutive path cells are open.

**Serpentine.** A boustrophedon (snake) path:
- Horizontal orientation: every cell row is a fully open corridor from column 1 to column W−2. Consecutive rows are joined alternately at the **left** end and the **right** end. The wall slot (2, 1) (left end, between rows 1 and 3) is open, then (4, W−2) at the right end, then (6, 1) at the left, then (8, W−2), and so on. In general, open wall-slot rows 2, 6, 10, … at column 1 and rows 4, 8, 12, … at column W−2.
- Vertical orientation: the same thing transposed. Every cell column is a fully open corridor from row 1 to row H−2. Columns are joined at the **top** at wall-slot columns 2, 6, 10, … (row 1) and at the **bottom** at columns 4, 8, 12, … (row H−2).

**Invariants.** PERFECT-SET for v0 (spiral) and v1 (serpentine).

**Errors.** Size < 3: AssertionError.

**Worked examples** (all four shapes at 3x5, from the goldens):

`gen/TrivialMaze/v0/h3w5/s1` (spiral, top-first)

    ###########
    #.........#
    #########.#
    #.......#.#
    #.#######.#
    #.........#
    ###########

`gen/TrivialMaze/v0/h3w5/s0` (spiral, left-first)

    ###########
    #.#.......#
    #.#.#####.#
    #.#.....#.#
    #.#######.#
    #.........#
    ###########

`gen/TrivialMaze/v1/h3w5/s1` (serpentine, horizontal)

    ###########
    #.........#
    #.#########
    #.........#
    #########.#
    #.........#
    ###########

`gen/TrivialMaze/v1/h3w5/s0` (serpentine, vertical)

    ###########
    #...#...#.#
    #.#.#.#.#.#
    #.#.#.#.#.#
    #.#.#.#.#.#
    #.#...#...#
    ###########

`gen/TrivialMaze/v0/h4w7/s0` (spiral, left-first, 4x7)

    ###############
    #.#...........#
    #.#.#########.#
    #.#.#.......#.#
    #.#.#######.#.#
    #.#.........#.#
    #.###########.#
    #.............#
    ###############

### Wilsons

**Interface.** `Wilsons(h, w, hunt_order = "random")`: `random` or `serpentine`.

**Algorithm.** Wilson's algorithm (loop-erased random walks, which give a uniform spanning tree):
1. Put one uniformly random cell in the tree.
2. Pick a start cell that isn't in the tree:
   - `random`: uniformly random cells, ignoring ones already in the tree. The original draws uniformly over all cells and treats an in-tree pick as a no-op.
   - `serpentine`: the first cell not in the tree, in reading order (row by row, left to right).
3. From the start, take a random walk. Each step goes to a uniformly random in-bounds orthogonal neighbor, until the walk hits a cell already in the tree. Erase loops: the standard "last exit direction per cell" technique is fine. Then add the loop-erased path to the tree, opening the slots along it.
4. Repeat until all h·w cells are in the tree.

**Invariants.** PERFECT-SET for v0 (random) and v1 (serpentine).

**Errors.** Size < 3: AssertionError.

**Worked examples:**

`gen/Wilsons/v1/h3w3/s0` (serpentine)

    #######
    #.#...#
    #.#.###
    #.#...#
    #.###.#
    #.....#
    #######

`gen/Wilsons/v0/h3w5/s2` (random)

    ###########
    #.....#.#.#
    #.###.#.#.#
    #.#.......#
    #.###.#####
    #...#.....#
    ###########

## Edge cases (all generators)

| Input | Expected |
|---|---|
| h = 3, w = 3 (minimum) | valid 7x7 grid with the variant's invariants |
| h ≠ w (e.g. 12x17, 5x3) | rows = 2h+1, columns = 2w+1; never transposed |
| h or w in {0, 1, 2} | AssertionError (all algorithms) |
| h or w negative | AssertionError, except DungeonRooms without a grid: ValueError |
| unknown `hunt_order` / `maze_type` string | default behavior, no error |
| BinaryTree skew null / unknown / lowercase | random one of the four, fixed per object |
| Ellers skews outside [0,1] | clamped |
| Ellers at large sizes (e.g. 12x17 with xskew 0.9) | valid perfect maze (no overflow) |
| DungeonRooms room outside the grid | room ignored, no error |
| DungeonRooms room with even coordinates | carved but no door. Reconnection still ensures connectivity |
| Calling `generate()` twice | two independent mazes (fresh grid each time) |

## Open questions
None yet. Builder questions go in `.slopfork/questions.md` and get answered here.
