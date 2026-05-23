# shield

Pure-sBPF-assembly transaction-precondition guards for Solana. Prepend a guard to any transaction; if its check fails, the entire transaction aborts atomically and the destination instruction never runs.

## Guards

| Guard | Status | Accounts | Instruction data | Source |
|---|---|---|---|---|
| `slot_deadline` | ✅ built | 0 | `u64 max_slot` (LE) | [Source](src/slot_deadline/slot_deadline.s) |
| `slippage` | todo | 1 token acct | `u64 min_amount` | — |
| `balance_floor` | todo | 1 | `u64 min_lamports` | — |
| `signer_allowlist` | todo | 1 signer | `u8 count`, `[32]u8 × count` | — |
| `fee_ceiling` | todo | 1 sysvar | `u64 max_micro_lamports` | — |
| `pyth_freshness` | todo | 1 price acct | `u64 max_age_slots` | — |
| `memo_audit` | todo | 0 | UTF-8 bytes | — |
| `nonce_guard` | todo (stateful) | 1 PDA | `[32]u8 nonce` | — |

## Exit codes (uniform across guards)

| `r0` | Meaning |
|---:|---|
| `0` | Success — condition held |
| `1` | Guard condition failed |
| `2` | Malformed instruction data |
| `3` | Invalid account |

Before exiting non-zero, each guard `sol_log_`s a short message so devnet diagnostics are usable without a custom client (`"deadline missed"`, `"bad ix data"`, …).

## Build / test workflow

```bash
sbpf build
sbpf deploy
bun install
bun run test
```

`bun run test` expects a local validator with the guard program already deployed. The script reads your Solana CLI keypair from `solana config get` and passes it via the `SIGNER` env var.

## slot_deadline

A signer can attach `slot_deadline(N)` to any transaction to enforce "this transaction must execute at slot ≤ N or fail." Useful for replay-protecting off-chain-signed intents — a keeper that's too late just fails the transaction instead of executing at a stale state.

- **Stateless**, no accounts, 8 bytes of instruction data.
- ~100 bytes of code (1.4 KB ELF including headers).
- Single syscall: `sol_get_clock_sysvar`.
- Three exit paths, each ending in an explicit `mov64 r0, N; exit`.

See the [assembly](src/slot_deadline/slot_deadline.s) and the [tests](tests/slot_deadline.test.ts) covering success, deadline-missed, and malformed-input.

## License

[MIT](LICENSE)
