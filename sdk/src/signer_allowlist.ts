import { PublicKey, TransactionInstruction } from "@solana/web3.js"

export type SignerAllowlistArgs = {
    programId: PublicKey
    signer: PublicKey
    allowed: PublicKey[]
}

export function signerAllowlistIx(
    args: SignerAllowlistArgs
): TransactionInstruction {
    if (args.allowed.length > 255) {
        throw new RangeError(
            `allowed list too large: ${args.allowed.length} > 255 (u8 count field)`
        )
    }
    const data = Buffer.alloc(1 + 32 * args.allowed.length)
    data.writeUInt8(args.allowed.length, 0)
    args.allowed.forEach((pk, i) => {
        pk.toBuffer().copy(data, 1 + i * 32)
    })
    return new TransactionInstruction({
        programId: args.programId,
        keys: [
            {
                pubkey: args.signer,
                isSigner: true,
                isWritable: false,
            },
        ],
        data,
    })
}
