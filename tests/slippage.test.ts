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
    createMint,
    createTransferInstruction,
    getAssociatedTokenAddressSync,
    getOrCreateAssociatedTokenAccount,
    mintTo,
} from "@solana/spl-token"
import { expect } from "chai"
import programSeed from "../deploy/slippage-keypair.json"

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

const CU_CEILING = 25
const TX_CU_HAPPY = 175
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

const USDC_MINT: Partial<Record<string, string>> = {
    devnet: "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU",
    mainnet: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
}

const connection = new Connection(RPC_URL, { commitment: "confirmed" })

const u64LE = (n: bigint): Buffer => {
    const b = Buffer.alloc(8)
    b.writeBigUInt64LE(n, 0)
    return b
}

const guardIx = (
    tokenAccount: PublicKey,
    data: Buffer
): TransactionInstruction =>
    new TransactionInstruction({
        keys: [
            {
                pubkey: tokenAccount,
                isSigner: false,
                isWritable: false,
            },
        ],
        programId: program,
        data,
    })

const buildSignedTx = async (
    tokenAccount: PublicKey,
    data: Buffer,
    cuLimit: number
): Promise<Transaction> => {
    const block = await connection.getLatestBlockhash()
    const tx = new Transaction()
    tx.feePayer = signer.publicKey
    tx.recentBlockhash = block.blockhash
    tx.lastValidBlockHeight = block.lastValidBlockHeight
    tx.add(ComputeBudgetProgram.setComputeUnitLimit({ units: cuLimit }))
    tx.add(guardIx(tokenAccount, data))
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

describe(`slippage guard [${cluster}, MODE=${MODE}]`, function () {
    this.timeout(60_000)

    let reportedCU: number | undefined
    let tokenMint: PublicKey | null = null
    let tokenAccount: PublicKey | null = null
    let tokenBalance: bigint = 0n

    before(async function () {
        // On local validator: mint a throwaway test token + ATA + balance.
        // On devnet/mainnet: use the real USDC mint and the signer's ATA.
        if (cluster === "local") {
            tokenMint = await createMint(
                connection,
                signer,
                signer.publicKey,
                null,
                6
            )
            const ata = await getOrCreateAssociatedTokenAccount(
                connection,
                signer,
                tokenMint,
                signer.publicKey
            )
            await mintTo(
                connection,
                signer,
                tokenMint,
                ata.address,
                signer.publicKey,
                1_000_000n
            )
            tokenAccount = ata.address
            tokenBalance = 1_000_000n
            console.log(
                `      minted local test token at ${tokenAccount.toBase58()} with ${tokenBalance} base units`
            )
            return
        }

        const mintAddr = USDC_MINT[cluster]
        if (!mintAddr) {
            console.log(`      skip: no token configured for ${cluster}`)
            return this.skip()
        }

        tokenMint = new PublicKey(mintAddr)
        const ata = getAssociatedTokenAddressSync(tokenMint, signer.publicKey)

        const bal = await connection.getTokenAccountBalance(ata).catch(() => null)
        if (!bal) {
            console.log(`      skip: signer has no token ATA at ${ata.toBase58()}`)
            return this.skip()
        }

        tokenAccount = ata
        tokenBalance = BigInt(bal.value.amount)
        console.log(`      using ${ata.toBase58()} with ${tokenBalance} base units`)
    })

    it("succeeds when token.amount >= min", async () => {
        const tx = await buildSignedTx(tokenAccount!, u64LE(0n), TX_CU_HAPPY)
        const result = await runTx(tx)
        if (result.signature) console.log(`      → ${explorerLink(result.signature)}`)
        expect(result.err, JSON.stringify(result.logs)).to.equal(null)
        reportedCU = guardCU(result.logs)
        expect(reportedCU, "no guard CU found in logs").to.be.a("number")
        expect(reportedCU!).to.be.at.most(CU_CEILING)
    })

    it("fails with exit 1 when token.amount < min", async () => {
        const tx = await buildSignedTx(tokenAccount!, u64LE(0xffffffffffffffffn), TX_CU_FAIL)
        const result = await runTx(tx)
        if (result.signature) console.log(`      → ${explorerLink(result.signature)}`)
        expect(result.err).to.not.equal(null)
        const logs = result.logs.join("\n")
        expect(logs).to.include("insufficient")
        expect(logs).to.match(/custom program error: 0x1\b/)
    })

    it("fails with exit 2 on malformed instruction data", async () => {
        const tx = await buildSignedTx(tokenAccount!, Buffer.alloc(7), TX_CU_FAIL)
        const result = await runTx(tx)
        if (result.signature) console.log(`      → ${explorerLink(result.signature)}`)
        expect(result.err).to.not.equal(null)
        const logs = result.logs.join("\n")
        expect(logs).to.include("bad ix data")
        expect(logs).to.match(/custom program error: 0x2\b/)
    })

    it("composes guard + token transfer", async function () {
        if (MODE !== "send") return this.skip()
        if (!tokenAccount || !tokenMint) return this.skip()

        const TRANSFER_AMOUNT = 1_000n
        if (tokenBalance < TRANSFER_AMOUNT * 2n) {
            console.log(`      skip: balance ${tokenBalance} below 2 * transfer`)
            return this.skip()
        }
        const MIN_AMOUNT = tokenBalance / 2n

        const recipient = Keypair.generate().publicKey
        const recipientAta = getAssociatedTokenAddressSync(tokenMint, recipient)

        const block = await connection.getLatestBlockhash()
        const tx = new Transaction()
        tx.feePayer = signer.publicKey
        tx.recentBlockhash = block.blockhash
        tx.lastValidBlockHeight = block.lastValidBlockHeight
        tx.add(ComputeBudgetProgram.setComputeUnitLimit({ units: TX_CU_COMPOSITION }))
        tx.add(guardIx(tokenAccount, u64LE(MIN_AMOUNT)))
        tx.add(
            createAssociatedTokenAccountIdempotentInstruction(
                signer.publicKey,
                recipientAta,
                recipient,
                tokenMint
            )
        )
        tx.add(
            createTransferInstruction(
                tokenAccount,
                recipientAta,
                signer.publicKey,
                TRANSFER_AMOUNT
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
                `\n    CU report → ${cluster.padEnd(8)} slippage: ${reportedCU} CU (ceiling ${CU_CEILING})\n`
            )
        }
    })
})
