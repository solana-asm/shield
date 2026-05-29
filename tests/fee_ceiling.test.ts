/// <reference types="mocha" />

import {
    ComputeBudgetProgram,
    Connection,
    Keypair,
    PublicKey,
    SYSVAR_INSTRUCTIONS_PUBKEY,
    Transaction,
    TransactionInstruction,
} from "@solana/web3.js"
import {
    createAssociatedTokenAccountIdempotentInstruction,
    createTransferInstruction,
    getAssociatedTokenAddressSync,
} from "@solana/spl-token"
import { expect } from "chai"
import programSeed from "../deploy/fee_ceiling-keypair.json"

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

const CU_CEILING = 250
const TX_CU_HAPPY = 800
const TX_CU_FAIL = 800
const TX_CU_COMPOSITION = 30_000

const guardCU = (logs: string[]): number | undefined => {
    const re = new RegExp(
        `Program ${program.toBase58()} consumed (\\d+) of \\d+ compute units`
    )
    for (const line of logs) {
        const m = line.match(re)
        if (m) return Number(m[1])
    }
    return undefined
}

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
        keys: [
            {
                pubkey: SYSVAR_INSTRUCTIONS_PUBKEY,
                isSigner: false,
                isWritable: false,
            },
        ],
        programId: program,
        data,
    })

const buildTx = async (opts: {
    data: Buffer
    cuLimit: number
    extraIxs?: TransactionInstruction[]
}): Promise<Transaction> => {
    const block = await connection.getLatestBlockhash()
    const tx = new Transaction()
    tx.feePayer = signer.publicKey
    tx.recentBlockhash = block.blockhash
    tx.lastValidBlockHeight = block.lastValidBlockHeight
    tx.add(ComputeBudgetProgram.setComputeUnitLimit({ units: opts.cuLimit }))
    for (const ix of opts.extraIxs ?? []) tx.add(ix)
    tx.add(guardIx(opts.data))
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

describe(`fee_ceiling guard [${cluster}, MODE=${MODE}]`, function () {
    this.timeout(60_000)

    let reportedCU: number | undefined

    it("succeeds when tx has no SetComputeUnitPrice", async () => {
        const tx = await buildTx({
            data: u64LE(1_000n),
            cuLimit: TX_CU_HAPPY,
        })
        const result = await runTx(tx)
        if (result.signature) console.log(`      → ${explorerLink(result.signature)}`)
        expect(result.err, JSON.stringify(result.logs)).to.equal(null)
        reportedCU = guardCU(result.logs)
        expect(reportedCU, "no guard CU found in logs").to.be.a("number")
        expect(reportedCU!).to.be.at.most(CU_CEILING)
    })

    it("succeeds when SetComputeUnitPrice < max", async () => {
        const tx = await buildTx({
            data: u64LE(1_000n),
            cuLimit: TX_CU_HAPPY,
            extraIxs: [
                ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 999 }),
            ],
        })
        const result = await runTx(tx)
        if (result.signature) console.log(`      → ${explorerLink(result.signature)}`)
        expect(result.err, JSON.stringify(result.logs)).to.equal(null)
    })

    it("succeeds when SetComputeUnitPrice == max (boundary, jgt is strict)", async () => {
        const tx = await buildTx({
            data: u64LE(1_000n),
            cuLimit: TX_CU_HAPPY,
            extraIxs: [
                ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 1_000 }),
            ],
        })
        const result = await runTx(tx)
        if (result.signature) console.log(`      → ${explorerLink(result.signature)}`)
        expect(result.err, JSON.stringify(result.logs)).to.equal(null)
    })

    it("fails with exit 1 when SetComputeUnitPrice > max", async () => {
        const tx = await buildTx({
            data: u64LE(1_000n),
            cuLimit: TX_CU_FAIL,
            extraIxs: [
                ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 1_001 }),
            ],
        })
        const result = await runTx(tx)
        if (result.signature) console.log(`      → ${explorerLink(result.signature)}`)
        expect(result.err).to.not.equal(null)
        const logs = result.logs.join("\n")
        expect(logs).to.include("fee too high")
        expect(logs).to.match(/custom program error: 0x1\b/)
    })

    it("fails with exit 1 when max == 0 and any non-zero price is set", async () => {
        const tx = await buildTx({
            data: u64LE(0n),
            cuLimit: TX_CU_FAIL,
            extraIxs: [
                ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 1 }),
            ],
        })
        const result = await runTx(tx)
        if (result.signature) console.log(`      → ${explorerLink(result.signature)}`)
        expect(result.err).to.not.equal(null)
        const logs = result.logs.join("\n")
        expect(logs).to.include("fee too high")
        expect(logs).to.match(/custom program error: 0x1\b/)
    })

    it("fails with exit 2 on malformed instruction data (7 bytes)", async () => {
        const tx = await buildTx({
            data: Buffer.alloc(7),
            cuLimit: TX_CU_FAIL,
        })
        const result = await runTx(tx)
        if (result.signature) console.log(`      → ${explorerLink(result.signature)}`)
        expect(result.err).to.not.equal(null)
        const logs = result.logs.join("\n")
        expect(logs).to.include("bad ix data")
        expect(logs).to.match(/custom program error: 0x2\b/)
    })

    it("fails with exit 2 on trailing junk bytes (9 bytes)", async () => {
        const tx = await buildTx({
            data: Buffer.concat([u64LE(1_000n), Buffer.from([0xff])]),
            cuLimit: TX_CU_FAIL,
        })
        const result = await runTx(tx)
        if (result.signature) console.log(`      → ${explorerLink(result.signature)}`)
        expect(result.err).to.not.equal(null)
        const logs = result.logs.join("\n")
        expect(logs).to.include("bad ix data")
        expect(logs).to.match(/custom program error: 0x2\b/)
    })

    it("fails with exit 3 when account 0 is not the Instructions sysvar", async () => {
        const wrongAccount = Keypair.generate().publicKey
        const block = await connection.getLatestBlockhash()
        const tx = new Transaction()
        tx.feePayer = signer.publicKey
        tx.recentBlockhash = block.blockhash
        tx.lastValidBlockHeight = block.lastValidBlockHeight
        tx.add(ComputeBudgetProgram.setComputeUnitLimit({ units: TX_CU_FAIL }))
        tx.add(
            new TransactionInstruction({
                keys: [
                    {
                        pubkey: wrongAccount,
                        isSigner: false,
                        isWritable: false,
                    },
                ],
                programId: program,
                data: u64LE(1_000n),
            })
        )
        tx.sign(signer)

        const result = await runTx(tx)
        if (result.signature) console.log(`      → ${explorerLink(result.signature)}`)
        expect(result.err).to.not.equal(null)
        const logs = result.logs.join("\n")
        expect(logs).to.include("bad account")
        expect(logs).to.match(/custom program error: 0x3\b/)
    })

    it("composes guard + USDC transfer with priority fee under ceiling", async function () {
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

        const block = await connection.getLatestBlockhash()
        const tx = new Transaction()
        tx.feePayer = signer.publicKey
        tx.recentBlockhash = block.blockhash
        tx.lastValidBlockHeight = block.lastValidBlockHeight
        tx.add(ComputeBudgetProgram.setComputeUnitLimit({ units: TX_CU_COMPOSITION }))
        tx.add(ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 500 }))
        tx.add(guardIx(u64LE(1_000n)))
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
                `\n    CU report → ${cluster.padEnd(8)} fee_ceiling: ${reportedCU} CU (ceiling ${CU_CEILING})\n`
            )
        }
    })
})
