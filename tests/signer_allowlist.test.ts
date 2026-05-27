/// <reference types="mocha" />

import {
    ComputeBudgetProgram,
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
import programSeed from "../deploy/signer_allowlist-keypair.json"

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

const CU_CEILING = 60
const CU_CEILING_LARGE = 250
const TX_CU_HAPPY = 225
const TX_CU_LARGE = 400
const TX_CU_FAIL = 500
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
                pubkey: signer.publicKey,
                isSigner: true,
                isWritable: false,
            },
        ],
        programId: program,
        data,
    })

const buildSignedTx = async (
    data: Buffer,
    cuLimit: number
): Promise<Transaction> => {
    const block = await connection.getLatestBlockhash()
    const tx = new Transaction()
    tx.feePayer = signer.publicKey
    tx.recentBlockhash = block.blockhash
    tx.lastValidBlockHeight = block.lastValidBlockHeight
    tx.add(ComputeBudgetProgram.setComputeUnitLimit({ units: cuLimit }))
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

describe(`signer_allowlist guard [${cluster}, MODE=${MODE}]`, function () {
    this.timeout(60_000)

    let reportedCU: number | undefined

    const otherA = Keypair.generate().publicKey
    const otherB = Keypair.generate().publicKey
    const otherC = Keypair.generate().publicKey

    it("succeeds when signer is the only entry (N=1)", async () => {
        const data = buildIxData(1, [signer.publicKey])
        const tx = await buildSignedTx(data, TX_CU_HAPPY)
        const result = await runTx(tx)
        if (result.signature) console.log(`      → ${explorerLink(result.signature)}`)
        expect(result.err, JSON.stringify(result.logs)).to.equal(null)
        reportedCU = guardCU(result.logs)
        expect(reportedCU, "no guard CU found in logs").to.be.a("number")
        expect(reportedCU!).to.be.at.most(CU_CEILING)
    })

    it("succeeds when signer is in the middle of N=3", async () => {
        const data = buildIxData(3, [otherA, signer.publicKey, otherB])
        const tx = await buildSignedTx(data, TX_CU_HAPPY)
        const result = await runTx(tx)
        if (result.signature) console.log(`      → ${explorerLink(result.signature)}`)
        expect(result.err, JSON.stringify(result.logs)).to.equal(null)
    })

    it("succeeds when signer is the last entry (exercises full loop)", async () => {
        const data = buildIxData(3, [otherA, otherB, signer.publicKey])
        const tx = await buildSignedTx(data, TX_CU_HAPPY)
        const result = await runTx(tx)
        if (result.signature) console.log(`      → ${explorerLink(result.signature)}`)
        expect(result.err, JSON.stringify(result.logs)).to.equal(null)
    })

    it("N=20 with signer at last index stays under linearly-scaled budget", async () => {
        // Worst-case position (last entry) at a large N catches two
        // regressions in one test: (a) CU growing super-linearly with N
        // (e.g., a buggy nested compare), and (b) reads going past the end
        // of the ix data buffer.
        const others = Array.from(
            { length: 19 },
            () => Keypair.generate().publicKey
        )
        const data = buildIxData(20, [...others, signer.publicKey])
        const tx = await buildSignedTx(data, TX_CU_LARGE)
        const result = await runTx(tx)
        if (result.signature) console.log(`      → ${explorerLink(result.signature)}`)
        expect(result.err, JSON.stringify(result.logs)).to.equal(null)
        const cu = guardCU(result.logs)
        expect(cu, "no guard CU found in logs").to.be.a("number")
        expect(cu!).to.be.at.most(CU_CEILING_LARGE)
        console.log(`      N=20 last-index CU: ${cu} (ceiling ${CU_CEILING_LARGE})`)
    })

    it("fails with exit 1 when signer is not in the list", async () => {
        const data = buildIxData(3, [otherA, otherB, otherC])
        const tx = await buildSignedTx(data, TX_CU_FAIL)
        const result = await runTx(tx)
        if (result.signature) console.log(`      → ${explorerLink(result.signature)}`)
        expect(result.err).to.not.equal(null)
        const logs = result.logs.join("\n")
        expect(logs).to.include("not allowed")
        expect(logs).to.match(/custom program error: 0x1\b/)
    })

    it("fails with exit 1 on empty allowlist (count=0)", async () => {
        const data = buildIxData(0, [])
        const tx = await buildSignedTx(data, TX_CU_FAIL)
        const result = await runTx(tx)
        if (result.signature) console.log(`      → ${explorerLink(result.signature)}`)
        expect(result.err).to.not.equal(null)
        const logs = result.logs.join("\n")
        expect(logs).to.include("not allowed")
        expect(logs).to.match(/custom program error: 0x1\b/)
    })

    it("fails with exit 2 when length doesn't match declared count", async () => {
        // claim count=2 but only ship 1 pubkey (length = 1 + 32 != 1 + 64)
        const data = buildIxData(2, [signer.publicKey])
        const tx = await buildSignedTx(data, TX_CU_FAIL)
        const result = await runTx(tx)
        if (result.signature) console.log(`      → ${explorerLink(result.signature)}`)
        expect(result.err).to.not.equal(null)
        const logs = result.logs.join("\n")
        expect(logs).to.include("bad ix data")
        expect(logs).to.match(/custom program error: 0x2\b/)
    })

    it("fails with exit 2 on trailing junk bytes", async () => {
        // count=1, one pubkey, plus 5 extra bytes of junk
        const data = buildIxData(1, [signer.publicKey], 5)
        const tx = await buildSignedTx(data, TX_CU_FAIL)
        const result = await runTx(tx)
        if (result.signature) console.log(`      → ${explorerLink(result.signature)}`)
        expect(result.err).to.not.equal(null)
        const logs = result.logs.join("\n")
        expect(logs).to.include("bad ix data")
        expect(logs).to.match(/custom program error: 0x2\b/)
    })

    it("fails with exit 3 when account 0 is not marked as signer", async () => {
        // Use a fresh pubkey that isn't a transaction signer. If we reused
        // signer.publicKey here, web3.js would merge it with the fee-payer
        // entry and the compiled tx would mark account 0 as a signer anyway.
        const nonSigner = Keypair.generate().publicKey
        const data = buildIxData(1, [nonSigner])

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
                        pubkey: nonSigner,
                        isSigner: false,
                        isWritable: false,
                    },
                ],
                programId: program,
                data,
            })
        )
        tx.sign(signer)

        const result = await runTx(tx)
        if (result.signature) console.log(`      → ${explorerLink(result.signature)}`)
        expect(result.err).to.not.equal(null)
        const logs = result.logs.join("\n")
        expect(logs).to.include("not signer")
        expect(logs).to.match(/custom program error: 0x3\b/)
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

        const data = buildIxData(2, [otherA, signer.publicKey])

        const block = await connection.getLatestBlockhash()
        const tx = new Transaction()
        tx.feePayer = signer.publicKey
        tx.recentBlockhash = block.blockhash
        tx.lastValidBlockHeight = block.lastValidBlockHeight
        tx.add(ComputeBudgetProgram.setComputeUnitLimit({ units: TX_CU_COMPOSITION }))
        tx.add(guardIx(data))
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
                `\n    CU report → ${cluster.padEnd(8)} signer_allowlist: ${reportedCU} CU (ceiling ${CU_CEILING})\n`
            )
        }
    })
})
