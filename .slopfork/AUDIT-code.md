# Code leak audit (phase: audit), 2026-10-22

Auditor: spec-writer (dirty side). Sealed source: `../mazelib-source` at 56cd882.
Target: `src/`, `adapter/`, `test/` of this repo. This report gives target locations and classifications only. It contains no source text.

## 1. Script audit (`leak_audit.py --mode code`, default 25-token normalized runs)

Commands, run from the repo root, one per target directory:

```
python3 .claude/skills/slopfork/scripts/leak_audit.py --mode code \
  --source /home/user/mazelib-source --against src \
  --allow-identifiers-from /home/user/mazelib-source/docs \
  --allow-identifiers-from /home/user/slopfork-mazelib-goldens/PROTOCOL.md
python3 .claude/skills/slopfork/scripts/leak_audit.py --mode code \
  --source /home/user/mazelib-source --against adapter \
  --allow-identifiers-from /home/user/mazelib-source/docs \
  --allow-identifiers-from /home/user/slopfork-mazelib-goldens/PROTOCOL.md
python3 .claude/skills/slopfork/scripts/leak_audit.py --mode code \
  --source /home/user/mazelib-source --against test \
  --allow-identifiers-from /home/user/mazelib-source/docs \
  --allow-identifiers-from /home/user/slopfork-mazelib-goldens/PROTOCOL.md
```

Results (65 source files compared):

| Dir | Findings | Exit |
|---|---|---|
| src | 2 | 1 |
| adapter | 0 | 0 |
| test | 0 | 0 |

| Target location | Type / score | Classification |
|---|---|---|
| src/generators/index.ts:36 | shared token run, 25 tokens (matches a source benchmark script) | public name: an alphabetical list of public generator class names |
| src/generators/index.ts:44 | shared token run, 25 tokens (same list, overlapping window) | public name: same list as above |

The test directory didn't need the goldens `expected/` allowance: it came back with 0 findings without it.

## 2. Targeted string-literal and comment check (manual and scripted)

Method: I pulled every string literal, line comment, and block/JSDoc comment out of the target. I also pulled every string literal, docstring, comment, and every assertion and raise message out of the source (excluding `docs/`). Then I compared them three ways, after lowercasing and stripping punctuation:
(a) the longest common word run per literal against each source fragment, flagging runs of 4 or more words, or 3 or more words with a similarity ratio of at least 0.5;
(b) 5-word shingles per target line, with shingles that also appear in the public docs, README, or goldens PROTOCOL/README excluded;
(c) 5-word shingles across joined multi-line comment blocks.
I also compared every target error message (all `throw new ...Error(...)` sites in `src/` and `adapter/`) by hand against the source's complete list of assertion and raise messages. The helper scripts are scratch files outside the repo and aren't part of the deliverable.

| Target location | Type / score | Classification |
|---|---|---|
| src/generators/base.ts:16 | error message, 6-word run, ratio 0.67 vs a source assertion | public behavior: the identical message, case aside, appears in the public goldens (`expected/generate.jsonl`) as observed error output. Keep it. |
| src/rng.ts:302 | error message, 4-word run vs a source string | public name: NumPy's own documented error text, quoted in the public goldens and rng spec. Not mazelib text. |
| src/solvers/base.ts:54 | error message, 4-word run vs a source solver assertion message | suspicious: rewrite from spec. The tail phrase matches a source assertion message, and that message isn't in the goldens or docs. Messages are never compared, so this costs nothing to reword. |
| src/solvers/shortest.ts:59 | error message, 3 of 4 source words, near-paraphrase of a source failure message | suspicious (low): rewrite from spec. It's short and generic, but it sits close to the source wording, so reword it freely. |
| src/maze.ts:103 | doc comment, 4-word run, ratio 0.5 | generic code idiom ("start/end" phrasing) |
| src/maze.ts:106 | error message, 3-word run | generic code idiom (this is one of the messages the orchestrator already rewrote; it no longer resembles the source) |
| src/maze.ts:111 | error message, 3-word run | generic code idiom (also already rewritten) |
| src/generators/aldousBroder.ts:7 | doc comment, 4-word run, ratio 0.48 | generic code idiom (standard random-walk description) |
| src/solvers/base.ts:5 | doc comment, 3-word run | generic code idiom |
| src/solvers/base.ts:69 | doc comment, 4-word run, ratio 0.33 | generic code idiom |
| src/solvers/base.ts:87 | doc comment, one 5-word shingle | generic code idiom ("start and end" phrasing) |
| src/solvers/base.ts:88 | doc comment, 4-word run, ratio 0.35 | generic code idiom |
| src/solvers/walkers.ts:88 | inline comment, 4-word run, ratio 0.30 | generic code idiom |
| test/solvers.test.ts:112 | test title, 3-word run | generic code idiom |

None of the target comments or JSDoc blocks matched a source docstring or comment beyond the generic short phrases listed above. The CPython `random` messages in `src/rng.ts` (e.g. the empty range, zero step, and empty sequence messages) are standard-library text. Where they appear in the goldens they're public behavior, and none of them matched mazelib's own text.

## 3. Counts by type

| Type | Count |
|---|---|
| Script: shared 25-token run | 2 (public name: 2) |
| Manual: error-message overlap | 4 (public behavior/name: 2, suspicious: 2) |
| Manual: comment / doc / test-title phrase overlap | 10 (generic idiom: 10) |
| **Total** | **16** (public: 4, generic: 10, suspicious: 2) |

## 4. Action items for the clean side

- Rewrite src/solvers/base.ts:54 from spec (`.slopfork/spec/solvers.md`, error table: start or end coordinate outside the grid raises `AssertionError`; message text is free).
- Rewrite src/solvers/shortest.ts:59 from spec (message text is free; only the error kind matters).

No other changes are needed. After the rewrites, the code audit is clean except for public names and generic idioms.

## Follow-up (clean side, orchestrator)
- `src/solvers/base.ts:54` and `src/solvers/shortest.ts:59`: both error messages rewritten in new wording, from spec (only the error kind is contractual). No source text was consulted.
- Earlier, before this audit: the `Maze` facade's assertion messages (`src/maze.ts`) were rewritten by the orchestrator because the builder had produced wording not present in any spec, which suggested recall from training data.
