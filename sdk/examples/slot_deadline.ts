/**
 * slot_deadline guard in front of a SOL self-transfer.
 * Fails the transaction if the current slot is past maxSlot.
 */

import {
    Connection,
    Keypair,
    SystemProgram,
    Transaction,
} from "@solana/web3.js"
import { slotDeadlineIx } from "@solana-asm/shield"
import slotDeadlineSeed from "../../deploy/slot_deadline-keypair.json"
import { explorerLink, runTx, signer } from "./_shared"

const RPC_URL = process.env.RPC_URL!
const MODE = (process.env.MODE ?? "simulate") as "send" | "simulate"

const programId = Keypair.fromSecretKey(
    new Uint8Array(slotDeadlineSeed)
).publicKey

async function main() {
    console.log(`\n=== slot_deadline === program=${programId.toBase58()}`)
    const connection = new Connection(RPC_URL, { commitment: "confirmed" })
    const currentSlot = await connection.getSlot()
    const block = await connection.getLatestBlockhash()

    const tx = new Transaction()
    tx.feePayer = signer.publicKey
    tx.recentBlockhash = block.blockhash
    tx.lastValidBlockHeight = block.lastValidBlockHeight

    tx.add(
        slotDeadlineIx({ programId, maxSlot: BigInt(currentSlot + 100) })
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
