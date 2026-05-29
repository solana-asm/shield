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
import { expect } from "chai"
import programSeed from "../deploy/compute_unit_floor-keypair.json"

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
const TX_CU_FAIL = 800

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

const connection = new Connection(RPC_URL, { commitment: "confirmed" })

const u32LE = (n: number): Buffer => {
    const b = Buffer.alloc(4)
    b.writeUInt32LE(n, 0)
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
    cuLimit?: number
    extraIxs?: TransactionInstruction[]
}): Promise<Transaction> => {
    const block = await connection.getLatestBlockhash()
    const tx = new Transaction()
    tx.feePayer = signer.publicKey
    tx.recentBlockhash = block.blockhash
    tx.lastValidBlockHeight = block.lastValidBlockHeight
    if (opts.cuLimit !== undefined) {
        tx.add(ComputeBudgetProgram.setComputeUnitLimit({ units: opts.cuLimit }))
    }
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

describe(`compute_unit_floor guard [${cluster}, MODE=${MODE}]`, function () {
    this.timeout(60_000)

    let reportedCU: number | undefined

    it("succeeds when SetComputeUnitLimit equals min_units (boundary, jlt is strict)", async () => {
        const tx = await buildTx({
            data: u32LE(50_000),
            cuLimit: 50_000,
        })
        const result = await runTx(tx)
        if (result.signature) console.log(`      → ${explorerLink(result.signature)}`)
        expect(result.err, JSON.stringify(result.logs)).to.equal(null)
        reportedCU = guardCU(result.logs)
        expect(reportedCU, "no guard CU found in logs").to.be.a("number")
        expect(reportedCU!).to.be.at.most(CU_CEILING)
    })

    it("succeeds when SetComputeUnitLimit exceeds min_units", async () => {
        const tx = await buildTx({
            data: u32LE(100_000),
            cuLimit: 200_000,
        })
        const result = await runTx(tx)
        if (result.signature) console.log(`      → ${explorerLink(result.signature)}`)
        expect(result.err, JSON.stringify(result.logs)).to.equal(null)
    })

    it("succeeds when min_units is 0 (effectively only requires presence of SetComputeUnitLimit)", async () => {
        const tx = await buildTx({
            data: u32LE(0),
            cuLimit: 800,
        })
        const result = await runTx(tx)
        if (result.signature) console.log(`      → ${explorerLink(result.signature)}`)
        expect(result.err, JSON.stringify(result.logs)).to.equal(null)
    })

    it("succeeds when SetComputeUnitLimit precedes the guard and SetComputeUnitPrice is also present", async () => {
        const tx = await buildTx({
            data: u32LE(50_000),
            cuLimit: 75_000,
            extraIxs: [
                ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 1 }),
            ],
        })
        const result = await runTx(tx)
        if (result.signature) console.log(`      → ${explorerLink(result.signature)}`)
        expect(result.err, JSON.stringify(result.logs)).to.equal(null)
    })

    it("fails with exit 1 when SetComputeUnitLimit is below min_units", async () => {
        const tx = await buildTx({
            data: u32LE(100_000),
            cuLimit: 50_000,
        })
        const result = await runTx(tx)
        if (result.signature) console.log(`      → ${explorerLink(result.signature)}`)
        expect(result.err).to.not.equal(null)
        const logs = result.logs.join("\n")
        expect(logs).to.include("cu too low")
        expect(logs).to.match(/custom program error: 0x1\b/)
    })

    it("fails with exit 1 when no SetComputeUnitLimit is present", async () => {
        const tx = await buildTx({
            data: u32LE(50_000),
        })
        const result = await runTx(tx)
        if (result.signature) console.log(`      → ${explorerLink(result.signature)}`)
        expect(result.err).to.not.equal(null)
        const logs = result.logs.join("\n")
        expect(logs).to.include("cu too low")
        expect(logs).to.match(/custom program error: 0x1\b/)
    })

    it("fails with exit 1 when only SetComputeUnitPrice is present (disc mismatch)", async () => {
        const tx = await buildTx({
            data: u32LE(50_000),
            extraIxs: [
                ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 1 }),
            ],
        })
        const result = await runTx(tx)
        if (result.signature) console.log(`      → ${explorerLink(result.signature)}`)
        expect(result.err).to.not.equal(null)
        const logs = result.logs.join("\n")
        expect(logs).to.include("cu too low")
        expect(logs).to.match(/custom program error: 0x1\b/)
    })

    it("fails with exit 2 on malformed instruction data (3 bytes)", async () => {
        const tx = await buildTx({
            data: Buffer.alloc(3),
            cuLimit: TX_CU_FAIL,
        })
        const result = await runTx(tx)
        if (result.signature) console.log(`      → ${explorerLink(result.signature)}`)
        expect(result.err).to.not.equal(null)
        const logs = result.logs.join("\n")
        expect(logs).to.include("bad ix data")
        expect(logs).to.match(/custom program error: 0x2\b/)
    })

    it("fails with exit 2 on trailing junk bytes (5 bytes)", async () => {
        const tx = await buildTx({
            data: Buffer.concat([u32LE(50_000), Buffer.from([0xff])]),
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
                data: u32LE(50_000),
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

    after(() => {
        if (reportedCU !== undefined) {
            console.log(
                `\n    CU report → ${cluster.padEnd(8)} compute_unit_floor: ${reportedCU} CU (ceiling ${CU_CEILING})\n`
            )
        }
    })
})
