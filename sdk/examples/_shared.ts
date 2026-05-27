/**
 * Shared helpers for SDK examples: signer, cluster detection, runTx, and
 * explorer-link formatting. Examples import from here so the per-guard
 * files stay focused on the SDK usage.
 */

import { Connection, Keypair, Transaction } from "@solana/web3.js"

const SIGNER_RAW = process.env.SIGNER
if (!SIGNER_RAW) throw new Error("SIGNER is required (run via scripts/example.sh)")

export const signer = Keypair.fromSecretKey(
    new Uint8Array(JSON.parse(SIGNER_RAW))
)

export function clusterOf(rpcUrl: string): string {
    if (rpcUrl.includes("127.0.0.1") || rpcUrl.includes("localhost")) return "local"
    if (rpcUrl.includes("devnet")) return "devnet"
    if (rpcUrl.includes("mainnet")) return "mainnet"
    return rpcUrl
}

export function explorerLink(sig: string, rpcUrl: string): string {
    const c = clusterOf(rpcUrl)
    if (c === "devnet") return `https://solscan.io/tx/${sig}?cluster=devnet`
    if (c === "mainnet") return `https://solscan.io/tx/${sig}`
    return `https://explorer.solana.com/tx/${sig}?cluster=custom&customUrl=${encodeURIComponent(rpcUrl)}`
}

export type TxResult = {
    signature?: string
    err: unknown
    logs: string[]
    cu: number
}

export async function runTx(
    connection: Connection,
    tx: Transaction,
    mode: "send" | "simulate"
): Promise<TxResult> {
    if (mode === "simulate") {
        const { value } = await connection.simulateTransaction(tx)
        return {
            err: value.err,
            logs: value.logs ?? [],
            cu: value.unitsConsumed ?? 0,
        }
    }

    const sig = await connection.sendRawTransaction(tx.serialize(), {
        skipPreflight: true,
    })
    await connection
        .confirmTransaction(
            {
                signature: sig,
                blockhash: tx.recentBlockhash!,
                lastValidBlockHeight: tx.lastValidBlockHeight!,
            },
            "confirmed"
        )
        .catch(() => undefined)

    const info = await connection.getTransaction(sig, {
        commitment: "confirmed",
        maxSupportedTransactionVersion: 0,
    })
    return {
        signature: sig,
        err: info?.meta?.err ?? null,
        logs: info?.meta?.logMessages ?? [],
        cu: info?.meta?.computeUnitsConsumed ?? 0,
    }
}
