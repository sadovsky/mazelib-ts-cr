# Spec: grid

Provenance: documented (mazelib README/docs: a maze is a 2D array of walls and passages) and observed (goldens grids, `invariants.json`, `checkers/mazeprops.py`). · Audit: see AUDIT.md

## Purpose
Every generator, solver, transmuter and the Maze facade share one representation of a maze: a rectangular grid of binary values in which **1 means wall** and **0 means open**. A maze described as `h` cell rows by `w` cell columns is stored as a grid with `2h+1` rows and `2w+1` columns. Cells, the wall slots between cells, and the posts at the corners all occupy their own grid position.

## Public interface
- `grid<bool>` of shape `H x W` (H rows, W columns), indexed `[row][col]`, row 0 at the top, column 0 at the left. The original uses a NumPy `int8` array of 0/1. The TS port uses a small `Grid` class over a row-major `Uint8Array` (index = row * W + col) exposing at least: height, width, get(row, col), set(row, col, value), copy, and conversion from/to the goldens string-row encoding.
- `cell`: a pair `(row, col)` of integers in grid coordinates (not cell-index coordinates). JSON: `[row, col]`.
- `path`: `list<cell>`. `solutions`: `list<path>`.

## Behavior
1. **Shape.** For a maze of h x w cells: H = 2h + 1, W = 2w + 1. Conversely, a grid of H x W holds h = (H - 1) / 2 cell rows and w = (W - 1) / 2 cell columns (integer division). DungeonRooms uses this to derive h and w from a supplied grid.
2. **Values.** Exactly two values occur: 1 (wall) and 0 (open passage). Generators never produce anything else. Any non-zero value counts as a wall for rendering and neighbor tests.
3. **Parity classes** of a position (r, c):
   - r odd and c odd: a **cell** (a room of the maze). Every generator leaves every cell open (`cells_open` holds for all generators in `invariants.json`).
   - r odd and c even, or r even and c odd: a **wall slot** between two orthogonally adjacent cells. (r odd, c even) separates cells (r, c-1) and (r, c+1). (r even, c odd) separates cells (r-1, c) and (r+1, c). Open means the two cells are connected.
   - r even and c even: a **post** (corner). In perfect mazes posts are always walls. CellularAutomaton and DungeonRooms (when it carves rooms) may leave posts open. Those two generators also produce loops, so their output is connected but not necessarily perfect.
4. **Cell adjacency.** Two cells are neighbors when they differ by 2 in exactly one coordinate. The position between them (their midpoint, the average of the coordinates) is their wall slot. Carving a passage between two neighbor cells means setting both cells and the midpoint to 0.
5. **Border.** Row 0, row H-1, column 0 and column W-1 form the outer border. Generators always leave the whole border as walls. The border is never carved by generation. Outer entrances (see maze.md) are border positions that line up with a cell: (0, odd c), (H-1, odd c), (odd r, 0), (odd r, W-1). Corners of the border are never entrances.
6. **Generated grids are fresh.** Each call to a generator's generate returns a newly created grid of shape (2h+1) x (2w+1).
7. **Ownership.** Transmuters change the grid they are given in place (the Maze facade's grid is mutated). Solvers must not change the grid they are given (they work on their own copy if they need scratch marks).
8. **JSON encoding (goldens / adapter).** A grid is a list of H strings, each W characters long, `#` for wall (1) and `.` for open (0). On input, `#` maps to 1 and every other character maps to 0. On output, a grid value other than 0 or 1 is an error (the reference adapter raises ValueError; ports simply never produce such values). Cells are `[row, col]`, paths are lists of cells, solutions are lists of paths.
9. **Text rendering** (the Maze facade's tostring) uses `#` for walls and a **space** for open positions. That is a different alphabet from the JSON encoding, which uses `.`. See maze.md.
10. **Paths walk on grid positions, not on cells.** A solution path moves one grid position at a time (Manhattan distance exactly 1 between consecutive entries, counting the start before the first entry and the end after the last). So a path passes through every wall slot between the cells it visits. All path entries must be open positions. The start and end themselves are excluded from paths (see maze.md, "Solution path convention").

## Invariants
Checked by the goldens checker (`checkers/mazeprops.py`), with the per-algorithm list in `invariants.json`:
- `shape`: H = 2h+1, W = 2w+1, all rows the same length.
- `alphabet`: only `#` and `.` in the JSON encoding.
- `border_walls`: every border position is a wall.
- `corners_walls`: every (even, even) position is a wall (perfect-maze generators).
- `cells_open`: every (odd, odd) position is open.
- `connected`: the open positions form one 4-connected component.
- `acyclic`: the number of open-open orthogonal adjacencies equals (open positions - components). In other words, the open area is a forest.
- `perfect`: connected and acyclic, i.e. exactly one route between any two open positions.

## Errors
| Condition | Error kind | Contractual message? |
|---|---|---|
| Grid output containing a value other than 0/1 (adapter-side check only) | ValueError | no |

No other grid-level errors exist. Size validation belongs to the generators (see the generators spec and maze.md's error table).

## Edge cases
| Input | Expected |
|---|---|
| 3 x 3 cells (smallest legal generated maze) | 7 x 7 grid |
| Supplied grid of even height or width (DungeonRooms `grid` param) | h, w derived by integer division (H-1)/2, (W-1)/2 |
| Entrance positions on the border | are wall positions in the grid. The grid is not modified to open them. Solvers treat start/end as special |

## Worked examples
From goldens `cases/tostring.jsonl` (`str/Prims3x3/...`), a 3 x 3-cell maze, 7 x 7 grid:

    #######
    #.....#
    #.#####
    #...#.#
    #.###.#
    #.....#
    #######

- (1,1), (1,3), (1,5), (3,1), ... are cells. All are open.
- (1,2) is open: cells (1,1) and (1,3) are connected. (3,4) is a wall: cells (3,3) and (3,5) are not connected.
- (2,2), (2,4), (4,4), ... are posts. All are walls.
- With start (3, 0) and end (1, 6) (both border positions, walls in the grid), the recorded solution is [[3,1],[2,1],[1,1],[1,2],[1,3],[1,4],[1,5]]: unit steps over cells and the wall slots between them, start and end excluded.

## Open questions
None yet.
