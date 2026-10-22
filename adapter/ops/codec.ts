/** JSON <-> library conversions shared by the op handlers (PROTOCOL.md encodings). */
import { Grid, type Cell } from "../../src/index.js";

export function decodeGrid(v: unknown): Grid {
  return Grid.fromStrings(v as string[]);
}

export function encodeGrid(g: Grid): string[] {
  return g.toStrings();
}

export function decodeCell(v: unknown): Cell {
  const [r, c] = v as [number, number];
  return [r, c];
}

export function decodeOptionalCell(v: unknown): Cell | null {
  return v === null || v === undefined ? null : decodeCell(v);
}

export function decodePaths(v: unknown): Cell[][] {
  return (v as [number, number][][]).map((p) => p.map(decodeCell));
}

export function encodePaths(paths: readonly (readonly Cell[])[]): [number, number][][] {
  return paths.map((p) => p.map(([r, c]) => [r, c] as [number, number]));
}

export function params(v: unknown): Record<string, unknown> {
  return (v as Record<string, unknown> | null | undefined) ?? {};
}
