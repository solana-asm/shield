import { describe, expect, test } from "bun:test"
import { PublicKey } from "@solana/web3.js"
import { balanceFloorIx } from "../src/balance_floor"

const PROGRAM = new PublicKey("11111111111111111111111111111111")
const ACCOUNT = new PublicKey("So11111111111111111111111111111111111111112")

describe("balanceFloorIx", () => {
    test("returns instruction with given program id", () => {
        const ix = balanceFloorIx({
            programId: PROGRAM,
            account: ACCOUNT,
            minLamports: 0n,
        })
        expect(ix.programId.equals(PROGRAM)).toBe(true)
    })

    test("has exactly one account", () => {
        const ix = balanceFloorIx({
            programId: PROGRAM,
            account: ACCOUNT,
            minLamports: 0n,
        })
        expect(ix.keys.length).toBe(1)
    })

    test("account is read-only and non-signer", () => {
        const ix = balanceFloorIx({
            programId: PROGRAM,
            account: ACCOUNT,
            minLamports: 0n,
        })
        expect(ix.keys[0].pubkey.equals(ACCOUNT)).toBe(true)
        expect(ix.keys[0].isWritable).toBe(false)
        expect(ix.keys[0].isSigner).toBe(false)
    })

    test("data is 8-byte little-endian u64", () => {
        const ix = balanceFloorIx({
            programId: PROGRAM,
            account: ACCOUNT,
            minLamports: 5_000_000n,
        })
        expect(ix.data.length).toBe(8)
        expect(ix.data.readBigUInt64LE(0)).toBe(5_000_000n)
    })

    test("rejects negative minLamports", () => {
        expect(() =>
            balanceFloorIx({
                programId: PROGRAM,
                account: ACCOUNT,
                minLamports: -1n,
            })
        ).toThrow(RangeError)
    })
})
