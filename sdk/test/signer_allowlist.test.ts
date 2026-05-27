import { describe, expect, test } from "bun:test"
import { Keypair, PublicKey } from "@solana/web3.js"
import { signerAllowlistIx } from "../src/signer_allowlist"

const PROGRAM = new PublicKey("11111111111111111111111111111111")
const SIGNER = new PublicKey("So11111111111111111111111111111111111111112")
const A = new PublicKey("EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v")
const B = new PublicKey("Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB")

describe("signerAllowlistIx", () => {
    test("returns instruction with given program id", () => {
        const ix = signerAllowlistIx({
            programId: PROGRAM,
            signer: SIGNER,
            allowed: [SIGNER],
        })
        expect(ix.programId.equals(PROGRAM)).toBe(true)
    })

    test("has exactly one account", () => {
        const ix = signerAllowlistIx({
            programId: PROGRAM,
            signer: SIGNER,
            allowed: [SIGNER],
        })
        expect(ix.keys.length).toBe(1)
    })

    test("account 0 is the signer, read-only, and isSigner=true", () => {
        const ix = signerAllowlistIx({
            programId: PROGRAM,
            signer: SIGNER,
            allowed: [SIGNER],
        })
        expect(ix.keys[0].pubkey.equals(SIGNER)).toBe(true)
        expect(ix.keys[0].isSigner).toBe(true)
        expect(ix.keys[0].isWritable).toBe(false)
    })

    test("data length is 1 + 32 * N", () => {
        for (const n of [1, 2, 3, 10, 38]) {
            const allowed = Array.from(
                { length: n },
                () => Keypair.generate().publicKey
            )
            const ix = signerAllowlistIx({
                programId: PROGRAM,
                signer: SIGNER,
                allowed,
            })
            expect(ix.data.length).toBe(1 + 32 * n)
        }
    })

    test("first byte encodes the count", () => {
        const allowed = [A, B, SIGNER]
        const ix = signerAllowlistIx({
            programId: PROGRAM,
            signer: SIGNER,
            allowed,
        })
        expect(ix.data[0]).toBe(3)
    })

    test("allowed pubkeys are concatenated in order after the count byte", () => {
        const allowed = [A, B, SIGNER]
        const ix = signerAllowlistIx({
            programId: PROGRAM,
            signer: SIGNER,
            allowed,
        })
        expect(ix.data.subarray(1, 33).equals(A.toBuffer())).toBe(true)
        expect(ix.data.subarray(33, 65).equals(B.toBuffer())).toBe(true)
        expect(ix.data.subarray(65, 97).equals(SIGNER.toBuffer())).toBe(true)
    })

    test("empty allowlist produces a single zero byte", () => {
        const ix = signerAllowlistIx({
            programId: PROGRAM,
            signer: SIGNER,
            allowed: [],
        })
        expect(ix.data.length).toBe(1)
        expect(ix.data[0]).toBe(0)
    })

    test("max allowed list (N=255) builds successfully", () => {
        const allowed = Array.from(
            { length: 255 },
            () => Keypair.generate().publicKey
        )
        const ix = signerAllowlistIx({
            programId: PROGRAM,
            signer: SIGNER,
            allowed,
        })
        expect(ix.data.length).toBe(1 + 32 * 255)
        expect(ix.data[0]).toBe(255)
    })

    test("rejects allowed list larger than 255 with RangeError", () => {
        const allowed = Array.from(
            { length: 256 },
            () => Keypair.generate().publicKey
        )
        expect(() =>
            signerAllowlistIx({
                programId: PROGRAM,
                signer: SIGNER,
                allowed,
            })
        ).toThrow(RangeError)
    })
})
