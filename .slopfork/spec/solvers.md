# Spec: solvers

Provenance: derived-from-source (cleanroom spec-writer), cross-checked against the shared goldens (`cases/solve.jsonl`, `expected/solve.jsonl`, `invariants.json`, `KNOWN_BUGS.json`) · Audit: see AUDIT.md

## Purpose
A solver takes a maze grid plus a start and an end position and returns a list of solution paths. Seven solvers are public: BacktrackingSolver, Chain, Collision, RandomMouse, ShortestPath, ShortestPaths, Tremaux. Every solver also offers `prune_solutions`, which cleans raw paths (removes back-and-forth excursions and loops, strips the entrances). The Maze facade calls `solve` and then, when its `prune` attribute is true (the default), `prune_solutions` on the result. The goldens exercise both modes through the `prune` flag of the `solve` op.

## Public interface
- `BacktrackingSolver()`, `Collision()`, `RandomMouse()`, `ShortestPath()`, `ShortestPaths()`, `Tremaux()`: no constructor parameters.
- `Chain(turn: string = "right")`: `turn` is `"right"` or `"left"`; any other value behaves as `"right"`.
- `solve(grid: grid<bool>, start: (int, int), end: (int, int)) -> list<list<(int, int)>>`
- `prune_solutions(solutions: list<list<(int, int)>>) -> list<list<(int, int)>>` (uses the start and end of the most recent `solve` call on the same solver object).

TS mapping: `solve(grid, start, end)`, `pruneSolutions(solutions)`; Chain option `turn`.

## Shared conventions

Grid geometry (see the grid spec for the full model): rows `0..H-1`, columns `0..W-1`, `1` = wall, `0` = open. Positions with odd row and odd column are cells; positions with one odd and one even coordinate are the wall slots between two cells; even/even positions are corners.

Adjacency used by the checker (and therefore by the `cr` profile): two positions are adjacent when their Manhattan distance is exactly 1. A path is a list of positions; it is "valid" for `(grid, start, end)` when every listed position is open in the input grid and each consecutive pair in the sequence `start, path..., end` is adjacent. The empty path is valid. `start` and `end` themselves need not be open (outer entrances are wall positions on the border in every golden case).

Entrances:
1. An entrance is either outer (a non-corner border position aligned with a cell row or column, e.g. `(0, odd)` or `(odd, W-1)`) or inner (a cell, not on the border). The goldens use outer/outer (`oo`) and inner/inner (`ii`) pairs; start and end are never equal or adjacent.
2. For an outer start, the walk effectively begins at the interior cell directly inside it (top row -> row 1; bottom row -> row H-2; left column -> column 1; right column -> column W-2).
3. A walker has arrived when it stands on a position that shares a row with `end` and is at most one column away, or shares a column and is at most one row away. For an outer end this is the cell directly inside it; for an inner end it is the end cell itself.

Movement in the original: every solver moves cell to cell. A move from a cell to an orthogonal cell two positions away is allowed when both the wall slot between them and the destination cell are open. A raw path records every position passed, so it alternates cell, wall slot, cell, ... and consecutive entries are always adjacent. The port may use any movement model whose outputs satisfy the invariants below; note that the checker measures reachability and shortest length over open positions with 4-adjacency (see "Position-level vs cell-level" below).

The input grid is never modified by `solve` (solvers work on a private copy).

## Behavior: validation
1. `solve` raises `AssertionError` when the grid is absent, when start or end is absent, or when any coordinate of start or end lies outside `0..H-1` / `0..W-1`. (In the original, an absent grid passed directly to a solver actually fails earlier with an attribute error while copying it; through the Maze facade the entrance check comes first. No golden case covers this; the port should raise `AssertionError`.)
2. Whether start/end are open, or lie on a cell, is not validated.
3. ShortestPath and ShortestPaths additionally raise `AssertionError` when the (inward-pushed) start cell has no open neighbouring cell. ShortestPaths also raises `AssertionError` when it finds no solution at all (e.g. end unreachable).

