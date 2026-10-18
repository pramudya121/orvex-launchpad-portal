import { queryOptions } from "@tanstack/react-query";
import { getLeaderboard, getPortfolio, getTokenDetail, listTokens } from "./launchpad.functions";

export const tokensQuery = () =>
  queryOptions({
    queryKey: ["tokens"],
    queryFn: () => listTokens(),
    staleTime: 10_000,
    refetchInterval: 15_000,
  });
export const tokenQuery = (symbol: string) =>
  queryOptions({
    queryKey: ["token", symbol.toUpperCase()],
    refetchInterval: 15_000,
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
