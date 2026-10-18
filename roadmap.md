# ORVEX improvements

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
- [ ] Verify funded wallet launch, buy, sell and portfolio readback — blocked by no connected funded testnet wallet or existing factory tokens.
- [ ] Verify populated grid/table and event delivery end-to-end — blocked by the connected factory and database having zero token launches.
- [x] Obtain available database security results — remaining informational notices concern intentionally public token/trade data.
- [ ] Verify deployed contract security independently — blocked by missing contract source and no external contract audit; database scans do not audit contracts.