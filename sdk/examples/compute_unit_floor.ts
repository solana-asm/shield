/**
 * compute_unit_floor guard in front of a SOL self-transfer.
 * Fails the transaction if no top-level SetComputeUnitLimit is present
 * or if its value is below minUnits.
 */

import {
    ComputeBudgetProgram,
    Connection,
    Keypair,
    SystemProgram,
    Transaction,
} from "@solana/web3.js"
import { computeUnitFloorIx } from "@solana-asm/shield"
import computeUnitFloorSeed from "../../deploy/compute_unit_floor-keypair.json"
import { explorerLink, runTx, signer } from "./_shared"

const RPC_URL = process.env.RPC_URL!
const MODE = (process.env.MODE ?? "simulate") as "send" | "simulate"

const programId = Keypair.fromSecretKey(
    new Uint8Array(computeUnitFloorSeed)
).publicKey

async function main() {
    console.log(`\n=== compute_unit_floor === program=${programId.toBase58()}`)
    const connection = new Connection(RPC_URL, { commitment: "confirmed" })
    const block = await connection.getLatestBlockhash()

    const tx = new Transaction()
    tx.feePayer = signer.publicKey
    tx.recentBlockhash = block.blockhash
    tx.lastValidBlockHeight = block.lastValidBlockHeight

    tx.add(ComputeBudgetProgram.setComputeUnitLimit({ units: 30_000 }))
    tx.add(
        computeUnitFloorIx({
            programId,
            minUnits: 10_000,
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
