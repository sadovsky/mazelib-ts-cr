# Builder questions

## rng
- Q1 (rng, builder): The spec defines the Np stream's bounded draw on [0, max] and shuffle, but not a `randint(low, high)` for the Np stream. `NpRandomState.randint(low, high)` (high exclusive) is implemented as `low + randomInterval(high - low - 1)` and marked `// SLOPFORK-Q:` in `src/rng.ts`. If any algorithm spec needs NumPy's `randint` (or `random()`, `choice`, etc.) from the Np stream, please state the exact draw semantics in that algorithm's spec.
  - A1 (orchestrator): No spec answer needed. Under the `cr` profile, how algorithms draw from the RNG streams is the port's own design (only the `rng` op is compared exactly), so the Np `randint` helper is a target design choice.
