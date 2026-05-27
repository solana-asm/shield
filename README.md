# shield

Pure-sBPF-assembly transaction-precondition guards for Solana. Prepend a guard to any transaction; if its check fails, the entire transaction aborts atomically and the destination instruction never runs.

## One Liner

Small on-chain safety checks you attach to a Solana transaction. If the check fails, the whole transaction is cancelled.

## Core Idea

Most Solana actions have "what if" worries attached to them. What if the swap pays out way less than I expected? What if my keeper bot runs too late? What if this transfer drains my account below rent? Today, you either trust the program you're calling to check these things, or you skip the check.

Shield gives you a third option. Each "what if" becomes its own tiny program. You stick the check in front of your real action in the same transaction. Solana already has a rule: if any step of a transaction fails, the whole transaction is thrown out. So if the check says "no", the swap (or transfer, or mint, or whatever) never happens. No partial progress, no cleanup, no risk.

The checks are written in raw Solana machine code instead of a framework, so they are small (a few hundred bytes) and fast (often under 10 units of compute, which is roughly nothing).

## What It Is

A set of single-purpose Solana programs. Each one answers one yes/no question:

- `slot_deadline`: is it still early enough for this transaction to be valid?
- `slippage`: does this token account hold at least N tokens?
- `balance_floor`: does this account hold at least N lamports (SOL)?
- More planned (signer allowlist, fee ceiling, Pyth price freshness, memo audit, replay protection). See the Guards table below.

Each one is deployed to Solana as its own program with its own address. You don't install a library. You just point your transaction at the guard's program ID and pass it the numbers it needs to check.

## How It Works

1. **You build a transaction with the check in front.** Normally a transaction has one instruction (e.g. "swap A for B"). With Shield, you put a guard instruction in front: "check that I will get at least 100 tokens, then do the swap."
2. **Solana runs the steps in order.** First the guard, then your real action. If the guard says "condition met", Solana moves on to the swap. If the guard says "condition failed", Solana stops and undoes everything. Your wallet, the swap pool, every account involved goes back to how it was before the transaction started.
3. **The guard does a tiny amount of work.** It reads the number you gave it (for example, the minimum tokens you'll accept), reads the matching number from the account (the actual token balance), and compares them. If the actual number is good enough, it returns success. If not, it logs a short error like `"slippage exceeded"` and returns failure.
4. **Why it's so cheap.** Solana hands the guard's memory to it already laid out. The guard doesn't have to ask for it, parse it, or call any helper functions. For most guards this is just a couple of memory reads and one comparison. The `slippage` guard costs 7 compute units. For reference, a Solana transaction has 1.4 million compute units to spend.
5. **No shared state.** The guards don't talk to each other and don't remember anything between transactions (one exception: `nonce_guard`, which uses a tiny on-chain record to prevent replays). This means you can mix and match them freely.

Putting it together: a swap with deadline, slippage, and balance-floor protection adds about 166 compute units on top of the swap itself, and works on top of any program you didn't write and can't change.

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
