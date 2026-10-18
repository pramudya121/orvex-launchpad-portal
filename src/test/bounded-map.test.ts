import { expect, it } from "vitest";
import { boundedMap } from "@/lib/bounded-map";

it("limits concurrent chain reads to six while retaining order and all results", async () => {
  let active = 0;
  let peak = 0;
  const result = await boundedMap(Array.from({ length: 25 }, (_, i) => i), async (i) => {
    active++;
    peak = Math.max(peak, active);
    await new Promise((resolve) => setTimeout(resolve, 1));
    active--;
    return i * 2;
  });
  expect(peak).toBe(6);
  expect(result).toEqual(Array.from({ length: 25 }, (_, i) => i * 2));
});