# Spec: rng

Provenance: documented (public CPython 3.13 `random` and NumPy legacy `RandomState` behavior; MT19937 reference algorithm by Matsumoto and Nishimura) and observed (goldens `rng` op). Nothing here is derived from mazelib's code. · Audit: see AUDIT.md

## Purpose
The library draws randomness from two independent pseudo-random streams. Both are Mersenne Twister (MT19937) generators. One behaves exactly like CPython's `random` module (call it the **Py stream**); the other behaves exactly like NumPy's legacy global `RandomState` (call it the **Np stream**). The goldens `rng` op checks both streams bit for bit under the `cr` profile, so every operation listed below must reproduce the public library behavior exactly. How the maze algorithms consume these streams is not part of this spec.

## Public interface
Language-neutral; the TypeScript names are the builder's choice.

Py stream:
- `seed(a: int)`: any integer, including negative ones and ones of any magnitude (the goldens use up to 2^32+5; ports should accept arbitrary size, e.g. via big integers).
- `random() -> float` in [0, 1).
- `getrandbits(k: int) -> int` with k >= 0.
- `randrange(stop: int) -> int`, `randrange(start: int, stop: int, step: int = 1) -> int`. Results can exceed 2^32 (goldens test spans of 2^40).
- `randint(a: int, b: int) -> int`, inclusive on both ends.
- `choice(seq: list<T>) -> T`.
- `shuffle(x: list<T>)`, in place.

Np stream:
- `seed(s: int)`: s must be in 0 .. 2^32-1 inclusive.
- `shuffle(x: list<T> or 1-D array)`, in place.
- The bounded integer draw that `shuffle` uses (described below) is worth exposing internally, since other modules need "uniform integer in [0, max]" from this stream.

Facade-level helper:
- `set_seed(seed: optional<int>)`: seeds both streams (see Behavior 20-21).

## Behavior

### A. MT19937 core (shared by both streams)
1. State: 624 unsigned 32-bit words plus an index. All arithmetic is modulo 2^32 (in JS, use `Math.imul` for the multiplications and `>>> 0` to normalize).
2. **Basic seeding from one 32-bit value s** (the "init_genrand" routine of the reference implementation): word[0] = s; for i = 1..623, word[i] = (1812433253 * (word[i-1] XOR (word[i-1] >> 30)) + i) mod 2^32. Afterwards the index is set to 624 so that the next output triggers a regeneration.
3. **Array seeding from a key of 32-bit words k[0..L-1]** (the "init_by_array" routine of the reference implementation, L >= 1):
   1. Perform basic seeding with s = 19650218.
   2. Set i = 1, j = 0. Repeat max(624, L) times: word[i] = ((word[i] XOR ((word[i-1] XOR (word[i-1] >> 30)) * 1664525)) + k[j] + j) mod 2^32; then increment i and j; if i reaches 624, set word[0] = word[623] and i = 1; if j reaches L, set j = 0.
   3. Repeat 623 times: word[i] = ((word[i] XOR ((word[i-1] XOR (word[i-1] >> 30)) * 1566083941)) - i) mod 2^32; then increment i; if i reaches 624, set word[0] = word[623] and i = 1. (i carries over from step 2.)
   4. Set word[0] = 0x80000000 (guarantees a non-zero state). Index = 624.
4. **Regeneration** (when the index reaches 624): for each k = 0..623, let y = (word[k] AND 0x80000000) OR (word[(k+1) mod 624] AND 0x7FFFFFFF); word[k] = word[(k+397) mod 624] XOR (y >> 1) XOR (0x9908B0DF if y is odd else 0). Index = 0. Updates are done in place in increasing k, so later k see already-updated earlier words (the standard reference behavior).
5. **Output** (one unsigned 32-bit value): y = word[index]; index += 1; then tempering: y ^= y >> 11; y ^= (y << 7) AND 0x9D2C5680; y ^= (y << 15) AND 0xEFC60000; y ^= y >> 18. Return y as unsigned.
6. Sanity vector: basic seeding with s = 5489 gives first output 3499211612 (the standard MT19937 check value).

