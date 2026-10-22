/**
 * Random number layer: two independent MT19937 streams.
 *
 * - `PyRandom` reproduces CPython 3.13's `random` module bit for bit
 *   (seeding from an integer, random(), getrandbits, randrange, randint,
 *   choice, shuffle).
 * - `NpRandomState` reproduces NumPy's legacy `RandomState` (integer seed,
 *   bounded "interval" draws, random(), shuffle).
 *
 * Both are public library behaviors; see `.slopfork/spec/rng.md`.
 */

import { IndexError, ValueError } from "./errors.js";

const N = 624;
const M = 397;
const MATRIX_A = 0x9908b0df;
const UPPER_MASK = 0x80000000;
const LOWER_MASK = 0x7fffffff;
const TWO_32 = 4294967296;
const TWO_53 = 9007199254740992;

/** The Mersenne Twister MT19937 core with 32-bit outputs. */
export class MT19937 {
  private readonly mt = new Uint32Array(N);
  private index = N + 1;

  /** Reference `init_genrand`: seed from a single 32-bit value. */
  initGenrand(s: number): void {
    const mt = this.mt;
    mt[0] = s >>> 0;
    for (let i = 1; i < N; i++) {
      const prev = mt[i - 1];
      mt[i] = (Math.imul(1812433253, (prev ^ (prev >>> 30)) >>> 0) + i) >>> 0;
    }
    this.index = N;
  }

  /** Reference `init_by_array`: seed from a key of 32-bit words. */
  initByArray(key: readonly number[]): void {
    const mt = this.mt;
    const len = key.length;
    if (len < 1) throw new ValueError("init_by_array needs a non-empty key");
    this.initGenrand(19650218);
    let i = 1;
    let j = 0;
    for (let k = Math.max(N, len); k > 0; k--) {
      const prev = mt[i - 1];
      const x = Math.imul((prev ^ (prev >>> 30)) >>> 0, 1664525);
      mt[i] = (((mt[i] ^ x) >>> 0) + (key[j] >>> 0) + j) >>> 0;
      i++;
      j++;
      if (i >= N) {
        mt[0] = mt[N - 1];
        i = 1;
      }
      if (j >= len) j = 0;
    }
    for (let k = N - 1; k > 0; k--) {
      const prev = mt[i - 1];
      const x = Math.imul((prev ^ (prev >>> 30)) >>> 0, 1566083941);
      mt[i] = (((mt[i] ^ x) >>> 0) - i) >>> 0;
      i++;
      if (i >= N) {
        mt[0] = mt[N - 1];
        i = 1;
      }
    }
    mt[0] = 0x80000000;
    this.index = N;
  }

  private regenerate(): void {
    const mt = this.mt;
    for (let k = 0; k < N; k++) {
      const y = (mt[k] & UPPER_MASK) | (mt[(k + 1) % N] & LOWER_MASK);
      mt[k] = (mt[(k + M) % N] ^ (y >>> 1) ^ (y & 1 ? MATRIX_A : 0)) >>> 0;
    }
    this.index = 0;
  }

  /** Next tempered unsigned 32-bit output. */
  nextUint32(): number {
    if (this.index >= N) {
      if (this.index > N) this.initGenrand(5489); // never seeded: reference default
      this.regenerate();
    }
    let y = this.mt[this.index++];
    y ^= y >>> 11;
    y ^= (y << 7) & 0x9d2c5680;
    y ^= (y << 15) & 0xefc60000;
    y ^= y >>> 18;
    return y >>> 0;
  }

  /** 53-bit double in [0, 1), the formula shared by CPython and NumPy. */
  nextDouble(): number {
    const a = this.nextUint32() >>> 5;
    const b = this.nextUint32() >>> 6;
    return (a * 67108864 + b) / TWO_53;
  }
}

/** Number of bits in the binary representation of a non-negative integer. */
function bitLength(n: number): number {
  if (n < TWO_32) return 32 - Math.clz32(n);
  return n.toString(2).length;
}

function bitLengthBig(n: bigint): number {
  return n === 0n ? 0 : n.toString(2).length;
}

function requireInt(name: string, v: number): void {
  if (!Number.isInteger(v)) {
    throw new TypeError(`${name} must be an integer, got ${v}`);
  }
}

/** Floor division on bigints (Python `//`). */
function floorDiv(a: bigint, b: bigint): bigint {
  const q = a / b;
  return (a % b !== 0n && (a < 0n) !== (b < 0n)) ? q - 1n : q;
}

