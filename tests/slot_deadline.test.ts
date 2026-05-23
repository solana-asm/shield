/// <reference types="mocha" />

import {
    Connection,
    Keypair,
    Transaction,
    TransactionInstruction,
} from "@solana/web3.js"
import { expect } from "chai"
import programSeed from "../deploy/slot_deadline-keypair.json"

const programKeypair = Keypair.fromSecretKey(new Uint8Array(programSeed))
const program = programKeypair.publicKey
const signerSeed = JSON.parse(process.env.SIGNER!)
const signer = Keypair.fromSecretKey(new Uint8Array(signerSeed))

const connection = new Connection(
    process.env.RPC_URL ?? "http://127.0.0.1:8899",
    { commitment: "confirmed" }
)

// max_slot as little-endian u64
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

const buildSignedTx = async (
    data: Buffer
): Promise<Transaction> => {
    const block = await connection.getLatestBlockhash()
    const tx = new Transaction()
    tx.feePayer = signer.publicKey
    tx.recentBlockhash = block.blockhash
    tx.lastValidBlockHeight = block.lastValidBlockHeight
    tx.add(guardIx(data))
    tx.sign(signer)
    return tx
}

describe("slot_deadline guard", () => {
    it("succeeds when current_slot <= max_slot", async () => {
        const currentSlot = await connection.getSlot()
        const tx = await buildSignedTx(u64LE(BigInt(currentSlot + 100)))
        const sim = await connection.simulateTransaction(tx)
        expect(sim.value.err, JSON.stringify(sim.value.logs)).to.equal(null)
    })

    it("fails with exit 1 when current_slot > max_slot", async () => {
        const tx = await buildSignedTx(u64LE(0n))
        const sim = await connection.simulateTransaction(tx)
        expect(sim.value.err).to.not.equal(null)
        const logs = (sim.value.logs ?? []).join("\n")
        expect(logs).to.include("deadline missed")
        expect(logs).to.match(/custom program error: 0x1\b/)
    })

    it("fails with exit 2 on malformed instruction data", async () => {
        const tx = await buildSignedTx(Buffer.alloc(7))
        const sim = await connection.simulateTransaction(tx)
        expect(sim.value.err).to.not.equal(null)
        const logs = (sim.value.logs ?? []).join("\n")
        expect(logs).to.include("bad ix data")
        expect(logs).to.match(/custom program error: 0x2\b/)
    })
})
