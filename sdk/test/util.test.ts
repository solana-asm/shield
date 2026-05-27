import { describe, expect, test } from "bun:test"
import { u64LE } from "../src/util"

describe("u64LE", () => {
    test("encodes zero", () => {
        expect(u64LE(0n).toString("hex")).toBe("0000000000000000")
    })

    test("encodes one byte", () => {
        expect(u64LE(255n).toString("hex")).toBe("ff00000000000000")
    })

    test("encodes max u64", () => {
        expect(u64LE(0xffffffffffffffffn).toString("hex")).toBe("ffffffffffffffff")
    })

    test("encodes little-endian", () => {
        // 0x0102030405060708 little-endian = 08 07 06 05 04 03 02 01
        expect(u64LE(0x0102030405060708n).toString("hex")).toBe(
            "0807060504030201"
        )
    })

    test("accepts number", () => {
        expect(u64LE(12345).toString("hex")).toBe(u64LE(12345n).toString("hex"))
    })

    test("rejects negative", () => {
        expect(() => u64LE(-1n)).toThrow(RangeError)
    })

    test("rejects values above max u64", () => {
        expect(() => u64LE(0x10000000000000000n)).toThrow(RangeError)
    })

    test("output is always 8 bytes", () => {
        expect(u64LE(0n).length).toBe(8)
        expect(u64LE(1n).length).toBe(8)
        expect(u64LE(0xffffffffffffffffn).length).toBe(8)
    })
})
