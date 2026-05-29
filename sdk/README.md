# @solana-asm/shield

TypeScript builders for [Shield](../README.md) transaction guards. Each function returns a `TransactionInstruction` you prepend to your transaction. If a guard's check fails, Solana aborts the whole transaction atomically.

## Install

```bash
npm install @solana-asm/shield @solana/web3.js
```

`@solana/web3.js` is a peer dependency. The package is tree-shakeable; importing one guard does not pull in the others.

## Quick Start

```ts
import { Connection, Keypair, PublicKey, Transaction } from "@solana/web3.js"
import {
    slotDeadlineIx,
    slippageIx,
    balanceFloorIx,
    feeCeilingIx,
} from "@solana-asm/shield"

const SLOT_DEADLINE = new PublicKey("SLDyTxMbunLA51WADZKpXNZ49mFnhsPxtZSp4Rbr4ja")
const SLIPPAGE      = new PublicKey("SLDChznvxmWVQpGQbweD1oXK8KcaxgaCD1qyDWB3Tps")
const BALANCE_FLOOR = new PublicKey("SLDwNtfXVRXuW29kMWLkvs8QX6xkdg8qjPuV6WQ25Hb")
const FEE_CEILING   = new PublicKey("SLDM7koS4UYLni15NGVoNW1DMG8ueZJmcGAA6UqMzQQ")

const connection = new Connection("https://api.devnet.solana.com")
const slot = await connection.getSlot()
const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash()

const tx = new Transaction({ feePayer: signer.publicKey, blockhash, lastValidBlockHeight })

tx.add(slotDeadlineIx({ programId: SLOT_DEADLINE, maxSlot: BigInt(slot + 100) }))
tx.add(slippageIx({ programId: SLIPPAGE, tokenAccount, minAmount: 1_000_000n }))
tx.add(balanceFloorIx({ programId: BALANCE_FLOOR, account: signer.publicKey, minLamports: 1_000n }))
tx.add(feeCeilingIx({ programId: FEE_CEILING, maxMicroLamports: 1_000n }))
tx.add(yourDestinationInstruction)
```

## API

### `slotDeadlineIx({ programId, maxSlot })`

Transaction fails if the current slot is past `maxSlot`. No accounts.

```ts
slotDeadlineIx({
    programId: SLOT_DEADLINE,
    maxSlot: 200_000_100n, // bigint or number
})
```

### `slippageIx({ programId, tokenAccount, minAmount })`

Transaction fails if `tokenAccount.amount` is less than `minAmount`. `tokenAccount` must be an SPL Token account.

```ts
slippageIx({
    programId: SLIPPAGE,
    tokenAccount: userUsdcAta,
    minAmount: 1_000_000n,
})
```

### `balanceFloorIx({ programId, account, minLamports })`

Transaction fails if `account.lamports` is less than `minLamports`. Works for any account, not just the signer.

```ts
balanceFloorIx({
    programId: BALANCE_FLOOR,
    account: signer.publicKey,
    minLamports: 5_000_000n,
})
```

### `signerAllowlistIx({ programId, signer, allowed })`

Transaction fails unless the signer's pubkey is in `allowed`. The on-chain program also verifies the account's `is_signer` byte (defense in depth), so the `AccountMeta` is always built with `isSigner: true`.

```ts
signerAllowlistIx({
    programId: SIGNER_ALLOWLIST,
    signer: keeper.publicKey,
    allowed: [keeperA.publicKey, keeperB.publicKey, keeperC.publicKey],
})
```

Cost scales linearly with the list size: roughly `17 + 11*N` CU. `allowed` is capped at 255 entries (`count` is a `u8`); in practice the transaction-size limit bites first around N=38. Throws `RangeError` if you pass more than 255 entries.

### `feeCeilingIx({ programId, maxMicroLamports })`

Transaction fails if any `ComputeBudget` `SetComputeUnitPrice` instruction in the same tx exceeds `maxMicroLamports` per CU. The Instructions sysvar account is wired internally, so the caller passes only the threshold.

```ts
feeCeilingIx({
    programId: FEE_CEILING,
    maxMicroLamports: 1_000n, // micro-lamports per CU
})
```

Useful for capping priority fee bids on keeper / agent transactions so a misconfigured client can't quietly burn an order of magnitude more than intended. Pair with `ComputeBudgetProgram.setComputeUnitPrice` from `@solana/web3.js` to set the actual fee. Throws `RangeError` if `maxMicroLamports` is negative or exceeds `u64`.

The guard walks every instruction in the sysvar's serialized data, so cost scales with `num_instructions` in the tx (~150 CU on a typical 3-4 ix transaction).

## Reading errors

Each guard logs a short string and exits with a numeric code before failing. Parse a failed transaction's logs:

```ts
import { GuardExitCode, parseGuardError } from "@solana-asm/shield"

const { value } = await connection.simulateTransaction(tx)
if (value.err) {
    const parsed = parseGuardError(value.logs ?? [])
    if (parsed?.code === GuardExitCode.ConditionFailed) {
        // user's slippage / deadline / balance check failed
    }
}
```

| Code | Name | Meaning |
|---:|---|---|
| `0` | `Success` | Condition held |
| `1` | `ConditionFailed` | The guard's check returned false |
| `2` | `BadInstructionData` | Instruction data was not exactly 8 bytes |
| `3` | `InvalidAccount` | Required account was missing or wrong type |

## Program IDs

Live on devnet and mainnet at the same addresses.

| Guard | Program ID |
|---|---|
| `slot_deadline` | `SLDyTxMbunLA51WADZKpXNZ49mFnhsPxtZSp4Rbr4ja` |
| `slippage` | `SLDChznvxmWVQpGQbweD1oXK8KcaxgaCD1qyDWB3Tps` |
| `balance_floor` | `SLDwNtfXVRXuW29kMWLkvs8QX6xkdg8qjPuV6WQ25Hb` |
| `signer_allowlist` | `SLDPp75MazNodaDGQVqduNNGYYbJVYk3EKWLFppYtvh` |
| `fee_ceiling` | `SLDM7koS4UYLni15NGVoNW1DMG8ueZJmcGAA6UqMzQQ` |

## Examples

Runnable per-guard demos live in [`examples/`](examples). They share signer / RPC / explorer plumbing through `examples/_shared.ts`.

```bash
bun run example:devnet              # run every example
bun run example:devnet slippage     # run one example
MODE=send bun run example:devnet    # actually submit (default is simulate)
```

## Roadmap

Additional guards on the roadmap (see the [main Guards table](../README.md#guards)): `compute_unit_floor`, `program_allowlist`, `nonce_guard`. Each will land as a new builder under the same import path.

## License

[MIT](../LICENSE)
