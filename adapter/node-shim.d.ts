// Minimal ambient declarations for the few Node APIs the adapter uses,
// so the project needs no @types/node dev dependency.
declare const process: {
  stdin: {
    setEncoding(enc: string): void;
    on(event: "data", cb: (chunk: string) => void): void;
    on(event: "end", cb: () => void): void;
  };
  stdout: { write(s: string): boolean };
  stderr: { write(s: string): boolean };
  exitCode: number | undefined;
};
