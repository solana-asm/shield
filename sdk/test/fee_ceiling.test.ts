import { describe, expect, test } from "bun:test"
import { PublicKey, SYSVAR_INSTRUCTIONS_PUBKEY } from "@solana/web3.js"
import { feeCeilingIx } from "../src/fee_ceiling"

const PROGRAM = new PublicKey("11111111111111111111111111111111")

describe("feeCeilingIx", () => {
    test("returns instruction with given program id", () => {
        const ix = feeCeilingIx({
            programId: PROGRAM,
            maxMicroLamports: 0n,
        })
        expect(ix.programId.equals(PROGRAM)).toBe(true)
    })

    test("has exactly one account", () => {
        const ix = feeCeilingIx({
            programId: PROGRAM,
            maxMicroLamports: 0n,
        })
        expect(ix.keys.length).toBe(1)
    })

    test("account 0 is the Instructions sysvar, read-only, non-signer", () => {
        const ix = feeCeilingIx({
            programId: PROGRAM,
            maxMicroLamports: 0n,
        })
        expect(ix.keys[0].pubkey.equals(SYSVAR_INSTRUCTIONS_PUBKEY)).toBe(true)
        expect(ix.keys[0].isWritable).toBe(false)
        expect(ix.keys[0].isSigner).toBe(false)
    })

    test("data is 8-byte little-endian u64", () => {
        const ix = feeCeilingIx({
            programId: PROGRAM,
            maxMicroLamports: 1_000n,
        })
        expect(ix.data.length).toBe(8)
        expect(ix.data.readBigUInt64LE(0)).toBe(1_000n)
    })

    test("accepts plain number for maxMicroLamports", () => {
        const ix = feeCeilingIx({
            programId: PROGRAM,
            maxMicroLamports: 5_000,
        })
        expect(ix.data.readBigUInt64LE(0)).toBe(5_000n)
    })

    test("encodes the maximum u64", () => {
        const max = 0xffffffffffffffffn
        const ix = feeCeilingIx({
            programId: PROGRAM,
            maxMicroLamports: max,
        })
        expect(ix.data.readBigUInt64LE(0)).toBe(max)
    })

    test("rejects negative maxMicroLamports", () => {
        expect(() =>
            feeCeilingIx({
                programId: PROGRAM,
                maxMicroLamports: -1n,
            })
        ).toThrow(RangeError)
    })

    test("rejects values larger than u64", () => {
        expect(() =>
            feeCeilingIx({
                programId: PROGRAM,
                maxMicroLamports: 0x1_0000_0000_0000_0000n,
            })
        ).toThrow(RangeError)
    })
})
