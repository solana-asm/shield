/// <reference types="mocha" />

import {
    ComputeBudgetProgram,
    Connection,
    Keypair,
    PublicKey,
    SystemProgram,
    SYSVAR_INSTRUCTIONS_PUBKEY,
    Transaction,
    TransactionInstruction,
} from "@solana/web3.js"
import { expect } from "chai"
import programSeed from "../deploy/program_allowlist-keypair.json"

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
const CU_CEILING_LARGE = 800
const TX_CU_HAPPY = 600
const TX_CU_LARGE = 1_500
const TX_CU_FAIL = 600

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

const buildIxData = (
    count: number,
    pubkeys: PublicKey[],
    extraBytes = 0
): Buffer => {
    const buf = Buffer.alloc(1 + 32 * pubkeys.length + extraBytes)
    buf.writeUInt8(count, 0)
    pubkeys.forEach((pk, i) => {
        pk.toBuffer().copy(buf, 1 + i * 32)
    })
    return buf
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

// A no-op destination ix: SOL self-transfer of 1 lamport. Targets the
// System Program (11111111111111111111111111111111).
const noopDest = (): TransactionInstruction =>
    SystemProgram.transfer({
        fromPubkey: signer.publicKey,
        toPubkey: signer.publicKey,
        lamports: 1,
    })

const buildSignedTx = async (opts: {
    data: Buffer
    cuLimit: number
    extraIxs?: TransactionInstruction[]
    omitCuLimit?: boolean
}): Promise<Transaction> => {
    const block = await connection.getLatestBlockhash()
    const tx = new Transaction()
    tx.feePayer = signer.publicKey
    tx.recentBlockhash = block.blockhash
    tx.lastValidBlockHeight = block.lastValidBlockHeight
    if (!opts.omitCuLimit) {
        tx.add(ComputeBudgetProgram.setComputeUnitLimit({ units: opts.cuLimit }))
    }
    tx.add(guardIx(opts.data))
    for (const ix of opts.extraIxs ?? []) tx.add(ix)
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

describe(`program_allowlist guard [${cluster}, MODE=${MODE}]`, function () {
    this.timeout(60_000)

    let reportedCU: number | undefined

    const otherA = Keypair.generate().publicKey
    const otherB = Keypair.generate().publicKey
    const otherC = Keypair.generate().publicKey

    it("succeeds when destination program is the only allowlist entry", async () => {
        const data = buildIxData(1, [SystemProgram.programId])
        const tx = await buildSignedTx({
            data,
            cuLimit: TX_CU_HAPPY,
            extraIxs: [noopDest()],
            omitCuLimit: true,
        })
        const result = await runTx(tx)
        if (result.signature) console.log(`      → ${explorerLink(result.signature)}`)
        expect(result.err, JSON.stringify(result.logs)).to.equal(null)
        reportedCU = guardCU(result.logs)
        expect(reportedCU, "no guard CU found in logs").to.be.a("number")
        expect(reportedCU!).to.be.at.most(CU_CEILING)
    })

    it("succeeds when destination program is in the middle of N=3", async () => {
        const data = buildIxData(3, [otherA, SystemProgram.programId, otherB])
        const tx = await buildSignedTx({
            data,
            cuLimit: TX_CU_HAPPY,
            extraIxs: [noopDest()],
            omitCuLimit: true,
        })
        const result = await runTx(tx)
        if (result.signature) console.log(`      → ${explorerLink(result.signature)}`)
        expect(result.err, JSON.stringify(result.logs)).to.equal(null)
    })

    it("succeeds when destination program is the last entry (exercises full inner loop)", async () => {
        const data = buildIxData(3, [otherA, otherB, SystemProgram.programId])
        const tx = await buildSignedTx({
            data,
            cuLimit: TX_CU_HAPPY,
            extraIxs: [noopDest()],
            omitCuLimit: true,
        })
        const result = await runTx(tx)
        if (result.signature) console.log(`      → ${explorerLink(result.signature)}`)
        expect(result.err, JSON.stringify(result.logs)).to.equal(null)
    })

    it("skips itself: tx with only the guard succeeds even if guard's program is not in the allowlist", async () => {
        // The only top-level ix besides setComputeUnitLimit is the guard itself.
        // The guard implicitly skips its own ix, so a strict allowlist that
        // happens not to include this program should still succeed.
        const data = buildIxData(1, [ComputeBudgetProgram.programId])
        const tx = await buildSignedTx({
            data,
            cuLimit: TX_CU_HAPPY,
        })
        const result = await runTx(tx)
        if (result.signature) console.log(`      → ${explorerLink(result.signature)}`)
        expect(result.err, JSON.stringify(result.logs)).to.equal(null)
    })

    it("fails with exit 1 when destination program is not in the allowlist", async () => {
        const data = buildIxData(3, [otherA, otherB, otherC])
        const tx = await buildSignedTx({
            data,
            cuLimit: TX_CU_FAIL,
            extraIxs: [noopDest()],
        })
        const result = await runTx(tx)
        if (result.signature) console.log(`      → ${explorerLink(result.signature)}`)
        expect(result.err).to.not.equal(null)
        const logs = result.logs.join("\n")
        expect(logs).to.include("not allowed")
        expect(logs).to.match(/custom program error: 0x1\b/)
    })

    it("fails with exit 1 on empty allowlist (count=0)", async () => {
        const data = buildIxData(0, [])
        const tx = await buildSignedTx({
            data,
            cuLimit: TX_CU_FAIL,
            extraIxs: [noopDest()],
        })
        const result = await runTx(tx)
        if (result.signature) console.log(`      → ${explorerLink(result.signature)}`)
        expect(result.err).to.not.equal(null)
        const logs = result.logs.join("\n")
        expect(logs).to.include("not allowed")
        expect(logs).to.match(/custom program error: 0x1\b/)
    })

    it("fails with exit 2 when length doesn't match declared count", async () => {
        // claim count=2 but only ship 1 pubkey
        const data = buildIxData(2, [SystemProgram.programId])
        const tx = await buildSignedTx({
            data,
            cuLimit: TX_CU_FAIL,
        })
        const result = await runTx(tx)
        if (result.signature) console.log(`      → ${explorerLink(result.signature)}`)
        expect(result.err).to.not.equal(null)
        const logs = result.logs.join("\n")
        expect(logs).to.include("bad ix data")
        expect(logs).to.match(/custom program error: 0x2\b/)
    })

    it("fails with exit 2 on trailing junk bytes", async () => {
        // count=1, one pubkey, plus 5 extra bytes of junk
        const data = buildIxData(1, [SystemProgram.programId], 5)
        const tx = await buildSignedTx({
            data,
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
                data: buildIxData(1, [SystemProgram.programId]),
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

    it("N=20 with destination at last index stays under linearly-scaled budget", async () => {
        // Worst-case position (destination program is last allowlist entry)
        // catches super-linear CU growth in the inner loop and any out-of-bounds
        // reads past the end of the ix data buffer.
        const others = Array.from(
            { length: 19 },
            () => Keypair.generate().publicKey
        )
        const data = buildIxData(20, [...others, SystemProgram.programId])
        const tx = await buildSignedTx({
            data,
            cuLimit: TX_CU_LARGE,
            extraIxs: [noopDest()],
            omitCuLimit: true,
        })
        const result = await runTx(tx)
        if (result.signature) console.log(`      → ${explorerLink(result.signature)}`)
        expect(result.err, JSON.stringify(result.logs)).to.equal(null)
        const cu = guardCU(result.logs)
        expect(cu, "no guard CU found in logs").to.be.a("number")
        expect(cu!).to.be.at.most(CU_CEILING_LARGE)
        console.log(`      N=20 last-index CU: ${cu} (ceiling ${CU_CEILING_LARGE})`)
    })

    it("composes guard + System transfer: must include System Program in allowlist", async () => {
        // Demonstrates the contract: every non-self top-level ix's program
        // must be on the allowlist. ComputeBudget is also at top level, so
        // it must be allowlisted too if the guard is to coexist with it.
        const data = buildIxData(2, [
            ComputeBudgetProgram.programId,
            SystemProgram.programId,
        ])
        const tx = await buildSignedTx({
            data,
            cuLimit: TX_CU_HAPPY,
            extraIxs: [noopDest()],
        })
        const result = await runTx(tx)
        if (result.signature) console.log(`      → ${explorerLink(result.signature)}`)
        expect(result.err, JSON.stringify(result.logs)).to.equal(null)
    })

    after(() => {
        if (reportedCU !== undefined) {
            console.log(
                `\n    CU report → ${cluster.padEnd(8)} program_allowlist: ${reportedCU} CU (ceiling ${CU_CEILING})\n`
            )
        }
    })
})
