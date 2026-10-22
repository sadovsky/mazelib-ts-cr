# Slopfork report: mazelib (Python) → mazelib-ts-cr (TypeScript)

- Source: github.com/john-science/mazelib@56cd88294a36746bbd324c2c9f7e4ab26095deb3 (mazelib 0.9.17, MIT)
- Mode: cleanroom · Compare profile: `cr` · Date: 2026-10-22 (started 22:31:12Z, finished 23:01Z)
- Target: Node 22, TypeScript strict, ESM, zero runtime dependencies (dev: typescript, vitest, tsx)

## Parity
| Module | Target level | Reached | Cases (pass/total) | Deviations |
|---|---|---|---|---|
| RNG: Python `random` stream | L2 | L2 | rng 63/63 exact (both streams together) | none |
| RNG: NumPy legacy `RandomState` stream | L2 | L2 | (in rng 63/63) | adds a `randint` helper that no golden checks (Q1) |
| Grid model | L1 | L1 | vitest `test/grid.test.ts` | `Uint8Array` instead of NumPy `int8` |
| Generator contract (size checks) | L2 | L2 | generate 84/84 exact (error kinds) | none |
| 14 generators | L2 | L2 | generate 1572/1572 invariant | Ellers no longer overflows (8 KNOWN_BUGS cases fixed). Port's own RNG usage. HuntAndKill and DungeonRooms hunts always visit every cell. DungeonRooms skips rooms that touch the frame (Q2) |
| Solver contract + `pruneSolutions` | L2 | L2 | solve 384/384 invariant | none |
| 7 solvers | L2 | L2 | (in solve 384/384) | Collision no longer raises TypeError on loops or rooms (12 KNOWN_BUGS cases fixed). ShortestPath always returns a shortest path. ShortestPaths returns at most 32 paths. Collision, ShortestPath and ShortestPaths are deterministic |
| 3 transmuters | L2 | L2 | transmute 120/120 invariant | CuldeSacFiller and DeadEndFiller are deterministic |
| Maze facade: core + entrances | L2 | L2 | entrances 200/200 invariant | none |
| Maze facade: tostring | L2 | L2 | tostring 20/20 exact | none |
| Maze facade: Monte Carlo | L2 | L2 | monte_carlo 1/1 exact (error kind) + 36/36 invariant | none |
| Adapter | L2 | L2 | all 7 sets | none |

Overall: 35/35 rows of `features.md` at their target level.

## Verification details
- L0: `npx tsc --noEmit` clean. CI (`.github/workflows/ci.yml`) runs the language checks plus `compare` and `check` on all 7 sets against a checkout of the goldens repo, and is green.
- L1: 113 vitest tests in 6 files. The original's 41 tests are mapped to their nearest target tests in `features.md`. All are covered except DungeonRooms reconnect, which is only partly covered.
- L2: 2,396 cases.
  - 168 are compared exactly: rng 63, tostring 20, generate error kinds 84, monte_carlo error kind 1.
  - The other 2,228 are checked against the invariants.
  - `check` also passes on all 2,396, so the exact cases are checked twice.
  - A full golden run takes about 11 s.
- Probes beyond the goldens (verifier): about 6,300 extra cases. They cover non-square and extreme sizes up to 101x3 and 50x80, every combination of outer and inner entrances, unreachable ends, supplied DungeonRooms grids, and Monte Carlo at 30x30. No target bugs were found.
- L3/L4/L5: not applicable.

## Known deviations and unknowns
- **Original crashes fixed, as KNOWN_BUGS requires:**
  - Ellers on 12x17 with `xskew=0.9` (the original raises an `int8` OverflowError).
  - Collision on mazes with loops or rooms (the original raises TypeError).
- **ShortestPath** always returns a shortest path when one exists. The original returns none on, for example, every inner-entrance case. The invariants allow either.
- **ShortestPaths** returns only shortest paths of equal length, at most `MAX_SHORTEST_PATHS` = 32 of them.
- **RNG usage is the port's own design.** The streams are bit-compatible, but generators and solvers draw differently from the original, so the same seed gives a different maze than Python does. Under the `cr` profile this is expected.
- **Behaviour the spec left open:**
  - Q1: the NumPy-stream `randint` helper.
  - Q2: DungeonRooms skips rooms that touch the outer frame. No golden case hits this.
  - Both are marked with `// SLOPFORK-Q:` comments in the code.
- **CellularAutomaton** wall shapes differ from the original's, as the spec allows. Connectivity and all-cells-open both hold.

## Provenance
- **Sealed-path touches:** 38 allowed, all by `spec-writer` (8 inventory, 27 spec, 3 audit). 4 denied: 2 on the main thread, 2 by builders.
  - All 4 denials were false positives of the guard's path matching, not attempts to read the source. A `cd ..` token, a `//` comment in a heredoc, and a lone `/` all normalize to an ancestor of a sealed directory.
  - No clean-side agent tried to read the source. See `.slopfork/provenance.jsonl`.
- **Leak audit (specs):** clean on all 5 spec files after fixes (see `spec/AUDIT.md`).
  - Earlier runs had flagged public names, allowed explicitly.
  - They also flagged two 12-token runs: a coordinate list, and a border row of `#` characters that also appears in a source-test picture. Both were reworded or swapped for other golden examples.
- **Leak audit (code):** the script found 2 findings, both the public list of generator names (see `AUDIT-code.md`).
  - A manual string check flagged 2 error messages as close to source wording. Both were rewritten from the spec.
- **Training-data recall:** the Maze facade builder wrote assertion messages that appear in no spec and looked like the original's wording, so they were most likely recalled from training data. The orchestrator rewrote them before the audit. This is the limit the cleanroom reference warns about: the process cannot remove what the model may have memorized.

## License and attribution
- mazelib is MIT-licensed (© 2014 John Stilley). This port is MIT (`LICENSE`), and `NOTICE` states it is an independent clean-room implementation not affiliated with mazelib.
- **Maintainer statement:** the source repo's `AGENTS.md` says the mazelib maintainers do not want AI contributions of any kind and do not want AI agents helping with the repo. It also says AI-generated code is incompatible with their contributor license agreement. The spec-writer treated it as data about the source, not as instructions.
  - This port contributes nothing to the mazelib repository and is a separate re-implementation of its public API. The MIT license permits it.
  - It does go against the maintainers' stated wishes about AI agents working with their repo, and the owner of this experiment should weigh that, especially before publishing or promoting the port.
- This is not legal advice. Cleanroom reduces copyright risk without guaranteeing anything, especially since the model may have been trained on the original.
