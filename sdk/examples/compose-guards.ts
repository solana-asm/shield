/**
 * Compose slot_deadline + balance_floor in front of a SOL self-transfer.
 * If either guard's check fails the transfer is aborted atomically.
 *
 * slippage is omitted here because it requires a token account; see
 * sdk/examples/slippage.ts for the per-guard demo.
 */

import {
    Connection,
    Keypair,
    SystemProgram,
    Transaction,
} from "@solana/web3.js"
import { balanceFloorIx, slotDeadlineIx } from "@solana-asm/shield"

import slotDeadlineSeed from "../../deploy/slot_deadline-keypair.json"
import balanceFloorSeed from "../../deploy/balance_floor-keypair.json"
import { explorerLink, runTx, signer } from "./_shared"

const RPC_URL = process.env.RPC_URL!
const MODE = (process.env.MODE ?? "simulate") as "send" | "simulate"

const slotDeadlineProgram = Keypair.fromSecretKey(
    new Uint8Array(slotDeadlineSeed)
).publicKey
const balanceFloorProgram = Keypair.fromSecretKey(
    new Uint8Array(balanceFloorSeed)
).publicKey

async function main() {
    console.log(`\n=== compose-guards === slot_deadline + balance_floor + transfer`)
    const connection = new Connection(RPC_URL, { commitment: "confirmed" })
    const currentSlot = await connection.getSlot()
    const block = await connection.getLatestBlockhash()

    const tx = new Transaction()
    tx.feePayer = signer.publicKey
    tx.recentBlockhash = block.blockhash
    tx.lastValidBlockHeight = block.lastValidBlockHeight

    tx.add(
        slotDeadlineIx({
            programId: slotDeadlineProgram,
            maxSlot: BigInt(currentSlot + 100),
        })
    )
    tx.add(
        balanceFloorIx({
            programId: balanceFloorProgram,
            account: signer.publicKey,
            minLamports: 1_000n,
        })
    )
    tx.add(
        SystemProgram.transfer({
            fromPubkey: signer.publicKey,
            toPubkey: signer.publicKey,
            lamports: 1,
        })
    )
    tx.sign(signer)

    const result = await runTx(connection, tx, MODE)
    console.log(`err=${JSON.stringify(result.err)} cu=${result.cu}`)
    if (result.signature) console.log(`  ${explorerLink(result.signature, RPC_URL)}`)
}

main().catch((e) => {
    console.error(e)
    process.exit(1)
})