function entropySeed(): bigint {
  const t = BigInt(Date.now());
  const r = BigInt(Math.floor(Math.random() * TWO_32));
  const r2 = BigInt(Math.floor(Math.random() * TWO_32));
  return (t << 64n) ^ (r << 32n) ^ r2;
}

/** Bit-compatible with CPython 3.13 `random.Random` for integer seeds. */
export class PyRandom {
  private readonly mt = new MT19937();

  constructor(seed?: number | bigint) {
    this.seed(seed ?? entropySeed());
  }

  /** Seed from any integer; `a` and `-a` give the same stream. */
  seed(a: number | bigint): void {
    let v: bigint;
    if (typeof a === "number") {
      requireInt("seed", a);
      v = BigInt(a);
    } else {
      v = a;
    }
    if (v < 0n) v = -v;
    const key: number[] = [];
    while (v > 0n) {
      key.push(Number(v & 0xffffffffn));
      v >>= 32n;
    }
    if (key.length === 0) key.push(0);
    this.mt.initByArray(key);
  }

  /** Raw tempered 32-bit output (equivalent to getrandbits(32)). */
  nextUint32(): number {
    return this.mt.nextUint32();
  }

  /** Float in [0, 1), a multiple of 2^-53. */
  random(): number {
    return this.mt.nextDouble();
  }

  /** getrandbits for 0 <= k <= 53, returned as an exact number. */
  getrandbits(k: number): number {
    requireInt("k", k);
    if (k < 0) throw new ValueError("number of bits must be non-negative");
    if (k > 53) throw new RangeError("getrandbits(k > 53) needs getrandbitsBig");
    if (k === 0) return 0;
    if (k <= 32) return this.mt.nextUint32() >>> (32 - k);
    const low = this.mt.nextUint32();
    const high = this.mt.nextUint32() >>> (64 - k);
    return high * TWO_32 + low;
  }

  /** getrandbits for any k >= 0, as a bigint. Least significant word first. */
  getrandbitsBig(k: number): bigint {
    requireInt("k", k);
    if (k < 0) throw new ValueError("number of bits must be non-negative");
    if (k <= 32) return BigInt(this.getrandbits(k));
    const words = Math.ceil(k / 32);
    let result = 0n;
    for (let i = 0; i < words; i++) {
      let r = this.mt.nextUint32();
      const remaining = k - 32 * i;
      if (remaining < 32) r >>>= 32 - remaining;
      result |= BigInt(r) << BigInt(32 * i);
    }
    return result;
  }

  /** Uniform integer in [0, n) by rejection on bit-length draws; n >= 1. */
  randbelow(n: number): number {
    if (!(n >= 1) || !Number.isSafeInteger(n)) {
      throw new ValueError(`randbelow needs a positive safe integer, got ${n}`);
    }
    const k = bitLength(n);
    let r = this.getrandbits(k);
    while (r >= n) r = this.getrandbits(k);
    return r;
  }

  /** Uniform bigint in [0, n); n >= 1. */
  randbelowBig(n: bigint): bigint {
    if (n < 1n) throw new ValueError("randbelow needs n >= 1");
    const k = bitLengthBig(n);
    let r = this.getrandbitsBig(k);
    while (r >= n) r = this.getrandbitsBig(k);
    return r;
  }

  /**
   * Python `randrange(stop)` or `randrange(start, stop, step = 1)`.
   * Works for any safe-integer arguments; large spans use BigInt internally.
   */
  randrange(start: number, stop?: number, step = 1): number {
    requireInt("start", start);
    requireInt("step", step);
    if (stop === undefined) {
      if (step !== 1) throw new TypeError("Missing a non-None stop argument");
      if (start > 0) return this.randbelow(start);
      throw new ValueError("empty range in randrange(" + start + ")");
    }
    requireInt("stop", stop);
    const LIM = 2 ** 50;
    if (Math.abs(start) <= LIM && Math.abs(stop) <= LIM && Math.abs(step) <= LIM) {
      const width = stop - start;
      if (step === 1) {
        if (width > 0) return start + this.randbelow(width);
        throw new ValueError(`empty range in randrange(${start}, ${stop})`);
      }
      let n: number;
      if (step > 0) n = Math.floor((width + step - 1) / step);
      else if (step < 0) n = Math.floor((width + step + 1) / step);
      else throw new ValueError("zero step for randrange()");
      if (n <= 0) throw new ValueError(`empty range in randrange(${start}, ${stop}, ${step})`);
      return start + step * this.randbelow(n);
    }
    // Big path: exact integer arithmetic.
    const s = BigInt(start);
    const e = BigInt(stop);
    const st = BigInt(step);
    const width = e - s;
    let n: bigint;
    if (st === 1n) {
      if (width <= 0n) throw new ValueError(`empty range in randrange(${start}, ${stop})`);
      return Number(s + this.randbelowBig(width));
    }
    if (st > 0n) n = floorDiv(width + st - 1n, st);
    else if (st < 0n) n = floorDiv(width + st + 1n, st);
    else throw new ValueError("zero step for randrange()");
    if (n <= 0n) throw new ValueError(`empty range in randrange(${start}, ${stop}, ${step})`);
    return Number(s + st * this.randbelowBig(n));
  }

