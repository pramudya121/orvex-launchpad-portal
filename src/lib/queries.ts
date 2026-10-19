import { infiniteQueryOptions, queryOptions } from "@tanstack/react-query";
import { getLeaderboard, getPortfolio, getTokenDetail, listTokens, listTokenPage, listLiveTrades } from "./launchpad.functions";

export const tokenPagesQuery = (q = "", stage: "all" | "curve" | "graduated" | "favorites" = "all", favorites: string[] = []) => infiniteQueryOptions({
  queryKey: ["tokens", "pages", q, stage, favorites],
  initialPageParam: null as { createdAt: string; id: string } | null,
  queryFn: ({ pageParam }) => listTokenPage({ data: { cursor: pageParam, q, stage, favorites } }),
  getNextPageParam: (page) => page.nextCursor ?? undefined,
  staleTime: 30_000,
  refetchInterval: 60_000,
});

export const tokensQuery = () =>
  queryOptions({
    queryKey: ["tokens"],
    queryFn: () => listTokens(),
    staleTime: 10_000,
    refetchInterval: 60_000,
  });
export const tokenQuery = (symbol: string) =>
  queryOptions({
    queryKey: ["token", symbol.toUpperCase()],
    refetchInterval: 30_000,
    queryFn: () => getTokenDetail({ data: { symbol } }),
  });
export const portfolioQuery = (address: string) =>
  queryOptions({
    queryKey: ["portfolio", address.toLowerCase()],
    refetchInterval: 30_000,
    queryFn: () => getPortfolio({ data: { address } }),
  });
export const leaderboardQuery = () =>
  queryOptions({
    queryKey: ["leaderboard"],
    queryFn: () => getLeaderboard(),
    staleTime: 15_000,
    refetchInterval: 30_000,
  });

export const liveTradesQuery = () =>
  queryOptions({
    queryKey: ["live-trades"],
    queryFn: () => listLiveTrades(),
    staleTime: 10_000,
    refetchInterval: 30_000,
  });