### B. Py stream (CPython 3.13 `random`)
7. **seed(a)** for an integer a: take the absolute value |a| (so a and -a produce the same stream). Split |a| into 32-bit words, least significant first, using as many words as needed (at least one; |a| = 0 gives the key [0]). Apply array seeding (Behavior 3) with that key. Examples: seed 42 -> key [42]; seed 4294967301 (= 2^32 + 5) -> key [5, 1]; seed 2^64+5 -> key [5, 0, 1].
8. **random()**: draw two outputs a and b. Use a >> 5 (27 bits) and b >> 6 (26 bits). Result = (a' * 67108864 + b') / 9007199254740992, i.e. a 53-bit value divided by 2^53. This is exactly representable as a double; JSON serialization of the double must round-trip (JS `JSON.stringify` of the number is fine; compare as numbers).
9. **getrandbits(k)**:
   - k = 0 returns 0 and draws nothing.
   - 1 <= k <= 32: one output, shifted right by (32 - k).
   - k > 32: build the result from ceil(k/32) outputs, least significant 32-bit word first. Each output fills the next 32 bits; for the last (most significant) word, where only r = k - 32*(words-1) bits remain and r < 32, that output is shifted right by (32 - r) before use. Example: k = 41 uses two outputs: bits 0-31 from the first output, bits 32-40 from the second output shifted right by 23.
   - Negative k raises ValueError (not exercised by the goldens).
