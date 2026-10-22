import { describe, expect, it } from "vitest";
import { MT19937, NpRandomState, PyRandom, rng, setSeed, ValueError } from "../src/index.js";

describe("MT19937", () => {
  it("matches the reference check value for seed 5489", () => {
    const mt = new MT19937();
    mt.initGenrand(5489);
    expect(mt.nextUint32()).toBe(3499211612);
  });
});

describe("PyRandom", () => {
  it("seed 0 raw outputs", () => {
    const r = new PyRandom(0);
    expect([r.getrandbits(32), r.getrandbits(32), r.getrandbits(32)]).toEqual([
      3626764237, 1654615998, 3255389356,
    ]);
  });

  it("random() for seed 0 and 42", () => {
    const r0 = new PyRandom(0);
    expect([r0.random(), r0.random(), r0.random()]).toEqual([
      0.8444218515250481, 0.7579544029403025, 0.420571580830845,
    ]);
    const r42 = new PyRandom(42);
    expect([r42.random(), r42.random()]).toEqual([0.6394267984578837, 0.025010755222666936]);
  });

  it("negative and large seeds", () => {
    expect(new PyRandom(-7).random()).toBe(0.32383276483316237);
    expect(new PyRandom(4294967301).random()).toBe(0.15727238718789782);
    expect(new PyRandom(2n ** 64n + 5n).random()).toBe(0.5105783769365112);
  });

  it("getrandbits(40)", () => {
    expect(new PyRandom(0).getrandbits(40)).toBe(424533559245);
    expect(new PyRandom(0).getrandbitsBig(40)).toBe(424533559245n);
    expect(new PyRandom(0).getrandbits(0)).toBe(0);
  });

  it("randrange / randint sequence for seed 0", () => {
    const r = new PyRandom(0);
    expect([
      r.randrange(10),
      r.randrange(1, 11, 2),
      r.randrange(0, 1099511627776),
      r.randrange(1, 1000000007),
      r.randrange(5, 6),
      r.randint(1, 6),
      r.randint(-3, 3),
    ]).toEqual([6, 7, 567109562164, 548977049, 5, 4, 3]);
    expect(new PyRandom(0).randrange(10, 0, -3)).toBe(1);
  });

  it("errors", () => {
    const r = new PyRandom(0);
    expect(() => r.randrange(0)).toThrow(ValueError);
    expect(() => r.randrange(3, 3)).toThrow(ValueError);
    expect(() => r.randrange(0, 10, 0)).toThrow(ValueError);
    expect(() => r.randint(2, 1)).toThrow(ValueError);
    expect(() => r.choice([])).toThrow(expect.objectContaining({ name: "IndexError" }));
  });

  it("shuffle for seed 0", () => {
    const r = new PyRandom(0);
    const a: number[] = [];
    r.shuffle(a);
    const b = [0];
    r.shuffle(b);
    const c = Array.from({ length: 10 }, (_, i) => i);
    r.shuffle(c);
    expect(c).toEqual([7, 8, 1, 5, 3, 4, 2, 0, 9, 6]);
  });
});

describe("NpRandomState", () => {
  it("seed 0 raw outputs", () => {
    const n = new NpRandomState(0);
    expect([n.nextUint32(), n.nextUint32(), n.nextUint32()]).toEqual([
      2357136044, 2546248239, 3071714933,
    ]);
  });

  it("shuffle", () => {
    const n = new NpRandomState(0);
    const x = Array.from({ length: 10 }, (_, i) => i);
    n.shuffle(x);
    expect(x).toEqual([2, 8, 4, 9, 1, 6, 7, 3, 0, 5]);
    const n42 = new NpRandomState(42);
    const y = Array.from({ length: 10 }, (_, i) => i);
    n42.shuffle(y);
    expect(y).toEqual([8, 1, 5, 0, 7, 2, 9, 4, 3, 6]);
  });

  it("seed range", () => {
    expect(() => new NpRandomState(-1)).toThrow(ValueError);
    expect(() => new NpRandomState(4294967296)).toThrow(ValueError);
    expect(() => new NpRandomState(4294967295)).not.toThrow();
  });
});

describe("setSeed", () => {
  it("streams are independent", () => {
    setSeed(0);
    const first = rng.py.random();
    const x = [0, 1, 2, 3, 4];
    rng.np.shuffle(x);
    expect(first).toBe(0.8444218515250481);
    expect(x).toEqual([2, 0, 1, 3, 4]);
    expect(rng.py.randrange(100)).toBe(97);
  });

  it("partial seed: Py reseeded, Np unchanged, then ValueError", () => {
    setSeed(0);
    const npBefore = new NpRandomState(0);
    expect(() => setSeed(-7)).toThrow(ValueError);
    expect(rng.py.random()).toBe(0.32383276483316237);
    expect(rng.np.nextUint32()).toBe(npBefore.nextUint32());
  });

  it("null seed reseeds nothing", () => {
    setSeed(42);
    rng.py.random();
    setSeed(null);
    expect(rng.py.random()).toBe(0.025010755222666936);
  });
});
