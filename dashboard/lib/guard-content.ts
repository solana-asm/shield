export type AssemblyBlock = {
  startLine: number;
  endLine: number;
  title: string;
  commentary: string[];
};

export type ExitCode = {
  code: 0 | 1 | 2 | 3;
  name: string;
  log?: string;
};

export type GuardContent = {
  detailed: boolean;
  description: string[];
  example: string;
  exampleNote?: string;
  assembly?: string;
  blocks?: AssemblyBlock[];
  exits: ExitCode[];
  sourceLinks: {
    assembly: string;
    test: string;
    example?: string;
  };
};

// -------- slot_deadline --------

const SLOT_DEADLINE_ASM = `.equ INSTRUCTION_DATA_LEN, 0x0008
.equ INSTRUCTION_DATA,     0x0010
.equ CLOCK_BUF_SIZE,       40
.equ CLOCK_SLOT_OFF,       0

.globl entrypoint
entrypoint:
  ldxdw r2, [r1 + INSTRUCTION_DATA_LEN]
  jne r2, 8, bad_ix_data

  ldxdw r6, [r1 + INSTRUCTION_DATA]

  mov64 r1, r10
  sub64 r1, CLOCK_BUF_SIZE
  call sol_get_clock_sysvar

  mov64 r2, r10
  sub64 r2, CLOCK_BUF_SIZE
  ldxdw r3, [r2 + CLOCK_SLOT_OFF]

  jgt r3, r6, deadline_missed

  mov64 r0, 0
  exit

deadline_missed:
  lddw r1, msg_late
  mov64 r2, 15
  call sol_log_
  mov64 r0, 1
  exit

bad_ix_data:
  lddw r1, msg_bad
  mov64 r2, 11
  call sol_log_
  mov64 r0, 2
  exit

.rodata
  msg_late: .ascii "deadline missed"
  msg_bad:  .ascii "bad ix data"`;

// -------- balance_floor --------

const BALANCE_FLOOR_ASM = `.equ INSTRUCTION_DATA_LEN, 0x2868
.equ INSTRUCTION_DATA,     0x2870
.equ ACCT0_LAMPORTS,       0x0050

.globl entrypoint
entrypoint:
  ldxdw r2, [r1 + INSTRUCTION_DATA_LEN]
  jne r2, 8, bad_ix_data

  ldxdw r3, [r1 + ACCT0_LAMPORTS]
  ldxdw r4, [r1 + INSTRUCTION_DATA]

  jlt r3, r4, below_floor

  mov64 r0, 0
  exit

below_floor:
  lddw r1, msg_below
  mov64 r2, 11
  call sol_log_
  mov64 r0, 1
  exit

bad_ix_data:
  lddw r1, msg_bad
  mov64 r2, 11
  call sol_log_
  mov64 r0, 2
  exit

.rodata
  msg_below: .ascii "below floor"
  msg_bad:   .ascii "bad ix data"`;

// -------- slippage --------

const SLIPPAGE_ASM = `.equ INSTRUCTION_DATA_LEN, 0x2910
.equ INSTRUCTION_DATA,     0x2918
.equ ACCT0_TOKEN_AMOUNT,   0x00A0

.globl entrypoint
entrypoint:
  ldxdw r2, [r1 + INSTRUCTION_DATA_LEN]
  jne r2, 8, bad_ix_data

  ldxdw r3, [r1 + ACCT0_TOKEN_AMOUNT]
  ldxdw r4, [r1 + INSTRUCTION_DATA]

  jlt r3, r4, insufficient

  mov64 r0, 0
  exit

insufficient:
  lddw r1, msg_insufficient
  mov64 r2, 12
  call sol_log_
  mov64 r0, 1
  exit

bad_ix_data:
  lddw r1, msg_bad
  mov64 r2, 11
  call sol_log_
  mov64 r0, 2
  exit

.rodata
  msg_insufficient: .ascii "insufficient"
  msg_bad:          .ascii "bad ix data"`;

// -------- signer_allowlist --------

const SIGNER_ALLOWLIST_ASM = `.equ INSTRUCTION_DATA_LEN, 0x2868
.equ INSTRUCTION_DATA,     0x2870
.equ ALLOWED_PUBKEYS,      0x2871
.equ ACCT0_IS_SIGNER,      0x0009
.equ ACCT0_PUBKEY_0,       0x0010
.equ ACCT0_PUBKEY_1,       0x0018
.equ ACCT0_PUBKEY_2,       0x0020
.equ ACCT0_PUBKEY_3,       0x0028

.globl entrypoint
entrypoint:
  ldxb r2, [r1 + ACCT0_IS_SIGNER]
  jne r2, 1, not_signer

  ldxb r2, [r1 + INSTRUCTION_DATA]
  jeq r2, 0, not_allowed

  ldxdw r3, [r1 + INSTRUCTION_DATA_LEN]
  mov64 r4, r2
  lsh64 r4, 5
  add64 r4, 1
  jne r3, r4, bad_ix_data

  ldxdw r6, [r1 + ACCT0_PUBKEY_0]
  ldxdw r7, [r1 + ACCT0_PUBKEY_1]
  ldxdw r8, [r1 + ACCT0_PUBKEY_2]
  ldxdw r9, [r1 + ACCT0_PUBKEY_3]

  mov64 r3, r1
  add64 r3, ALLOWED_PUBKEYS

check:
  ldxdw r4, [r3 + 0]
  jne r4, r6, advance
  ldxdw r4, [r3 + 8]
  jne r4, r7, advance
  ldxdw r4, [r3 + 16]
  jne r4, r8, advance
  ldxdw r4, [r3 + 24]
  jne r4, r9, advance

  mov64 r0, 0
  exit

advance:
  add64 r3, 32
  sub64 r2, 1
  jne r2, 0, check

not_allowed:
  lddw r1, msg_not_allowed
  mov64 r2, 11
  call sol_log_
  mov64 r0, 1
  exit

not_signer:
  lddw r1, msg_not_signer
  mov64 r2, 10
  call sol_log_
  mov64 r0, 3
  exit

bad_ix_data:
  lddw r1, msg_bad
  mov64 r2, 11
  call sol_log_
  mov64 r0, 2
  exit

.rodata
  msg_not_allowed: .ascii "not allowed"
  msg_not_signer:  .ascii "not signer"
  msg_bad:         .ascii "bad ix data"`;

// -------- fee_ceiling --------

const FEE_CEILING_ASM = `.equ ACCT0_KEY,             0x0010
.equ ACCT0_DATA_LEN,        0x0058
.equ ACCT0_DATA,            0x0060

.equ EXPECTED_IX_DATA_LEN,  8
.equ CB_PRICE_IX_LEN,       9
.equ SET_CU_PRICE_DISC,     3

.globl entrypoint
entrypoint:
  lddw r2, sysvar_ix_key
  ldxdw r3, [r1 + ACCT0_KEY + 0]
  ldxdw r4, [r2 + 0]
  jne r3, r4, bad_account
  ldxdw r3, [r1 + ACCT0_KEY + 8]
  ldxdw r4, [r2 + 8]
  jne r3, r4, bad_account
  ldxdw r3, [r1 + ACCT0_KEY + 16]
  ldxdw r4, [r2 + 16]
  jne r3, r4, bad_account
  ldxdw r3, [r1 + ACCT0_KEY + 24]
  ldxdw r4, [r2 + 24]
  jne r3, r4, bad_account

  ldxdw r2, [r1 + ACCT0_DATA_LEN]
  mov64 r3, r1
  add64 r3, ACCT0_DATA

  mov64 r4, r3
  add64 r4, r2
  sub64 r4, 2
  ldxh r5, [r4 + 0]

  mov64 r4, r5
  lsh64 r4, 1
  add64 r4, r3
  ldxh r9, [r4 + 2]

  mov64 r4, r3
  add64 r4, r9

  ldxh r5, [r4 + 0]
  mov64 r9, r5
  mul64 r9, 33
  add64 r9, 34
  add64 r9, r4

  ldxh r5, [r9 + 0]
  jne r5, EXPECTED_IX_DATA_LEN, bad_ix_data
  ldxdw r6, [r9 + 2]

  ldxh r8, [r3 + 0]
  mov64 r7, 0

loop:
  jge r7, r8, ok

  mov64 r4, r7
  lsh64 r4, 1
  add64 r4, r3
  ldxh r5, [r4 + 2]

  mov64 r9, r3
  add64 r9, r5

  ldxh r4, [r9 + 0]

  mov64 r5, r4
  mul64 r5, 33
  add64 r5, r9
  add64 r5, 2

  lddw r4, cb_program_id

  ldxdw r0, [r5 + 0]
  ldxdw r1, [r4 + 0]
  jne r0, r1, next_ix

  ldxdw r0, [r5 + 8]
  ldxdw r1, [r4 + 8]
  jne r0, r1, next_ix

  ldxdw r0, [r5 + 16]
  ldxdw r1, [r4 + 16]
  jne r0, r1, next_ix

  ldxdw r0, [r5 + 24]
  ldxdw r1, [r4 + 24]
  jne r0, r1, next_ix

  ldxh r4, [r5 + 32]
  jne r4, CB_PRICE_IX_LEN, next_ix

  ldxb r4, [r5 + 34]
  jne r4, SET_CU_PRICE_DISC, next_ix

  ldxdw r4, [r5 + 35]
  jgt r4, r6, fee_too_high

next_ix:
  add64 r7, 1
  ja loop

ok:
  mov64 r0, 0
  exit

fee_too_high:
  lddw r1, msg_high
  mov64 r2, 12
  call sol_log_
  mov64 r0, 1
  exit

bad_ix_data:
  lddw r1, msg_bad
  mov64 r2, 11
  call sol_log_
  mov64 r0, 2
  exit

bad_account:
  lddw r1, msg_acct
  mov64 r2, 11
  call sol_log_
  mov64 r0, 3
  exit

.rodata
  sysvar_ix_key:  .byte 0x06, 0xa7, 0xd5, 0x17, 0x18, 0x7b, 0xd1, 0x66, 0x35, 0xda, 0xd4, 0x04, 0x55, 0xfd, 0xc2, 0xc0, 0xc1, 0x24, 0xc6, 0x8f, 0x21, 0x56, 0x75, 0xa5, 0xdb, 0xba, 0xcb, 0x5f, 0x08, 0x00, 0x00, 0x00
  cb_program_id:  .byte 0x03, 0x06, 0x46, 0x6f, 0xe5, 0x21, 0x17, 0x32, 0xff, 0xec, 0xad, 0xba, 0x72, 0xc3, 0x9b, 0xe7, 0xbc, 0x8c, 0xe5, 0xbb, 0xc5, 0xf7, 0x12, 0x6b, 0x2c, 0x43, 0x9b, 0x3a, 0x40, 0x00, 0x00, 0x00
  msg_high:       .ascii "fee too high"
  msg_bad:        .ascii "bad ix data"
  msg_acct:       .ascii "bad account"`;

