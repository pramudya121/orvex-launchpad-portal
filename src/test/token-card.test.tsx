import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";

// The card links to the token page; render links as plain anchors so the test
// does not need a live router.
vi.mock("@tanstack/react-router", async () => {
  const React = await import("react");
  return {
    Link: ({ children, ...props }: { children?: ReactNode }) =>
      React.createElement("a", props, children),
  };
});

import { TokenCard } from "@/components/orvex/TokenCard";
import type { TokenView } from "@/lib/launchpad.functions";

const token: TokenView = {
  id: "11111111-1111-4111-8111-111111111111",
  address: "0x1234567890abcdef1234567890abcdef12345678",
  curveAddress: null,
  pairAddress: null,
  name: "Rocket Puffer",
  symbol: "RPF",
  description: "",
  logoUrl: null,
  creator: "0xabcdefabcdefabcdefabcdefabcdefabcdefabcd",
  createdAt: new Date(Date.now() - 3_600_000).toISOString(),
  twitter: null,
  telegram: null,
  website: null,
  price: 0.0000049,
  priceUsd: 0.00042,
  marketCapUsd: 8390,
  progress: 12.5,
  realBase: 8.39,
  graduated: false,
  maxBuy: null,
  change24h: 3.25,
  volume24hUsd: 8.5,
  trades24h: 4,
  holders: 2,
  reserves: {
    virtualBase: 100,
    virtualToken: 1_000_000,
    tokensSold: 100_000,
    realBase: 8.39,
    saleSupply: 800_000_000,
    totalSupply: 1_000_000_000,
    feeBps: 100,
  },
};

describe("Token card", () => {
  it("shows price, market cap and curve progress but no raised or 24h volume row", () => {
    render(<TokenCard t={token} />);

    expect(screen.getByText("Rocket Puffer")).toBeTruthy();
    expect(screen.getByText("$0.000420")).toBeTruthy();
    expect(screen.getByText("$8.4K MC")).toBeTruthy();
    expect(screen.getByText("12.5%")).toBeTruthy();

    // The removed block showed "RAISED $8.39" and "VOL 24H $8.50".
    expect(screen.queryByText(/raised/i)).toBeNull();
    expect(screen.queryByText(/vol 24h/i)).toBeNull();
    expect(screen.queryByText("$8.50")).toBeNull();
  });
});