10. **Uniform below n** (internal, used by everything below; n >= 1): let k = bit length of n (number of bits in n's binary representation; n = 1 gives k = 1). Draw r = getrandbits(k); while r >= n, draw again. Return r. Consequences that matter for bit compatibility:
    - Even n = 1 consumes one output (choice from a one-element list, randrange(5, 6), and randint(x, x) all draw once).
    - For n a power of two, k is one more than log2(n), so about half the draws are rejected.
    - For n > 2^32 the draw spans multiple outputs per attempt (Behavior 9); use big integers or exact 53-bit-safe arithmetic. The goldens use n = 2^40 (k = 41) and n = 1000000006.
11. **randrange(stop)** (single argument): if stop > 0, return uniform-below(stop). Otherwise raise ValueError ("empty range").
12. **randrange(start, stop, step=1)**:
    - width = stop - start.
    - step = 1: if width > 0, return start + uniform-below(width); else ValueError.
    - step > 0: n = floor((width + step - 1) / step) (floor division on exact integers).
    - step < 0: n = floor((width + step + 1) / step) (floor division; note dividing by a negative).
    - step = 0: ValueError.
    - If n <= 0: ValueError. Otherwise return start + step * uniform-below(n).
    - Passing a step together with a single argument, or non-integer arguments, raises TypeError in CPython 3.13 (not exercised).
13. **randint(a, b)** is randrange(a, b + 1). a > b raises ValueError.
14. **choice(seq)**: if seq is empty, IndexError. Otherwise return seq[uniform-below(len(seq))].
15. **shuffle(x)**: Fisher-Yates from the end: for i from len(x)-1 down to 1, j = uniform-below(i + 1), swap x[i] and x[j]. Lengths 0 and 1 draw nothing.

### C. Np stream (NumPy legacy `RandomState`, also the module-level `numpy.random.*` functions)
16. **seed(s)** for an integer: if s < 0 or s > 4294967295, raise ValueError (the message NumPy uses is "Seed must be between 0 and 2**32 - 1"; messages are never compared). Otherwise apply **basic seeding** (Behavior 2) with s directly. NumPy legacy integer seeding does **not** use array seeding, unlike the Py stream. (Seeding also clears NumPy's cached Gaussian; irrelevant here.)
17. **Bounded draw on [0, max]** (inclusive; NumPy's legacy "interval" draw, masked rejection):
    - If max = 0, return 0 and draw nothing.
    - mask = the smallest value of the form 2^m - 1 that is >= max (smear max's highest bit downward).
    - If max <= 0xFFFFFFFF: repeat { v = one 32-bit output AND mask } until v <= max; return v.
    - (For max > 0xFFFFFFFF NumPy uses 64-bit draws, each made of two outputs with the first as the high word; not reachable by any case in the goldens.)
    - Note this is not Lemire's method and not the Py stream's "uniform below": the bound is inclusive and the mask is computed from max, not from max + 1.
18. **shuffle(x)** for a list or 1-D array of length n: for i from n-1 down to 1, j = bounded draw on [0, i], swap x[i] and x[j]. Lengths 0 and 1 draw nothing. The draws are identical whether x is a NumPy array or a plain list, and independent of element type.

### D. Independence and seeding through the library
19. The two streams never share state. Drawing from one never advances the other (see the `mixed` worked examples).
20. **set_seed(seed)** (and the Maze constructor with a seed): when seed is not null, seed the Py stream with seed, then seed the Np stream with seed. Because the Py stream accepts every integer and the Np stream rejects values outside 0 .. 2^32-1, a seed such as -7 or 4294967301 raises ValueError from the Np step **after** the Py stream has already been reseeded. The Np stream is left unchanged in that case.
21. When seed is null, nothing is reseeded; both streams continue from whatever state they had.

### E. The goldens `rng` op and adapter seeding
22. The adapter calls set_seed(case.seed) before running any op whenever `seed` is present and not null. A ValueError from seeding makes the whole case fail with error kind `ValueError` before any call runs. That is why every `rng` case with seed -7 or 4294967301 expects `{"ok": false, "error": {"kind": "ValueError"}}` regardless of its calls.
23. Calls map as follows (one output entry per call, in order, all against the same two streams):
    - `["random"]`: Py random().
    - `["randrange", ...]`: Py randrange with 1, 2 or 3 integer arguments.
    - `["randint", a, b]`: Py randint.
    - `["choice", n]`: Py choice over the list 0..n-1, which equals uniform-below(n).
    - `["shuffle", n]`: the list 0..n-1 shuffled by the Py stream.
    - `["np_shuffle", n]`: the list 0..n-1 shuffled by the Np stream.
24. If any call raises (e.g. `["randrange", 0]`), the whole case fails with that error kind (`ValueError`); earlier outputs are discarded.
25. Initial state when no seed was ever given: the original seeds from OS entropy, so it is not reproducible. No golden depends on it: the only cases with a null or missing seed are the `tostring` cases, which draw nothing. A port may start from any state (a fixed default seed is fine).
26. The adapter processes many cases in one process; a non-null seed resets both streams at the start of each case, so cases are independent.

## Invariants
- Same seed gives the same sequence of outputs for every call, in every port.
- random() is in [0, 1) and is a multiple of 2^-53.
- randrange(start, stop, step) returns start + step*i for some 0 <= i < n.
- randint(a, b) is in [a, b]; choice(n) is in [0, n); shuffle and np_shuffle return a permutation of 0..n-1.
- Py seed a and seed -a produce identical streams.
- Drawing from the Py stream does not change subsequent Np outputs and vice versa.

## Errors
| Condition | Error kind | Contractual message? |
|---|---|---|
| randrange(stop) with stop <= 0 | ValueError | no |
| randrange(start, stop[, step]) whose range is empty (e.g. start >= stop with step 1) | ValueError | no |
| randrange with step = 0 | ValueError | no |
| randint(a, b) with a > b | ValueError | no |
| choice of an empty sequence | IndexError | no (not in goldens) |
| getrandbits(k) with k < 0 | ValueError | no (not in goldens) |
| Np seed outside 0 .. 2^32-1 (negative or > 4294967295), including via set_seed / Maze(seed) / adapter seeding | ValueError | no |
| Non-integer arguments to randrange / randint | TypeError | no (not in goldens) |

## Edge cases
| Input | Expected |
|---|---|
| Py seed 0 | key [0]; first three raw outputs 3626764237, 1654615998, 3255389356 |
| Np seed 0 | basic seeding with 0; first three raw outputs 2357136044, 2546248239, 3071714933 |
| Py seed -7 | identical stream to seed 7; first random() = 0.32383276483316237 |
| Py seed 4294967301 alone (Py stream only) | key [5, 1]; first random() = 0.15727238718789782 |
| Py seed 2^64+5 alone | key [5, 0, 1]; first random() = 0.5105783769365112 |
| Py seed 0 then getrandbits(40) | 424533559245 |
| Py seed 0 then getrandbits(32) twice | 3626764237, 1654615998 (same as raw outputs) |
| Py seed 0 then randrange(10, 0, -3) | 1 (range is 10, 7, 4, 1; n = 4) |
| randrange(5, 6), randint(x, x), choice of 1 element | the only value, but one output is consumed |
| shuffle / np_shuffle of length 0 or 1 | unchanged, no outputs consumed |
| set_seed(-7) or set_seed(4294967301) | ValueError (Py stream already reseeded, Np unchanged) |
| set_seed(4294967295) | accepted by both streams |

## Worked examples
All copied from goldens `cases/rng.jsonl` and `expected/rng.jsonl`. Each case starts with set_seed(seed).

1. `rng/floats/s0`, seed 0, eight `["random"]` calls -> 0.8444218515250481, 0.7579544029403025, 0.420571580830845, 0.25891675029296335, 0.5112747213686085, 0.4049341374504143, 0.7837985890347726, 0.30331272607892745.
2. `rng/floats/s42`, seed 42, eight random() -> 0.6394267984578837, 0.025010755222666936, 0.27502931836911926, 0.22321073814882275, 0.7364712141640124, 0.6766994874229113, 0.8921795677048454, 0.08693883262941615.
3. `rng/floats/s4294967295`, seed 4294967295 -> first two random() are 0.6353574441341173, 0.20319993954407756.
4. `rng/ranges/s0`, seed 0, calls `randrange 10`, `randrange 1 11 2`, `randrange 0 1099511627776`, `randrange 1 1000000007`, `randrange 5 6`, `randint 1 6`, `randint -3 3` -> 6, 7, 567109562164, 548977049, 5, 4, 3.
5. `rng/ranges/s1`, seed 1, same calls -> 2, 9, 140719340484, 273878288, 5, 4, 3.
6. `rng/ranges/s123456789`, same calls -> 7, 9, 874464074003, 326277043, 5, 4, 1.
7. `rng/choice/s0`, seed 0, `choice 1`, `choice 2`, `choice 7`, `choice 1000` -> 0, 1, 0, 265.
8. `rng/choice/s42` -> 0, 0, 5, 281.
9. `rng/shuffle/s0`, seed 0, `shuffle 0`, `shuffle 1`, `shuffle 10`, `shuffle 37` -> [], [0], [7, 8, 1, 5, 3, 4, 2, 0, 9, 6], [1, 27, 35, 0, 23, 30, 14, 12, 7, 26, 16, 34, 21, 5, 6, 11, 20, 15, 10, 2, 29, 9, 4, 28, 36, 17, 31, 25, 19, 3, 24, 33, 18, 8, 32, 13, 22].
10. `rng/np/s0`, seed 0, `np_shuffle 0`, `np_shuffle 1`, `np_shuffle 10`, `np_shuffle 50`, `np_shuffle 300` -> [], [0], [2, 8, 4, 9, 1, 6, 7, 3, 0, 5], [26, 35, 44, 28, 11, 2, 34, 47, 40, 22, 4, 10, 30, 41, 33, 43, 49, 7, 14, 32, 21, 29, 42, 3, 18, 0, 27, 15, 5, 31, 16, 19, 20, 9, 8, 13, 25, 37, 17, 45, 48, 39, 38, 1, 12, 46, 24, 6, 23, 36], and a 300-element permutation beginning 6, 52, 270, 45, 295, 189, 191, 116, 90, 250 and ending 105, 273, 244, 38, 53.
11. `rng/np/s42` -> np_shuffle 10 gives [8, 1, 5, 0, 7, 2, 9, 4, 3, 6].
12. `rng/mixed/s0`, seed 0, calls `random`, `np_shuffle 5`, `randrange 100`, `shuffle 5`, `choice 3`, `np_shuffle 5` -> 0.8444218515250481, [2, 0, 1, 3, 4], 97, [4, 2, 1, 0, 3], 1, [0, 2, 1, 4, 3]. The first random() equals example 1's first value: the Np draws in between do not disturb the Py stream.
13. `rng/mixed/s42` -> 0.6394267984578837, [1, 4, 2, 0, 3], 3, [3, 4, 0, 1, 2], 2, [3, 1, 2, 0, 4].
14. `rng/errors/s0`, seed 0, `["randrange", 0]` -> `{"ok": false, "error": {"kind": "ValueError"}}`.
15. `rng/floats/s-7` and every other case with seed -7 -> ValueError (from the Np seeding step).
16. `rng/floats/s4294967301` and every other case with seed 4294967301 -> ValueError.

A pure re-implementation of Behaviors 1-18 was checked by the spec-writer against all 63 `rng` goldens: 63/63 match.

## Open questions
None yet.
