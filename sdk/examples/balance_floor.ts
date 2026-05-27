/**
 * balance_floor guard in front of a SOL self-transfer.
 * Fails the transaction if the signer's lamports drop below minLamports.
 */

import {
    Connection,
    Keypair,
    SystemProgram,
    Transaction,
} from "@solana/web3.js"
import { balanceFloorIx } from "@solana-asm/shield"
import balanceFloorSeed from "../../deploy/balance_floor-keypair.json"
import { explorerLink, runTx, signer } from "./_shared"

const RPC_URL = process.env.RPC_URL!
const MODE = (process.env.MODE ?? "simulate") as "send" | "simulate"

const programId = Keypair.fromSecretKey(
    new Uint8Array(balanceFloorSeed)
).publicKey

async function main() {
    console.log(`\n=== balance_floor === program=${programId.toBase58()}`)
    const connection = new Connection(RPC_URL, { commitment: "confirmed" })
    const block = await connection.getLatestBlockhash()

    const tx = new Transaction()
    tx.feePayer = signer.publicKey
    tx.recentBlockhash = block.blockhash
    tx.lastValidBlockHeight = block.lastValidBlockHeight

    tx.add(
        balanceFloorIx({
            programId,
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
