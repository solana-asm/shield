export function u64LE(value: bigint | number): Buffer {
    const v = typeof value === "number" ? BigInt(value) : value
    if (v < 0n || v > 0xffffffffffffffffn) {
        throw new RangeError(`u64 out of range: ${v}`)
    }
    const buf = Buffer.alloc(8)
    buf.writeBigUInt64LE(v, 0)
    return buf
}