// -------- program_allowlist --------

const PROGRAM_ALLOWLIST_ASM = `.equ ACCT0_KEY,             0x0010
.equ ACCT0_DATA_LEN,        0x0058
.equ ACCT0_DATA,            0x0060

.globl entrypoint
entrypoint:
  lddw r2, sysvar_ix_key
  ldxdw r3, [r1 + ACCT0_KEY + 0]
  ldxdw r4, [r2 + 0]
  jne r3, r4, bad_account
  ldxdw r3, [r1 + ACCT0_KEY + 8]
  ldxdw r4, [r2 + 8]
  jne r3, r4, bad_account
  ldxdw r3, [r1 + ACCT0_KEY + 16]
  ldxdw r4, [r2 + 16]
  jne r3, r4, bad_account
  ldxdw r3, [r1 + ACCT0_KEY + 24]
  ldxdw r4, [r2 + 24]
  jne r3, r4, bad_account

  ldxdw r2, [r1 + ACCT0_DATA_LEN]
  mov64 r3, r1
  add64 r3, ACCT0_DATA

  mov64 r4, r3
  add64 r4, r2
  sub64 r4, 2
  ldxh r9, [r4 + 0]

  ldxh r8, [r3 + 0]

  mov64 r2, r9
  lsh64 r2, 1
  add64 r2, r3
  ldxh r4, [r2 + 2]
  add64 r4, r3

  ldxh r2, [r4 + 0]
  mul64 r2, 33
  add64 r2, 34
  add64 r4, r2

  ldxh r2, [r4 + 0]
  add64 r4, 2

  ldxb r6, [r4 + 0]
  jeq r6, 0, not_allowed

  mov64 r5, r6
  lsh64 r5, 5
  add64 r5, 1
  jne r2, r5, bad_ix_data

  mov64 r5, r4
  add64 r5, 1

  mov64 r2, r6
  lsh64 r2, 5
  mov64 r6, r5
  add64 r6, r2

  mov64 r7, 0

loop:
  jge r7, r8, ok

  jeq r7, r9, advance_outer

  mov64 r2, r7
  lsh64 r2, 1
  add64 r2, r3
  ldxh r4, [r2 + 2]
  add64 r4, r3

  ldxh r2, [r4 + 0]
  mul64 r2, 33
  add64 r2, 2
  add64 r4, r2
  mov64 r1, r4

  mov64 r2, r5

check_inner:
  ldxdw r0, [r1 + 0]
  ldxdw r4, [r2 + 0]
  jne r0, r4, advance_inner
  ldxdw r0, [r1 + 8]
  ldxdw r4, [r2 + 8]
  jne r0, r4, advance_inner
  ldxdw r0, [r1 + 16]
  ldxdw r4, [r2 + 16]
  jne r0, r4, advance_inner
  ldxdw r0, [r1 + 24]
  ldxdw r4, [r2 + 24]
  jne r0, r4, advance_inner

  ja advance_outer

advance_inner:
  add64 r2, 32
  jge r2, r6, not_allowed
  ja check_inner

advance_outer:
  add64 r7, 1
  ja loop

ok:
  mov64 r0, 0
  exit

not_allowed:
  lddw r1, msg_not_allowed
  mov64 r2, 11
  call sol_log_
  mov64 r0, 1
  exit

bad_ix_data:
  lddw r1, msg_bad
  mov64 r2, 11
  call sol_log_
  mov64 r0, 2
  exit

bad_account:
  lddw r1, msg_acct
  mov64 r2, 11
  call sol_log_
  mov64 r0, 3
  exit

.rodata
  sysvar_ix_key:    .byte 0x06, 0xa7, 0xd5, 0x17, 0x18, 0x7b, 0xd1, 0x66, 0x35, 0xda, 0xd4, 0x04, 0x55, 0xfd, 0xc2, 0xc0, 0xc1, 0x24, 0xc6, 0x8f, 0x21, 0x56, 0x75, 0xa5, 0xdb, 0xba, 0xcb, 0x5f, 0x08, 0x00, 0x00, 0x00
  msg_not_allowed:  .ascii "not allowed"
  msg_bad:          .ascii "bad ix data"
  msg_acct:         .ascii "bad account"`;

// -------- compute_unit_floor --------

const COMPUTE_UNIT_FLOOR_ASM = `.equ ACCT0_KEY,             0x0010
.equ ACCT0_DATA_LEN,        0x0058
.equ ACCT0_DATA,            0x0060

.equ EXPECTED_IX_DATA_LEN,  4
.equ CB_LIMIT_IX_LEN,       5
.equ SET_CU_LIMIT_DISC,     2

.globl entrypoint
entrypoint:
  lddw r2, sysvar_ix_key
  ldxdw r3, [r1 + ACCT0_KEY + 0]
  ldxdw r4, [r2 + 0]
  jne r3, r4, bad_account
  ldxdw r3, [r1 + ACCT0_KEY + 8]
  ldxdw r4, [r2 + 8]
  jne r3, r4, bad_account
  ldxdw r3, [r1 + ACCT0_KEY + 16]
  ldxdw r4, [r2 + 16]
  jne r3, r4, bad_account
  ldxdw r3, [r1 + ACCT0_KEY + 24]
  ldxdw r4, [r2 + 24]
  jne r3, r4, bad_account

  ldxdw r2, [r1 + ACCT0_DATA_LEN]
  mov64 r3, r1
  add64 r3, ACCT0_DATA

  mov64 r4, r3
  add64 r4, r2
  sub64 r4, 2
  ldxh r5, [r4 + 0]

  mov64 r4, r5
  lsh64 r4, 1
  add64 r4, r3
  ldxh r9, [r4 + 2]

  mov64 r4, r3
  add64 r4, r9

  ldxh r5, [r4 + 0]
  mov64 r9, r5
  mul64 r9, 33
  add64 r9, 34
  add64 r9, r4

  ldxh r5, [r9 + 0]
  jne r5, EXPECTED_IX_DATA_LEN, bad_ix_data
  ldxw r6, [r9 + 2]

  ldxh r8, [r3 + 0]
  mov64 r7, 0
  mov64 r2, 0

loop:
  jge r7, r8, check_found

  mov64 r4, r7
  lsh64 r4, 1
  add64 r4, r3
  ldxh r5, [r4 + 2]

  mov64 r9, r3
  add64 r9, r5

  ldxh r4, [r9 + 0]

  mov64 r5, r4
  mul64 r5, 33
  add64 r5, r9
  add64 r5, 2

  lddw r4, cb_program_id

  ldxdw r0, [r5 + 0]
  ldxdw r1, [r4 + 0]
  jne r0, r1, next_ix

  ldxdw r0, [r5 + 8]
  ldxdw r1, [r4 + 8]
  jne r0, r1, next_ix

  ldxdw r0, [r5 + 16]
  ldxdw r1, [r4 + 16]
  jne r0, r1, next_ix

  ldxdw r0, [r5 + 24]
  ldxdw r1, [r4 + 24]
  jne r0, r1, next_ix

  ldxh r4, [r5 + 32]
  jne r4, CB_LIMIT_IX_LEN, next_ix

  ldxb r4, [r5 + 34]
  jne r4, SET_CU_LIMIT_DISC, next_ix

  ldxw r4, [r5 + 35]
  jlt r4, r6, cu_too_low

  mov64 r2, 1

next_ix:
  add64 r7, 1
  ja loop

check_found:
  jeq r2, 0, cu_too_low

ok:
  mov64 r0, 0
  exit

cu_too_low:
  lddw r1, msg_low
  mov64 r2, 10
  call sol_log_
  mov64 r0, 1
  exit

bad_ix_data:
  lddw r1, msg_bad
  mov64 r2, 11
  call sol_log_
  mov64 r0, 2
  exit

bad_account:
  lddw r1, msg_acct
  mov64 r2, 11
  call sol_log_
  mov64 r0, 3
  exit

.rodata
  sysvar_ix_key:  .byte 0x06, 0xa7, 0xd5, 0x17, 0x18, 0x7b, 0xd1, 0x66, 0x35, 0xda, 0xd4, 0x04, 0x55, 0xfd, 0xc2, 0xc0, 0xc1, 0x24, 0xc6, 0x8f, 0x21, 0x56, 0x75, 0xa5, 0xdb, 0xba, 0xcb, 0x5f, 0x08, 0x00, 0x00, 0x00
  cb_program_id:  .byte 0x03, 0x06, 0x46, 0x6f, 0xe5, 0x21, 0x17, 0x32, 0xff, 0xec, 0xad, 0xba, 0x72, 0xc3, 0x9b, 0xe7, 0xbc, 0x8c, 0xe5, 0xbb, 0xc5, 0xf7, 0x12, 0x6b, 0x2c, 0x43, 0x9b, 0x3a, 0x40, 0x00, 0x00, 0x00
  msg_low:        .ascii "cu too low"
  msg_bad:        .ascii "bad ix data"
  msg_acct:       .ascii "bad account"`;

