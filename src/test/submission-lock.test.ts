import { describe, expect, it } from "vitest";
import { createSubmissionLock } from "../lib/submission-lock";

describe("wallet submission lock", () => {
  it("rejects a duplicate before UI state updates and permits retry after release", () => {
    const lock = createSubmissionLock();
    expect(lock.acquire()).toBe(true);
    expect(lock.acquire()).toBe(false);
    lock.release();
    expect(lock.acquire()).toBe(true);
  });
});