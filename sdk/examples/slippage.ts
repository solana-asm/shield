/**
 * slippage guard in front of a SOL self-transfer.
 * Fails the transaction if the SPL Token account's amount is below minAmount.
 *
 * Requires a token account. The example resolves one in this order:
 *   1. TOKEN_ACCOUNT env var (any cluster)
 *   2. signer's USDC ATA on devnet or mainnet
 *   3. otherwise, skip
 */

import {
    Connection,
    Keypair,
    PublicKey,
    SystemProgram,
    Transaction,
} from "@solana/web3.js"
import { getAssociatedTokenAddressSync } from "@solana/spl-token"
import { slippageIx } from "@solana-asm/shield"
import slippageSeed from "../../deploy/slippage-keypair.json"
import { clusterOf, explorerLink, runTx, signer } from "./_shared"

const RPC_URL = process.env.RPC_URL!
const MODE = (process.env.MODE ?? "simulate") as "send" | "simulate"

const programId = Keypair.fromSecretKey(
    new Uint8Array(slippageSeed)
).publicKey

const USDC_MINT: Partial<Record<string, string>> = {
    devnet: "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU",
    mainnet: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
}

async function resolveTokenAccount(
    connection: Connection
): Promise<PublicKey | null> {
    if (process.env.TOKEN_ACCOUNT) {
        return new PublicKey(process.env.TOKEN_ACCOUNT)
    }
    const cluster = clusterOf(RPC_URL)
    const mintAddr = USDC_MINT[cluster]
    if (!mintAddr) return null
    const ata = getAssociatedTokenAddressSync(
        new PublicKey(mintAddr),
        signer.publicKey
    )
    const bal = await connection.getTokenAccountBalance(ata).catch(() => null)
    return bal ? ata : null
}

async function main() {
    console.log(`\n=== slippage === program=${programId.toBase58()}`)
    const connection = new Connection(RPC_URL, { commitment: "confirmed" })

    const tokenAccount = await resolveTokenAccount(connection)
    if (!tokenAccount) {
        console.log(
            "  skip: set TOKEN_ACCOUNT, or run against devnet/mainnet with a USDC ATA"
        )
        return
    }
    console.log(`  using token account ${tokenAccount.toBase58()}`)

    const block = await connection.getLatestBlockhash()
    const tx = new Transaction()
    tx.feePayer = signer.publicKey
    tx.recentBlockhash = block.blockhash
    tx.lastValidBlockHeight = block.lastValidBlockHeight

    tx.add(slippageIx({ programId, tokenAccount, minAmount: 1n }))
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
