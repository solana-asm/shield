/// <reference types="mocha" />

import {
    ComputeBudgetProgram,
    Connection,
    Keypair,
    SystemProgram,
    Transaction,
    TransactionInstruction,
} from "@solana/web3.js"
import { expect } from "chai"
import balanceFloorSeed from "../deploy/balance_floor-keypair.json"
import slotDeadlineSeed from "../deploy/slot_deadline-keypair.json"

const balanceFloorProgram = Keypair.fromSecretKey(
    new Uint8Array(balanceFloorSeed)
).publicKey
const slotDeadlineProgram = Keypair.fromSecretKey(
    new Uint8Array(slotDeadlineSeed)
).publicKey

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

const SYSTEM_PROGRAM_ID = "11111111111111111111111111111111"

const connection = new Connection(RPC_URL, { commitment: "confirmed" })

const u64LE = (n: bigint): Buffer => {
    const b = Buffer.alloc(8)
    b.writeBigUInt64LE(n, 0)
    return b
}

const buildBalanceFloorIx = (
    minLamports: bigint
): TransactionInstruction =>
    new TransactionInstruction({
        keys: [
            {
                pubkey: signer.publicKey,
                isSigner: false,
                isWritable: false,
            },
        ],
        programId: balanceFloorProgram,
        data: u64LE(minLamports),
    })

const buildSlotDeadlineIx = (maxSlot: bigint): TransactionInstruction =>
    new TransactionInstruction({
        keys: [],
        programId: slotDeadlineProgram,
        data: u64LE(maxSlot),
    })

const explorerLink = (sig: string): string => {
    if (cluster === "devnet") return `https://solscan.io/tx/${sig}?cluster=devnet`
    if (cluster === "mainnet") return `https://solscan.io/tx/${sig}`
    return `https://explorer.solana.com/tx/${sig}?cluster=custom&customUrl=${encodeURIComponent(RPC_URL)}`
}

type Outcome = {
    signature?: string
    err: unknown
    logs: string[]
}

const runTx = async (tx: Transaction): Promise<Outcome> => {
    if (MODE === "simulate") {
        const { value } = await connection.simulateTransaction(tx)
        return {
            err: value.err,
            logs: value.logs ?? [],
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
    }
}

describe(`atomicity [${cluster}, MODE=${MODE}]`, function () {
    this.timeout(60_000)

    it("aborts the whole tx the moment a guard exits non-zero", async () => {
        // Tx layout, four top-level instructions, indexed 0..3:
        //   0: ComputeBudget.setComputeUnitLimit              (runs, sets budget)
        //   1: balance_floor with an impossible floor         (FAILS, exit 1)
        //   2: slot_deadline that would pass on its own        (must NOT run)
        //   3: System Program self-transfer of 1 lamport       (must NOT run)
        //
        // If Solana's atomicity holds, ix 1 fails and the runtime stops there.
        // Logs should show ix 0 and ix 1 only. Ixs 2 and 3 should never invoke.

        const slot = await connection.getSlot()
        const block = await connection.getLatestBlockhash()

        const tx = new Transaction()
        tx.feePayer = signer.publicKey
        tx.recentBlockhash = block.blockhash
        tx.lastValidBlockHeight = block.lastValidBlockHeight

        tx.add(ComputeBudgetProgram.setComputeUnitLimit({ units: 30_000 }))

        // impossible_floor = 1e17 lamports (~100M SOL). No wallet has this.
        tx.add(buildBalanceFloorIx(100_000_000_000_000_000n))

        // would pass if it ran (deadline far in the future), but must not run
        tx.add(buildSlotDeadlineIx(BigInt(slot + 1_000)))

        // would also pass if it ran, but must not run
        tx.add(
            SystemProgram.transfer({
                fromPubkey: signer.publicKey,
                toPubkey: signer.publicKey,
                lamports: 1,
            })
        )

        tx.sign(signer)

        const result = await runTx(tx)
        if (result.signature) console.log(`      → ${explorerLink(result.signature)}`)

        // 1. The transaction failed.
        expect(result.err, JSON.stringify(result.err)).to.not.equal(null)

        // 2. The error is an InstructionError pointing at index 1
        //    (balance_floor's position, right after the CU limit at index 0).
        const errObj = result.err as { InstructionError?: [number, unknown] }
        expect(errObj.InstructionError, JSON.stringify(result.err)).to.be.an(
            "array"
        )
        expect(errObj.InstructionError![0]).to.equal(1)

        const logs = result.logs.join("\n")

        // 3. balance_floor was invoked, logged its failure string,
        //    and exited with custom error 0x1.
        expect(logs).to.include(
            `Program ${balanceFloorProgram.toBase58()} invoke [1]`
        )
        expect(logs).to.include("below floor")
        expect(logs).to.match(/custom program error: 0x1\b/)

        // 4. slot_deadline never invoked. The runtime aborted before reaching it.
        expect(logs).to.not.include(
            `Program ${slotDeadlineProgram.toBase58()} invoke`
        )

        // 5. The System Program self-transfer never invoked either.
        expect(logs).to.not.include(`Program ${SYSTEM_PROGRAM_ID} invoke`)
    })
})
