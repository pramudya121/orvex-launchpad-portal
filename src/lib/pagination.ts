export const TOKEN_PAGE_SIZE = 24;
export const POOL_PAGE_SIZE = 10;
export function pageWindow(offset: number, total: number, size: number) {
  if (![offset, total, size].every(Number.isSafeInteger) || offset < 0 || total < 0 || size < 1)
    throw new Error("Invalid page window");
  return Array.from({ length: Math.max(0, Math.min(size, total - offset)) }, (_, i) => offset + i);
}