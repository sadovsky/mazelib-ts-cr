/** Shared types for adapter op handlers. */

export interface Case {
  id?: string;
  op: string;
  seed?: number | null;
  args?: Record<string, unknown>;
}

/** An op handler receives the case args (seeding already done) and returns the result `value`. */
export type OpHandler = (args: Record<string, unknown>, c: Case) => unknown;
