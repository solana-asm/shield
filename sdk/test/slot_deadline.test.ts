import { describe, expect, test } from "bun:test"
import { PublicKey } from "@solana/web3.js"
import { slotDeadlineIx } from "../src/slot_deadline"

const PROGRAM = new PublicKey("11111111111111111111111111111111")

describe("slotDeadlineIx", () => {
    test("returns instruction with given program id", () => {
        const ix = slotDeadlineIx({ programId: PROGRAM, maxSlot: 0n })
        expect(ix.programId.equals(PROGRAM)).toBe(true)
    })

    test("has zero accounts", () => {
        const ix = slotDeadlineIx({ programId: PROGRAM, maxSlot: 0n })
        expect(ix.keys.length).toBe(0)
    })

    test("data is 8-byte little-endian u64", () => {
        const ix = slotDeadlineIx({ programId: PROGRAM, maxSlot: 0x42n })
        expect(ix.data.length).toBe(8)
        expect(ix.data.toString("hex")).toBe("4200000000000000")
    })

    test("accepts number for maxSlot", () => {
        const ix = slotDeadlineIx({ programId: PROGRAM, maxSlot: 12345 })
        expect(ix.data.readBigUInt64LE(0)).toBe(12345n)
    })

    test("accepts bigint for maxSlot", () => {
        const ix = slotDeadlineIx({ programId: PROGRAM, maxSlot: 12345n })
        expect(ix.data.readBigUInt64LE(0)).toBe(12345n)
    })

    test("rejects negative maxSlot", () => {
        expect(() =>
            slotDeadlineIx({ programId: PROGRAM, maxSlot: -1n })
        ).toThrow(RangeError)
    })
})