## Behavior: prune_solutions
Applied independently to each path; the list keeps its length and order (no path is dropped, and identical paths are not merged).

For one path `p`:
1. Loop erasure, only when `p` has more than two entries. The result is built as follows: take the first entry `x`; jump to the last occurrence of `x` in `p`; emit `x`; continue with the entry right after that last occurrence; repeat until the end of `p`. The result contains no repeated position, keeps the first and last entries of `p`, and is a subsequence of `p`. Because `p` is a walk of adjacent positions, the result is again a walk of adjacent positions (each emitted entry is followed in `p` by the next emitted entry). Every back-and-forth excursion into a dead end and every loop is removed. (Verified: applying exactly this rule to every unpruned golden result reproduces the pruned golden result for the same seed, 186 of 186 pairs.)
2. Endpoint stripping, only when the result has more than one entry: if its first entry equals `start`, drop it; then, if its last entry equals `end`, drop it.
3. Paths with zero, one or two entries are returned unchanged apart from step 2.

Consequences: pruning an already-simple path that excludes start and end is the identity. Pruning does not make a path shortest; it just removes revisits.

## Behavior: per solver
For each solver: what the original returns, then what the `cr` profile requires. The required properties come from `invariants.json` under the key `<algo>[/<turn>]/<prune|noprune>` (Chain with an explicit `turn` uses `Chain/left/...`; the goldens only pass `turn` for `left`, so default-turn cases use `Chain/prune` / `Chain/noprune`). Property definitions are under "Invariants".

### BacktrackingSolver
Published idea: random walk that picks a random open direction at each cell and only turns back when it hits a dead end.
1. Returns exactly one path.
2. Original raw path: begins at the first interior cell (the inward cell for an outer start, the start cell itself for an inner start), records every position walked, ends on the arrival position (rule 3 of Entrances, so for an inner end it includes the end cell). At each cell it chooses uniformly among open neighbouring cells, excluding the cell it just came from unless that is the only choice.
3. Unpruned paths may contain revisits (18 of 24 golden unpruned results did) and, for inner entrances, include the start and end cells themselves, so they are generally not "valid" paths. Pruned paths are simple; they are not necessarily shortest on mazes with loops.
4. Unreachable end: the original never terminates (or fails when the start cell has no exit). Not covered by goldens. Port: must terminate; returning an empty list is acceptable (no property requires a path when the end is unreachable).
5. Works on mazes with loops and rooms.
- `cr` required, noprune: nonempty_when_reachable.
- `cr` required, prune: nonempty_when_reachable, paths_valid.

### RandomMouse
Published idea: wander randomly until the end is found.
1. Returns exactly one path, same shape as BacktrackingSolver's (starts at the first interior cell, ends on the arrival position).
2. At each cell it chooses uniformly among all open neighbouring cells, including the one it came from. Unpruned paths are typically very long with many revisits (23 of 24 golden unpruned results had revisits).
3. Unreachable end: original never terminates. Port: must terminate; an empty list is acceptable.
- `cr` required, noprune: nonempty_when_reachable.
- `cr` required, prune: nonempty_when_reachable, paths_valid.

### Chain
Published idea (from the docs): draw a straight-ish line of cells from start to end ignoring walls; follow it; where a wall blocks the next step, send out backtracking robots in the open directions and continue from where one rejoins the line.
1. Returns exactly one path, starting at the first interior cell and ending on the arrival position.
2. The guide line: starting at the first interior cell, each step moves two positions toward the end along each axis where the remaining distance is more than one (so diagonal steps while both axes differ, then straight). It ends at the first position that counts as arrival.
3. Following the line: from line point i to point i+1, if the connecting route is open (for a straight step, the wall slot between; for a diagonal step, either the row-first or the column-first L-shaped route through the corner cell) the path takes it. Otherwise one robot is launched per open neighbouring cell of point i; each performs a BacktrackingSolver-style random walk until it reaches point i+1; the path appends the shortest robot route (ties: the first robot found shortest) and continues from point i+1.
4. `turn`: accepted and stored; it does not change observable behaviour in the original beyond being recorded (left and right give results with the same properties). Unknown values fall back to right.
5. Unpruned paths may contain revisits and, for inner entrances, the start and end cells.
6. Unreachable end: original never terminates. Port: must terminate; an empty list is acceptable.
- `cr` required, Chain/noprune and Chain/left/noprune: nonempty_when_reachable.
- `cr` required, Chain/prune and Chain/left/prune: nonempty_when_reachable, paths_valid.

