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
        title: "Constants for the byte offsets we will read",
        commentary: [
          "Every guard starts the same way: name the byte offsets we are about to read, then load them by name. No struct definitions, no parser library, just numbers.",
          "Why 8 and 16? The runtime hands every program one big block of bytes (r1 points at the start of it). For a program that declares ZERO accounts, that block starts with two u64 header fields: account count first (always 0 here), then instruction data length, then the instruction data itself. Each u64 is 8 bytes. So the length sits at byte 8 (0x0008) and the data starts at byte 16 (0x0010). That is the entire reason for those two numbers.",
          "Other Shield guards have very different-looking offsets (0x2868, 0x2870, 0x2910). Same fields, just shoved further along because declaring accounts inserts a chunk of per-account info between the header and your ix data. slot_deadline declares no accounts, so nothing gets inserted, and the offsets stay tiny.",
          "Why 40 for CLOCK_BUF_SIZE? The Clock sysvar (Solana's runtime struct of timing data) serializes to exactly 40 bytes: slot (u64) + epoch_start_timestamp (i64) + epoch (u64) + leader_schedule_epoch (u64) + unix_timestamp (i64). Five fields of 8 bytes each = 40. We need a 40-byte buffer to receive a copy of it.",
          "Why CLOCK_SLOT_OFF = 0? slot is the first field of the Clock struct above, so it sits at byte 0 of whatever buffer the syscall fills.",
        ],
      },
      {
        startLine: 8,
        endLine: 9,
        title: "Check that the caller gave us exactly 8 bytes of ix data",
        commentary: [
          "Read the u64 ix data length the runtime wrote at INSTRUCTION_DATA_LEN into r2, then branch to bad_ix_data unless it equals 8.",
          "Why exactly 8? The caller is supposed to hand us one u64 max_slot, no more, no less. A 7-byte input would leave the top byte of the u64 as whatever was in memory before. A 9-byte input could sneak past a permissive SDK and let an attacker stuff extra data into the tx. Strict equality blocks both.",
        ],
      },
      {
        startLine: 11,
        endLine: 11,
        title: "Save the caller's deadline before we make a syscall",
        commentary: [
          "Load the caller's max_slot from the ix data into r6.",
          "Why r6 specifically? The next thing we do is call sol_get_clock_sysvar. The Solana syscall ABI lets the runtime overwrite r0 through r5 (the return register and the five argument registers). Anything you leave in r0-r5 across a syscall is gone. r6 through r9 are guaranteed to survive. Putting max_slot in r6 means we still have it after the syscall returns.",
        ],
      },
      {
        startLine: 13,
        endLine: 15,
        title: "Reserve a 40-byte buffer on the stack and ask the runtime for the Clock",
        commentary: [
          "r10 is the stack frame pointer. Subtracting 40 from it gives a pointer to a 40-byte slot at the top of our stack frame. (sBPF stacks grow downward, same direction as x86 and ARM.) We do this twice: once to hand the pointer to the syscall in r1, again later to read the result.",
          "call sol_get_clock_sysvar invokes the runtime's clock syscall. The convention is: pass the destination pointer in r1, runtime writes 40 bytes of live Clock data into that buffer, then returns.",
          "This is the only syscall in slot_deadline and it is the reason the guard costs ~152 CU on the happy path. The arithmetic and compares around it are 1-2 CU each. The syscall is the rest. Reading sysvars is expensive: the runtime has to look up sysvar state, copy it, and validate the call.",
        ],
      },
      {
        startLine: 17,
        endLine: 19,
        title: "Read the current slot out of the buffer",
        commentary: [
          "Rebuild the buffer pointer in r2. We have to do this because r1 may have been overwritten by the syscall (see the ABI note above). r10 - 40 is a fixed expression, not data the syscall touched, so it always points to the same slot we just filled.",
          "ldxdw r3, [r2 + 0] reads the first 8 bytes of the buffer. Since CLOCK_SLOT_OFF is 0, that is the slot field. r3 now holds the current slot number, freshly written by the runtime moments ago.",
        ],
      },
      {
        startLine: 21,
        endLine: 21,
        title: "The actual safety check, one instruction",
        commentary: [
          "jgt r3, r6, deadline_missed is unsigned greater-than: if the current slot is STRICTLY greater than the caller's max_slot, jump to the failure exit.",
          "Equal passes. If you signed for 'must execute at or before slot N' and the current slot is exactly N, the tx is still valid. Strict greater-than makes the boundary inclusive.",
          "Every line of code before this was loading values into registers. Every line after is exit plumbing. This single jgt is the entire check.",
        ],
      },
      {
        startLine: 23,
        endLine: 24,
        title: "Happy path exit",
        commentary: [
          "Set r0 to 0 (success), then exit. The runtime reads r0 to decide what happened: 0 means 'this instruction passed, continue with the next ix in the transaction', anything non-zero means 'abort the whole transaction atomically and revert every state change made so far'.",
        ],
      },
      {
        startLine: 26,
        endLine: 42,
        title: "Failure exits and the string table",
        commentary: [
          "Two failure paths, same shape: put the log string's address in r1, its byte length in r2, call sol_log_, set the exit code in r0, exit.",
          "deadline_missed logs 'deadline missed' (15 bytes) and exits 1 (condition failed). Every Solana RPC and indexer captures program logs, so the SDK can read this string from the failed tx and tell the user 'your transaction missed the deadline' instead of a generic 'transaction failed'.",
          "bad_ix_data logs 'bad ix data' (11 bytes) and exits 2 (malformed ix data). The caller did not give us exactly 8 bytes.",
          "There is no exit 3 here. Exit 3 means 'invalid account' across all Shield guards, but slot_deadline declares zero accounts, so there is nothing for the caller to get wrong on the account side.",
          "The .rodata section at the bottom holds the literal bytes of the two log strings. They get baked into the program's compiled .so at link time. lddw at runtime loads their ADDRESSES; the bytes themselves are part of the program image and never get copied.",
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
        title: "Constants for the byte offsets we will read",
        commentary: [
          "Three byte offsets into the input region (the block of bytes r1 points at). Declare them up front, read them by name. No structs, no parsers.",
          "Why ACCT0_TOKEN_AMOUNT = 0xA0 (160 decimal)? Solana's aligned loader lays account 0 out in a fixed shape: a per-account header first, then the account's data right after. The header is exactly 0x60 bytes (96 decimal). Inside that 96: dup tag + signer/writable/executable flags (8) + 32-byte pubkey + 32-byte owner + u64 lamports + u64 data_len = 96. So account 0's data block starts at byte 0x60.",
          "An SPL Token account stores its fields in this order: mint (32 bytes) + owner (32) + amount (u64) + ... The amount we care about sits at byte 64 INSIDE the data block. Add that to the data block's start: 0x60 + 0x40 = 0xA0. That is why the constant is 0xA0. One add, no runtime work.",
          "Why INSTRUCTION_DATA_LEN = 0x2910 and INSTRUCTION_DATA = 0x2918? After every declared account's region, the loader appends the instruction's metadata (your ix data length and bytes, the program id, signer indices). Each account region takes about 0x2868 bytes when the account has no data. Account 0 here is a real SPL Token account with 165 bytes of state, which pushes the metadata 168 bytes further along (165 rounded up to an 8-byte alignment boundary). That extra padding is why slippage's offsets are bigger than balance_floor's 0x2868. INSTRUCTION_DATA sits exactly 8 bytes past the length field because the length is a u64.",
        ],
      },
      {
        startLine: 5,
        endLine: 8,
        title: "Check that the caller gave us exactly 8 bytes of ix data",
        commentary: [
          "ldxdw r2, [r1 + INSTRUCTION_DATA_LEN] reads the u64 length the runtime wrote at that offset into r2. ldxdw means 'load 8 bytes from memory at base + offset, zero-extend into the destination register'.",
          "jne r2, 8, bad_ix_data branches to bad_ix_data unless r2 equals 8.",
          "Why exactly 8? The caller is supposed to hand us one u64 min_amount, no more, no less. A 7-byte input would leave the top byte of the u64 as undefined memory. A 9-byte input could sneak past a permissive SDK and let an attacker stuff extra bytes into the tx. Strict equality blocks both. A careful SDK sends exactly 8, a careless or hostile one does not, the guard trusts neither.",
        ],
      },
      {
        startLine: 10,
        endLine: 13,
        title: "Two loads and the actual safety check",
        commentary: [
          "ldxdw r3, [r1 + ACCT0_TOKEN_AMOUNT] reads the live token balance straight out of the account's data block. There is no separate 'fetch account' step because the runtime already mapped account 0's bytes into the same memory r1 points at.",
          "ldxdw r4, [r1 + INSTRUCTION_DATA] reads the caller's floor (the minimum acceptable balance) from the ix data, 8 bytes past the length field.",
          "jlt r3, r4, insufficient is the entire safety check. jlt is unsigned less-than: if the token balance is less than the floor, jump to the failure exit. Equal passes because jlt is strict. Everything around this line was loading values into registers; this one instruction is the check.",
        ],
      },
      {
        startLine: 15,
        endLine: 16,
        title: "Happy path exit",
        commentary: [
          "Set r0 to 0 (success), then exit. The runtime reads r0: 0 means 'continue with the next ix in the transaction', anything non-zero means 'abort the whole transaction and revert every state change'.",
          "Total work on the happy path: 7 instructions, no syscalls, no memory writes, no branches taken. That is the 7 CU baseline. For reference, a Solana transaction has 1.4 million CU to spend, so this guard costs roughly 0.0005% of your budget.",
        ],
      },
      {
        startLine: 18,
        endLine: 23,
        title: "Failure path for the slippage check",
        commentary: [
          "lddw r1, msg_insufficient puts the address of the 'insufficient' string into r1. This overwrites the input pointer in r1, which is fine because we have already read everything we needed from the input region.",
          "mov64 r2, 12 sets the byte length of the string. The Solana syscall ABI for sol_log_ is 'pointer in r1, length in r2' (this is the same calling convention every sBPF syscall uses).",
          "call sol_log_ invokes the runtime's logger. The log line is recorded in the transaction's log messages, captured by every Solana RPC and indexer. That is how a client app finds out WHY the tx failed: the SDK parses 'insufficient' from the log and reports a friendly error instead of a generic 'transaction failed'.",
          "mov64 r0, 1 then exit returns exit code 1. The runtime sees a non-zero exit, aborts the whole transaction atomically, reverts every state change from earlier instructions. The destination ix (your swap, your transfer, whatever) never runs.",
        ],
      },
      {
        startLine: 25,
        endLine: 30,
        title: "Failure path for malformed ix data",
        commentary: [
          "Same shape as the previous block: load the address of 'bad ix data' (11 bytes), log it, exit with code 2.",
          "Why a different exit code? Code 1 means 'the world failed your check' (the user did not have enough tokens). Code 2 means 'you gave me a malformed instruction' (probably a client bug). The SDK can tell these apart and route them differently: show a user-facing slippage error for code 1, log a developer bug for code 2.",
          "The Shield contract uses four exit codes total: 0 success, 1 condition failed, 2 bad ix data, 3 invalid account. slippage has no exit 3 because it does not check what KIND of account 0 is, it just reads the SPL Token amount field by offset. Pass it a non-token account and it will read whatever bytes are at that offset and probably fail with code 1.",
        ],
      },
      {
        startLine: 32,
        endLine: 34,
        title: "Read-only string table",
        commentary: [
          "The two log strings live in the program's read-only data section (.rodata). lddw loads their addresses at runtime; the actual bytes are baked into the compiled .so and never copied.",
          "Total program footprint after the sBPF linker runs: a couple hundred bytes. No relocations, no allocator, no panic handler. The output .so is essentially the entrypoint, the two failure branches, and 23 bytes of read-only ASCII.",
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
        title: "Constants for the byte offsets we will read",
        commentary: [
          "Why INSTRUCTION_DATA_LEN = 0x2868 and INSTRUCTION_DATA = 0x2870? These are the standard offsets for any Shield guard that declares ONE account with no data. The per-account region for a zero-data account takes 0x2868 bytes (10,344 decimal). That includes the per-account header, alignment padding, and zero bytes of data. Whatever comes after that region is your ix metadata, so the length field lands at 0x2868 and the data starts 8 bytes later at 0x2870.",
          "Compare to slippage's 0x2910/0x2918: slippage's account 0 is a real SPL Token account that holds 165 bytes of state, which pushes everything 168 bytes further along (165 rounded up to an 8-byte alignment boundary). Same fields, just shoved later because more sits in front of them. Compare to slot_deadline at 0x0008/0x0010: it declares zero accounts so nothing sits in front, and the offsets stay tiny.",
          "Why ACCT0_LAMPORTS = 0x0050 (80 decimal)? The input region starts with an 8-byte u64 holding the account count. Right after that, the per-account header for account 0 is 8 more bytes (1-byte dup tag + 1-byte is_signer + 1-byte is_writable + 1-byte executable + 4 bytes of alignment padding), followed by the 32-byte pubkey and the 32-byte owner pubkey. Add them up: 8 + 8 + 32 + 32 = 80 bytes. The lamport balance is the next u64, so it sits at byte 80 (0x50). The runtime writes the live balance from chain state at instruction load time, so reading this offset gives us the up-to-date number.",
        ],
      },
      {
        startLine: 7,
        endLine: 8,
        title: "Check that the caller gave us exactly 8 bytes of ix data",
        commentary: [
          "Read the u64 ix data length the runtime wrote at INSTRUCTION_DATA_LEN, fail with exit 2 unless it equals 8.",
          "Why exactly 8? The caller is supposed to hand us one u64 floor (minimum lamports), no more, no less. A 7-byte input leaves the top byte of the u64 undefined; a 9-byte input could sneak past a permissive SDK. Strict equality blocks both.",
        ],
      },
      {
        startLine: 10,
        endLine: 13,
        title: "Two loads and the actual safety check",
        commentary: [
          "ldxdw r3, [r1 + ACCT0_LAMPORTS] reads the account's lamport balance straight out of the input region. There is no separate 'fetch account' step because the runtime already mapped account 0's header into the same memory r1 points at.",
          "ldxdw r4, [r1 + INSTRUCTION_DATA] reads the caller's floor from the ix data.",
          "jlt r3, r4, below_floor is the entire check. jlt is unsigned less-than: if the account holds less than the floor, jump to the failure exit. Equal passes because jlt is strict.",
        ],
      },
      {
        startLine: 15,
        endLine: 16,
        title: "Happy path exit",
        commentary: [
          "Seven instructions on the happy path, 7 CU total. balance_floor is one of the cheapest guards because the runtime hands us pre-decoded lamports at a fixed offset. No parsing, no syscall, no function calls. Just a load and a compare.",
        ],
      },
      {
        startLine: 18,
        endLine: 30,
        title: "Two failure paths",
        commentary: [
          "below_floor logs 'below floor' (11 bytes), exits 1 (condition failed). The SDK reads 'below floor' from the log and reports a friendly error to the user.",
          "bad_ix_data logs 'bad ix data' (11 bytes), exits 2 (malformed ix data). Code 2 means the caller's instruction was malformed (probably a client bug), not that the user failed the balance check.",
          "There is no exit 3 here. balance_floor accepts ANY account at position 0: a Solana program account, a system account, a token account, a wallet, whatever. The guard just reads the lamport field at offset 0x50 and trusts the caller about what KIND of account this is. If you point it at a non-existent address, the runtime materializes a zero-lamports placeholder and the check fails with exit 1.",
        ],
      },
      {
        startLine: 32,
        endLine: 34,
        title: "Read-only string table",
        commentary: [
          "Two log strings live in .rodata, baked into the .so at link time. lddw at runtime loads their addresses; the bytes themselves are part of the compiled program image.",
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
        title: "Constants for every byte we will touch",
        commentary: [
          "Eight constants this time because signer_allowlist reads more pieces of the input region than slippage. The big additions are the is_signer flag byte and the signer's 32-byte pubkey, split into four 8-byte chunks.",
          "INSTRUCTION_DATA_LEN = 0x2868 and INSTRUCTION_DATA = 0x2870 are the standard offsets for any guard with ONE account that holds no data (the per-account region takes 0x2868 bytes, then the ix metadata follows). ALLOWED_PUBKEYS = 0x2871 is exactly one byte past INSTRUCTION_DATA because the ix data layout is [u8 count][32 bytes * count]: one count byte, then count contiguous 32-byte pubkeys.",
          "Why ACCT0_IS_SIGNER = 0x0009? The first 8 bytes of the input region are the u64 account count. Byte 8 is the dup tag (0xFF for a fresh account, otherwise the index of an earlier duplicate). Byte 9 is is_signer. That is exactly where 0x09 comes from. The runtime writes 1 to this byte if and only if the account actually signed the transaction (the signature check happens BEFORE the program runs; this byte is the result the runtime leaves for us).",
          "Why ACCT0_PUBKEY_0..3 at 0x0010, 0x0018, 0x0020, 0x0028? After byte 9 (is_signer) come is_writable (10), executable (11), and 4 bytes of alignment padding (12-15). The 32-byte pubkey starts at byte 16 (0x10). 32 bytes is four u64 chunks of 8 bytes each, so they sit at 16, 24, 32, 40 (which is 0x10, 0x18, 0x20, 0x28). We load all four into registers up front so the inner loop is register-vs-memory, not memory-vs-memory.",
        ],
      },
      {
        startLine: 12,
        endLine: 13,
        title: "Trust the runtime, verify anyway",
        commentary: [
          "ldxb r2, [r1 + ACCT0_IS_SIGNER] reads the 1-byte is_signer flag (ldxb is 'load byte', zero-extended into r2). jne r2, 1, not_signer fails with exit 3 unless it equals 1.",
          "Why check this at all? The Solana runtime ALREADY checks signatures before invoking any program. But there is a real failure mode: a buggy SDK could construct the ix with AccountMeta { isSigner: false } for the signer. The runtime would not require a signature for that pubkey, and the is_signer byte would be 0. Without this guard's check, signer_allowlist would happily compare an UNSIGNED pubkey against the allowlist and succeed. With this check, the failure surfaces as exit 3 ('not signer'), an explicit diagnostic that tells the SDK author exactly what went wrong.",
        ],
      },
      {
        startLine: 15,
        endLine: 16,
        title: "Read the allowlist count, reject empty lists fast",
        commentary: [
          "ldxb r2, [r1 + INSTRUCTION_DATA] reads the count byte (a u8) into r2. r2 now holds how many allowed pubkeys we expect in the rest of the ix data.",
          "jeq r2, 0, not_allowed bails immediately if count is 0. An empty allowlist means 'nobody is permitted', every signer fails. Treated as condition-failure (exit 1), not as malformed input, because the caller might have legitimately constructed an empty list and we should reject rather than crash.",
        ],
      },
      {
        startLine: 18,
        endLine: 22,
        title: "Check that the actual ix data length matches the declared count",
        commentary: [
          "Expected length = 1 + 32 * count. Compare against what the runtime actually delivered.",
          "lsh64 r4, 5 is left-shift by 5 bits, which is the same as multiplying by 32 (since 2^5 = 32). Strictly the same result as mul64 r4, 32, but shift is a cheaper microop. Then add64 r4, 1 for the count byte itself. r4 = expected total length.",
          "jne r3, r4, bad_ix_data on mismatch. This catches both 'caller declared count=5 but only sent 3 pubkeys' (truncation) and 'caller declared count=5 but sent 6 pubkeys' (trailing junk). Either way, exit 2.",
        ],
      },
      {
        startLine: 24,
        endLine: 27,
        title: "Cache the signer's pubkey in registers before the loop",
        commentary: [
          "Four ldxdw instructions load the signer's 32-byte pubkey into r6..r9 as four u64 chunks. We do this ONCE here, before the loop, so the inner loop body only does memory loads on the allowlist side.",
          "Why r6-r9 specifically? Two reasons. First, they are the registers guaranteed to survive a syscall (we do not call any here, but Shield keeps the convention consistent across guards). Second, we have nothing else competing for them right now, the comparison is about to use them and that is it.",
        ],
      },
      {
        startLine: 29,
        endLine: 30,
        title: "Set up the allowlist pointer",
        commentary: [
          "Copy r1 (the input region base) into r3, then add ALLOWED_PUBKEYS to advance r3 to the first 32-byte allowlist entry (one byte past the count). The loop below advances r3 by 32 each iteration to walk through the entries one at a time.",
        ],
      },
      {
        startLine: 32,
        endLine: 43,
        title: "Compare the signer against the current allowlist entry, 8 bytes at a time",
        commentary: [
          "The check label is the inner loop body. Compare the current allowlist entry (in memory at r3) against the cached signer (in registers r6-r9), one 8-byte chunk at a time.",
          "ldxdw r4, [r3 + 0] reads chunk 0 of the candidate, jne r4, r6, advance branches to advance on the first mismatch. Same pattern for offsets 8, 16, 24 against r7, r8, r9. Each compare is one load + one branch, minimal work.",
          "Why unroll the four chunks instead of looping them? Because the signer is already in fixed registers (r6-r9), each compare is one ldxdw + one jne. A sub-loop would need its own counter, indirect addressing, and an extra branch back to the inner check, more instructions per chunk for no benefit. Loop overhead is wasted when the loop body is shorter than the loop machinery.",
          "If all four chunks match, execution falls through past the last jne to mov64 r0, 0; exit. The signer is in the allowlist, transaction continues.",
        ],
      },
      {
        startLine: 45,
        endLine: 48,
        title: "Advance to the next allowlist entry",
        commentary: [
          "advance is the path taken when the candidate did not match. add64 r3, 32 moves r3 to the next 32-byte pubkey in the allowlist (each entry is 32 bytes). sub64 r2, 1 decrements the remaining count.",
          "jne r2, 0, check loops back to the comparison if we still have entries to check. When r2 reaches 0, we have walked the whole allowlist with no match. Fall through to not_allowed (exit 1).",
          "CU scales linearly with the size of the allowlist. Empirically: roughly 17 + 11*N CU. 25 CU at N=1, ~50 CU at N=3, ~225 CU at N=20.",
        ],
      },
      {
        startLine: 50,
        endLine: 69,
        title: "Three failure paths, three exit codes",
        commentary: [
          "not_allowed (exit 1): we walked the entire allowlist without finding the signer. Log 'not allowed' (11 bytes).",
          "not_signer (exit 3): the runtime's is_signer byte was 0, the pubkey passed at position 0 did not actually sign the tx. Exit 3 means 'invalid account' across all Shield guards.",
          "bad_ix_data (exit 2): the declared count and the actual byte length disagreed.",
          "All three follow the same pattern: load the log string address into r1, the length into r2, call sol_log_, set r0 to the exit code, exit. The log strings let the SDK tell the user exactly why the tx failed.",
        ],
      },
      {
        startLine: 71,
        endLine: 74,
        title: "Read-only string table",
        commentary: [
          "Three log strings, one per failure path. Total program footprint stays under a few hundred bytes. The heaviest part of the program is the four-ldxdw chain in the inner loop, not the rodata.",
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
        title: "Constants for the byte offsets and the magic numbers we are scanning for",
        commentary: [
          "Six constants. The first three say where the Instructions sysvar lives inside our input region. The last three say what we are looking for inside that sysvar.",
          "Why ACCT0_KEY = 0x0010, ACCT0_DATA_LEN = 0x0058, ACCT0_DATA = 0x0060? Same per-account header math as balance_floor. The first 8 bytes of the input region are the u64 account count. Then for account 0: 8 bytes of dup tag + flags + padding, then 32-byte pubkey at offset 16 (0x10), then 32-byte owner at 48, then u64 lamports at 80, then u64 data_len at 88 (0x58), then the data itself starts at 96 (0x60). These are the standard offsets for any guard that declares one account.",
          "Why EXPECTED_IX_DATA_LEN = 8? Our own ix data is one u64 ceiling (the per-CU priority fee cap), nothing else. 1 u64 = 8 bytes.",
          "Why CB_PRICE_IX_LEN = 9? A ComputeBudget SetComputeUnitPrice instruction's data is 1 discriminator byte + 1 u64 price = 9 bytes. We will use this to filter out other ComputeBudget variants while walking the tx.",
          "Why SET_CU_PRICE_DISC = 3? ComputeBudget uses single-byte discriminators to tell its variants apart: RequestHeapFrame = 1, SetComputeUnitLimit = 2, SetComputeUnitPrice = 3, SetLoadedAccountsDataSizeLimit = 4. We only care about variant 3.",
        ],
      },
      {
        startLine: 11,
        endLine: 23,
        title: "Verify account 0 is actually the Instructions sysvar",
        commentary: [
          "The Instructions sysvar is a special Solana sysvar that contains the full serialized list of every instruction in the current transaction. It is the only way for a program to inspect its sibling instructions. fee_ceiling NEEDS that introspection because it has to find every ComputeBudget SetComputeUnitPrice in the tx and check it against the ceiling.",
          "The sysvar lives at a fixed pubkey (Sysvar1nstructions1111111111111111111111111). If account 0 is anything else, this guard cannot do its job. Exit 3 with 'bad account'.",
          "lddw r2, sysvar_ix_key loads the address of a 32-byte rodata constant holding the sysvar's raw pubkey bytes. Four pairs of ldxdw + jne compare account 0's pubkey (32 bytes starting at 0x10) against that constant, 8 bytes at a time. First mismatch jumps to bad_account.",
          "Why check this at all? The SDK always wires the sysvar in, but a hand-crafted tx could pass any account. We refuse anything else before reading bytes we would otherwise interpret as serialized instructions.",
        ],
      },
      {
        startLine: 25,
        endLine: 27,
        title: "Set up the sysvar data pointer",
        commentary: [
          "Account 0 is confirmed to be the Instructions sysvar. ldxdw r2 reads the total length of the sysvar's data block into r2. mov64 r3, r1; add64 r3, ACCT0_DATA puts r3 at byte 0 of the sysvar's data. Every offset from here on is computed from r3, not from r1.",
        ],
      },
      {
        startLine: 29,
        endLine: 37,
        title: "Find our own ix using current_instruction_index",
        commentary: [
          "The Instructions sysvar data is laid out as: a 2-byte num_instructions count at the start, then a 2-byte offset entry for each instruction (each entry is the byte offset within the sysvar data where that instruction's serialized form lives), then the serialized instructions themselves, and finally the LAST 2 bytes are current_instruction_index (the index of the instruction the runtime is currently executing, which is THIS guard).",
          "r4 = r3 + r2 - 2 puts r4 at the address of the last 2 bytes. ldxh reads 2 bytes (a u16) into r5. That is our own index in the tx.",
          "Now compute the address of offsets[current_idx]. Each offset entry is 2 bytes, so we multiply current_idx by 2 (lsh64 r4, 1 is left-shift by 1 = multiply by 2, cheaper than mul64). Add r3 to get the absolute address. The +2 in ldxh r9, [r4 + 2] skips the num_instructions u16 at the very start of the sysvar data, so we land on the right offsets-table entry.",
        ],
      },
      {
        startLine: 39,
        endLine: 50,
        title: "Skip the ix header to land on our own ceiling u64",
        commentary: [
          "r4 = r3 + r9 = the base of our own ix's serialized form within the sysvar. Each serialized ix has this layout: 2-byte num_accounts, then num_accounts account metas (33 bytes each = 1 flag byte + 32-byte pubkey), then 32-byte program_id, then 2-byte ix_data_len, then ix_data.",
          "ldxh r5, [r4 + 0] reads num_accounts. We need to skip past: 2 bytes (num_accounts) + 33 * num_accounts (account metas) + 32 (program_id) = 34 + 33 * num_accounts. lsh64 r4, 1 then add64 r4, 1 would not work in one go, so the code splits: mul64 r9, 33; add64 r9, 34; add64 r9, r4. r9 = pointer to our ix_data_len.",
          "ldxh r5, [r9 + 0] reads ix_data_len. jne r5, 8, bad_ix_data verifies it equals 8.",
          "ldxdw r6, [r9 + 2] reads the u64 ceiling from our ix data, 8 bytes past the length field. The +2 is because ix_data_len is a u16 (2 bytes), not a u64. r6 now holds the per-CU ceiling for the rest of the program.",
        ],
      },
      {
        startLine: 52,
        endLine: 53,
        title: "Loop setup",
        commentary: [
          "ldxh r8, [r3 + 0] reads num_instructions (the very first u16 of the sysvar data). r8 is the loop bound. mov64 r7, 0 initializes the outer counter. We will walk every instruction in the tx, checking each one for a SetComputeUnitPrice that exceeds the ceiling.",
        ],
      },
      {
        startLine: 55,
        endLine: 71,
        title: "Walk every ix, compute its program_id pointer",
        commentary: [
          "jge r7, r8, ok: counter reached num_instructions with no violation found, success exit.",
          "Same offsets-table dance as the previous block, but for ix at index r7 instead of our own ix. offsets[r7] gives the byte offset of ix r7's serialization. r9 = base of ix r7.",
          "This time we want to skip to the program_id (not the ix_data_len). Skip 2 (num_accounts) + 33 * num_accounts (account metas). r5 = pointer to ix r7's 32-byte program_id.",
        ],
      },
      {
        startLine: 73,
        endLine: 89,
        title: "Is this ix a ComputeBudget call?",
        commentary: [
          "lddw r4, cb_program_id loads the address of a 32-byte rodata constant holding ComputeBudget's program_id (ComputeBudget111111111111111111111111111111).",
          "Four pairs of ldxdw + jne compare ix r7's program_id against the constant. First mismatch branches to next_ix (this ix is not a ComputeBudget call, move on). All four match means this ix targets ComputeBudget, continue checking.",
        ],
      },
      {
        startLine: 91,
        endLine: 98,
        title: "Is it specifically SetComputeUnitPrice, and does it exceed the ceiling?",
        commentary: [
          "We know ix r7 targets ComputeBudget. ComputeBudget has four variants; we only care about SetComputeUnitPrice. Check the shape:",
          "ldxh r4, [r5 + 32] reads ix_data_len at offset 32 from the program_id (program_id is 32 bytes wide, so ix_data_len follows it). Must equal 9. The other ComputeBudget variants (SetComputeUnitLimit = 5 bytes, RequestHeapFrame = 5 bytes, SetLoadedAccountsDataSizeLimit = 5 bytes) all have shorter data, so a length of 9 effectively narrows us to SetComputeUnitPrice.",
          "ldxb r4, [r5 + 34] reads the discriminator byte (offset 34 = program_id end at 32 + ix_data_len u16 at 32-33 = first ix data byte at 34). Must equal 3.",
          "If both match, ldxdw r4, [r5 + 35] reads the u64 price (8 bytes after the discriminator).",
          "jgt r4, r6, fee_too_high: if the bid price is STRICTLY greater than our ceiling, fail with exit 1. Equal passes (the boundary is inclusive on purpose, paying exactly the ceiling is fine).",
        ],
      },
      {
        startLine: 100,
        endLine: 106,
        title: "Advance and ok exit",
        commentary: [
          "next_ix: add64 r7, 1; ja loop. Increment the counter, jump back. We walk EVERY instruction in the tx. Solana's runtime already rejects txs with duplicate ComputeBudget variants, but the guard is more conservative: if a duplicate ever slips through, both get checked.",
          "ok: mov64 r0, 0; exit. We walked the whole tx, no SetComputeUnitPrice exceeded the ceiling. Success.",
        ],
      },
      {
        startLine: 108,
        endLine: 127,
        title: "Three failure paths, three exit codes",
        commentary: [
          "fee_too_high (exit 1): a SetComputeUnitPrice was higher than the ceiling. Log 'fee too high' (12 bytes).",
          "bad_ix_data (exit 2): our own ix data was not exactly 8 bytes. Log 'bad ix data' (11 bytes).",
          "bad_account (exit 3): account 0 was not the Instructions sysvar. Log 'bad account' (11 bytes).",
          "All three follow the same pattern: load the log string into r1, the length into r2, call sol_log_, set r0 to the exit code, exit.",
        ],
      },
      {
        startLine: 129,
        endLine: 134,
        title: "Read-only data: two pubkeys and three strings",
        commentary: [
          "Two 32-byte pubkey constants (the Instructions sysvar key and the ComputeBudget program id) plus three log strings. The pubkeys are baked into the .so at link time, same as the log strings. No relocations, no dynamic allocation, the whole program is one self-contained chunk.",
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
        title: "Constants for the byte offsets we will read",
        commentary: [
          "Three constants, identical to the other sysvar-walking guards (fee_ceiling, compute_unit_floor). They name where account 0's pubkey, data length, and data block live inside the input region.",
          "Why ACCT0_KEY = 0x0010, ACCT0_DATA_LEN = 0x0058, ACCT0_DATA = 0x0060? Same per-account header math as the other guards. 8 bytes for the u64 account count + 8 bytes for the dup tag/flags/padding = 16, where the 32-byte pubkey starts. Pubkey ends at 48, then 32 bytes of owner pubkey ends at 80, then 8-byte u64 lamports ends at 88, which is where the data_len u64 sits (0x58). Data starts at 96 (0x60). Account 0 here is the Instructions sysvar, so the data block is the serialized list of every instruction in the tx.",
        ],
      },
      {
        startLine: 7,
        endLine: 20,
        title: "Verify account 0 is the Instructions sysvar",
        commentary: [
          "Four 8-byte compares against the rodata sysvar pubkey constant (Sysvar1nstructions1111111111111111111111111). Any mismatch exits 3 with 'bad account'.",
          "Why check at all? The SDK always wires the sysvar in, but a hand-crafted tx could pass any account. We refuse anything else before reading bytes we would otherwise interpret as serialized instructions. See the fee_ceiling walkthrough for the same pattern.",
        ],
      },
      {
        startLine: 22,
        endLine: 31,
        title: "Set up the data pointer, cache our own index and the total ix count",
        commentary: [
          "r3 = pointer to the sysvar's serialized data (input region + 0x60). All subsequent ix lookups are relative to r3.",
          "r9 = current_instruction_index, read from the LAST 2 bytes of the sysvar data. The runtime puts our own index there so a program can identify itself. We cache it because the outer loop will compare every ix index against r9 to skip the guard's own ix (more on that below).",
          "r8 = num_instructions, the u16 at the very start of the sysvar data. r8 is the outer loop bound.",
        ],
      },
      {
        startLine: 33,
        endLine: 45,
        title: "Locate our own ix and read its data length",
        commentary: [
          "Same sysvar walk as fee_ceiling: use the offsets table to find our own ix's serialized form, then skip past the per-ix header (num_accounts u16 + 33 bytes per account meta + 32-byte program_id) to land on the ix_data_len u16.",
          "ldxh r2 reads num_accounts. mul64 r2, 33; add64 r2, 34 computes the offset to ix_data_len (skipping the num_accounts u16, the account metas, and the program_id). r4 += r2 leaves r4 pointing at ix_data_len.",
          "ldxh r2 reads the length. add64 r4, 2 advances r4 to the first byte of ix_data itself.",
        ],
      },
      {
        startLine: 47,
        endLine: 53,
        title: "Read the allowlist count, validate the total length",
        commentary: [
          "ldxb r6, [r4 + 0] reads count (the first byte of our ix data). The layout is [u8 count][32 bytes * count]: one count byte, then count contiguous 32-byte pubkeys.",
          "jeq r6, 0, not_allowed fast-fails on an empty allowlist. An empty list means 'nothing is permitted', every non-self ix would fail, so we exit 1 immediately instead of running the loop for nothing.",
          "Expected length = 1 + 32 * count. r5 = r6 << 5 (left-shift by 5 is multiplication by 32, since 2^5 = 32), then add 1 for the count byte. jne r2, r5, bad_ix_data on mismatch (exit 2). Catches both truncation and trailing junk.",
        ],
      },
      {
        startLine: 55,
        endLine: 61,
        title: "Set up the start and end pointers for the allowlist",
        commentary: [
          "r5 = r4 + 1 = pointer to the first 32-byte allowlist entry (skipping the count byte).",
          "r6 = r5 + count * 32 = pointer to one byte past the last entry. We use r6 as a sentinel in the inner loop: when the scan pointer reaches r6, we have walked the whole allowlist without finding a match for the current ix.",
        ],
      },
      {
        startLine: 63,
        endLine: 80,
        title: "Outer loop: skip our own ix, look up the next program_id",
        commentary: [
          "jge r7, r8, ok exits the loop successfully when r7 reaches num_instructions (all top-level ixs checked, no violation).",
          "jeq r7, r9, advance_outer skips the guard's own ix (where r7 equals current_instruction_index, which we cached in r9). This is the implicit-self-skip contract: the caller does not need to include this guard's program_id in the allowlist because the guard exempts itself. Without this branch, the user would have to list this program's own pubkey, which is awkward and circular.",
          "For every other ix, locate its program_id using the offsets table (same pattern as fee_ceiling). Save the candidate program_id pointer in r1.",
        ],
      },
      {
        startLine: 84,
        endLine: 102,
        title: "Inner check: compare the candidate program_id against every allowlist entry",
        commentary: [
          "Inner loop body. Compare the candidate program_id (in memory at r1) against the current allowlist entry (in memory at r2), 8 bytes at a time. Four pairs of ldxdw + jne.",
          "First mismatch jumps to advance_inner: bump r2 by 32 (move to the next allowlist entry), check if r2 reached r6 (the end sentinel we computed above). If yes, the candidate didn't match anything in the allowlist, fail with exit 1 (not_allowed). If no, loop back to check_inner with the new r2.",
          "All four chunks match (this ix's program_id is in the allowlist), ja advance_outer to check the next ix.",
        ],
      },
      {
        startLine: 104,
        endLine: 110,
        title: "Outer advance and happy exit",
        commentary: [
          "advance_outer: add64 r7, 1; ja loop. Increment the outer counter, restart.",
          "ok: mov64 r0, 0; exit. All non-self ixs matched some entry in the allowlist. Success.",
        ],
      },
      {
        startLine: 112,
        endLine: 131,
        title: "Three failure paths, three exit codes",
        commentary: [
          "not_allowed (exit 1): either the count was 0, or some ix targeted a program not in the allowlist. Log 'not allowed' (11 bytes).",
          "bad_ix_data (exit 2): the declared count and the actual ix data length disagreed. Log 'bad ix data' (11 bytes).",
          "bad_account (exit 3): account 0 was not the Instructions sysvar. Log 'bad account' (11 bytes).",
        ],
      },
      {
        startLine: 133,
        endLine: 137,
        title: "Read-only data",
        commentary: [
          "The Instructions sysvar pubkey constant (32 bytes) and three log strings. Total program size stays small because the loops are unrolled four wide (each pubkey compare is four ldxdw + four jne, no inner table machinery).",
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
        title: "Constants for the byte offsets and the magic numbers we are scanning for",
        commentary: [
          "Six constants. The first three are the standard sysvar input-region offsets (same as fee_ceiling and program_allowlist): account 0's pubkey at 0x10, its data length at 0x58, its data block at 0x60. See balance_floor for why those specific numbers fall out of the per-account header layout.",
          "Why EXPECTED_IX_DATA_LEN = 4? Our ix data is one u32 holding the floor (4 bytes). We use a u32 instead of a u64 because SetComputeUnitLimit's units field is itself a u32, there is no point storing a floor that ComputeBudget cannot represent. 1 u32 = 4 bytes.",
          "Why CB_LIMIT_IX_LEN = 5? A ComputeBudget SetComputeUnitLimit instruction's data is 1 discriminator byte + 1 u32 units = 5 bytes total.",
          "Why SET_CU_LIMIT_DISC = 2? ComputeBudget's discriminator table: RequestHeapFrame = 1, SetComputeUnitLimit = 2, SetComputeUnitPrice = 3, SetLoadedAccountsDataSizeLimit = 4. We want variant 2 (distinct from fee_ceiling, which wanted variant 3).",
        ],
      },
      {
        startLine: 11,
        endLine: 23,
        title: "Verify account 0 is the Instructions sysvar",
        commentary: [
          "Same four-chunk sysvar pubkey compare as the other two sysvar-walking guards. Any mismatch exits 3 with 'bad account'. See fee_ceiling for the full explanation.",
        ],
      },
      {
        startLine: 25,
        endLine: 37,
        title: "Locate our own ix inside the sysvar data",
        commentary: [
          "Same sysvar walk as fee_ceiling. r3 = pointer to the sysvar's serialized data. r5 = current_instruction_index, read from the LAST 2 bytes of the sysvar data (where the runtime stamps it). r9 = offsets[current_idx] (the byte offset of our own ix's serialization within the sysvar data).",
          "r4 = r3 + r9 = base of our own ix's serialized form. Every byte we read from here is relative to r4.",
        ],
      },
      {
        startLine: 39,
        endLine: 50,
        title: "Skip the per-ix header to land on our ceiling u32",
        commentary: [
          "Same num_accounts * 33 + 34 hop as fee_ceiling to skip past num_accounts (2 bytes) + the account metas (33 bytes each) + the program_id (32 bytes), landing on our ix_data_len.",
          "Validate ix_data_len == 4. Mismatch exits 2.",
          "ldxw r6, [r9 + 2] reads the u32 floor into r6. ldxw loads 4 bytes (vs ldxdw's 8), zero-extending the top 32 bits of r6. r6 now holds the floor for the rest of the program. The +2 is because ix_data_len is itself a u16 (2 bytes), so the actual ix data starts 2 bytes past the length field.",
        ],
      },
      {
        startLine: 52,
        endLine: 54,
        title: "Loop setup with a 'found' flag",
        commentary: [
          "r8 = num_instructions. r7 = 0 (outer counter). r2 = 0 (the found flag).",
          "Why a found flag? This guard has to enforce something subtler than fee_ceiling. It requires that AT LEAST ONE SetComputeUnitLimit greater than or equal to the floor exists in the tx, AND that no SetComputeUnitLimit is below the floor. Single pass through the ixs: set r2 = 1 when we see a valid one. After the loop, if r2 is still 0, no SetComputeUnitLimit was present at all, so we fail.",
        ],
      },
      {
        startLine: 56,
        endLine: 73,
        title: "Walk every ix, compute its program_id pointer",
        commentary: [
          "jge r7, r8, check_found exits the loop into the found-flag check (not directly into success). Even with no violation seen, we still need to verify we found at least one matching ix.",
          "Same pattern as fee_ceiling for locating ix r7's program_id: offsets table, skip num_accounts * 33 + 2 bytes to land on the 32-byte program_id.",
        ],
      },
      {
        startLine: 74,
        endLine: 90,
        title: "Is this ix a ComputeBudget call?",
        commentary: [
          "Load cb_program_id (the ComputeBudget program's 32-byte pubkey from rodata). Four-chunk u64 compare. First mismatch branches to next_ix (this ix is not a ComputeBudget call, move on).",
        ],
      },
      {
        startLine: 92,
        endLine: 101,
        title: "Is it specifically SetComputeUnitLimit, and does it meet the floor?",
        commentary: [
          "ix_data_len at offset 32 (right after the 32-byte program_id) must equal 5. Discriminator at offset 34 (program_id + ix_data_len u16) must equal 2. A length of 5 plus a discriminator of 2 effectively narrows us to SetComputeUnitLimit, distinct from fee_ceiling's price check (length 9, disc 3).",
          "If both match, ldxw r4, [r5 + 35] reads the u32 units (4 bytes after the discriminator). ldxw zero-extends so the top 32 bits of r4 are 0.",
          "jlt r4, r6, cu_too_low is strict less-than: if units is less than the floor, exit 1 immediately. Even one undersized SetComputeUnitLimit fails the whole tx, there is no point continuing the walk after a violation.",
          "Otherwise, mov64 r2, 1 marks 'found a valid SetComputeUnitLimit' and falls through to next_ix.",
        ],
      },
      {
        startLine: 103,
        endLine: 108,
        title: "Advance and check the found flag at the end",
        commentary: [
          "next_ix: add64 r7, 1; ja loop. Walk every ix.",
          "check_found: jeq r2, 0, cu_too_low. If r2 is still 0 after the loop, no SetComputeUnitLimit was found anywhere in the tx. Fail with cu_too_low (exit 1).",
          "This is the 'missing SetComputeUnitLimit also fails' contract. The guard treats 'no explicit limit declared' the same as 'limit below floor'. Solana would otherwise apply a default per-ix CU budget; we do not trust that default. The caller must declare what budget they expect.",
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
        title: "Three failure paths, three exit codes",
        commentary: [
          "cu_too_low (exit 1): either no SetComputeUnitLimit was found at all, or one was below the floor. Log 'cu too low' (10 bytes). Same exit code for both cases because they mean the same thing semantically: the tx's compute budget does not meet the caller's minimum.",
          "bad_ix_data (exit 2): our own ix data was not exactly 4 bytes. Log 'bad ix data' (11 bytes).",
          "bad_account (exit 3): account 0 was not the Instructions sysvar. Log 'bad account' (11 bytes).",
        ],
      },
      {
        startLine: 135,
        endLine: 140,
        title: "Read-only data",
        commentary: [
          "Two 32-byte pubkey constants (the Instructions sysvar key and the ComputeBudget program id) plus three log strings. Same shape as fee_ceiling because both guards walk the same sysvar looking for ComputeBudget instructions, just for different opcodes (and a different comparison direction).",
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