// -------- TS examples --------

const SLIPPAGE_EXAMPLE = `import { Connection, PublicKey, Transaction } from "@solana/web3.js"
import { slippageIx } from "@solana-asm/shield"

const SLIPPAGE = new PublicKey("SLDChznvxmWVQpGQbweD1oXK8KcaxgaCD1qyDWB3Tps")

const tx = new Transaction()

// Run the swap first, then verify the user actually received what they signed for.
tx.add(yourSwapInstruction)

tx.add(slippageIx({
  programId: SLIPPAGE,
  tokenAccount: userUsdcAta,
  minAmount: 150_000_000n, // 150 USDC, six decimals
}))`;

const SLOT_DEADLINE_EXAMPLE = `import { slotDeadlineIx } from "@solana-asm/shield"
import { PublicKey, Transaction } from "@solana/web3.js"

const SLOT_DEADLINE = new PublicKey("SLDyTxMbunLA51WADZKpXNZ49mFnhsPxtZSp4Rbr4ja")

const slot = await connection.getSlot()

const tx = new Transaction()
tx.add(slotDeadlineIx({
  programId: SLOT_DEADLINE,
  maxSlot: BigInt(slot + 100),
}))
tx.add(yourDestinationInstruction)`;

const BALANCE_FLOOR_EXAMPLE = `import { balanceFloorIx } from "@solana-asm/shield"
import { PublicKey, Transaction } from "@solana/web3.js"

const BALANCE_FLOOR = new PublicKey("SLDwNtfXVRXuW29kMWLkvs8QX6xkdg8qjPuV6WQ25Hb")

const tx = new Transaction()
tx.add(balanceFloorIx({
  programId: BALANCE_FLOOR,
  account: signer.publicKey,
  minLamports: 1_000_000n,
}))
tx.add(yourDestinationInstruction)`;

const SIGNER_ALLOWLIST_EXAMPLE = `import { signerAllowlistIx } from "@solana-asm/shield"
import { PublicKey, Transaction } from "@solana/web3.js"

const SIGNER_ALLOWLIST = new PublicKey("SLDPp75MazNodaDGQVqduNNGYYbJVYk3EKWLFppYtvh")

const tx = new Transaction()
tx.add(signerAllowlistIx({
  programId: SIGNER_ALLOWLIST,
  signer: keeper.publicKey,
  allowed: [keeperA.publicKey, keeperB.publicKey, keeperC.publicKey],
}))
tx.add(yourDestinationInstruction)`;

const FEE_CEILING_EXAMPLE = `import { feeCeilingIx } from "@solana-asm/shield"
import { ComputeBudgetProgram, PublicKey, Transaction } from "@solana/web3.js"

const FEE_CEILING = new PublicKey("SLDM7koS4UYLni15NGVoNW1DMG8ueZJmcGAA6UqMzQQ")

const tx = new Transaction()
tx.add(ComputeBudgetProgram.setComputeUnitLimit({ units: 30_000 }))
tx.add(ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 500 }))
tx.add(feeCeilingIx({
  programId: FEE_CEILING,
  maxMicroLamports: 1_000n,
}))
tx.add(yourDestinationInstruction)`;

const PROGRAM_ALLOWLIST_EXAMPLE = `import { programAllowlistIx } from "@solana-asm/shield"
import { ComputeBudgetProgram, PublicKey, Transaction } from "@solana/web3.js"

const PROGRAM_ALLOWLIST = new PublicKey("SLDHxogaum69jT7C8V4jV16AK7jnuQM8y8EfCJ9RGeK")

const tx = new Transaction()
tx.add(programAllowlistIx({
  programId: PROGRAM_ALLOWLIST,
  allowed: [JUPITER_V6, ComputeBudgetProgram.programId],
}))
tx.add(yourDestinationInstruction)`;

const COMPUTE_UNIT_FLOOR_EXAMPLE = `import { computeUnitFloorIx } from "@solana-asm/shield"
import { ComputeBudgetProgram, PublicKey, Transaction } from "@solana/web3.js"

const COMPUTE_UNIT_FLOOR = new PublicKey("SLDfqR7EtW1Fgb8y8oEM6aFuho6Yccf8a3j2ebrGQEy")

const tx = new Transaction()
tx.add(ComputeBudgetProgram.setComputeUnitLimit({ units: 200_000 }))
tx.add(computeUnitFloorIx({
  programId: COMPUTE_UNIT_FLOOR,
  minUnits: 100_000,
}))
tx.add(yourDestinationInstruction)`;

// -------- guardContent --------

