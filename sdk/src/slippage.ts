import { PublicKey, TransactionInstruction } from "@solana/web3.js"
import { u64LE } from "./util"

export type SlippageArgs = {
    programId: PublicKey
    tokenAccount: PublicKey
    minAmount: bigint | number
}

export function slippageIx(args: SlippageArgs): TransactionInstruction {
    return new TransactionInstruction({
        programId: args.programId,
        keys: [
            {
                pubkey: args.tokenAccount,
                isSigner: false,
                isWritable: false,
            },
        ],
        data: u64LE(args.minAmount),
    })
}
