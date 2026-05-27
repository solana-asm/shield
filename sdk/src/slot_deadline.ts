import { PublicKey, TransactionInstruction } from "@solana/web3.js"
import { u64LE } from "./util"

export type SlotDeadlineArgs = {
    programId: PublicKey
    maxSlot: bigint | number
}

export function slotDeadlineIx(args: SlotDeadlineArgs): TransactionInstruction {
    return new TransactionInstruction({
        programId: args.programId,
        keys: [],
        data: u64LE(args.maxSlot),
    })
}
