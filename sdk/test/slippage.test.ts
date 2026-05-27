import { describe, expect, test } from "bun:test"
import { PublicKey } from "@solana/web3.js"
import { slippageIx } from "../src/slippage"

const PROGRAM = new PublicKey("11111111111111111111111111111111")
const TOKEN_ACCOUNT = new PublicKey("So11111111111111111111111111111111111111112")

describe("slippageIx", () => {
    test("returns instruction with given program id", () => {
        const ix = slippageIx({
            programId: PROGRAM,
            tokenAccount: TOKEN_ACCOUNT,
            minAmount: 0n,
        })
        expect(ix.programId.equals(PROGRAM)).toBe(true)
    })

    test("has exactly one account", () => {
        const ix = slippageIx({
            programId: PROGRAM,
            tokenAccount: TOKEN_ACCOUNT,
            minAmount: 0n,
        })
        expect(ix.keys.length).toBe(1)
    })

    test("token account is read-only and non-signer", () => {
        const ix = slippageIx({
            programId: PROGRAM,
            tokenAccount: TOKEN_ACCOUNT,
            minAmount: 0n,
        })
        expect(ix.keys[0].pubkey.equals(TOKEN_ACCOUNT)).toBe(true)
        expect(ix.keys[0].isWritable).toBe(false)
        expect(ix.keys[0].isSigner).toBe(false)
    })

    test("data is 8-byte little-endian u64", () => {
        const ix = slippageIx({
            programId: PROGRAM,
            tokenAccount: TOKEN_ACCOUNT,
            minAmount: 1_000_000n,
        })
        expect(ix.data.length).toBe(8)
        expect(ix.data.readBigUInt64LE(0)).toBe(1_000_000n)
    })

    test("rejects negative minAmount", () => {
        expect(() =>
            slippageIx({
                programId: PROGRAM,
                tokenAccount: TOKEN_ACCOUNT,
                minAmount: -1n,
            })
        ).toThrow(RangeError)
    })
})
