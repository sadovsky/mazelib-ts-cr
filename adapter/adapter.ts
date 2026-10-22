/**
 * Goldens adapter: reads JSON-line cases on stdin, writes one JSON result line
 * per case to stdout, in order. See the goldens PROTOCOL.md.
 */
import { setSeed } from "../src/index.js";
import { ops } from "./ops/registry.js";
import type { Case } from "./ops/types.js";

function errorKind(e: unknown): string {
  if (e instanceof Error) {
    if (e.name && e.name !== "Error") return e.name;
    return e.constructor?.name || "Error";
  }
  return "Exception";
}

function runCase(c: Case): unknown {
  try {
    if (c.seed !== undefined && c.seed !== null) setSeed(c.seed);
    const handler = Object.prototype.hasOwnProperty.call(ops, c.op) ? ops[c.op] : undefined;
    if (!handler) {
      return { ok: false, error: { kind: "NotImplementedError", message: `op ${c.op} not implemented` } };
    }
    const value = handler(c.args ?? {}, c);
    return { ok: true, value };
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return { ok: false, error: { kind: errorKind(e), message } };
  }
}

function main(input: string): void {
  const lines = input.split("\n");
  const out: string[] = [];
  for (const line of lines) {
    if (line.trim() === "") continue;
    let c: Case;
    try {
      c = JSON.parse(line) as Case;
    } catch (e) {
      out.push(JSON.stringify({ ok: false, error: { kind: "ValueError", message: `bad JSON: ${String(e)}` } }));
      continue;
    }
    out.push(JSON.stringify(runCase(c)));
  }
  process.stdout.write(out.length ? out.join("\n") + "\n" : "");
}

let buf = "";
process.stdin.setEncoding("utf8");
process.stdin.on("data", (chunk) => {
  buf += chunk;
});
process.stdin.on("end", () => main(buf));
