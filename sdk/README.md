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
} from "@solana-asm/shield"

const SLOT_DEADLINE = new PublicKey("SLDyTxMbunLA51WADZKpXNZ49mFnhsPxtZSp4Rbr4ja")
const SLIPPAGE = new PublicKey("SLDChznvxmWVQpGQbweD1oXK8KcaxgaCD1qyDWB3Tps")
const BALANCE_FLOOR = new PublicKey("SLDwNtfXVRXuW29kMWLkvs8QX6xkdg8qjPuV6WQ25Hb")

const connection = new Connection("https://api.devnet.solana.com")
const slot = await connection.getSlot()
const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash()

const tx = new Transaction({ feePayer: signer.publicKey, blockhash, lastValidBlockHeight })

tx.add(slotDeadlineIx({ programId: SLOT_DEADLINE, maxSlot: BigInt(slot + 100) }))
tx.add(slippageIx({ programId: SLIPPAGE, tokenAccount, minAmount: 1_000_000n }))
tx.add(balanceFloorIx({ programId: BALANCE_FLOOR, account: signer.publicKey, minLamports: 1_000n }))
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

## Examples

Runnable per-guard demos live in [`examples/`](examples). They share signer / RPC / explorer plumbing through `examples/_shared.ts`.

```bash
bun run example:devnet              # run every example
bun run example:devnet slippage     # run one example
MODE=send bun run example:devnet    # actually submit (default is simulate)
```

## Roadmap

Additional guards on the roadmap (see the [main Guards table](../README.md#guards)): `fee_ceiling`, `pyth_freshness`, `memo_audit`, `nonce_guard`. Each will land as a new builder under the same import path.

## License

[MIT](../LICENSE)
