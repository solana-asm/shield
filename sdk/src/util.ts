export function u64LE(value: bigint | number): Buffer {
    const v = typeof value === "number" ? BigInt(value) : value
    if (v < 0n || v > 0xffffffffffffffffn) {
        throw new RangeError(`u64 out of range: ${v}`)
    }
    const buf = Buffer.alloc(8)
    buf.writeBigUInt64LE(v, 0)
    return buf
}

export function u32LE(value: bigint | number): Buffer {
    const v = typeof value === "number" ? BigInt(value) : value
    if (v < 0n || v > 0xffffffffn) {
        throw new RangeError(`u32 out of range: ${v}`)
    }
    const buf = Buffer.alloc(4)
    buf.writeUInt32LE(Number(v), 0)
    return buf
}