  /** Integer in [a, b], both inclusive. */
  randint(a: number, b: number): number {
    return this.randrange(a, b + 1);
  }

  /** Uniformly chosen element of a non-empty sequence. */
  choice<T>(seq: readonly T[]): T {
    if (seq.length === 0) throw new IndexError("Cannot choose from an empty sequence");
    return seq[this.randbelow(seq.length)];
  }

  /** In-place Fisher-Yates shuffle, from the end. */
  shuffle<T>(x: T[]): void {
    for (let i = x.length - 1; i > 0; i--) {
      const j = this.randbelow(i + 1);
      const t = x[i];
      x[i] = x[j];
      x[j] = t;
    }
  }
}

/** Bit-compatible with NumPy's legacy `RandomState` for the calls below. */
export class NpRandomState {
  private readonly mt = new MT19937();

  constructor(seed?: number | bigint) {
    this.seed(seed ?? Math.floor(Math.random() * TWO_32));
  }

  /** Seed with an integer in 0 .. 2^32-1 (basic seeding, no array key). */
  seed(s: number | bigint): void {
    let v: bigint;
    if (typeof s === "number") {
      requireInt("seed", s);
      v = BigInt(s);
    } else {
      v = s;
    }
    if (v < 0n || v > 0xffffffffn) {
      throw new ValueError("Seed must be between 0 and 2**32 - 1");
    }
    this.mt.initGenrand(Number(v));
  }

  /** Raw tempered 32-bit output. */
  nextUint32(): number {
    return this.mt.nextUint32();
  }

  /** Float in [0, 1) (legacy `random_sample`). */
  random(): number {
    return this.mt.nextDouble();
  }

  /** Uniform integer in [0, max] inclusive, by masked rejection. */
  randomInterval(max: number): number {
    if (!Number.isSafeInteger(max) || max < 0) {
      throw new ValueError(`interval bound must be a non-negative safe integer, got ${max}`);
    }
    if (max === 0) return 0;
    if (max <= 0xffffffff) {
      let mask = max;
      mask |= mask >>> 1;
      mask |= mask >>> 2;
      mask |= mask >>> 4;
      mask |= mask >>> 8;
      mask |= mask >>> 16;
      mask >>>= 0;
      let v: number;
      do {
        v = (this.mt.nextUint32() & mask) >>> 0;
      } while (v > max);
      return v;
    }
    // 64-bit draws, first output is the high word.
    const bmax = BigInt(max);
    const mask = (1n << BigInt(bitLengthBig(bmax))) - 1n;
    let v: bigint;
    do {
      const hi = BigInt(this.mt.nextUint32());
      const lo = BigInt(this.mt.nextUint32());
      v = ((hi << 32n) | lo) & mask;
    } while (v > bmax);
    return Number(v);
  }

  /**
   * Integer in [low, high) (high exclusive), as low + randomInterval(high - low - 1).
   * SLOPFORK-Q: (see questions.md Q1) not covered by the rng spec or goldens; assumed to follow the same
   * masked-rejection draw as the bounded interval. Prefer randomInterval.
   */
  randint(low: number, high: number): number {
    requireInt("low", low);
    requireInt("high", high);
    if (high <= low) throw new ValueError("low >= high");
    return low + this.randomInterval(high - low - 1);
  }

  /** In-place shuffle: for i from n-1 down to 1, swap x[i] with x[interval(i)]. */
  shuffle<T>(x: T[]): void {
    for (let i = x.length - 1; i > 0; i--) {
      const j = this.randomInterval(i);
      const t = x[i];
      x[i] = x[j];
      x[j] = t;
    }
  }
}

/** The library-wide shared pair of streams. */
export const rng = { py: new PyRandom(), np: new NpRandomState() };

/**
 * Seed both shared streams: Py first, then Np. A seed outside 0 .. 2^32-1
 * reseeds Py and then throws ValueError from the Np step (Np unchanged).
 * A null/undefined seed reseeds nothing.
 */
export function setSeed(seed: number | bigint | null | undefined): void {
  if (seed === null || seed === undefined) return;
  rng.py.seed(seed);
  rng.np.seed(seed);
}
