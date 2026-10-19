/** A synchronous lock closes the gap before React renders disabled transaction controls. */
export function createSubmissionLock() {
  let locked = false;
  return {
    acquire() {
      if (locked) return false;
      locked = true;
      return true;
    },
    release() { locked = false; },
  };
}