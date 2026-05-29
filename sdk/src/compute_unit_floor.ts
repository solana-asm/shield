import {
    PublicKey,
    SYSVAR_INSTRUCTIONS_PUBKEY,
    TransactionInstruction,
} from "@solana/web3.js"
import { u32LE } from "./util"

export type ComputeUnitFloorArgs = {
    programId: PublicKey
    minUnits: bigint | number
}

export function computeUnitFloorIx(
    args: ComputeUnitFloorArgs
): TransactionInstruction {
    return new TransactionInstruction({
        programId: args.programId,
        keys: [
            {
                pubkey: SYSVAR_INSTRUCTIONS_PUBKEY,
                isSigner: false,
                isWritable: false,
            },
        ],
        data: u32LE(args.minUnits),
    })
}
