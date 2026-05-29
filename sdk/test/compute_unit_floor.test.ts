import { describe, expect, test } from "bun:test"
import { PublicKey, SYSVAR_INSTRUCTIONS_PUBKEY } from "@solana/web3.js"
import { computeUnitFloorIx } from "../src/compute_unit_floor"

const PROGRAM = new PublicKey("11111111111111111111111111111111")

describe("computeUnitFloorIx", () => {
    test("returns instruction with given program id", () => {
        const ix = computeUnitFloorIx({
            programId: PROGRAM,
            minUnits: 100_000,
        })
        expect(ix.programId.equals(PROGRAM)).toBe(true)
    })

    test("has exactly one account: the Instructions sysvar", () => {
        const ix = computeUnitFloorIx({
            programId: PROGRAM,
            minUnits: 100_000,
        })
        expect(ix.keys.length).toBe(1)
        expect(ix.keys[0].pubkey.equals(SYSVAR_INSTRUCTIONS_PUBKEY)).toBe(true)
        expect(ix.keys[0].isSigner).toBe(false)
        expect(ix.keys[0].isWritable).toBe(false)
    })

    test("data is 4-byte little-endian u32", () => {
        const ix = computeUnitFloorIx({
            programId: PROGRAM,
            minUnits: 50_000,
        })
        expect(ix.data.length).toBe(4)
        expect(ix.data.readUInt32LE(0)).toBe(50_000)
    })

    test("accepts plain number for minUnits", () => {
        const ix = computeUnitFloorIx({
            programId: PROGRAM,
            minUnits: 1_400_000,
        })
        expect(ix.data.readUInt32LE(0)).toBe(1_400_000)
    })

    test("accepts bigint for minUnits", () => {
        const ix = computeUnitFloorIx({
            programId: PROGRAM,
            minUnits: 200_000n,
        })
        expect(ix.data.readUInt32LE(0)).toBe(200_000)
    })

    test("encodes the maximum u32", () => {
        const ix = computeUnitFloorIx({
            programId: PROGRAM,
            minUnits: 0xffffffff,
        })
        expect(ix.data.readUInt32LE(0)).toBe(0xffffffff)
    })

    test("encodes zero", () => {
        const ix = computeUnitFloorIx({
            programId: PROGRAM,
            minUnits: 0,
        })
        expect(ix.data.readUInt32LE(0)).toBe(0)
    })

    test("rejects negative minUnits", () => {
        expect(() =>
            computeUnitFloorIx({
                programId: PROGRAM,
                minUnits: -1,
            })
        ).toThrow(RangeError)
    })

    test("rejects values larger than u32", () => {
        expect(() =>
            computeUnitFloorIx({
                programId: PROGRAM,
                minUnits: 0x100000000,
            })
        ).toThrow(RangeError)
    })
})
