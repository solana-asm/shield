import { PublicKey, TransactionInstruction } from "@solana/web3.js"
import { u64LE } from "./util"

export type BalanceFloorArgs = {
    programId: PublicKey
    account: PublicKey
    minLamports: bigint | number
}

export function balanceFloorIx(args: BalanceFloorArgs): TransactionInstruction {
    return new TransactionInstruction({
        programId: args.programId,
        keys: [
            {
                pubkey: args.account,
                isSigner: false,
                isWritable: false,
            },
        ],
        data: u64LE(args.minLamports),
    })
}
