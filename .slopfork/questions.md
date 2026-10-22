# Builder questions

## rng
- Q1 (rng, builder): The spec defines the Np stream's bounded draw on [0, max] and shuffle, but not a `randint(low, high)` for the Np stream. `NpRandomState.randint(low, high)` (high exclusive) is implemented as `low + randomInterval(high - low - 1)` and marked `// SLOPFORK-Q:` in `src/rng.ts`. If any algorithm spec needs NumPy's `randint` (or `random()`, `choice`, etc.) from the Np stream, please state the exact draw semantics in that algorithm's spec.
  - A1 (orchestrator): No spec answer needed. Under the `cr` profile, how algorithms draw from the RNG streams is the port's own design (only the `rng` op is compared exactly), so the Np `randint` helper is a target design choice.

## generators
- Q2 (generators, builder): DungeonRooms says a room that "reaches outside the grid" is skipped, but not what happens to a room that is inside the grid yet touches the outer frame (row 0, row H-1, column 0 or column W-1). Carving it would open frame squares and break border_walls. `src/generators/dungeonRooms.ts` skips such rooms entirely (a room must lie within rows 1..H-2 and columns 1..W-2), marked `// SLOPFORK-Q:`. No golden case is affected.
