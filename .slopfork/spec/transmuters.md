# Spec: transmuters

Provenance: derived-from-source (cleanroom spec-writer), cross-checked against the shared goldens (`cases/transmute.jsonl`, `expected/transmute.jsonl`, `invariants.json`) · Audit: see AUDIT.md

## Purpose
A transmuter edits an existing maze grid in place: it is given the grid plus the start and end entrances and changes walls. Three are public: CuldeSacFiller (breaks loops that hang off a single junction), DeadEndFiller (walls off dead ends), and Perturbation (adds random walls, then reopens walls until the maze is connected again). The Maze facade runs each transmuter in its `transmuters` list, in order, on its own grid (the facade asserts that a grid exists; see the Maze facade spec).

## Public interface
- `CuldeSacFiller()`
- `DeadEndFiller(iterations: int = 1)`
- `Perturbation(repeat: int = 1, new_walls: int = 1)`
- `transmute(grid: grid<bool>, start: (int, int), end: (int, int)) -> none`: mutates `grid` in place; returns nothing.

TS mapping: `transmute(grid, start, end)` mutating the `Grid`; options `iterations`, `repeat`, `newWalls` (adapter maps `new_walls`).

Goldens `transmute` op: `args` `{algo, params, grid, start, end}`; the result is `{"grid": ...}`, the grid after transmutation. Every golden case is compared by invariants under `cr`.

## Shared conventions
Grid geometry as in the grid spec (odd/odd = cells, mixed parity = wall slots between cells, even/even = corners; `1` wall, `0` open). Two cells are "connected neighbours" when they are two positions apart orthogonally and both the destination cell and the wall slot between them are open. "Within one" of an entrance: same row and at most one column away, or same column and at most one row away (for an outer entrance this is the entrance itself plus the cell directly inside it; for an inner entrance it is the entrance cell itself, since other cells are two away).

No transmuter validates its inputs (no golden transmute case expects an error).

## Behavior

### CuldeSacFiller
Published idea (docs): scan for cells whose passages go in exactly two directions; from each, walk both ways to the first intersection; if both walks reach the same intersection the cell lies on a loop, so fill the cell, breaking the loop.
1. Cells are scanned in row-major order; the grid is updated as the scan proceeds, so later checks see earlier fills.
2. Skipped: a cell equal to start or end, a cell that is already a wall, and any cell that does not have exactly two connected neighbours.
3. For a candidate cell, each of its two directions is followed through corridor cells (cells with exactly two connected neighbours, continuing away from where it came) until reaching a cell with a different number of connected neighbours (a junction or a dead end). If the walk comes back around to the candidate without meeting any such cell (an isolated ring), the walk's result is the cell just before returning, which differs between the two directions, so isolated rings are not filled.
4. If both directions reach the same cell, the candidate cell (only that one position) becomes a wall. The wall slots next to it are left as they were.
5. On a perfect maze nothing is filled (there are no loops), so the grid is unchanged.
6. Observed in the goldens: the grid was unchanged in all 24 CuldeSacFiller cases, including the non-perfect DungeonRooms10x10 and CellularAutomaton6x6 inputs.
7. Hazard the port must avoid: if the start or end (or, for an outer entrance, the cell directly inside it) lies on such a loop, filling a different loop cell can lengthen or cut the start-to-end route, which would violate `keeps_route` / `keeps_shortest_length`. The goldens never hit this; the port must not fill a cell whose removal changes the start-to-end shortest distance (for example, skip loops that contain the start, the end, or the cells within one of them). A loop that touches the rest of the maze only at one junction is never used by a shortest route between positions outside it, so filling it is otherwise safe.
- `cr` required (key `CuldeSacFiller`): border_unchanged, keeps_route, keeps_shortest_length, only_adds_walls, perfect_if_input_perfect, shape.

