/// <reference types="mocha" />

import {
    Connection,
    Keypair,
    PublicKey,
    Transaction,
    TransactionInstruction,
} from "@solana/web3.js"
import {
    createAssociatedTokenAccountIdempotentInstruction,
    createTransferInstruction,
    getAssociatedTokenAddressSync,
} from "@solana/spl-token"
import { expect } from "chai"
import programSeed from "../deploy/slot_deadline-keypair.json"

const programKeypair = Keypair.fromSecretKey(new Uint8Array(programSeed))
const program = programKeypair.publicKey
const signerSeed = JSON.parse(process.env.SIGNER!)
const signer = Keypair.fromSecretKey(new Uint8Array(signerSeed))

const RPC_URL = process.env.RPC_URL ?? "http://127.0.0.1:8899"
const MODE = (process.env.MODE ?? "send") as "send" | "simulate"

const cluster =
    RPC_URL.includes("127.0.0.1") || RPC_URL.includes("localhost")
        ? "local"
        : RPC_URL.includes("devnet")
          ? "devnet"
          : RPC_URL.includes("mainnet")
            ? "mainnet"
            : RPC_URL

const CU_CEILING = 200

const USDC_DEST = new PublicKey("8gm5X1Nq8f28qu5XPTXk236FVmEufFprFmceRssYzMuk")
const USDC_MINT: Partial<Record<string, string>> = {
    devnet: "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU",
    mainnet: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
}
const USDC_TRANSFER_AMOUNT = 1_000n

const connection = new Connection(RPC_URL, { commitment: "confirmed" })

const u64LE = (n: bigint): Buffer => {
    const b = Buffer.alloc(8)
    b.writeBigUInt64LE(n, 0)
    return b
}

const guardIx = (data: Buffer): TransactionInstruction =>
    new TransactionInstruction({
        keys: [],
        programId: program,
        data,
    })

const buildSignedTx = async (data: Buffer): Promise<Transaction> => {
    const block = await connection.getLatestBlockhash()
    const tx = new Transaction()
    tx.feePayer = signer.publicKey
    tx.recentBlockhash = block.blockhash
    tx.lastValidBlockHeight = block.lastValidBlockHeight
    tx.add(guardIx(data))
    tx.sign(signer)
    return tx
}

const explorerLink = (sig: string): string => {
    if (cluster === "devnet") return `https://solscan.io/tx/${sig}?cluster=devnet`
    if (cluster === "mainnet") return `https://solscan.io/tx/${sig}`
    return `https://explorer.solana.com/tx/${sig}?cluster=custom&customUrl=${encodeURIComponent(RPC_URL)}`
}

type Outcome = {
    signature?: string
    err: unknown
    logs: string[]
    cu: number
}

const runTx = async (tx: Transaction): Promise<Outcome> => {
    if (MODE === "simulate") {
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

    let info = null
    for (let i = 0; i < 8 && info === null; i++) {
        info = await connection.getTransaction(sig, {
            commitment: "confirmed",
            maxSupportedTransactionVersion: 0,
        })
        if (info === null) await new Promise((r) => setTimeout(r, 500))
    }
    if (info === null) throw new Error(`tx ${sig} confirmed but getTransaction returned null`)

    return {
        signature: sig,
        err: info.meta?.err ?? null,
        logs: info.meta?.logMessages ?? [],
        cu: info.meta?.computeUnitsConsumed ?? 0,
    }
}

describe(`slot_deadline guard [${cluster}, MODE=${MODE}]`, function () {
    this.timeout(60_000)

    let reportedCU: number | undefined

    it("succeeds when current_slot <= max_slot", async () => {
        const currentSlot = await connection.getSlot()
        const tx = await buildSignedTx(u64LE(BigInt(currentSlot + 100)))
        const result = await runTx(tx)
        if (result.signature) console.log(`      → ${explorerLink(result.signature)}`)
        expect(result.err, JSON.stringify(result.logs)).to.equal(null)
        reportedCU = result.cu
        expect(reportedCU, "no CU reported").to.be.a("number")
        expect(reportedCU!).to.be.lessThan(CU_CEILING)
    })

    it("fails with exit 1 when current_slot > max_slot", async () => {
        const tx = await buildSignedTx(u64LE(0n))
        const result = await runTx(tx)
        if (result.signature) console.log(`      → ${explorerLink(result.signature)}`)
        expect(result.err).to.not.equal(null)
        const logs = result.logs.join("\n")
        expect(logs).to.include("deadline missed")
        expect(logs).to.match(/custom program error: 0x1\b/)
    })

    it("fails with exit 2 on malformed instruction data", async () => {
        const tx = await buildSignedTx(Buffer.alloc(7))
        const result = await runTx(tx)
        if (result.signature) console.log(`      → ${explorerLink(result.signature)}`)
        expect(result.err).to.not.equal(null)
        const logs = result.logs.join("\n")
        expect(logs).to.include("bad ix data")
        expect(logs).to.match(/custom program error: 0x2\b/)
    })

    it("composes guard + USDC transfer", async function () {
        if (MODE !== "send") return this.skip()
        const mintAddr = USDC_MINT[cluster]
        if (!mintAddr) return this.skip()

        const mint = new PublicKey(mintAddr)
        const fromAta = getAssociatedTokenAddressSync(mint, signer.publicKey)
        const toAta = getAssociatedTokenAddressSync(mint, USDC_DEST)

        const bal = await connection
            .getTokenAccountBalance(fromAta)
            .catch(() => null)
        if (!bal || BigInt(bal.value.amount) < USDC_TRANSFER_AMOUNT) {
            console.log(
                `      skip: signer needs ≥ ${USDC_TRANSFER_AMOUNT} USDC base units at ${fromAta.toBase58()}`
            )
            return this.skip()
        }

        const currentSlot = await connection.getSlot()
        const block = await connection.getLatestBlockhash()
        const tx = new Transaction()
        tx.feePayer = signer.publicKey
        tx.recentBlockhash = block.blockhash
        tx.lastValidBlockHeight = block.lastValidBlockHeight
        tx.add(guardIx(u64LE(BigInt(currentSlot + 100))))
        tx.add(
            createAssociatedTokenAccountIdempotentInstruction(
                signer.publicKey,
                toAta,
                USDC_DEST,
                mint
            )
        )
        tx.add(
            createTransferInstruction(
                fromAta,
                toAta,
                signer.publicKey,
                USDC_TRANSFER_AMOUNT
            )
        )
        tx.sign(signer)

        const result = await runTx(tx)
        if (result.signature) console.log(`      → ${explorerLink(result.signature)}`)
        expect(result.err, JSON.stringify(result.logs)).to.equal(null)
    })

    after(() => {
        if (reportedCU !== undefined) {
            console.log(
                `\n    CU report → ${cluster.padEnd(8)} slot_deadline: ${reportedCU} CU (ceiling ${CU_CEILING})\n`
            )
        }
    })
})
