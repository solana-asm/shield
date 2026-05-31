# shield

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
- `fee_ceiling`: is this transaction's priority fee bid at or below N micro-lamports per CU?
- `program_allowlist`: does every other top-level instruction target a program on a caller-supplied allowlist?
- `compute_unit_floor`: does this transaction declare a `SetComputeUnitLimit` of at least N CU?

Each one is deployed to Solana as its own program with its own address. You don't install a library. You just point your transaction at the guard's program ID and pass it the numbers it needs to check.

## How It Works

1. **You build a transaction with the check in front.** Normally a transaction has one instruction (e.g. "swap A for B"). With Shield, you put a guard instruction in front: "check that I will get at least 100 tokens, then do the swap."
2. **Solana runs the steps in order.** First the guard, then your real action. If the guard says "condition met", Solana moves on to the swap. If the guard says "condition failed", Solana stops and undoes everything. Your wallet, the swap pool, every account involved goes back to how it was before the transaction started.
3. **The guard does a tiny amount of work.** It reads the number you gave it (for example, the minimum tokens you'll accept), reads the matching number from the account (the actual token balance), and compares them. If the actual number is good enough, it returns success. If not, it logs a short error like `"insufficient"` and returns failure.
4. **Why it's so cheap.** Solana hands the guard's memory to it already laid out. The guard doesn't have to ask for it, parse it, or call any helper functions. For most guards this is just a couple of memory reads and one comparison. The `slippage` guard costs 7 compute units. For reference, a Solana transaction has 1.4 million compute units to spend.
5. **No shared state.** The guards don't talk to each other and don't remember anything between transactions, so you can mix and match them freely.

Putting it together: a swap with deadline, slippage, and balance-floor protection adds about 166 compute units on top of the swap itself, and works on top of any program you didn't write and can't change.

## Try it without cloning

- **Live demo**: [shield.sbpf.dev](https://shield.sbpf.dev) builds a transaction with up to four guards, simulates against devnet or mainnet, and shows the per-guard CU cost and the abort log.
- **SDK on npm**: [`@solana-asm/shield`](https://www.npmjs.com/package/@solana-asm/shield). All guard program IDs are the same on devnet and mainnet (see below).

## Quick Start (SDK)

```bash
npm install @solana-asm/shield @solana/web3.js
```

```ts
import { Connection, PublicKey, Transaction } from "@solana/web3.js"
import { slotDeadlineIx, balanceFloorIx, feeCeilingIx } from "@solana-asm/shield"

const SLOT_DEADLINE = new PublicKey("SLDyTxMbunLA51WADZKpXNZ49mFnhsPxtZSp4Rbr4ja")
const BALANCE_FLOOR = new PublicKey("SLDwNtfXVRXuW29kMWLkvs8QX6xkdg8qjPuV6WQ25Hb")
const FEE_CEILING   = new PublicKey("SLDM7koS4UYLni15NGVoNW1DMG8ueZJmcGAA6UqMzQQ")

const slot = await connection.getSlot()

const tx = new Transaction()
tx.add(slotDeadlineIx({ programId: SLOT_DEADLINE, maxSlot: BigInt(slot + 100) }))
tx.add(balanceFloorIx({ programId: BALANCE_FLOOR, account: signer.publicKey, minLamports: 1_000_000n }))
tx.add(feeCeilingIx({ programId: FEE_CEILING, maxMicroLamports: 1_000n }))
tx.add(yourDestinationInstruction)
```

See [`sdk/README.md`](sdk/README.md) for the full API, and [`sdk/examples/`](sdk/examples/) for runnable per-guard demos.

## Guards

| Guard | Status | Accounts | Instruction data | CU | Source |
|---|---|---|---|---:|---|
| `slot_deadline` | Done | 0 | `u64 max_slot` (LE) | 152 | [src](src/slot_deadline/slot_deadline.s) |
| `slippage` | Done | 1 token acct | `u64 min_amount` (LE) | 7 | [src](src/slippage/slippage.s) |
| `balance_floor` | Done | 1 | `u64 min_lamports` (LE) | 7 | [src](src/balance_floor/balance_floor.s) |
| `signer_allowlist` | Done | 1 signer | `u8 count`, `[32]u8 × count` | 25 (N=1) | [src](src/signer_allowlist/signer_allowlist.s) |
| `fee_ceiling` | Done | 1 sysvar | `u64 max_micro_lamports` (LE) | 86 (2-ix) | [src](src/fee_ceiling/fee_ceiling.s) |
| `program_allowlist` | Done | 1 sysvar | `u8 count`, `[32]u8 × count` | 80 (N=1) | [src](src/program_allowlist/program_allowlist.s) |
| `compute_unit_floor` | Done | 1 sysvar | `u32 min_units` (LE) | 93 (3-ix) | [src](src/compute_unit_floor/compute_unit_floor.s) |

## Program IDs

Live on devnet and mainnet at the same addresses. Both clusters share the keypairs in `deploy/`, so the IDs stay constant.

| Guard | Program ID |
|---|---|
| `slot_deadline` | `SLDyTxMbunLA51WADZKpXNZ49mFnhsPxtZSp4Rbr4ja` |
| `slippage` | `SLDChznvxmWVQpGQbweD1oXK8KcaxgaCD1qyDWB3Tps` |
| `balance_floor` | `SLDwNtfXVRXuW29kMWLkvs8QX6xkdg8qjPuV6WQ25Hb` |
| `signer_allowlist` | `SLDPp75MazNodaDGQVqduNNGYYbJVYk3EKWLFppYtvh` |
| `fee_ceiling` | `SLDM7koS4UYLni15NGVoNW1DMG8ueZJmcGAA6UqMzQQ` |
| `program_allowlist` | `SLDHxogaum69jT7C8V4jV16AK7jnuQM8y8EfCJ9RGeK` |
| `compute_unit_floor` | `SLDfqR7EtW1Fgb8y8oEM6aFuho6Yccf8a3j2ebrGQEy` |

## Exit codes (uniform across guards)

| `r0` | Meaning |
|---:|---|
| `0` | Success (condition held) |
| `1` | Guard condition failed |
| `2` | Malformed instruction data |
| `3` | Invalid account |

Before exiting non-zero, each guard `sol_log_`s a short message so devnet diagnostics are usable without a custom client (`"deadline missed"`, `"bad ix data"`, `"insufficient"`, `"below floor"`, `"not allowed"`, `"fee too high"`, `"cu too low"`, `"bad account"`).

## Building from source

### Prerequisites

- [Bun](https://bun.sh) (workspace runtime, replaces npm)
- [Solana CLI](https://docs.solana.com/cli/install-solana-cli-tools) (`solana --version` ≥ 1.18). The test runner reads the keypair at `solana config get` and the deploy script shells out to `solana program deploy`.
- [`sbpf`](https://github.com/blueshift-gg/sbpf) assembler (`cargo install sbpf`). Provides `sbpf build` used to compile every `.s` to `deploy/*.so`.
- For `bun run test:local` / `deploy:local`: a running `solana-test-validator` on `127.0.0.1:8899`.
- For `bun run test:devnet` and `example:devnet`: a Solana CLI keypair with some devnet SOL (`solana airdrop 2 --url devnet`).

### Workspace commands

```bash
git clone https://github.com/solana-asm/shield && cd shield
bun install                       # install root + sdk workspace
sbpf build                        # build every .s into deploy/*.so
bun run deploy:local              # deploy all programs to a local validator
bun run deploy:local slippage     # deploy only the slippage program
bun run test:local                # mocha integration tests against the deployed programs
bun run test:local slippage       # run a single integration test file
bun run test:sdk                  # bun:test unit tests for the SDK
bun run test:sdk slippage         # run a single SDK test file
bun run example:devnet            # run every SDK example against devnet (simulate)
bun run example:devnet slippage   # run a single example
MODE=send bun run example:devnet  # actually submit the example transactions
```

`test:devnet` / `test:mainnet` and `example:local` / `example:mainnet` are also wired with the same shape. `mainnet` defaults to `MODE=simulate` unless you set `MODE=send` explicitly.

## slot_deadline

Attach `slot_deadline(N)` to enforce "this transaction must execute at slot ≤ N or fail." Useful for replay-protecting off-chain-signed intents. A keeper that's too late fails the transaction instead of executing at a stale state.

- Stateless, no accounts, 8 bytes of instruction data.
- Single syscall: `sol_get_clock_sysvar`.
- 152 CU on the happy path.

[assembly](src/slot_deadline/slot_deadline.s) · [integration test](tests/slot_deadline.test.ts) · [example](sdk/examples/slot_deadline.ts)

## slippage

Attach `slippage(min_amount)` with a token account as account 0 to enforce "the account's SPL Token `amount` must be ≥ min_amount." Compose after a swap to confirm the user received what they expected, or before to confirm input balance.

- Stateless, 1 read-only SPL Token account, 8 bytes of instruction data.
- No syscalls. Pure memory reads.
- 7 CU on the happy path.

The SPL Token `amount` field lives at byte 64 of the account data, which the aligned loader maps at `r1 + 0xA0`. Because the per-account block size depends on `data.len()`, this guard's `INSTRUCTION_DATA_LEN` is at `0x2910` (not the `0x2868` used by zero-data-account guards).

[assembly](src/slippage/slippage.s) · [integration test](tests/slippage.test.ts) · [example](sdk/examples/slippage.ts)

## balance_floor

Attach `balance_floor(min_lamports)` with any account as account 0 to enforce "the account's lamports must be ≥ min_lamports." Useful as a rent-reserve check before triggering an action that might leave the account below the rent-exempt threshold.

- Stateless, 1 read-only account, 8 bytes of instruction data.
- No syscalls.
- 7 CU on the happy path.

[assembly](src/balance_floor/balance_floor.s) · [integration test](tests/balance_floor.test.ts) · [example](sdk/examples/balance_floor.ts)

## signer_allowlist

Attach `signer_allowlist([pubkeys])` with the transaction signer as account 0 to enforce "the signer of this transaction must be one of these N pubkeys, or fail." Useful for gating keeper actions, multi-bot setups, and off-chain-signed intents (pair with `slot_deadline` to bound how long an intent stays valid).

- Stateless, 1 read-only signer account, `1 + 32*N` bytes of instruction data.
- No syscalls. Pure memory reads.
- Cost scales linearly with N: roughly `17 + 11*N` CU. 25 CU for N=1, ~50 CU for N=3.

The guard also verifies the account's on-chain `is_signer` byte equals 1 (not just trusting the SDK to set `AccountMeta.isSigner = true`). If you build the instruction from a different SDK and forget to mark the account as a signer, the program exits 3 (invalid account) rather than silently accepting any pubkey.

[assembly](src/signer_allowlist/signer_allowlist.s) · [integration test](tests/signer_allowlist.test.ts) · [example](sdk/examples/signer_allowlist.ts)

## fee_ceiling

Attach `fee_ceiling(max_micro_lamports)` with the Instructions sysvar as account 0 to enforce "no `ComputeBudget` `SetComputeUnitPrice` in this transaction exceeds the ceiling." Useful for keeper bots and agent flows that want a hard cap on priority fee bidding so a misconfigured client can't quietly burn tens of dollars on a tx that should cost a fraction of a cent.

- Stateless, 1 read-only sysvar account (`Sysvar1nstructions1111111111111111111111111`), 8 bytes of instruction data.
- No syscalls. Walks the Instructions sysvar's serialized data to find every `ComputeBudget` instruction and compares any `SetComputeUnitPrice` against the ceiling.
- 86 CU on a 2-instruction tx (limit + guard, no match); scales linearly with `num_instructions` and adds ~30 CU per `SetComputeUnitPrice` match in the loop.

Unlike the other guards, the Instructions sysvar's per-account input region is bounded at `0x60 + data_len` with no realloc padding and no accessible `rent_epoch`. The guard reads its own `max_micro_lamports` from inside the sysvar's serialization (via the trailing `current_instruction_index` and the offsets table) rather than from the standard input layout that `slippage` and `signer_allowlist` use.

[assembly](src/fee_ceiling/fee_ceiling.s) · [integration test](tests/fee_ceiling.test.ts) · [example](sdk/examples/fee_ceiling.ts)

## program_allowlist

Attach `program_allowlist([pubkeys])` with the Instructions sysvar as account 0 to enforce "every other top-level instruction in this transaction targets a program on this allowlist, or fail." Useful for hardening keeper bots and agent flows so a compromised or misconfigured client cannot redirect the transaction to a program the operator never intended.

- Stateless, 1 read-only sysvar account (`Sysvar1nstructions1111111111111111111111111`), `1 + 32*N` bytes of instruction data.
- No syscalls. Walks the Instructions sysvar's offsets table and compares each top-level ix's 32-byte program_id against the allowlist with an unrolled 4× u64 compare.
- 80 CU on the minimal happy path (`[guard, one dest ix]`, N=1). Scales roughly with `num_top_level_ix * average_allowlist_position`.

**Implicit self-skip, everything else is explicit.** The guard's own instruction is excluded from the check, so this program does not need to be in the allowlist. Every OTHER top-level ix in the transaction is checked, including `ComputeBudget` (`SetComputeUnitLimit`, `SetComputeUnitPrice`) and any other Shield guards you compose with. If the transaction sets a CU limit, allowlist `ComputeBudget111111111111111111111111111111` too, or the guard exits `1` ("not allowed") at that ix. The composition integration test (`tests/program_allowlist.test.ts`) demonstrates the realistic pattern.

[assembly](src/program_allowlist/program_allowlist.s) · [integration test](tests/program_allowlist.test.ts)

## compute_unit_floor

Attach `compute_unit_floor(min_units)` with the Instructions sysvar as account 0 to enforce "this transaction must declare a `ComputeBudget` `SetComputeUnitLimit` of at least N CU, or fail." Useful for keeper bots and agent flows that want a guaranteed minimum compute budget even when the client forgets to set one or under-allocates, preventing partial execution and surprise `"Computational budget exceeded"` aborts mid-tx.

- Stateless, 1 read-only sysvar account (`Sysvar1nstructions1111111111111111111111111`), 4 bytes of instruction data (`u32 min_units` LE).
- No syscalls. Walks the Instructions sysvar's offsets table to find every `ComputeBudget` `SetComputeUnitLimit` (disc 2, 5-byte ix data) and compares its u32 units against the floor.
- 93 CU on a 3-instruction tx (limit + guard + destination); scales linearly with `num_instructions`.

**Strict presence requirement.** The guard exits `1` (`"cu too low"`) if no `SetComputeUnitLimit` is present at all, not only when the value is below floor. Solana's runtime would otherwise apply a default per-ix CU budget in that case; this guard treats explicit allocation as part of the contract. The boundary is non-strict: `units == min_units` passes (`jlt` is strict less-than).

[assembly](src/compute_unit_floor/compute_unit_floor.s) · [integration test](tests/compute_unit_floor.test.ts) · [example](sdk/examples/compute_unit_floor.ts)

## Repo layout

```
src/                  guard programs, one folder per guard (*.s)
deploy/               compiled *.so and program keypairs
tests/                mocha integration tests against deployed programs
sdk/                  @solana-asm/shield TypeScript client
  src/                builders, errors, util
  test/               offline bun:test unit tests
  examples/           runnable per-guard demos
dashboard/            next.js app served at shield.sbpf.dev
scripts/              deploy.sh, test.sh, test-sdk.sh, example.sh
```

## Contributing

New guards follow the pattern in `src/<name>/<name>.s`: keep it stateless when possible, match the uniform exit codes, log a short message before any non-zero exit. Add a matching folder in `sdk/src/`, a `bun:test` unit test in `sdk/test/`, a runnable example in `sdk/examples/`, and an entry in the Guards table above. Open a PR against `main`.

## License

[MIT](LICENSE)