### DeadEndFiller(iterations)
Published idea (docs): find dead ends and fill them in, together with the dead-end passages behind them; repeated runs on a perfect maze leave only the solution open.
1. Parameter: `iterations` greater than 0 is truncated toward zero to an integer; any value of 0 or less means 100. So a value strictly between 0 and 1 truncates to 0 and nothing is filled.
2. While running, the start and end positions are treated as open; afterwards each is restored to exactly the value it had before (so an outer entrance that was a wall is still a wall).
3. A dead end is an open cell with fewer than two connected neighbours (zero or one). Cells within one of the start or of the end are never treated as dead ends.
4. Each iteration finds the first dead end in row-major order over the cells, and fills it: the cell and its four orthogonally adjacent positions become walls. Then the iteration ends. If no dead end exists, the whole operation stops early.
5. Net observed effect: each iteration fills exactly one dead-end cell. In every golden case, `iterations=1` filled exactly 1 cell (2 positions changed: the cell plus its one open passage) and `iterations=3` filled exactly 3 cells (6 positions changed). Successive iterations naturally eat back along a dead-end corridor, because the cell behind a filled dead end often becomes the next dead end.
6. The border never changes (the four positions around a cell are interior or border walls that are already walls). Walls are only added.
7. Because a filled cell had at most one connected neighbour and is not the start, the end, or the cell inside an outer entrance, it is never an interior point of a start-to-end route, so the route and its shortest length are kept, and a perfect maze stays perfect (removing a leaf from a tree).
8. Port note: in grids with open corner positions (DungeonRooms rooms), closing the four positions around a cell can in principle close a corner-level shortcut. The goldens never hit this; the port must still keep `keeps_shortest_length`, so it should either confirm the filled positions are not needed or fill only positions that have at most one open orthogonal neighbour.
- `cr` required (keys `DeadEndFiller` and `DeadEndFiller/{"iterations": 3}`): border_unchanged, keeps_route, keeps_shortest_length, only_adds_walls, perfect_if_input_perfect, shape.

### Perturbation(repeat, new_walls)
Published idea (docs): starting from a valid maze, add a few random walls blocking current passages, then reconnect all passages that were cut off by randomly opening walls; repeat a set number of times.
1. Each of `repeat` rounds: add `new_walls` random walls, then reconnect. `repeat` of 0 or `new_walls` of 0 skip the corresponding step (with `new_walls` 0 the reconnection still runs).
2. Adding one wall: a position is drawn as follows: its row uniformly from `1..H-2`; if the row is even, its column uniformly from the odd columns in `1..W-2`; if the row is odd, its column uniformly from the even columns in `2..W-2`. So it is always an interior wall slot between two cells, never on the border and never a cell or corner. If that slot is open it becomes a wall and the wall is placed; otherwise another position is drawn. After more than `2*H*W` failed draws the attempt is abandoned (no wall added).
3. Reconnecting: the cells are grouped into connected components (cells linked through connected-neighbour moves). While more than one component remains, a random cell of the first component is picked, and if it has a neighbouring open cell (two positions away) belonging to another component, the wall slot between them is opened and the two components merge; otherwise another random cell is picked. The result: all cells are mutually reachable again.
4. Only interior wall slots change, so the border is unchanged; open counts can go up or down. Walls may be removed that were walls in the input (so `only_adds_walls` does not hold), and the route can get longer or shorter (`keeps_shortest_length` does not hold).
5. Start and end are not used. Since all cells end up connected, any start/end pair (outer entrances attach to the cell directly inside them) stays connected.
6. On a perfect maze, each placed wall splits one component into two and reconnection opens exactly one wall per split, so the maze stays perfect. Observed in the goldens with default parameters: positions changed came in matched pairs (one closed, one opened; sometimes the same slot, giving no visible change) on every perfect input. On the non-perfect DungeonRooms10x10 inputs a wall sometimes closed a loop edge, needing no reopening.
7. With `repeat=3, new_walls=2` the original occasionally produced a non-perfect result from a perfect input (two Prims10x10 golden cases), because its component grouping can fail to notice that two groups are already connected and then opens an extra wall. This is why `perfect_if_input_perfect` is not required for that key. A port that keeps perfect inputs perfect is fine.
8. Golden inputs always have every cell open. Behaviour when a cell is a wall is not specified by the goldens; the port should treat only open cells as members of components.
- `cr` required (key `Perturbation`, default parameters): border_unchanged, keeps_route, perfect_if_input_perfect, shape.
- `cr` required (key `Perturbation/{"new_walls": 2, "repeat": 3}`): border_unchanged, keeps_route, shape.

