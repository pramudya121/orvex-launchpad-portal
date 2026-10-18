import { queryOptions } from "@tanstack/react-query";
import { getPortfolio, getTokenDetail, listTokens } from "./launchpad.functions";

export const tokensQuery = () => queryOptions({ queryKey: ["tokens"], queryFn: () => listTokens(), staleTime: 10_000 });
export const tokenQuery = (symbol: string) =>
  queryOptions({ queryKey: ["token", symbol.toUpperCase()], queryFn: () => getTokenDetail({ data: { symbol } }) });
export const portfolioQuery = (address: string) =>
  queryOptions({ queryKey: ["portfolio", address.toLowerCase()], queryFn: () => getPortfolio({ data: { address } }) });
