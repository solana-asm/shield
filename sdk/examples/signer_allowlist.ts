/**
 * signer_allowlist guard in front of a SOL self-transfer.
 * Fails the transaction unless the signer's pubkey is in the allowlist.
 */

import {
    Connection,
    Keypair,
    SystemProgram,
    Transaction,
} from "@solana/web3.js"
import { signerAllowlistIx } from "@solana-asm/shield"
import signerAllowlistSeed from "../../deploy/signer_allowlist-keypair.json"
import { explorerLink, runTx, signer } from "./_shared"

const RPC_URL = process.env.RPC_URL!
const MODE = (process.env.MODE ?? "simulate") as "send" | "simulate"

const programId = Keypair.fromSecretKey(
    new Uint8Array(signerAllowlistSeed)
).publicKey

async function main() {
    console.log(`\n=== signer_allowlist === program=${programId.toBase58()}`)
    const connection = new Connection(RPC_URL, { commitment: "confirmed" })
    const block = await connection.getLatestBlockhash()

    // Build an allowlist that includes the signer (happy path). Add a
    // throwaway pubkey first so the on-chain loop has to skip past one
    // non-match before finding the signer.
    const decoy = Keypair.generate().publicKey

    const tx = new Transaction()
    tx.feePayer = signer.publicKey
    tx.recentBlockhash = block.blockhash
    tx.lastValidBlockHeight = block.lastValidBlockHeight

    tx.add(
        signerAllowlistIx({
            programId,
            signer: signer.publicKey,
            allowed: [decoy, signer.publicKey],
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
