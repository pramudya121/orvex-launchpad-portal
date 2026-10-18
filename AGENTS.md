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

- Display-only bonding-curve estimates live in `src/lib/curve.ts`; transaction amounts and slippage use integer units and fresh deployed-contract quotes, so floating-point previews cannot weaken transaction bounds.
- Token creation, trade writes, logo uploads and signed logo URLs go through server functions against the service-role client; the database has no public INSERT/UPDATE policies, so curve math can't be faked from the client.
- Charts are built client-side by aggregating real `token_trades` rows (`buildCandles` in `src/lib/tokens.ts`); the `1m` timeframe is the live feed view.
- The active UI uses an injected wallet and deployed LitVM contracts; confirmed receipt events supply launch addresses and server indexing deduplicates trades by `(tx_hash, log_index)` so simulation races and multiple events cannot corrupt the index.
- Market lists share URL-based filters, a local watchlist provider and shared query invalidation; polling is a fallback to database Realtime, because event delivery and chain confirmation cannot be assumed instantaneous.
- Chain indexing reconciles factory entries by address and advances bounded durable event checkpoints only after successful writes, so outages cannot silently skip historical events.
- Chain indexing acquires a service-role-only expiring database lease and uses conditional curve checkpoint writes, so concurrent polling cannot regress scan progress; workers stop within a bounded execution budget.
- Pending token launch hashes and metadata survive refresh in session storage from wallet submission until successful indexing, so confirmation delays cannot cause repeat deployment fees.
- Wallet writes revalidate chain and account; DEX quotes and balances identify assets by address, validate routes and token precision before submission, so symbols and stale quotes cannot redirect trades.
- Chain reads use direct RPC calls rather than the configured multicall contract, because that address currently reverts on LiteForge.
- Indexed trades retain block number/hash and token launch block; first history scans resolve the deployment timestamp to a block so new launches never start scanning from genesis.
- Market counts, 24-hour volume and curve-trade holder estimates use the RLS-respecting token_market_stats database function, so a globally capped trade feed cannot silently change token metrics.
- Supplied deployed contract addresses and ABIs are authoritative; do not describe absent local contract sources as audited or regenerate the deployed ABI from unrelated custom contracts.
- lightweight-charts can't parse oklch()/CSS variables — chart colors are fixed sRGB constants in `PriceChart.tsx`.
