/** Finds the first block at/after a factory launch timestamp without scanning from genesis. */
export async function findLaunchBlock(
  timestamp: bigint,
  latest: bigint,
  readTimestamp: (block: bigint) => Promise<bigint>,
): Promise<bigint> {
  let low = 0n;
  let high = latest;
  while (low < high) {
    const middle = (low + high) / 2n;
    if (await readTimestamp(middle) < timestamp) low = middle + 1n;
    else high = middle;
  }
  return low;
}

export function scanWindow(checkpoint: bigint, launch: bigint, latest: bigint, size = 9_000n) {
  const from = checkpoint > launch ? checkpoint : launch;
  if (from > latest) return null;
  return { from, end: from + size < latest ? from + size : latest };
}

/** Rotate a bounded discovery page so neither old entries nor concurrent launches starve. */
export function factoryDiscoveryPage(cursor: number, total: number, size = 12) {
  const start = cursor >= total ? 0 : Math.max(0, cursor);
  const end = Math.min(total, start + size);
  return { indexes: Array.from({ length: Math.max(0, end - start) }, (_, i) => start + i), next: end >= total ? 0 : end };
}