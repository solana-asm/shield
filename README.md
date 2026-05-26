# shield

Pure-sBPF-assembly transaction-precondition guards for Solana. Prepend a guard to any transaction; if its check fails, the entire transaction aborts atomically and the destination instruction never runs.

## Guards

| Guard | Status | Accounts | Instruction data | CU | Source |
|---|---|---|---|---:|---|
| `slot_deadline` | Done | 0 | `u64 max_slot` (LE) | 152 | [src](src/slot_deadline/slot_deadline.s) |
| `slippage` | Done | 1 token acct | `u64 min_amount` (LE) | 7 | [src](src/slippage/slippage.s) |
| `balance_floor` | Done | 1 | `u64 min_lamports` (LE) | 7 | [src](src/balance_floor/balance_floor.s) |
| `signer_allowlist` | todo | 1 signer | `u8 count`, `[32]u8 × count` | - | - |
| `fee_ceiling` | todo | 1 sysvar | `u64 max_micro_lamports` | - | - |
| `pyth_freshness` | todo | 1 price acct | `u64 max_age_slots` | - | - |
| `memo_audit` | todo | 0 | UTF-8 bytes | - | - |
| `nonce_guard` | todo (stateful) | 1 PDA | `[32]u8 nonce` | - | - |

## Exit codes (uniform across guards)

| `r0` | Meaning |
|---:|---|
| `0` | Success (condition held) |
| `1` | Guard condition failed |
| `2` | Malformed instruction data |
| `3` | Invalid account |

Before exiting non-zero, each guard `sol_log_`s a short message so devnet diagnostics are usable without a custom client (`"deadline missed"`, `"bad ix data"`, …).

## Build / deploy / test workflow

```bash
bun install
sbpf build
bun run deploy:local
bun run deploy:local slippage
bun run test:local
```

## slot_deadline

Attach `slot_deadline(N)` to enforce "this transaction must execute at slot ≤ N or fail." Useful for replay-protecting off-chain-signed intents. A keeper that's too late fails the transaction instead of executing at a stale state.

- Stateless, no accounts, 8 bytes of instruction data.
- Single syscall: `sol_get_clock_sysvar`.
- 152 CU on the happy path.

[assembly](src/slot_deadline/slot_deadline.s) · [tests](tests/slot_deadline.test.ts)

## slippage

Attach `slippage(min_amount)` with a token account as account 0 to enforce "the account's SPL Token `amount` must be ≥ min_amount." Compose after a swap to confirm the user received what they expected, or before to confirm input balance.

- Stateless, 1 read-only SPL Token account, 8 bytes of instruction data.
- No syscalls. Pure memory reads.
- 7 CU on the happy path.

The SPL Token `amount` field lives at byte 64 of the account data, which the aligned loader maps at `r1 + 0xA0`. Because the per-account block size depends on `data.len()`, this guard's `INSTRUCTION_DATA_LEN` is at `0x2910` (not the `0x2868` used by zero-data-account guards).

[assembly](src/slippage/slippage.s) · [tests](tests/slippage.test.ts)

## balance_floor

Attach `balance_floor(min_lamports)` with any account as account 0 to enforce "the account's lamports must be ≥ min_lamports." Useful as a rent-reserve check before triggering an action that might leave the account below the rent-exempt threshold.

- Stateless, 1 read-only account, 8 bytes of instruction data.
- No syscalls.
- 7 CU on the happy path.

[assembly](src/balance_floor/balance_floor.s) · [tests](tests/balance_floor.test.ts)

## License

[LICENSE](LICENSE)