### Collision
Published idea (from the docs): flood the maze from the start in all directions at the same speed; where two flood fronts meet, wall off the meeting point; fill dead ends; repeat until nothing changes. Finds shortest solutions.
1. Returns a list of one or more paths. On perfect mazes exactly one; on mazes with loops possibly several of equal (shortest) length (golden example below has two).
2. Returned paths already list only positions strictly between start and end, with no revisits, so they are valid without pruning; pruning leaves them unchanged.
3. KNOWN BUG: on mazes with loops or rooms the original can crash with `TypeError` (12 golden cases, all listed in `KNOWN_BUGS.json`: `solve/Collision/CellularAutomaton6x6/oo/{p,np}/{s0,s1}` and `solve/Collision/DungeonRooms10x10/{oo,ii}/{p,np}/{s0,s1}`). The port must return a valid result there: a non-empty list of shortest paths.
4. Unreachable end: no golden case. Port: return an empty list.
5. Port guidance: any method that returns only shortest paths satisfies this solver (for example breadth-first search returning one or all shortest paths). The properties are required even unpruned.
- `cr` required, noprune and prune: all_shortest, first_is_shortest, nonempty_when_reachable, paths_valid.

### ShortestPath
Published idea: breadth-first search that stops at the first solution found.
1. Returns a list of at most one path. When it returns one, it is a shortest path, already strictly between start and end, simple, and valid without pruning.
2. Observed quirk: with inner entrances the original returns an empty list even though a solution exists (all 12 golden `ii` cases, prune and noprune). With outer entrances it returned one shortest path in all 12 golden `oo` cases. Because `nonempty_when_reachable` is not required for this solver, an empty list is accepted by the checker; the port may (and is encouraged to) return the shortest path in every reachable case.
3. Raises `AssertionError` if the start cell has no open neighbouring cell (invalid maze).
4. Unreachable end: original returns an empty list (or asserts as above). Port: empty list.
- `cr` required, noprune and prune: all_shortest, first_is_shortest, paths_valid.

### ShortestPaths
Published idea: breadth-first search that keeps branching until every branch has reached the end or a dead end, then discards the dead-end branches.
1. Returns one or more paths, deduplicated as exact sequences, sorted by length ascending; the first is a shortest path. Order among equal-length paths is unspecified.
2. Later paths may be longer than the shortest, and unpruned they may include short back-and-forth excursions (a branch is only forbidden from stepping straight back, so it can enter a dead-end spur and bounce out) and may pass through the start cell. Every returned path is still a valid walk of adjacent open positions, and is strictly between start and end in the sense of the checker (the start/end positions are not listed at the ends). Golden results had 1, 2 or 3+ paths.
3. Raises `AssertionError` when the start cell has no open neighbouring cell, and when no solution is found.
4. On mazes with loops a branch stops when it re-enters a cell it already contains.
5. Port guidance: returning all shortest paths, or just one, satisfies the required properties; if more paths are returned, the shortest must come first.
- `cr` required, noprune and prune: first_is_shortest, nonempty_when_reachable, paths_valid.

