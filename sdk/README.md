# @solana-asm/shield

TypeScript helpers for building Shield guard instructions. Each function returns a `TransactionInstruction` you prepend to your transaction.

## Install

Inside this workspace:

```bash
bun install
```

## Usage

```ts
import { Connection, Keypair, PublicKey, Transaction } from "@solana/web3.js"
import {
    slotDeadlineIx,
    slippageIx,
    balanceFloorIx,
    GuardExitCode,
    parseGuardError,
} from "@solana-asm/shield"

const SLOT_DEADLINE_PROGRAM = new PublicKey("...")
const SLIPPAGE_PROGRAM = new PublicKey("...")
const BALANCE_FLOOR_PROGRAM = new PublicKey("...")

const tx = new Transaction()

tx.add(
    slotDeadlineIx({
        programId: SLOT_DEADLINE_PROGRAM,
        maxSlot: BigInt(currentSlot + 100),
    })
)

tx.add(
    slippageIx({
        programId: SLIPPAGE_PROGRAM,
        tokenAccount: userUsdcAta,
        minAmount: 1_000_000n,
    })
)

tx.add(
    balanceFloorIx({
        programId: BALANCE_FLOOR_PROGRAM,
        account: signer.publicKey,
        minLamports: 1_000_000n,
    })
)

tx.add(yourSwapInstruction)
```

If any guard's check fails, Solana aborts the entire transaction. The swap instruction never runs.

## Reading errors

Each guard logs a short string and exits with a numeric code before failing. Parse a failed transaction's logs:

```ts
const parsed = parseGuardError(simulation.logs)
if (parsed?.code === GuardExitCode.ConditionFailed) {
    // user's slippage / deadline / balance check failed
}
```

| Exit code | Meaning |
|---:|---|
| `0` | Success |
| `1` | Condition failed |
| `2` | Malformed instruction data |
| `3` | Invalid account |

## Program IDs

The SDK takes program IDs as parameters. Wire them from wherever you keep deployment addresses (env vars, a constants file, etc.). For local development against this repo, derive them from the keypair files in `deploy/`:

```ts
import { Keypair } from "@solana/web3.js"
import slippageSeed from "../../deploy/slippage-keypair.json"

const SLIPPAGE_PROGRAM = Keypair.fromSecretKey(new Uint8Array(slippageSeed)).publicKey
```
