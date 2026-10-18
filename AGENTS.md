<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

# ORVEX — architecture rules

- Bonding-curve math lives only in `src/lib/curve.ts` (pure) and is executed only inside the `trade`/`createToken` server functions in `src/lib/launchpad.functions.ts`. Trades apply reserves with an optimistic-concurrency update on `tokens_sold` (retry ×3) so parallel buys can't double-spend the curve; the browser only ever shows quotes.
- Token creation, trade writes, logo uploads and signed logo URLs go through server functions against the service-role client; the database has no public INSERT/UPDATE policies, so curve math can't be faked from the client.
- Charts are built client-side by aggregating real `token_trades` rows (`buildCandles` in `src/lib/tokens.ts`); the `1m` timeframe is the live feed view.
- Two modes: if `VITE_ORVEX_LAUNCHPAD` is set and an injected EIP-1193 wallet is connected, trades/launches are contract calls (`src/lib/web3/actions.ts`) and the server `indexTx` mirrors decoded events into the DB (chain is source of truth, deduped by unique `tx_hash`); otherwise the demo wallet (localStorage `orvex-demo-wallet*`) uses the off-chain server curve.
- Contracts live in `contracts/*.sol` and must mirror `src/lib/curve.ts` constants; `src/lib/web3/abi.ts` and `bytecode.ts` are generated from them with solc 0.8.24 — regenerate after any contract edit.
- lightweight-charts can't parse oklch()/CSS variables — chart colors are fixed sRGB constants in `PriceChart.tsx`.
