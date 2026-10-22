
## rng.md, grid.md, maze.md (spec-writer: RNG / grid / Maze facade), 2026-10-22
Command: `leak_audit.py --source ../mazelib-source --against .slopfork/spec/<file>.md --mode spec --allow-identifiers-from ../mazelib-source/docs --allow-identifiers-from ../slopfork-mazelib-goldens/PROTOCOL.md --allow prune_solutions`
- First run: rng.md 0, grid.md 0, maze.md 2 findings (public solver method name `prune_solutions`; a 12-token coordinate run in a tostring worked example that also appears in a source test).
- Fixes: `prune_solutions` is a public, non-underscored solver method in the API surface, so it was explicitly allowed. The coordinate list in maze.md was replaced by a reference to grid.md's worked example.
- Final: rng.md 0, grid.md 0, maze.md 0 findings. Clean.
- Verification: the RNG description was re-implemented independently and matched 63/63 `rng` goldens. The tostring rules matched 20/20 `tostring` goldens.

## solvers.md, transmuters.md (spec-writer: solvers/transmuters), 2026-10-22
- Command: leak_audit.py --mode spec --source ../mazelib-source --against <copy of solvers.md + transmuters.md> --allow-identifiers-from ../mazelib-source/docs, plus --allow for public names: RandomMouse, ShortestPath, ShortestPaths, prune_solutions (public solver method), AssertionError (Python exception kind), CellularAutomaton (public generator class).
- First run: 7 findings, all public API / exception names listed above; no code fences, no private identifiers, no shared verbatim runs (ngram 12).
- Final run: 0 findings across 65 source files. Status: clean.

## generators.md (spec-writer: generators), 2026-10-22
Command: `leak_audit.py --mode spec --source ../mazelib-source --against <dir containing only generators.md> --allow-identifiers-from ../mazelib-source/docs --allow-identifiers-from ../slopfork-mazelib-goldens/PROTOCOL.md --allow-identifiers-from ../slopfork-mazelib-goldens/expected/generate.jsonl`
Result: **0 findings** (exit 0).
Notes:
- With only `docs/` allowed there are 9 identifier findings. All are public names: the generator class names BinaryTree, HuntAndKill, TrivialMaze, GrowingTree, AldousBroder, BacktrackingGenerator, CellularAutomaton, the public option `maze_type`, and the exception kind `AssertionError`. They're all documented in the goldens PROTOCOL.md, which is allowed as public.
- One shingle finding was a run of 12 `#` characters (a maze border row), which also shows up in a maze picture inside a source test docstring. It's generic golden grid data, not a leak. It went away once the goldens' expected grids were allowed as public text. One worked example was also swapped for another seed along the way.
- There are no code fences, no private identifiers, and no copied comments or docstrings. All worked-example grids are copied from the goldens.
