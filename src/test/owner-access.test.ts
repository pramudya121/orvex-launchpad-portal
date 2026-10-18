import { describe, expect, it } from "vitest";
import { isFeeManagerOwner } from "@/lib/owner-access";

const owner = "0x1234567890abcdef1234567890abcdef12345678";
describe("private FeeManager access", () => {
  it("denies disconnected wallets", () => expect(isFeeManagerOwner(null, owner)).toBe(false));
  it("denies a different connected wallet", () => expect(isFeeManagerOwner("0x0000000000000000000000000000000000000001", owner)).toBe(false));
  it("accepts only the current contract owner regardless of case", () => expect(isFeeManagerOwner("0x1234567890ABCDEF1234567890ABCDEF12345678", owner)).toBe(true));
  it("denies access while ownership is unknown", () => expect(isFeeManagerOwner(owner, undefined)).toBe(false));
  it("rejects invalid wallet identifiers", () => expect(isFeeManagerOwner("owner", "owner")).toBe(false));
});