### Tremaux
Published idea (Trémaux's algorithm, as in the docs): mark each cell every time it is visited; at a dead end turn back; at an unvisited junction pick a new passage at random; prefer passages marked fewer times; avoid immediately reversing when there is a choice.
1. Returns exactly one path.
2. Original raw path begins with the start position itself (also for an outer start, which is a wall), then the inward cell for an outer start, then the walk, ending on the arrival position. So unpruned results are never valid paths (all 24 golden unpruned results included the start). Pruning strips the start.
3. Choice rule: among open neighbouring cells, the ones with the lowest visit count (counts above 2 treated as 2) are candidates; when the candidates are the once- or twice-visited group and contain more than one cell, the cell it just came from is excluded; choose uniformly among the rest. A cell with exactly one neighbour moves there.
4. Unreachable end: original does not terminate (or fails when the start cell has no exit). Port: must terminate; an empty list is acceptable.
- `cr` required, noprune: nonempty_when_reachable.
- `cr` required, prune: nonempty_when_reachable, paths_valid.

## Position-level vs cell-level
The checker computes `best` = shortest number of steps from start to end over open positions with 4-adjacency (end may be a wall). In grids whose corners are all walls and cells all open (all Prims, DungeonRooms6x6 and CellularAutomaton6x6 golden grids), cell-to-cell moves and position-level moves give the same distances. The DungeonRooms10x10 golden grids have open corner positions (9 of them, inside rooms); there a position-level path can be shorter than any cell-to-cell route. To be safe, the shortest-path solvers (Collision, ShortestPath, ShortestPaths) should compute distances over open positions with 4-adjacency, and the random walkers should not report "unreachable" when the end is reachable at position level.

## Invariants
Definitions (from the goldens' checker; `sols` = returned list, `best` as above, `None` when unreachable):
- paths_valid: every path in `sols` is valid (all positions open; start, path, end consecutive-adjacent). Empty paths count as valid.
- first_is_shortest: `sols` is empty, or the end is unreachable, or the first path has exactly `best - 1` entries.
- all_shortest: the end is unreachable, or every path has exactly `best - 1` entries.
- nonempty_when_reachable: the end is unreachable, or `sols` is non-empty and every path is non-empty (an empty path is allowed only when `best == 1`).

Per key (from `invariants.json`):

| Key | Required |
|---|---|
| BacktrackingSolver/noprune | nonempty_when_reachable |
| BacktrackingSolver/prune | nonempty_when_reachable, paths_valid |
| Chain/noprune, Chain/left/noprune | nonempty_when_reachable |
| Chain/prune, Chain/left/prune | nonempty_when_reachable, paths_valid |
| Collision/noprune, Collision/prune | all_shortest, first_is_shortest, nonempty_when_reachable, paths_valid |
| RandomMouse/noprune | nonempty_when_reachable |
| RandomMouse/prune | nonempty_when_reachable, paths_valid |
| ShortestPath/noprune, ShortestPath/prune | all_shortest, first_is_shortest, paths_valid |
| ShortestPaths/noprune, ShortestPaths/prune | first_is_shortest, nonempty_when_reachable, paths_valid |
| Tremaux/noprune | nonempty_when_reachable |
| Tremaux/prune | nonempty_when_reachable, paths_valid |

Additional invariants of the original worth keeping: `solve` does not modify its input grid; `prune_solutions` preserves list length and order; pruned paths contain no repeated position.

## Errors
| Condition | Error kind | Contractual message? |
|---|---|---|
| start or end coordinate outside the grid | `AssertionError` | no |
| start or end absent / grid absent | `AssertionError` | no |
| ShortestPath / ShortestPaths: start cell has no open neighbouring cell | `AssertionError` | no |
| ShortestPaths: no solution found | `AssertionError` | no |
| Collision on mazes with loops (original `TypeError`) | none: KNOWN BUG, port must return a valid result | n/a |

Golden solve cases whose expected result is an error: only the 12 Collision KNOWN_BUGS cases above (kind `TypeError`). They are not matched by kind; the checker requires a non-crashing, valid result. No other solve case expects an error.

## Edge cases
| Input | Expected |
|---|---|
| Inner start and end (cells) | Unpruned results of BacktrackingSolver, RandomMouse, Chain, Tremaux include the start and end cells; pruning removes them |
| Outer start | Unpruned walkers begin at the inward cell (Tremaux begins with the start position itself, then the inward cell) |
| ShortestPath with inner entrances | Original: empty list. Accepted; port may return the shortest path |
| Collision on CellularAutomaton / DungeonRooms grids with loops | Original crashes; port returns non-empty list of shortest valid paths |
| End unreachable | Random walkers in the original do not terminate; port returns an empty list. ShortestPaths raises `AssertionError` |
| Start adjacent to end (`best == 1`) | An empty path is acceptable |
| `Chain(turn="bogus")` | Behaves as `right` |
| `prune_solutions([])` | `[]` |
| A path of length 1 or 2 | Loop erasure skipped; endpoint stripping still applies when length is 2 |

## Worked examples
All from the goldens. Grid rows use `#` wall and `.` open.

Prims3x3 grid used by the first examples (7 rows): `#######`, `#.....#`, `#.#####`, `#...#.#`, `#.###.#`, `#.....#`, `#######`.

1. `solve/BacktrackingSolver/Prims3x3/oo/np/s0` (seed 0, start (3,0), end (1,6), prune false). Raw single path: (3,1) (4,1) (5,1) (5,2) (5,3) (5,4) (5,5) (4,5) (3,5) (4,5) (5,5) (5,4) (5,3) (5,2) (5,1) (4,1) (3,1) (3,2) (3,3) (3,2) (3,1) (2,1) (1,1) (1,2) (1,3) (1,4) (1,5).
2. Same case with prune true (`.../oo/p/s0`): (3,1) (2,1) (1,1) (1,2) (1,3) (1,4) (1,5). This is exactly the loop erasure of example 1. All seven solvers return this same single path for this pruned case.
3. `solve/Tremaux/Prims3x3/oo/np/s0`: raw path starts with the start itself: (3,0) (3,1) (4,1) (5,1) ... (2,1) (1,1) (1,2) (1,3) (1,4) (1,5). Pruned: (3,1) (2,1) (1,1) (1,2) (1,3) (1,4) (1,5).
4. `solve/BacktrackingSolver/Prims3x3/ii/np/s0` (start (5,3), end (3,1)): raw (5,3) (5,2) (5,1) (4,1) (3,1); pruned (`.../ii/p/s0`): (5,2) (5,1) (4,1). Chain, Chain-left and Tremaux give the same raw and pruned results here; Collision gives (5,2) (5,1) (4,1) even unpruned.
5. `solve/RandomMouse/Prims3x3/ii/np/s0`: raw (5,3) (5,2) (5,1) (5,2) (5,3) (5,2) (5,1) (4,1) (3,1); pruned (5,2) (5,1) (4,1).
6. `solve/ShortestPath/Prims3x3/ii/p/s0` and `.../np/s0`: `[]` (quirk; a solution exists).
7. `solve/ShortestPaths/Prims3x3/ii/np/s0`: two paths, shortest first: [(5,2) (5,1) (4,1)] and [(5,4) (5,5) (5,4) (5,3) (5,2) (5,1) (4,1)]. Pruned (`.../p/s0`): [(5,2) (5,1) (4,1)] and [(5,4) (5,3) (5,2) (5,1) (4,1)] (the second passes through the start cell; still valid under the checker).
8. `solve/Collision/CellularAutomaton6x6/ii/p/s0` (start (3,9), end (9,7)); grid rows: `#############`, `#...........#`, `#.###.###.###`, `#.#...#.#...#`, `#.#.###.###.#`, `#.#.#.......#`, `###.#####.###`, `#.......#...#`, `###.###.###.#`, `#.#.......#.#`, `#.#######.#.#`, `#.........#.#`, `#############`. Two shortest paths of 19 entries: (2,9) (1,9) (1,8) (1,7) (1,6) (1,5) (2,5) (3,5) (3,4) (3,3) (4,3) (5,3) (6,3) (7,3) then either (7,4) (7,5) (7,6) (7,7) (8,7) or (8,3) (9,3) (9,4) (9,5) (9,6). The order of the two differs between seeds (s0 vs s1); both orders are fine.

## Open questions
None yet.
