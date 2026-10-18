/** Bound outbound work to the deployment runtime's six-connection budget. */
export async function boundedMap<T, R>(items: T[], fn: (item: T) => Promise<R>): Promise<R[]> {
  const results: R[] = [];
  for (let i = 0; i < items.length; i += 6) {
    results.push(...await Promise.all(items.slice(i, i + 6).map(fn)));
  }
  return results;
}