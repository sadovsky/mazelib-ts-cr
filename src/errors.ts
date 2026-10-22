/**
 * Error classes whose `name` maps 1:1 to the Python exception kind reported
 * by the adapter protocol. (JS's built-in `TypeError` already has the right
 * name, so it is used directly where a Python TypeError is meant.)
 */

export class AssertionError extends Error {
  constructor(message = "") {
    super(message);
    this.name = "AssertionError";
  }
}

export class ValueError extends Error {
  constructor(message = "") {
    super(message);
    this.name = "ValueError";
  }
}

export class IndexError extends Error {
  constructor(message = "") {
    super(message);
    this.name = "IndexError";
  }
}

export class NotImplementedError extends Error {
  constructor(message = "") {
    super(message);
    this.name = "NotImplementedError";
  }
}
