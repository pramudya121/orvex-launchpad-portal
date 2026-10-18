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

- Database migration history is project-local; after remix, start from an empty baseline managed by the migration tool rather than replaying the source project's migrations, so copied schema and seed changes cannot run against the new database.

- Bonding-curve math lives only in `src/lib/curve.ts` (pure) and is executed only inside the `trade`/`createToken` server functions in `src/lib/launchpad.functions.ts`. Trades apply reserves with an optimistic-concurrency update on `tokens_sold` (retry ×3) so parallel buys can't double-spend the curve; the browser only ever shows quotes.
- Token creation, trade writes, logo uploads and signed logo URLs go through server functions against the service-role client; the database has no public INSERT/UPDATE policies, so curve math can't be faked from the client.
- Charts are built client-side by aggregating real `token_trades` rows (`buildCandles` in `src/lib/tokens.ts`); the `1m` timeframe is the live feed view.
- The active UI uses an injected wallet and deployed LitVM contracts; confirmed receipt events supply launch addresses and server indexing deduplicates trades by `(tx_hash, log_index)` so simulation races and multiple events cannot corrupt the index.
- Market lists share URL-based filters, a local watchlist provider and shared query invalidation; polling is a fallback to database Realtime, because event delivery and chain confirmation cannot be assumed instantaneous.
- Chain indexing reconciles factory entries by address and advances bounded durable event checkpoints only after successful writes, so outages cannot silently skip historical events.
- Chain reads use direct RPC calls rather than the configured multicall contract, because that address currently reverts on LiteForge.
- Contracts live in `contracts/*.sol` and must mirror `src/lib/curve.ts` constants; `src/lib/web3/abi.ts` and `bytecode.ts` are generated from them with solc 0.8.24 — regenerate after any contract edit.
- lightweight-charts can't parse oklch()/CSS variables — chart colors are fixed sRGB constants in `PriceChart.tsx`.