export const guardContent: Record<string, GuardContent | undefined> = {
  slot_deadline: {
    detailed: true,
    description: [
      "slot_deadline answers one question: is the current slot still at or before the deadline you signed for? If yes, continue. If no, abort the whole transaction atomically.",
      "Useful for off-chain-signed intents that go stale. The keeper that lands the tx is not the entity that signed it; if it lands late, slot_deadline catches it. Pair with signer_allowlist to bound who can submit and how long the intent stays valid.",
      "Zero accounts, one syscall, 152 CU on the happy path. The syscall (sol_get_clock_sysvar) is what costs the bulk of it; the comparison itself is one instruction.",
    ],
    example: SLOT_DEADLINE_EXAMPLE,
    assembly: SLOT_DEADLINE_ASM,
    blocks: [
      {
        startLine: 1,
        endLine: 4,
        title: "Four offset constants",
        commentary: [
          "Four constants name the byte offsets and sizes this guard touches. The pattern: declare the offsets up front, then read them by name.",
          "INSTRUCTION_DATA_LEN = 0x0008 and INSTRUCTION_DATA = 0x0010. slot_deadline declares ZERO accounts, so the aligned loader does not place any per-account region before the ix metadata; it sits at the very front of the input region. Compare to the other Shield guards: declaring even one account pushes these offsets out to 0x2868 / 0x2870, and a token account with data pushes them further still (slippage is at 0x2910).",
          "CLOCK_BUF_SIZE = 40. The Clock sysvar (Solana's runtime-maintained struct of timing data, serializes to exactly 40 bytes: slot (u64), epoch_start_timestamp (i64), epoch (u64), leader_schedule_epoch (u64), unix_timestamp (i64). We need 40 bytes of writable memory to receive a copy of it from the runtime.",
          "CLOCK_SLOT_OFF = 0, slot is the first field in the Clock struct, so it lives at offset 0 of the buffer the syscall fills.",
        ],
      },
      {
        startLine: 8,
        endLine: 9,
        title: "Validate ix data shape",
        commentary: [
          "Standard length gate. Read the u64 ix_data_len the runtime wrote at offset INSTRUCTION_DATA_LEN into r2, branch to bad_ix_data if it is not exactly 8.",
          "We expect one u64 LE max_slot, no more, no less. A 7-byte input would leave the high byte of the u64 as garbage; a 9-byte input might sneak past a looser SDK check. Strict equality kills both attacks.",
        ],
      },
      {
        startLine: 11,
        endLine: 11,
        title: "Cache the deadline",
        commentary: [
          "ldxdw r6, [r1 + INSTRUCTION_DATA] loads the caller's max_slot into r6. Why specifically r6? Because we are about to make a syscall. The syscall ABI may clobber r1-r5 (the argument registers). r6-r9 are callee-saved, the runtime guarantees they survive the call. Putting our deadline in r6 means we still have it after sol_get_clock_sysvar returns.",
        ],
      },
      {
        startLine: 13,
        endLine: 15,
        title: "Reserve stack, call sol_get_clock_sysvar",
        commentary: [
          "Stack-allocate a 40-byte buffer to receive the Clock data. r10 is the stack frame pointer; subtracting CLOCK_BUF_SIZE from it gives a pointer to the bottom of a 40-byte slot at the top of our stack frame (sBPF stacks grow downward, same convention as x86).",
          "call sol_get_clock_sysvar invokes the runtime's clock syscall. The syscall ABI is `(destination_pointer in r1, ...)`. The runtime writes 40 bytes of live Clock data into our stack slot and returns. This is the only syscall in this guard, and it's why slot_deadline costs ~152 CU. Most of the cost is the syscall itself; the instructions around it are 1-2 CU each.",
        ],
      },
      {
        startLine: 17,
        endLine: 19,
        title: "Read slot from the buffer",
        commentary: [
          "After the syscall, recompute the buffer pointer in r2 (r1 may have been clobbered by the call).",
          "ldxdw r3, [r2 + CLOCK_SLOT_OFF] reads the first u64 of the buffer, which is the current slot. r3 now holds today's slot number, freshly written by the runtime.",
        ],
      },
      {
        startLine: 21,
        endLine: 21,
        title: "The comparison",
        commentary: [
          "jgt r3, r6, deadline_missed. Unsigned greater-than: if the current slot is strictly greater than the caller's max_slot, jump to the failure exit. Equal passes. If you signed for 'must execute at or before slot N' and the current slot is exactly N, the tx is still valid.",
          "This single instruction is the entire safety check. Every preceding instruction was about loading values into registers; everything after is exit plumbing.",
        ],
      },
      {
        startLine: 23,
        endLine: 24,
        title: "Happy path exit",
        commentary: [
          "mov64 r0, 0 puts the success return code in r0. exit hands control to the runtime, which reads r0. Zero means 'this instruction succeeded, continue to the next ix in the transaction.'",
        ],
      },
      {
        startLine: 26,
        endLine: 42,
        title: "Failure exits and rodata",
        commentary: [
          "Two failure paths, same shape: load the log string address into r1, the string length into r2, call sol_log_, set the exit code in r0, exit.",
          "deadline_missed logs 'deadline missed' (15 bytes) and exits 1 (condition failed). The log line gets captured by every Solana RPC and indexer, so the SDK can parse it from the failed tx and tell the user 'your transaction missed the deadline' instead of a generic failure.",
          "bad_ix_data logs 'bad ix data' (11 bytes) and exits 2 (malformed ix data, the caller did not give us exactly 8 bytes).",
          "No exit 3 in this guard. Exit 3 is 'invalid account' in the Shield contract, but slot_deadline declares zero accounts. There is nothing for the caller to get wrong on the account side.",
          "The rodata section at the bottom holds the literal bytes of the two log strings, baked into the program's .so at link time. lddw at runtime loads their addresses; the bytes themselves are never copied.",
        ],
      },
    ],
    exits: [
      { code: 0, name: "Success", log: "(no log)" },
      { code: 1, name: "ConditionFailed", log: "deadline missed" },
      { code: 2, name: "BadInstructionData", log: "bad ix data" },
    ],
    sourceLinks: {
      assembly: "https://github.com/solana-asm/shield/blob/main/src/slot_deadline/slot_deadline.s",
      test: "https://github.com/solana-asm/shield/blob/main/tests/slot_deadline.test.ts",
      example: "https://github.com/solana-asm/shield/blob/main/sdk/examples/slot_deadline.ts",
    },
  },
  slippage: {
    detailed: true,
    description: [
      "slippage answers one question: is this SPL token account holding at least N tokens? If yes, the transaction continues. If no, Solana aborts the whole transaction atomically and the destination instruction never settles.",
      "Compose it after a swap to confirm the user received what they expected, or before to verify input balance. The guard never touches state, never calls a syscall, never branches into helper functions. Two memory reads, one comparison, exit. That is the whole program.",
      "It is 7 compute units on the happy path. For reference, a Solana transaction has 1.4 million compute units to spend, so slippage is roughly 0.0005% of your budget.",
    ],
    example: SLIPPAGE_EXAMPLE,
    exampleNote:
      "Compose either before (verify input) or after (verify output) your destination instruction. Multiple slippage checks can stack in the same tx.",
    assembly: SLIPPAGE_ASM,
    blocks: [
      {
        startLine: 1,
        endLine: 3,
        title: "Three offset constants",
        commentary: [
          "These name three byte offsets into the input region (the memory r1 points to). The pattern of every guard: declare the offsets up front, then read them by name. No structs, no parsers. addressable memory and arithmetic.",
          "ACCT0_TOKEN_AMOUNT = 0xA0. Solana's aligned loader places account 0's per-account header at the front of the input region, then the account's data block right after. The header is exactly 0x60 bytes (dup tag + signer/writable flags + 32-byte pubkey + 32-byte owner + u64 lamports + u64 data_len). The data block starts at 0x60. The SPL Token program lays out a token account as `mint (32) | owner (32) | amount (u64) | ...`, so `amount` sits at byte 64 of the data block. That is 0x60 + 0x40 = 0xA0 from the start of the input region. One additive constant, no runtime arithmetic.",
          "INSTRUCTION_DATA_LEN = 0x2910 (note: NOT the more common 0x2868 you see in other Shield guards). After the per-account region for every declared account, the loader appends the instruction's metadata block (the caller's ix data, the program id, signer indices). The size of each per-account region depends on `data.len()` for that account. Account 0 here is a real SPL Token account with 165 bytes of data; account 0 in the other guards has zero data. That 165-byte payload (rounded up for alignment) pushes the ix metadata 168 bytes further into memory. INSTRUCTION_DATA = 0x2918 is exactly 8 bytes past INSTRUCTION_DATA_LEN, right after the u64 length field.",
        ],
      },
      {
        startLine: 5,
        endLine: 8,
        title: "Validate ix data shape",
        commentary: [
          "`ldxdw r2, [r1 + INSTRUCTION_DATA_LEN]` does one thing: read the u64 the runtime wrote at that offset, which is the length of THIS guard's ix data, and put it in r2. (`ldxdw` = load 8 bytes from memory at `base + offset`, zero-extend into the destination register.)",
          "`jne r2, 8, bad_ix_data` is the conditional jump 'if r2 != 8, branch to label `bad_ix_data`'. We accept exactly 8 bytes, one u64 LE `min_amount`. Anything else, including a 7-byte truncation or a 9-byte trailing-junk attack, fails with exit code 2. This is what makes the guard malleable-proof. A reasonable client SDK might send 8 bytes; a careless or hostile one might not. The guard does not trust either.",
        ],
      },
      {
        startLine: 10,
        endLine: 13,
        title: "Two loads, one compare",
        commentary: [
          "`ldxdw r3, [r1 + ACCT0_TOKEN_AMOUNT]`. r3 now holds the live token balance, read directly from the account's data block at the offset we computed in block 1. The loader already mapped account 0's data into the same input region r1 points at, so there is no separate \"load account\" step.",
          "`ldxdw r4, [r1 + INSTRUCTION_DATA]`. r4 holds the caller's floor, the minimum acceptable balance, written by the SDK builder into the ix data 8 bytes past the length field.",
          "`jlt r3, r4, insufficient` is the entire safety check. `jlt` is unsigned less-than: 'if r3 < r4, branch to `insufficient`'. If the account's amount is at least the caller's minimum, the branch is not taken and execution falls through to the happy-path exit. Equal passes (jlt is strict). This single instruction is what the guard's compute budget pays for; everything around it is loading the values into registers.",
        ],
      },
      {
        startLine: 15,
        endLine: 16,
        title: "Happy path exit",
        commentary: [
          "`mov64 r0, 0` puts the success return code in r0. `exit` returns control to the runtime, which reads r0. Zero means \"this instruction succeeded, continue with the next ix in the transaction.\"",
          "Total work on the happy path: 7 instructions, no syscalls, no memory writes, no branches taken. That is what the README's 7 CU baseline measures. For reference, a Solana transaction has 1.4 million CU to spend, so the guard costs roughly 0.0005 percent of your budget.",
        ],
      },
      {
        startLine: 18,
        endLine: 23,
        title: "Condition failed",
        commentary: [
          "`lddw r1, msg_insufficient` puts the address of the rodata string `\"insufficient\"` into r1. This temporarily overwrites the input pointer in r1, but at this point the guard has already read everything it needed; r1 is free to repurpose.",
          "`mov64 r2, 12` sets the length argument (the byte length of the string). The Solana syscall ABI for `sol_log_` is `(pointer in r1, length in r2)`, the same calling convention every sBPF syscall uses.",
          "`call sol_log_` invokes the runtime's logger. The log line is recorded in the transaction's log messages, captured by every Solana RPC and indexer. That is how a client knows WHY the guard rejected the tx: the SDK parses `\"insufficient\"` from the failed tx and reports it back to the user instead of a useless `\"transaction failed\"`.",
          "`mov64 r0, 1` then `exit` returns exit code 1. Solana sees a non-zero exit, aborts the entire transaction atomically, and reverts every state change made by prior instructions. The destination ix (the swap, the transfer, whatever) never runs.",
        ],
      },
      {
        startLine: 25,
        endLine: 30,
        title: "Bad ix data",
        commentary: [
          "Identical structure to the previous block: load the address of `\"bad ix data\"` (11 bytes), log it, exit with code 2.",
          "Exit code 2 is semantically different from 1. Code 1 means \"the world failed your check\" (the user got less than the slippage floor). Code 2 means \"you gave me a malformed instruction\" (probably a client bug). The SDK can tell these apart and route them differently. Show a user-facing slippage error for code 1, log a developer-facing bug for code 2.",
          "Three exit codes total in the Shield contract: 0 success, 1 condition failed, 2 bad ix data, 3 invalid account. Slippage has no exit 3 because it never validates what KIND of account 0 is, it just reads the SPL Token amount field by offset. Pass it a non-token account and you will read garbage and probably fail with code 1.",
        ],
      },
      {
        startLine: 32,
        endLine: 34,
        title: "Rodata",
        commentary: [
          "The two log strings live in the program's read-only data section. `lddw` loads their addresses at runtime; the actual bytes are baked into the compiled `.so` and never copied.",
          "Total program footprint after `sbpf-link`: a couple hundred bytes. No relocations, no allocator, no panic handler. The output `.so` is essentially: the entrypoint, the two failure branches, and 23 bytes of read-only ASCII.",
        ],
      },
    ],
    exits: [
      { code: 0, name: "Success", log: "(no log)" },
      { code: 1, name: "ConditionFailed", log: "insufficient" },
      { code: 2, name: "BadInstructionData", log: "bad ix data" },
    ],
    sourceLinks: {
      assembly: "https://github.com/solana-asm/shield/blob/main/src/slippage/slippage.s",
      test: "https://github.com/solana-asm/shield/blob/main/tests/slippage.test.ts",
      example: "https://github.com/solana-asm/shield/blob/main/sdk/examples/slippage.ts",
    },
  },
  balance_floor: {
    detailed: true,
    description: [
      "balance_floor answers: does this account hold at least N lamports? If yes, continue. If no, abort.",
      "Useful as a rent-reserve check, or as a pre-condition that a keeper's operational balance is sufficient before triggering an action that might leave the account below the rent-exempt threshold.",
      "Same shape as slippage but reads from the account's header (lamports) instead of its data block (token amount). 7 CU on the happy path.",
    ],
    example: BALANCE_FLOOR_EXAMPLE,
    assembly: BALANCE_FLOOR_ASM,
    blocks: [
      {
        startLine: 1,
        endLine: 3,
        title: "Three offset constants",
        commentary: [
          "INSTRUCTION_DATA_LEN = 0x2868 and INSTRUCTION_DATA = 0x2870. These are the canonical offsets for any guard that declares one account with zero data. The per-account region for a zero-data account is the standard 0x2868 bytes (header + alignment padding + 0 bytes of data), so the ix metadata that follows starts at 0x2868. Compare to slippage's 0x2910, slippage's account 0 holds ~165 bytes of SPL Token data, which shifts everything by ~168 bytes.",
          "ACCT0_LAMPORTS = 0x0050. Every account's input region carries the lamport balance at a fixed offset in its header. The header layout is: dup tag (8) + signer/writable flags (8) + pubkey (32) + owner pubkey (32) = 0x50 bytes. Lamports is the next u64. The runtime writes this from the live account state at instruction load time, so reading this offset gives us the current balance.",
        ],
      },
      {
        startLine: 7,
        endLine: 8,
        title: "Validate ix data shape",
        commentary: [
          "Standard length gate. Read the u64 ix_data_len, fail with exit 2 if it is not exactly 8 (one u64 LE floor). Same shape as slippage's block 2.",
        ],
      },
      {
        startLine: 10,
        endLine: 13,
        title: "Two loads, one compare",
        commentary: [
          "ldxdw r3, [r1 + ACCT0_LAMPORTS] reads the account's current lamport balance directly from the input region. No syscall, no helper, the runtime already mapped this into our memory.",
          "ldxdw r4, [r1 + INSTRUCTION_DATA] reads the caller's minimum lamports threshold from our ix data.",
          "jlt r3, r4, below_floor. Unsigned less-than: if the account holds less than the minimum, jump to the failure exit. Equal passes (strict less-than). Same shape as slippage, different field.",
        ],
      },
      {
        startLine: 15,
        endLine: 16,
        title: "Happy path exit",
        commentary: [
          "Seven instructions total on the happy path, balance_floor is one of the cheapest guards (7 CU) precisely because the aligned loader handed us pre-decoded lamports at a fixed offset, no parsing layer, no syscall, no function calls.",
        ],
      },
      {
        startLine: 18,
        endLine: 30,
        title: "Failure exits",
        commentary: [
          "below_floor logs 'below floor' (11 bytes), exits with code 1 (condition failed).",
          "bad_ix_data logs 'bad ix data' (11 bytes), exits with code 2 (malformed ix data).",
          "No exit 3 here, same as slippage, balance_floor accepts ANY account at position 0: a Solana program account, a system account, a token account, a wallet, whatever the caller passes. The guard reads the lamport field at offset 0x50 and trusts the caller about what kind of account this is. If you point it at a fresh account that does not exist, the runtime will instantiate a zero-lamports placeholder and the check will fail with exit 1, not 3.",
        ],
      },
      {
        startLine: 32,
        endLine: 34,
        title: "Rodata",
        commentary: [
          "Two log strings live in read-only data, baked into the .so. lddw at runtime just loads their addresses; the bytes themselves are part of the compiled program.",
        ],
      },
    ],
    exits: [
      { code: 0, name: "Success", log: "(no log)" },
      { code: 1, name: "ConditionFailed", log: "below floor" },
      { code: 2, name: "BadInstructionData", log: "bad ix data" },
    ],
    sourceLinks: {
      assembly: "https://github.com/solana-asm/shield/blob/main/src/balance_floor/balance_floor.s",
      test: "https://github.com/solana-asm/shield/blob/main/tests/balance_floor.test.ts",
      example: "https://github.com/solana-asm/shield/blob/main/sdk/examples/balance_floor.ts",
    },
  },
  signer_allowlist: {
    detailed: true,
    description: [
      "signer_allowlist answers: is the signer of this transaction one of these N pubkeys? If yes, continue. If no, abort.",
      "Useful for gating keeper actions, multi-bot setups, and off-chain-signed intents (pair with slot_deadline to bound how long an intent stays valid).",
      "The guard also verifies the on-chain is_signer byte equals 1 (defense in depth, in case a buggy SDK forgets AccountMeta.isSigner = true). CU scales linearly with N: roughly 17 + 11*N. 25 CU at N=1.",
    ],
    example: SIGNER_ALLOWLIST_EXAMPLE,
    assembly: SIGNER_ALLOWLIST_ASM,
    blocks: [
      {
        startLine: 1,
        endLine: 8,
        title: "Offset constants",
        commentary: [
          "Eight constants this time, because the guard reads more pieces of the input region than slippage. The big additions are the is_signer byte and the four-chunk signer pubkey.",
          "INSTRUCTION_DATA_LEN at 0x2868 and INSTRUCTION_DATA at 0x2870 are the standard 1-account-zero-data offsets. ALLOWED_PUBKEYS = 0x2871 is one byte past INSTRUCTION_DATA, where the variable-length array of allowed pubkeys begins. The ix data layout is `[u8 count][32 bytes * count]`: count first, then `count` 32-byte pubkeys packed contiguously.",
          "ACCT0_IS_SIGNER = 0x0009. Each account's header has a flag byte at offset 9 that the runtime sets to 1 if and only if the account actually signed the transaction. The runtime checks signatures BEFORE the program runs; this is the byte the runtime writes after that check.",
          "ACCT0_PUBKEY_0..3 at 0x0010, 0x0018, 0x0020, 0x0028. Account 0's 32-byte pubkey, split into four contiguous u64 chunks at 8-byte offsets. We load all four into registers up front so the inner loop is register-vs-memory, not memory-vs-memory.",
        ],
      },
      {
        startLine: 12,
        endLine: 13,
        title: "Trust the runtime, verify anyway",
        commentary: [
          "ldxb r2, [r1 + ACCT0_IS_SIGNER] reads the is_signer byte (1 byte, zero-extended into the low 8 bits of r2). jne r2, 1, not_signer fails with exit 3 if it is not exactly 1.",
          "Why check? The Solana runtime ALREADY checks signatures before invoking any program. But this check is here as defense in depth against a real failure mode: if a buggy SDK constructs the ix with `AccountMeta { isSigner: false }` for the would-be signer, the runtime never required a signature for that pubkey, and the is_signer byte will be 0. Without this guard's check, the guard would happily compare an UNSIGNED pubkey against the allowlist and succeed. Exactly the failure the SDK should have prevented and didn't. With this check, the failure surfaces as exit 3 ('not signer'), an explicit diagnostic.",
        ],
      },
      {
        startLine: 15,
        endLine: 16,
        title: "Read count, reject empty allowlist",
        commentary: [
          "ldxb r2, [r1 + INSTRUCTION_DATA] reads the count byte (u8) into r2. r2 now holds how many allowed pubkeys we should expect in the rest of the ix data.",
          "jeq r2, 0, not_allowed. An empty allowlist means 'nobody is permitted', every signer fails. Treated as a condition-failure (exit 1, not_allowed), not as malformed input. The caller might have legitimately built an empty list; the guard rejects rather than crashes.",
        ],
      },
      {
        startLine: 18,
        endLine: 22,
        title: "Validate ix data length",
        commentary: [
          "We declared the ix data as `1 + 32 * count` bytes. Verify the runtime-reported length matches that formula.",
          "lsh64 r4, 5 left-shifts count by 5 bits, which is multiplication by 32 (since 2^5 = 32). Strictly faster than mul64 r4, 32, one instruction either way, but shift is a simpler microop. Result: r4 = count * 32. Then add64 r4, 1 for the count byte itself = total expected length.",
          "jne r3, r4, bad_ix_data. Mismatch → exit 2. This catches both 'caller declared count=5 but only sent 3 pubkeys' (truncation) and 'caller declared count=5 but sent 6 pubkeys' (trailing junk). Either way, malformed input.",
        ],
      },
      {
        startLine: 24,
        endLine: 27,
        title: "Cache signer pubkey in registers",
        commentary: [
          "Four ldxdw instructions load the signer's 32-byte pubkey into r6..r9 as four u64 chunks. We do this ONCE here, before the loop, so the inner loop body only does memory loads on the allowlist side.",
          "Why r6-r9 specifically? They're callee-saved (we don't make any syscalls in this guard, but the convention is consistent) and they're free to use because we won't need them for anything else until the comparison.",
        ],
      },
      {
        startLine: 29,
        endLine: 30,
        title: "Setup allowlist pointer",
        commentary: [
          "mov64 r3, r1 puts the input region base in r3. add64 r3, ALLOWED_PUBKEYS advances r3 to point at the first 32-byte allowlist entry (one byte past the count). The loop below will advance r3 by 32 each iteration to walk through the entries.",
        ],
      },
      {
        startLine: 32,
        endLine: 43,
        title: "Unrolled 32-byte compare",
        commentary: [
          "The check label is the inner loop body. We compare the current allowlist entry (in memory at r3) against the cached signer (in registers r6-r9) one 8-byte chunk at a time.",
          "ldxdw r4, [r3 + 0]; jne r4, r6, advance loads chunk 0 of the candidate, branches to advance on the first mismatch. Same for offsets 8, 16, 24 against r7, r8, r9. Each compare is one load + one branch, minimal work.",
          "Why unroll instead of looping the 4 chunks? Because we cached the signer in fixed registers, each compare is one ldxdw + one jne. A sub-loop would need an inner counter, indirect addressing, and an extra branch back to the inner check; that's strictly more instructions per chunk.",
          "If all four chunks match, fall through past the last jne to mov64 r0, 0; exit. The signer is in the allowlist; transaction continues.",
        ],
      },
      {
        startLine: 45,
        endLine: 48,
        title: "Advance to next entry",
        commentary: [
          "advance is the path taken when the candidate doesn't match. add64 r3, 32 moves r3 to the next 32-byte pubkey in the allowlist. sub64 r2, 1 decrements the remaining count.",
          "jne r2, 0, check loops back to the comparison if we still have entries to check. When r2 reaches 0, we've exhausted the allowlist with no match. Fall through to not_allowed (exit 1).",
          "CU scales linearly with the size of the allowlist. Empirically: roughly 17 + 11*N CU. 25 CU at N=1, ~50 CU at N=3, ~225 CU at N=20.",
        ],
      },
      {
        startLine: 50,
        endLine: 69,
        title: "Three failure exits",
        commentary: [
          "not_allowed (exit 1): we walked the entire allowlist without finding the signer. Log 'not allowed' (11 bytes).",
          "not_signer (exit 3): the runtime's is_signer byte was 0, the signer pubkey passed by the caller did not actually sign the transaction.",
          "bad_ix_data (exit 2): the declared count and the actual byte length disagreed.",
          "All three follow the same pattern: load the log string address into r1, the length into r2, call sol_log_, set r0 to the exit code, exit. The log strings let the SDK report a useful failure to the user.",
        ],
      },
      {
        startLine: 71,
        endLine: 74,
        title: "Rodata",
        commentary: [
          "Three log strings, one per failure path. Total program footprint stays under a few hundred bytes, the heaviest part is the four ldxdw chain in the inner loop.",
        ],
      },
    ],
    exits: [
      { code: 0, name: "Success", log: "(no log)" },
      { code: 1, name: "ConditionFailed", log: "not allowed" },
      { code: 2, name: "BadInstructionData", log: "bad ix data" },
      { code: 3, name: "InvalidAccount", log: "not signer" },
    ],
    sourceLinks: {
      assembly: "https://github.com/solana-asm/shield/blob/main/src/signer_allowlist/signer_allowlist.s",
      test: "https://github.com/solana-asm/shield/blob/main/tests/signer_allowlist.test.ts",
      example: "https://github.com/solana-asm/shield/blob/main/sdk/examples/signer_allowlist.ts",
    },
  },
  fee_ceiling: {
    detailed: true,
    description: [
      "fee_ceiling answers: does any SetComputeUnitPrice in this transaction exceed the per-CU priority fee ceiling? If yes, abort.",
      "Caps priority-fee bids so a misconfigured client cannot quietly burn an order of magnitude more than intended. Useful for keeper bots and agent flows that submit transactions automatically.",
      "The guard walks the Instructions sysvar to inspect every other top-level instruction. 86 CU on a 2-ix tx (limit + guard, no match), scaling roughly linearly with num_instructions and adding ~30 CU per matched SetComputeUnitPrice in the loop.",
    ],
    example: FEE_CEILING_EXAMPLE,
    exampleNote:
      "Account 0 is the Instructions sysvar, wired internally by the SDK. The caller only supplies the ceiling.",
    assembly: FEE_CEILING_ASM,
    blocks: [
      {
        startLine: 1,
        endLine: 7,
        title: "Constants for the sysvar walk",
        commentary: [
          "Six constants. Three describe where the Instructions sysvar lives in our input region; three describe what we're looking for inside it.",
          "ACCT0_KEY = 0x0010 is account 0's pubkey. ACCT0_DATA_LEN = 0x0058 is the u64 length of account 0's data block. ACCT0_DATA = 0x0060 is where the data block itself starts. We declared one account (the Instructions sysvar) at position 0, so these are the standard 1-account header offsets.",
          "EXPECTED_IX_DATA_LEN = 8: our ix data is one u64 LE ceiling. CB_PRICE_IX_LEN = 9: a ComputeBudget SetComputeUnitPrice ix data is 1 discriminator byte + u64 price = 9 bytes. SET_CU_PRICE_DISC = 3: the discriminator byte the ComputeBudget program uses to distinguish SetComputeUnitPrice from its other instructions (RequestHeapFrame=1, SetComputeUnitLimit=2, SetComputeUnitPrice=3, SetLoadedAccountsDataSizeLimit=4).",
        ],
      },
      {
        startLine: 11,
        endLine: 23,
        title: "Verify account 0 is the Instructions sysvar",
        commentary: [
          "The Instructions sysvar is a special Solana sysvar that contains the complete serialized list of every instruction in the current transaction. It is the only way for a program to inspect sibling instructions in the same tx. This guard NEEDS that introspection, it wants to find every ComputeBudget SetComputeUnitPrice in the tx and check it against the ceiling.",
          "The sysvar's pubkey is the fixed `Sysvar1nstructions1111111111111111111111111`. If account 0 is not that, the guard cannot do its job; exit 3 with 'bad account'.",
          "lddw r2, sysvar_ix_key loads the address of a 32-byte rodata constant containing the sysvar's raw pubkey bytes. Four pairs of ldxdw + jne compare account 0's pubkey (at offset 0x10 in our input region) against that constant, 8 bytes at a time. First mismatch jumps to bad_account.",
          "Defense in depth: the SDK builder always wires the sysvar in, but a hand-crafted instruction could pass any account. We refuse anything else before reading data we'd otherwise be interpreting as serialized instructions.",
        ],
      },
      {
        startLine: 25,
        endLine: 27,
        title: "Setup sysvar data pointer",
        commentary: [
          "Now we know account 0 IS the Instructions sysvar. ldxdw r2, [r1 + ACCT0_DATA_LEN] reads the sysvar data's total byte length into r2. mov64 r3, r1; add64 r3, ACCT0_DATA makes r3 point at the first byte of the sysvar data. Every offset below is computed from r3.",
        ],
      },
      {
        startLine: 29,
        endLine: 37,
        title: "Find our own ix via current_instruction_index",
        commentary: [
          "The Instructions sysvar is laid out as: 2-byte num_instructions header, then a 2-byte offset for each instruction (pointing to where that ix's serialized data lives within the sysvar), then the serialized instructions themselves, and finally the last 2 bytes are current_instruction_index, the index of the instruction the runtime is currently executing (which is THIS guard).",
          "mov64 r4, r3; add64 r4, r2; sub64 r4, 2 puts r4 at the address of the last 2 bytes. ldxh r5, [r4 + 0] reads them into r5 as a u16. That's current_instruction_index, our own index in the tx.",
          "mov64 r4, r5; lsh64 r4, 1; add64 r4, r3 computes the address of `offsets[current_idx]` in the offsets table (each table entry is 2 bytes, so we left-shift by 1 to multiply by 2). ldxh r9, [r4 + 2] reads our own ix's offset into r9. The +2 skips the num_instructions u16 at the start of the sysvar data.",
        ],
      },
      {
        startLine: 39,
        endLine: 50,
        title: "Skip past the ix header to land on the ceiling u64",
        commentary: [
          "r4 = r3 + r9 = base of our own ix's serialized form within the sysvar. Each serialized ix is: num_accounts (u16), then `num_accounts` account metas (33 bytes each: 1 flag byte + 32-byte pubkey), then 32-byte program_id, then 2-byte ix_data_len, then ix_data.",
          "ldxh r5, [r4 + 0] reads num_accounts. mov64 r9, r5; mul64 r9, 33; add64 r9, 34; add64 r9, r4 computes the offset to ix_data_len: skip 2 bytes (num_accounts) + num_accounts*33 (account metas) + 32 (program_id), or `r9 = r4 + 34 + num_accounts*33` (the +34 is 2 + 32).",
          "ldxh r5, [r9 + 0] reads our ix_data_len. jne r5, EXPECTED_IX_DATA_LEN, bad_ix_data verifies it equals 8.",
          "ldxdw r6, [r9 + 2] reads our u64 ceiling from the ix data (8 bytes past the length field). r6 now holds the per-CU ceiling for the rest of the program.",
        ],
      },
      {
        startLine: 52,
        endLine: 53,
        title: "Loop init",
        commentary: [
          "ldxh r8, [r3 + 0] reads num_instructions (the first u16 of the sysvar data). r8 is the loop bound. mov64 r7, 0 initializes the outer counter. We will walk every instruction in the tx, checking each one for a SetComputeUnitPrice that exceeds the ceiling.",
        ],
      },
      {
        startLine: 55,
        endLine: 71,
        title: "Walk every ix, compute its program_id pointer",
        commentary: [
          "jge r7, r8, ok: counter reached num_instructions without finding a violation → successful exit.",
          "Same offsets-table dance as block 4, but for ix at index r7 instead of our own ix. offsets[r7] gives the byte offset of ix r7. r9 = base of ix r7's serialization.",
          "Skip `num_accounts * 33 + 2` to land on the program_id (this time we want the program_id, not the ix_data_len). r5 = pointer to ix r7's 32-byte program_id.",
        ],
      },
      {
        startLine: 73,
        endLine: 89,
        title: "Is this ix a ComputeBudget call?",
        commentary: [
          "lddw r4, cb_program_id loads the address of a 32-byte rodata constant containing ComputeBudget's program_id bytes (`ComputeBudget111111111111111111111111111111`).",
          "Four pairs of ldxdw + jne compare ix r7's program_id against the constant. First mismatch jumps to next_ix, this ix isn't a ComputeBudget call, move on. All four match → this ix targets ComputeBudget, continue checking.",
        ],
      },
      {
        startLine: 91,
        endLine: 98,
        title: "Is it specifically SetComputeUnitPrice, and does it exceed?",
        commentary: [
          "We know ix r7 is a ComputeBudget call. ComputeBudget has multiple instruction variants; we only care about SetComputeUnitPrice. Check the shape:",
          "ldxh r4, [r5 + 32] reads ix_data_len at offset 32 from the program_id (program_id is 32 bytes, then ix_data_len follows). Must equal 9. Other ComputeBudget variants (SetComputeUnitLimit, RequestHeapFrame) have different lengths.",
          "ldxb r4, [r5 + 34] reads the discriminator byte. Must equal 3.",
          "If both match, ldxdw r4, [r5 + 35] reads the u64 price (8 bytes after the disc).",
          "jgt r4, r6, fee_too_high: if the bid price exceeds our ceiling, fail with exit 1. Equal passes (strict greater-than).",
        ],
      },
      {
        startLine: 100,
        endLine: 106,
        title: "Advance and ok exit",
        commentary: [
          "next_ix: add64 r7, 1; ja loop. Increment the counter, jump back. We walk EVERY ix to catch a hypothetical second SetComputeUnitPrice that might exceed the ceiling. Solana's runtime rejects a tx with duplicate ComputeBudget ix variants, but the guard is more conservative: if a duplicate slips through, both get checked.",
          "ok: mov64 r0, 0; exit. We walked the whole tx; no SetComputeUnitPrice exceeded the ceiling. Success.",
        ],
      },
      {
        startLine: 108,
        endLine: 127,
        title: "Three failure exits",
        commentary: [
          "fee_too_high (exit 1): some SetComputeUnitPrice's price was greater than the ceiling. Log 'fee too high' (12 bytes).",
          "bad_ix_data (exit 2): our own ix data was not exactly 8 bytes. Log 'bad ix data' (11 bytes).",
          "bad_account (exit 3): account 0 was not the Instructions sysvar. Log 'bad account' (11 bytes).",
          "All three follow the same r1/r2/sol_log_/r0/exit pattern.",
        ],
      },
      {
        startLine: 129,
        endLine: 134,
        title: "Rodata",
        commentary: [
          "Two 32-byte pubkey constants (Instructions sysvar key and ComputeBudget program id) and three log strings. The pubkeys are baked into the .so at link time; the log strings too. No relocations, no dynamic allocation.",
        ],
      },
    ],
    exits: [
      { code: 0, name: "Success", log: "(no log)" },
      { code: 1, name: "ConditionFailed", log: "fee too high" },
      { code: 2, name: "BadInstructionData", log: "bad ix data" },
      { code: 3, name: "InvalidAccount", log: "bad account" },
    ],
    sourceLinks: {
      assembly: "https://github.com/solana-asm/shield/blob/main/src/fee_ceiling/fee_ceiling.s",
      test: "https://github.com/solana-asm/shield/blob/main/tests/fee_ceiling.test.ts",
      example: "https://github.com/solana-asm/shield/blob/main/sdk/examples/fee_ceiling.ts",
    },
  },
  program_allowlist: {
    detailed: true,
    description: [
      "program_allowlist answers: does every other top-level instruction in this transaction target a program that the caller put on the allowlist? The guard implicitly skips its own ix.",
      "Useful for hardening keeper bots and agent flows so a compromised or misconfigured client cannot redirect the transaction to a program the operator never intended.",
      "Every OTHER top-level ix is checked, including ComputeBudget. Allowlist ComputeBudget111111111111111111111111111111 if your tx sets a CU limit or price. ~80 CU on N=1, scales with num_top_level_ix × average allowlist position.",
    ],
    example: PROGRAM_ALLOWLIST_EXAMPLE,
    exampleNote:
      "Include ComputeBudget on the allowlist if your transaction sets a CU limit. The guard's own ix is skipped automatically.",
    assembly: PROGRAM_ALLOWLIST_ASM,
    blocks: [
      {
        startLine: 1,
        endLine: 3,
        title: "Sysvar offset constants",
        commentary: [
          "Three constants, same as the other sysvar-walking guards (fee_ceiling, compute_unit_floor). They describe where account 0's pubkey, data length, and data block live in the input region.",
          "ACCT0_KEY = 0x0010 is account 0's pubkey. ACCT0_DATA_LEN = 0x0058 is the u64 length of account 0's data block. ACCT0_DATA = 0x0060 is where the data block itself starts. The data block here is the Instructions sysvar's serialized bytes, which is what the guard walks.",
        ],
      },
      {
        startLine: 7,
        endLine: 20,
        title: "Verify account 0 is the Instructions sysvar",
        commentary: [
          "Four 8-byte compares against the rodata sysvar pubkey constant. Any mismatch exits 3 with 'bad account'. See fee_ceiling for the full explanation of why the sysvar is required and how the four-chunk compare works.",
        ],
      },
      {
        startLine: 22,
        endLine: 31,
        title: "Setup DATA_PTR, find current_idx and num_ix",
        commentary: [
          "r3 = pointer to the sysvar's serialized data (input region + 0x60). All subsequent ix lookups are relative to r3.",
          "r9 = current_instruction_index, read from the last 2 bytes of the sysvar data. We cache it here because the outer loop below will compare every ix index against r9 to skip the guard's own ix (the implicit-self-skip contract).",
          "r8 = num_instructions, the u16 at the start of the sysvar data. r8 is the outer loop bound.",
        ],
      },
      {
        startLine: 33,
        endLine: 45,
        title: "Locate our own ix and read its ix_data_len",
        commentary: [
          "Same sysvar-walk pattern as fee_ceiling block 4 and 5. Use the offsets table: r4 = r3 + offsets[current_idx] = pointer to our own ix's per-ix serialization.",
          "ldxh r2 = num_accounts. mul64 r2, 33; add64 r2, 34 computes the offset to ix_data_len (skipping num_accounts u16, account metas, program_id, and landing on the 2-byte length header).",
          "r4 += r2 leaves r4 = pointer to ix_data_len. ldxh r2 reads the length. add64 r4, 2 advances r4 to the first byte of ix_data.",
        ],
      },
      {
        startLine: 47,
        endLine: 53,
        title: "Read count, validate length",
        commentary: [
          "ldxb r6, [r4 + 0] reads count (the first byte of ix_data). The ix data layout is `[u8 count][32 bytes * count]`, count first then count 32-byte pubkeys.",
          "jeq r6, 0, not_allowed treats an empty allowlist as 'nothing is permitted'. Every non-self ix would fail the check, so we fast-fail with exit 1 instead of starting the loop.",
          "Expected length = 1 + 32 * count. r5 = r6 << 5 (shift by 5 = multiply by 32), then add 1 for the count byte. jne r2, r5, bad_ix_data on mismatch (exit 2). Catches both truncation and trailing junk.",
        ],
      },
      {
        startLine: 55,
        endLine: 61,
        title: "Setup ALLOWLIST_PTR and ALLOWLIST_END",
        commentary: [
          "r5 = r4 + 1 = pointer to the first 32-byte allowlist entry (skipping the count byte).",
          "r6 = r5 + count * 32 = pointer to one byte past the last entry. We use r6 as a sentinel in the inner loop: when the scan pointer reaches r6, we have exhausted the allowlist without finding a match.",
        ],
      },
      {
        startLine: 63,
        endLine: 80,
        title: "Outer loop, skip self, compute candidate program_id",
        commentary: [
          "jge r7, r8, ok exits the loop successfully when r7 reaches num_instructions (all top-level ixs checked, no violation).",
          "jeq r7, r9, advance_outer skips the guard's own ix (where r7 equals current_instruction_index, stored in r9). This is the implicit-self-skip contract: the caller does not need to include this guard's program_id in the allowlist because the guard exempts itself. Without this branch, the user would have to list this program's own pubkey, which is awkward and circular.",
          "For every other ix, locate its program_id using the offsets table (same pattern as fee_ceiling block 7). Stash the candidate program_id pointer in r1.",
        ],
      },
      {
        startLine: 84,
        endLine: 102,
        title: "Inner check, 4 chunk unrolled u64 compare",
        commentary: [
          "Inner loop body. Compare the candidate program_id (in memory at r1) against the current allowlist entry (in memory at r2), 8 bytes at a time. Four pairs of ldxdw + jne.",
          "First mismatch jumps to advance_inner: bump r2 by 32 (next allowlist entry), check if r2 reached r6 (end of allowlist). If yes, the candidate didn't match anything, exit 1 (not_allowed). If no, loop back to check_inner with the new r2.",
          "All four chunks match (the ix's program_id is in the allowlist), ja advance_outer to check the next ix.",
        ],
      },
      {
        startLine: 104,
        endLine: 110,
        title: "Advance outer, exit",
        commentary: [
          "advance_outer: add64 r7, 1; ja loop. Increment the outer counter, restart.",
          "ok: mov64 r0, 0; exit. All non-self ixs matched some entry in the allowlist. Success.",
        ],
      },
      {
        startLine: 112,
        endLine: 131,
        title: "Three failure exits",
        commentary: [
          "not_allowed (exit 1): either count was 0, or some ix targeted a program not in the allowlist. Log 'not allowed' (11 bytes).",
          "bad_ix_data (exit 2): the declared count and the actual ix data length disagreed. Log 'bad ix data' (11 bytes).",
          "bad_account (exit 3): account 0 was not the Instructions sysvar. Log 'bad account' (11 bytes).",
        ],
      },
      {
        startLine: 133,
        endLine: 137,
        title: "Rodata",
        commentary: [
          "The Instructions sysvar pubkey constant (32 bytes) and three log strings. Total program size stays small because the loops are unrolled four wide (no inner-loop tables, no inline data beyond the sysvar key).",
        ],
      },
    ],
    exits: [
      { code: 0, name: "Success", log: "(no log)" },
      { code: 1, name: "ConditionFailed", log: "not allowed" },
      { code: 2, name: "BadInstructionData", log: "bad ix data" },
      { code: 3, name: "InvalidAccount", log: "bad account" },
    ],
    sourceLinks: {
      assembly: "https://github.com/solana-asm/shield/blob/main/src/program_allowlist/program_allowlist.s",
      test: "https://github.com/solana-asm/shield/blob/main/tests/program_allowlist.test.ts",
    },
  },
  compute_unit_floor: {
    detailed: true,
    description: [
      "compute_unit_floor answers: does this transaction declare a SetComputeUnitLimit of at least N CU? If yes, continue. If no (or no SetComputeUnitLimit at all), abort.",
      "Guarantees a minimum compute budget for keeper or agent transactions where a client might forget to set one or under-allocate, preventing partial execution and surprise 'Computational budget exceeded' aborts mid-tx.",
      "Boundary is non-strict: units == minUnits passes (jlt is strict less-than). ~93 CU on a 3-ix tx (limit + guard + destination).",
    ],
    example: COMPUTE_UNIT_FLOOR_EXAMPLE,
    assembly: COMPUTE_UNIT_FLOOR_ASM,
    blocks: [
      {
        startLine: 1,
        endLine: 7,
        title: "Constants",
        commentary: [
          "Six constants. First three are the standard sysvar input-region offsets, same as fee_ceiling and program_allowlist (account 0's pubkey, data length, and data block).",
          "EXPECTED_IX_DATA_LEN = 4: our ix data is one u32 LE (4 bytes) holding the floor. u32 because SetComputeUnitLimit's units field is itself a u32, so there's no point storing a larger floor than ComputeBudget can represent.",
          "CB_LIMIT_IX_LEN = 5: a ComputeBudget SetComputeUnitLimit ix is 1 disc byte + u32 units = 5 bytes total. SET_CU_LIMIT_DISC = 2: the discriminator for SetComputeUnitLimit (distinct from fee_ceiling's SET_CU_PRICE_DISC = 3).",
        ],
      },
      {
        startLine: 11,
        endLine: 23,
        title: "Verify account 0 is the Instructions sysvar",
        commentary: [
          "Same four-chunk sysvar pubkey compare as the other two sysvar-walking guards. Any mismatch exits 3.",
        ],
      },
      {
        startLine: 25,
        endLine: 37,
        title: "Locate our own ix",
        commentary: [
          "Same sysvar walk as fee_ceiling block 4. r3 = sysvar data pointer. r5 = current_instruction_index (last 2 bytes of the sysvar data). r9 = offsets[current_idx] (our own ix's byte offset within the sysvar data).",
          "r4 = r3 + r9 = base of our own ix's serialized form within the sysvar.",
        ],
      },
      {
        startLine: 39,
        endLine: 50,
        title: "Skip header, validate length, read floor",
        commentary: [
          "Same num_accounts * 33 + 34 hop as fee_ceiling to skip account metas + program_id + ix_data_len header, landing r9 on our ix_data_len.",
          "Validate ix_data_len == 4 (we expect exactly 4 bytes, one u32 LE floor). Mismatch exits 2.",
          "ldxw r6, [r9 + 2] reads the u32 floor into r6. ldxw loads 4 bytes (vs ldxdw's 8), zero-extending the high 32 bits of r6. r6 now holds the floor for the rest of the program.",
        ],
      },
      {
        startLine: 52,
        endLine: 54,
        title: "Loop init with found flag",
        commentary: [
          "r8 = num_instructions. r7 = 0 (outer counter). r2 = 0 (found flag).",
          "The found-flag pattern: we want to enforce that at least one SetComputeUnitLimit greater than or equal to the floor exists in the tx. Single pass through the ixs, set r2 = 1 if we see a valid one. After the loop, if r2 is still 0, no valid SetComputeUnitLimit was present, so fail.",
        ],
      },
      {
        startLine: 56,
        endLine: 73,
        title: "Loop, compute ix r7 program_id pointer",
        commentary: [
          "jge r7, r8, check_found exits the loop into the found-flag check (not directly into success). The loop reaches its end without a violation, but we still need to verify we found at least one matching ix.",
          "Same pattern as fee_ceiling for locating ix r7's program_id (offsets table, skip num_accounts * 33 + 2 to land on the program_id).",
        ],
      },
      {
        startLine: 74,
        endLine: 90,
        title: "Is this ix ComputeBudget?",
        commentary: [
          "Load cb_program_id constant. Four-chunk u64 compare. First mismatch branches to next_ix (this ix is not a ComputeBudget call, move on).",
        ],
      },
      {
        startLine: 92,
        endLine: 101,
        title: "Is it specifically SetComputeUnitLimit, and does it meet the floor?",
        commentary: [
          "ix_data_len at offset 32 must equal 5. Discriminator at offset 34 must equal 2 (SetComputeUnitLimit, not SetComputeUnitPrice which is 3).",
          "If both match, ldxw r4, [r5 + 35] reads the u32 units (4 bytes after the discriminator, zero-extended).",
          "jlt r4, r6, cu_too_low. Strict less-than: if units less than floor, exit 1 immediately. Even one undersized SetComputeUnitLimit fails the whole tx (no point continuing the walk if we already found a violation).",
          "Otherwise, mov64 r2, 1 marks 'found a valid SetComputeUnitLimit' and falls through to next_ix.",
        ],
      },
      {
        startLine: 103,
        endLine: 108,
        title: "Advance, check found flag",
        commentary: [
          "next_ix: add64 r7, 1; ja loop. Walk every ix.",
          "check_found: jeq r2, 0, cu_too_low. If r2 is still 0 after the loop, no SetComputeUnitLimit was found anywhere in the tx. Fail with cu_too_low (exit 1).",
          "This is the 'missing SetComputeUnitLimit also fails' contract. The guard treats 'no explicit limit declared' the same as 'limit below floor'. Solana would otherwise apply a default per-ix CU budget; we don't trust that default. The caller must declare what budget they expect.",
        ],
      },
      {
        startLine: 110,
        endLine: 112,
        title: "Happy path exit",
        commentary: [
          "ok: mov64 r0, 0; exit. At least one SetComputeUnitLimit was found and met the floor, and no SetComputeUnitLimit was below the floor. Success.",
        ],
      },
      {
        startLine: 114,
        endLine: 133,
        title: "Three failure exits",
        commentary: [
          "cu_too_low (exit 1): either no SetComputeUnitLimit found at all, or one was below the floor. Log 'cu too low' (10 bytes). Same exit code for both cases because they mean the same thing semantically: the tx's compute budget does not meet the caller's minimum.",
          "bad_ix_data (exit 2): our own ix data was not exactly 4 bytes. Log 'bad ix data' (11 bytes).",
          "bad_account (exit 3): account 0 was not the Instructions sysvar. Log 'bad account' (11 bytes).",
        ],
      },
      {
        startLine: 135,
        endLine: 140,
        title: "Rodata",
        commentary: [
          "Two 32-byte pubkey constants (Instructions sysvar key and ComputeBudget program id) and three log strings. Same shape as fee_ceiling because both guards walk the same sysvar looking for ComputeBudget instructions, just for different opcodes.",
        ],
      },
    ],
    exits: [
      { code: 0, name: "Success", log: "(no log)" },
      { code: 1, name: "ConditionFailed", log: "cu too low" },
      { code: 2, name: "BadInstructionData", log: "bad ix data" },
      { code: 3, name: "InvalidAccount", log: "bad account" },
    ],
    sourceLinks: {
      assembly: "https://github.com/solana-asm/shield/blob/main/src/compute_unit_floor/compute_unit_floor.s",
      test: "https://github.com/solana-asm/shield/blob/main/tests/compute_unit_floor.test.ts",
      example: "https://github.com/solana-asm/shield/blob/main/sdk/examples/compute_unit_floor.ts",
    },
  },
};