## Invariants
Definitions (from the goldens' checker; `before` = input grid, `after` = returned grid, distances = shortest number of steps from start to end over open positions with 4-adjacency, end may be a wall):
- shape: same number of rows and columns.
- border_unchanged: every position in the first/last row or column is identical before and after.
- only_adds_walls: no position goes from wall to open.
- keeps_route: if the end was reachable before, it is reachable after.
- keeps_shortest_length: if the end was reachable before, the distance after equals the distance before.
- perfect_if_input_perfect: if the input is perfect (open positions form one connected component and an acyclic graph), so is the output.

| Key | Required |
|---|---|
| CuldeSacFiller | border_unchanged, keeps_route, keeps_shortest_length, only_adds_walls, perfect_if_input_perfect, shape |
| DeadEndFiller | border_unchanged, keeps_route, keeps_shortest_length, only_adds_walls, perfect_if_input_perfect, shape |
| DeadEndFiller/{"iterations": 3} | border_unchanged, keeps_route, keeps_shortest_length, only_adds_walls, perfect_if_input_perfect, shape |
| Perturbation | border_unchanged, keeps_route, perfect_if_input_perfect, shape |
| Perturbation/{"new_walls": 2, "repeat": 3} | border_unchanged, keeps_route, shape |

The key is the algo name, plus `/` and the params as JSON with sorted keys when params are non-empty.

## Errors
| Condition | Error kind | Contractual message? |
|---|---|---|
| (none in the goldens) | n/a | n/a |
| DeadEndFiller with an absent start or end (original fails while indexing it) | not contractual; not tested | no |
| Maze facade `transmute()` with no grid | `AssertionError` (facade spec) | no |

No golden transmute case expects an error.

## Edge cases
| Input | Expected |
|---|---|
| CuldeSacFiller on a perfect maze | Grid unchanged |
| DeadEndFiller(iterations=0) or negative | Runs up to 100 iterations |
| DeadEndFiller(iterations=0.5) | Truncates to 0: nothing filled |
| DeadEndFiller when no dead end exists | Grid unchanged |
| DeadEndFiller dead end next to an entrance | Not filled (cells within one of start/end are exempt) |
| Perturbation on a grid with no open interior wall slot | Gives up adding after `2*H*W` failed draws; reconnection still runs |
| Perturbation(new_walls=0) on a disconnected grid | Opens walls until all cells are connected |
| Perturbation where the drawn wall is reopened by reconnection | Grid may come back unchanged (golden `trans/Perturbation/v3/Prims6x6/oo/s1`) |

## Worked examples
From the goldens. Input grid for all four (Prims3x3, start (3,0), end (1,6), seed 0): `#######`, `#.....#`, `#.#####`, `#...#.#`, `#.###.#`, `#.....#`, `#######`.

1. `trans/CuldeSacFiller/v0/Prims3x3/oo/s0`: output identical to the input.
2. `trans/DeadEndFiller/v1/Prims3x3/oo/s0` (iterations 1): `#######`, `#.....#`, `#.#####`, `#.###.#`, `#.###.#`, `#.....#`, `#######`. The first dead end in row-major order outside the entrance exemptions is cell (3,3); it and its passage (3,2) became walls. Cell (3,1) is exempt (inside the outer start), cell (1,5) is exempt (inside the outer end).
3. `trans/DeadEndFiller/v2/Prims3x3/oo/s0` (iterations 3): `#######`, `#.....#`, `#.#####`, `#.#####`, `#.#####`, `#...###`, `#######`. Cells (3,3), (3,5), (5,5) were filled in turn, with their passages (3,2), (4,5), (5,4).
4. `trans/Perturbation/v3/Prims3x3/oo/s0` (defaults): `#######`, `#...#.#`, `#.###.#`, `#...#.#`, `#.###.#`, `#.....#`, `#######`. A wall was added at (1,4), splitting the maze; reconnection opened (2,5). Still perfect; the shortest route got longer (allowed).
5. `trans/Perturbation/v4/Prims3x3/oo/s0` (repeat 3, new_walls 2): `#######`, `#...#.#`, `#.###.#`, `#.....#`, `#.#####`, `#.....#`, `#######`.

## Open questions
None yet.
