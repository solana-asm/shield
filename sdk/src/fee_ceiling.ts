import {
    SYSVAR_INSTRUCTIONS_PUBKEY,
    PublicKey,
    TransactionInstruction,
} from "@solana/web3.js"
import { u64LE } from "./util"

export type FeeCeilingArgs = {
    programId: PublicKey
    maxMicroLamports: bigint | number
}

export function feeCeilingIx(args: FeeCeilingArgs): TransactionInstruction {
    return new TransactionInstruction({
        programId: args.programId,
        keys: [
            {
                pubkey: SYSVAR_INSTRUCTIONS_PUBKEY,
                isSigner: false,
                isWritable: false,
            },
        ],
        data: u64LE(args.maxMicroLamports),
    })
}
