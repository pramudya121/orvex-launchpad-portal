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

- Remix migrations start with a tool-managed empty baseline; never replay copied history against the new database.
- Router hydration transfers the request-scoped Query cache so initial market rows match server rendering.

- Display-only bonding-curve estimates live in `src/lib/curve.ts`; transaction amounts and slippage use integer units and fresh deployed-contract quotes, so floating-point previews cannot weaken transaction bounds.
- Token trade forms read native and ERC20 balances directly with account/chain/asset-scoped queries and exact integer sell presets, so portfolio indexing and rounding cannot misstate spendable funds.
- Token creation, trade writes, logo uploads and signed logo URLs go through server functions against the service-role client; the database has no public INSERT/UPDATE policies, so curve math can't be faked from the client.
- Charts are built client-side by aggregating real `token_trades` rows (`buildCandles` in `src/lib/tokens.ts`); the `1m` timeframe is the live feed view.
- The active UI uses an injected wallet and deployed LitVM contracts; confirmed receipt events supply launch addresses and server indexing deduplicates trades by `(tx_hash, log_index)` so simulation races and multiple events cannot corrupt the index.
- Market lists share URL-based filters, a local watchlist provider and shared query invalidation; polling is a fallback to database Realtime, because event delivery and chain confirmation cannot be assumed instantaneous.
- Chain indexing reconciles factory entries by address and advances bounded durable event checkpoints only after successful writes, so outages cannot silently skip historical events.
- Chain indexing acquires a service-role-only expiring database lease and uses conditional curve checkpoint writes, so concurrent polling cannot regress scan progress; workers stop within a bounded execution budget.
- Public market reads serve indexed state without waiting for global chain scans; an authenticated managed schedule owns bounded synchronization so visitor traffic cannot amplify RPC scanning.
- Factory discovery uses a durable rotating cursor and curve scans prioritize the oldest checkpoint with bounded direct RPC reads, so large launch counts cannot starve later tokens.
- Wallet transaction entry points use synchronous submission locks in addition to disabled controls, so rapid repeated clicks cannot submit duplicate transactions.
- Pending token launch hashes and metadata survive refresh in session storage from wallet submission until successful indexing, so confirmation delays cannot cause repeat deployment fees.
- Wallet writes revalidate chain and account; DEX quotes and balances identify assets by address, validate routes and token precision before submission, so symbols and stale quotes cannot redirect trades.
- Chain reads use direct RPC calls rather than the configured multicall contract, because that address currently reverts on LiteForge.
- Indexed trades retain block number/hash and token launch block; first history scans resolve the deployment timestamp to a block so new launches never start scanning from genesis.
- Market counts, 24-hour volume and curve-trade holder estimates use the RLS-respecting token_market_stats database function, so a globally capped trade feed cannot silently change token metrics.
- Supplied deployed contract addresses and ABIs are authoritative; do not describe absent local contract sources as audited or regenerate the deployed ABI from unrelated custom contracts.
- lightweight-charts can't parse oklch()/CSS variables — chart colors are fixed sRGB constants in `PriceChart.tsx`.
- Admin navigation and console share a fail-closed live FeeManager owner query; this is a presentation gate only, while the deployed contract remains the authority for privileged transactions.
- Market pages reuse MarketHeading and MarketStats for consistent hierarchy without adding extra network requests.
- Lifetime market windows use the RLS-respecting token_market_all_stats RPC, not a capped browser trade feed, to keep All metrics consistent across grid and table.
- Portfolio chain balance reads use the shared six-slot bounded mapper to respect deployed outbound concurrency while preserving result order.
- Create allocation information reads deployed bonding-curve constants and derives percentages, so presentation stays aligned with contract supply.
- DEX separates Swap, Liquidity positions and Pools with design-system tabs; positions read actual LP balances, not inferred swap holdings.
- Explore and DEX token selectors use cursor token pages; factory pools use bounded incremental index pages to avoid unbounded reads.
- Logo size and image signatures are validated server-side before storage; the same byte limit is enforced at file selection and bucket level.
- DEX liquidity uses integer reserve-ratio quotes, exact approvals, simulation and receipt confirmation; submitted liquidity hashes survive refresh to prevent duplicate submission.
