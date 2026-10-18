# ORVEX improvements

- [ ] Remove Explore Window label and emphasize market cap on token cards.
- [ ] Separate DEX Swap/Liquidity/Pools navigation and add uploaded ORVX logo.
- [ ] Move Create logo upload to top and show contract supply allocations.
- [ ] Inspect and improve database performance and integrity; verify public flows and document remaining scale blockers.

- [x] Add Explore Window All/24H/7D with matching real statistics and window sorting tests.
- [x] Save the supplied ITACHI logo and verify it displays on cards and token details.
- [x] Add subtle reduced-motion-aware Home animations and refine DEX pools; verify search, pool selection, live reserves and mobile layouts.

- [x] Restrict Admin content and navigation to the connected FeeManager owner; test owner/non-owner eligibility and disconnected direct access.
- [x] Refresh Trending, Leaderboard and Portfolio; verify 24H/7D, ranking tabs/search, public portfolio balances and activity, and mobile layouts.
- [ ] Verify Admin console with a real owner wallet — blocked by no connected signing owner wallet.

- [x] Harden pending-launch recovery across refresh, verify wallet chain/account, protect integer transaction limits and DEX address-based quotes; add regression tests.
- [x] Serialize chain synchronization with private durable leases and conditional checkpoints.
- [x] Run database and dependency scans; restrict indexing state to the indexer and update vulnerable packages (production dependency rescan clear).

- [x] Use uploaded ORVEX logo in the website header and favicon.
- [x] Add launch/trade block provenance, genesis-free first scans, explicit database error handling and database market aggregates; verify public RPC and 15 tests.

- [x] Check database coverage; add event-level trade indexing and Realtime publication; fix reverting multicall reads.
- [x] Compact Explore grid/table with matching filters, watchlist and Buy/Sell navigation.
- [x] Upgrade Home and Trending market presentation.
- [x] Upgrade Create, Leaderboard, DEX and Portfolio usability and error states.
- [x] Verify seven public pages, Create validation, URL filters, real DEX quotes, mobile layout and eleven tests.
- [x] Keep the raised/24h-volume row out of the token card and shorten the card (4:3 artwork, tighter rows, 165px grid columns); lock it with a render test.
- [ ] Verify funded wallet launch, buy and sell — blocked by no connected funded signing testnet wallet; public portfolio readback verified separately.
- [ ] Verify live event delivery after a new transaction — blocked by no connected funded signing testnet wallet; populated market display verified separately.
- [x] Obtain available database security results — remaining informational notices concern intentionally public token/trade data.
- [ ] Verify deployed contract security independently — blocked by missing contract source and no external contract audit; database scans do not audit contracts.