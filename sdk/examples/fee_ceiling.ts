/**
 * fee_ceiling guard in front of a SOL self-transfer with a priority fee bid.
 * Fails the transaction if any ComputeBudget SetComputeUnitPrice in the tx
 * exceeds maxMicroLamports per CU.
 */

import {
    ComputeBudgetProgram,
    Connection,
    Keypair,
    SystemProgram,
    Transaction,
} from "@solana/web3.js"
import { feeCeilingIx } from "@solana-asm/shield"
import feeCeilingSeed from "../../deploy/fee_ceiling-keypair.json"
import { explorerLink, runTx, signer } from "./_shared"

const RPC_URL = process.env.RPC_URL!
const MODE = (process.env.MODE ?? "simulate") as "send" | "simulate"

const programId = Keypair.fromSecretKey(
    new Uint8Array(feeCeilingSeed)
).publicKey

async function main() {
    console.log(`\n=== fee_ceiling === program=${programId.toBase58()}`)
    const connection = new Connection(RPC_URL, { commitment: "confirmed" })
    const block = await connection.getLatestBlockhash()

    const tx = new Transaction()
    tx.feePayer = signer.publicKey
    tx.recentBlockhash = block.blockhash
    tx.lastValidBlockHeight = block.lastValidBlockHeight

    tx.add(ComputeBudgetProgram.setComputeUnitLimit({ units: 30_000 }))
    tx.add(ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 500 }))
    tx.add(
        feeCeilingIx({
            programId,
            maxMicroLamports: 1_000n,
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
