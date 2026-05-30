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
          "INSTRUCTION_DATA_LEN = 0x0008 and INSTRUCTION_DATA = 0x0010. slot_deadline takes zero accounts, so the aligned loader's per-account block does not exist; ix metadata sits at the very front of the input region.",
          "CLOCK_BUF_SIZE = 40. The Clock sysvar serializes to exactly 40 bytes: slot (u64), epoch_start_timestamp (i64), epoch (u64), leader_schedule_epoch (u64), unix_timestamp (i64).",
          "CLOCK_SLOT_OFF = 0. slot is the first u64 in the Clock struct, read at offset 0 of the buffer.",
        ],
      },
      {
        startLine: 8,
        endLine: 9,
        title: "Validate ix data shape",
        commentary: [
          "ldxdw r2, [r1 + INSTRUCTION_DATA_LEN]. Read the runtime-supplied length of our ix data.",
          "jne r2, 8, bad_ix_data. Exactly 8 bytes expected: one u64 LE max_slot. Anything else exits 2.",
        ],
      },
      {
        startLine: 11,
        endLine: 11,
        title: "Cache the deadline",
        commentary: [
          "ldxdw r6, [r1 + INSTRUCTION_DATA]. Load the caller's max_slot into r6. r6 is callee-saved across the syscall, which matters in the next block.",
        ],
      },
      {
        startLine: 13,
        endLine: 15,
        title: "Reserve stack, call sol_get_clock_sysvar",
        commentary: [
          "r10 is the stack frame pointer. mov64 r1, r10; sub64 r1, CLOCK_BUF_SIZE puts r1 at the bottom of a 40-byte stack slot.",
          "call sol_get_clock_sysvar. The syscall ABI says r1 is the destination buffer pointer. After the call returns, that 40-byte slot holds the live Clock sysvar.",
        ],
      },
      {
        startLine: 17,
        endLine: 19,
        title: "Read slot from the buffer",
        commentary: [
          "Recompute the buffer pointer in r2 (the syscall may have clobbered r1).",
          "ldxdw r3, [r2 + CLOCK_SLOT_OFF]. r3 now holds the current slot.",
        ],
      },
      {
        startLine: 21,
        endLine: 21,
        title: "The comparison",
        commentary: [
          "jgt r3, r6, deadline_missed. 'if current_slot > max_slot, jump.' Equality passes: the deadline you signed for is still valid this slot.",
        ],
      },
      {
        startLine: 23,
        endLine: 24,
        title: "Happy path exit",
        commentary: [
          "mov64 r0, 0; exit. The transaction continues to the next instruction.",
        ],
      },
      {
        startLine: 26,
        endLine: 42,
        title: "Failure exits and rodata",
        commentary: [
          "deadline_missed logs 'deadline missed' (15 bytes) and exits 1.",
          "bad_ix_data logs 'bad ix data' (11 bytes) and exits 2.",
          "No exit 3: zero accounts means no account check that could fail.",
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
          "Solana's aligned loader hands the program a pre-formatted memory region in r1. These three constants name the three byte offsets this guard cares about.",
          "ACCT0_TOKEN_AMOUNT = 0xA0. Account 0's data begins at byte 0x60 (after the 8-byte dup tag, flags, pubkey, owner, lamports, data_len). The SPL Token program stores amount as a u64 at byte 64 of the account data, so amount = 0x60 + 0x40 = 0xA0. One offset, no runtime arithmetic.",
          "INSTRUCTION_DATA_LEN = 0x2910 (not the usual 0x2868). Per-account regions grow with data.len(). Account 0 here is a real SPL Token account with 165 bytes of data, which shifts the ix-metadata block 168 bytes downward. INSTRUCTION_DATA sits exactly 8 bytes past that (right after the u64 length field).",
        ],
      },
      {
        startLine: 5,
        endLine: 8,
        title: "Validate ix data shape",
        commentary: [
          "ldxdw r2, [r1 + INSTRUCTION_DATA_LEN]. Read the u64 the runtime wrote there, which is the length of OUR ix data.",
          "jne r2, 8, bad_ix_data. We expect exactly 8 bytes: one u64 LE min_amount. Anything else, including 7-byte truncation or 9-byte padding attacks, branches to the bad_ix_data exit. This is what makes the guard malleable-proof.",
        ],
      },
      {
        startLine: 10,
        endLine: 13,
        title: "Two loads, one compare",
        commentary: [
          "ldxdw r3, [r1 + ACCT0_TOKEN_AMOUNT]. r3 now holds the live token balance, read straight from account 0's data region.",
          "ldxdw r4, [r1 + INSTRUCTION_DATA]. r4 holds the caller-supplied floor. Both are u64 little-endian.",
          "jlt r3, r4, insufficient. jlt is unsigned 'less than'. If amount < min, jump to the insufficient exit. Equal passes. This single instruction is the entire safety check.",
        ],
      },
      {
        startLine: 15,
        endLine: 16,
        title: "Happy path exit",
        commentary: [
          "mov64 r0, 0 sets the return code to success. exit hands control back to the runtime. Solana sees r0 == 0 and moves on to the next instruction in the transaction.",
          "That is the entire happy path: 7 instructions, no syscalls, no writes, no branches taken.",
        ],
      },
      {
        startLine: 18,
        endLine: 23,
        title: "Condition failed",
        commentary: [
          "lddw r1, msg_insufficient. Load the address of the rodata string into r1, which sol_log_ uses as the buffer pointer.",
          "mov64 r2, 12. The byte length of the string 'insufficient'. r1 and r2 together are sol_log_'s ABI: pointer + length.",
          "call sol_log_, then mov64 r0, 1, then exit. Solana sees r0 == 1, aborts the transaction atomically, and the log line lands in devnet diagnostics so the client can tell users what happened.",
        ],
      },
      {
        startLine: 25,
        endLine: 30,
        title: "Bad ix data",
        commentary: [
          "Same shape, different message. 11 bytes for 'bad ix data'. r0 = 2 distinguishes a malformed-input failure from a condition failure.",
          "Two exits, two log strings, three exit codes total. The uniform Shield exit-code contract: 0 success, 1 condition failed, 2 bad ix data, 3 invalid account (slippage does not validate account 0's type, so no exit 3 here).",
        ],
      },
      {
        startLine: 32,
        endLine: 34,
        title: "Rodata",
        commentary: [
          "The two log strings live in read-only data. lddw loads their addresses into r1 at runtime, the rodata bytes themselves are part of the .so.",
          "Total binary footprint after sbpf-link: a couple hundred bytes. No relocations, no panics, no allocator.",
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
          "INSTRUCTION_DATA_LEN = 0x2868 and INSTRUCTION_DATA = 0x2870. These are the standard offsets for a zero-data-account guard. Account 0 has no data, so the per-account region uses its minimum size and ix metadata starts at 0x2868.",
          "ACCT0_LAMPORTS = 0x0050. Each account's input region carries the lamports balance at a fixed 8-byte offset in the header: dup tag (8) + flags (8) + pubkey (32) + owner (32) = 0x50.",
        ],
      },
      {
        startLine: 7,
        endLine: 8,
        title: "Validate ix data shape",
        commentary: [
          "Standard length check: exactly 8 bytes (one u64 LE floor) or exit 2 with bad_ix_data.",
        ],
      },
      {
        startLine: 10,
        endLine: 13,
        title: "Two loads, one compare",
        commentary: [
          "ldxdw r3, [r1 + ACCT0_LAMPORTS]. r3 holds the live lamports balance for account 0. The aligned loader hands this to us directly; no syscall needed.",
          "ldxdw r4, [r1 + INSTRUCTION_DATA]. r4 holds the caller-supplied minimum.",
          "jlt r3, r4, below_floor. Unsigned less-than: if balance < min, fail. Equal passes.",
        ],
      },
      {
        startLine: 15,
        endLine: 16,
        title: "Happy path exit",
        commentary: [
          "Seven instructions total. Same shape as slippage, different field. The aligned loader does all the parsing; this guard just reads the right offset.",
        ],
      },
      {
        startLine: 18,
        endLine: 30,
        title: "Failure exits",
        commentary: [
          "below_floor logs 'below floor' (11 bytes) and exits 1.",
          "bad_ix_data logs 'bad ix data' (11 bytes) and exits 2.",
          "No exit 3: balance_floor accepts any account at position 0. It is the caller's responsibility to pass the right one.",
        ],
      },
      {
        startLine: 32,
        endLine: 34,
        title: "Rodata",
        commentary: [
          "Two rodata strings: 'below floor' for exit 1, 'bad ix data' for exit 2.",
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
          "INSTRUCTION_DATA_LEN = 0x2868 (standard zero-data-account offset). INSTRUCTION_DATA = 0x2870 is the first byte of our payload, which is the count u8.",
          "ALLOWED_PUBKEYS = 0x2871. One byte past the count, where the 32-byte pubkeys begin packed.",
          "ACCT0_IS_SIGNER = 0x0009. The runtime flips this byte to 1 if the runtime saw a valid signature for account 0.",
          "ACCT0_PUBKEY_0..3 at 0x0010, 0x0018, 0x0020, 0x0028. The signer's 32-byte pubkey split into four contiguous u64 chunks for unrolled compare.",
        ],
      },
      {
        startLine: 12,
        endLine: 13,
        title: "Trust the runtime, verify anyway",
        commentary: [
          "ldxb r2, [r1 + ACCT0_IS_SIGNER]; jne r2, 1, not_signer. Defense in depth. If a buggy SDK marks the account as a signer in JS but it actually was not signed, the runtime's is_signer byte will be 0 and we exit 3 with 'not signer'. This guards against the 'I forgot AccountMeta.isSigner = true' failure mode.",
        ],
      },
      {
        startLine: 15,
        endLine: 16,
        title: "Read count, reject empty allowlist",
        commentary: [
          "ldxb r2, [r1 + INSTRUCTION_DATA]. r2 = count, the number of allowed pubkeys.",
          "jeq r2, 0, not_allowed. An empty allowlist is semantically 'nobody is allowed', which is always a fail. Treated as a condition-failed (exit 1), not a malformed input.",
        ],
      },
      {
        startLine: 18,
        endLine: 22,
        title: "Validate ix data length",
        commentary: [
          "Expected length = 1 (count byte) + 32 * count.",
          "r4 = r2 << 5 computes 32 * count in one instruction (left shift by 5 = multiply by 32). add64 r4, 1 adds the count byte.",
          "jne r3, r4, bad_ix_data. If the actual length does not match the declared count, the caller built a malformed instruction (trailing junk, missing pubkeys), exit 2.",
        ],
      },
      {
        startLine: 24,
        endLine: 27,
        title: "Cache signer pubkey in registers",
        commentary: [
          "Load the signer's 32-byte pubkey into r6..r9 as four u64 chunks. These stay in registers across the loop so the inner compare is register-vs-memory, no second pointer to track.",
        ],
      },
      {
        startLine: 29,
        endLine: 30,
        title: "Setup allowlist pointer",
        commentary: [
          "r3 starts at the input region base. add64 r3, ALLOWED_PUBKEYS advances it to the first 32-byte allowlist entry.",
        ],
      },
      {
        startLine: 32,
        endLine: 43,
        title: "Unrolled 32-byte compare",
        commentary: [
          "check is the inner loop body. Compare the current allowlist entry (at r3) against the cached signer (r6..r9) using four 8-byte compares.",
          "Each jne short-circuits on the first mismatch to advance. Why unroll? r6..r9 in registers makes each compare one ldxdw + one jne. Tight and predictable.",
          "If all four match, fall through to mov64 r0, 0; exit. The signer is allowed.",
        ],
      },
      {
        startLine: 45,
        endLine: 48,
        title: "Advance to next entry",
        commentary: [
          "add64 r3, 32 jumps to the next pubkey in the allowlist.",
          "sub64 r2, 1 decrements the remaining count. jne r2, 0, check loops if there are more entries.",
          "When r2 reaches 0, we fall through to not_allowed. CU scales linearly with N: roughly 17 + 11*N CU.",
        ],
      },
      {
        startLine: 50,
        endLine: 69,
        title: "Three failure exits",
        commentary: [
          "not_allowed (exit 1): signer's pubkey did not match any allowlist entry. Log 'not allowed' (11 bytes).",
          "not_signer (exit 3): the runtime did not mark account 0 as signed. Log 'not signer' (10 bytes).",
          "bad_ix_data (exit 2): length mismatch on caller-supplied ix data. Log 'bad ix data' (11 bytes).",
        ],
      },
      {
        startLine: 71,
        endLine: 74,
        title: "Rodata",
        commentary: [
          "Three log strings, one per failure path.",
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
          "ACCT0_KEY = 0x0010, ACCT0_DATA_LEN = 0x0058, ACCT0_DATA = 0x0060. Standard input-region offsets to reach account 0's pubkey, data length, and data block.",
          "EXPECTED_IX_DATA_LEN = 8: our caller-supplied ceiling is one u64 LE.",
          "CB_PRICE_IX_LEN = 9: a ComputeBudget SetComputeUnitPrice ix is 1 disc byte + u64 price.",
          "SET_CU_PRICE_DISC = 3: the discriminator the ComputeBudget program uses for SetComputeUnitPrice.",
        ],
      },
      {
        startLine: 11,
        endLine: 23,
        title: "Verify account 0 is the Instructions sysvar",
        commentary: [
          "lddw r2, sysvar_ix_key loads the address of the 32-byte sysvar pubkey constant from rodata.",
          "Four pairs of ldxdw + jne compare the supplied account 0 pubkey against the constant in 8-byte chunks. Any mismatch exits 3 with 'bad account'.",
          "This is the only place the guard trusts the caller about an account, and it verifies that trust before reading the data block.",
        ],
      },
      {
        startLine: 25,
        endLine: 27,
        title: "Setup sysvar data pointer",
        commentary: [
          "r2 = sysvar data length. r3 = pointer to the start of the sysvar's serialized bytes (input region + 0x60). The walk below indexes into [r3...].",
        ],
      },
      {
        startLine: 29,
        endLine: 37,
        title: "Find our own ix via current_instruction_index",
        commentary: [
          "The sysvar's last 2 bytes are current_instruction_index, the index of the ix that is currently executing (this guard). r4 = r3 + data_len - 2, ldxh reads it into r5.",
          "The offsets table at the front of the sysvar lists each top-level ix's byte offset. r4 = r3 + (r5 << 1), ldxh [r4 + 2] reads offsets[current_idx] into r9. The +2 skips the num_instructions u16 header.",
          "r9 = our own ix's byte offset relative to the sysvar data.",
        ],
      },
      {
        startLine: 39,
        endLine: 50,
        title: "Skip past the ix header to land on the ceiling u64",
        commentary: [
          "r4 = r3 + r9 = base of our ix's per-ix serialization. Each ix is laid out as: num_accounts (u16) | account_metas (33 bytes each) | program_id (32) | ix_data_len (u16) | ix_data.",
          "r9 = num_accounts * 33 + 34 + r4 advances past num_accounts and account metas (33 bytes each), the 32-byte program_id, and the 2-byte ix_data_len header.",
          "Validate ix_data_len == 8 (ldxh r5, [r9]). r6 = ldxdw [r9 + 2] reads the u64 ceiling.",
        ],
      },
      {
        startLine: 52,
        endLine: 53,
        title: "Loop init",
        commentary: [
          "r8 = num_instructions (first u16 of the sysvar data). r7 = 0, the loop counter.",
        ],
      },
      {
        startLine: 55,
        endLine: 71,
        title: "Walk every ix, compute its program_id pointer",
        commentary: [
          "jge r7, r8, ok exits successfully if we have walked every ix without violation.",
          "Same offsets-table pattern: offsets[r7] gives the byte offset of ix r7. r9 = base of ix r7.",
          "Skip num_accounts * 33 + 2 to land on its program_id. r5 = pointer to the 32-byte program_id of ix r7.",
        ],
      },
      {
        startLine: 73,
        endLine: 89,
        title: "Is this ix a ComputeBudget call?",
        commentary: [
          "Load the 32-byte cb_program_id constant. Compare against ix r7's program_id in four 8-byte chunks.",
          "First mismatch branches to next_ix. If all four match, this ix targets ComputeBudget.",
        ],
      },
      {
        startLine: 91,
        endLine: 98,
        title: "Is it specifically SetComputeUnitPrice, and does it exceed?",
        commentary: [
          "ldxh r4, [r5 + 32]: ix_data_len at offset 32 from program_id. Must equal 9.",
          "ldxb r4, [r5 + 34]: discriminator at offset 34 (program_id + ix_data_len u16 + 0). Must equal 3.",
          "If both match, ldxdw r4, [r5 + 35] reads the u64 price (8 bytes after the disc).",
          "jgt r4, r6, fee_too_high. If price > ceiling, exit 1 with 'fee too high'. Equal passes.",
        ],
      },
      {
        startLine: 100,
        endLine: 106,
        title: "Advance and ok exit",
        commentary: [
          "next_ix: r7 += 1, jump back to loop. Walking every ix catches multiple SetComputeUnitPrice attempts (Solana's runtime rejects duplicates, but the guard is more conservative).",
          "ok: r0 = 0, exit. Successful walk; no SetComputeUnitPrice exceeded the ceiling.",
        ],
      },
      {
        startLine: 108,
        endLine: 127,
        title: "Three failure exits",
        commentary: [
          "fee_too_high (exit 1): 'fee too high' (12 bytes). A SetComputeUnitPrice exceeded the ceiling.",
          "bad_ix_data (exit 2): 'bad ix data' (11 bytes). Our own ix data was not exactly 8 bytes.",
          "bad_account (exit 3): 'bad account' (11 bytes). Account 0 was not the Instructions sysvar.",
        ],
      },
      {
        startLine: 129,
        endLine: 134,
        title: "Rodata",
        commentary: [
          "Two 32-byte pubkey constants (Instructions sysvar key, ComputeBudget program id) and three log strings.",
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
          "ACCT0_KEY = 0x0010, ACCT0_DATA_LEN = 0x0058, ACCT0_DATA = 0x0060. Same as fee_ceiling: account 0's pubkey, data length, and data block within the aligned-loader input region.",
        ],
      },
      {
        startLine: 7,
        endLine: 20,
        title: "Verify account 0 is the Instructions sysvar",
        commentary: [
          "Four 8-byte compares against the rodata sysvar pubkey. Any mismatch exits 3 with 'bad account'. Same defensive pattern as fee_ceiling.",
        ],
      },
      {
        startLine: 22,
        endLine: 31,
        title: "Setup DATA_PTR, find current_idx and num_ix",
        commentary: [
          "r3 = pointer to the sysvar's serialized data (input + 0x60). All subsequent ix lookups are relative to r3.",
          "r9 = current_instruction_index, read from the last 2 bytes of the sysvar data. We use r9 below to skip our own ix in the loop.",
          "r8 = num_instructions, the u16 at the front of the sysvar data.",
        ],
      },
      {
        startLine: 33,
        endLine: 45,
        title: "Locate our own ix and read its ix_data_len",
        commentary: [
          "Use the offsets table: r4 = r3 + offsets[current_idx] = pointer to our own ix's per-ix serialization.",
          "ldxh r2 = num_accounts. mul64 r2, 33; add64 r2, 34 computes the offset to ix_data_len (skipping account metas, program_id, and landing on the 2-byte length header).",
          "r4 += r2 leaves r4 = &ix_data_len. ldxh r2 reads the length. add64 r4, 2 advances to ix_data.",
        ],
      },
      {
        startLine: 47,
        endLine: 53,
        title: "Read count, validate length",
        commentary: [
          "ldxb r6, [r4 + 0] = count (first byte of ix_data). jeq r6, 0, not_allowed treats an empty allowlist as 'nothing is allowed', which always fails (exit 1).",
          "Expected length = 1 + 32 * count. r5 = r6 << 5 (multiply by 32) + 1. jne r2, r5, bad_ix_data on mismatch (exit 2).",
        ],
      },
      {
        startLine: 55,
        endLine: 61,
        title: "Setup ALLOWLIST_PTR and ALLOWLIST_END",
        commentary: [
          "r5 = r4 + 1 = pointer to the first 32-byte allowlist entry.",
          "r6 = r5 + count * 32 = one byte past the last entry. The inner loop uses r6 as a sentinel to know when we exhausted the allowlist.",
        ],
      },
      {
        startLine: 63,
        endLine: 80,
        title: "Outer loop, skip self, compute candidate program_id",
        commentary: [
          "jeq r7, r9, advance_outer skips the guard's own ix (the implicit-self-skip contract). The user does not need to include this guard's program_id in the allowlist.",
          "For every other ix, locate its program_id using the offsets table (same pattern as fee_ceiling).",
          "r1 = pointer to candidate program_id. r2 = ALLOWLIST_PTR (reset every outer iteration).",
        ],
      },
      {
        startLine: 84,
        endLine: 102,
        title: "Inner check, 4× unrolled u64 compare",
        commentary: [
          "Four pairs of ldxdw + jne. On first mismatch, jump to advance_inner. If all four match, the candidate program_id IS in the allowlist; jump to advance_outer.",
          "advance_inner adds 32 to r2 (next allowlist entry). jge r2, r6, not_allowed exits if we exhausted the allowlist without finding a match (exit 1).",
        ],
      },
      {
        startLine: 104,
        endLine: 110,
        title: "Advance outer, exit",
        commentary: [
          "advance_outer: r7 += 1, loop back. Walk every top-level ix.",
          "ok: mov64 r0, 0; exit. Every checked ix matched an allowlist entry.",
        ],
      },
      {
        startLine: 112,
        endLine: 131,
        title: "Three failure exits",
        commentary: [
          "not_allowed (exit 1): 'not allowed' (11 bytes). Either an ix targeted a non-allowlisted program, or count was 0.",
          "bad_ix_data (exit 2): 'bad ix data' (11 bytes). Length mismatch against declared count.",
          "bad_account (exit 3): 'bad account' (11 bytes). Account 0 was not the Instructions sysvar.",
        ],
      },
      {
        startLine: 133,
        endLine: 137,
        title: "Rodata",
        commentary: [
          "The Instructions sysvar pubkey constant and three log strings.",
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
          "First three: standard sysvar input-region offsets, same as fee_ceiling and program_allowlist.",
          "EXPECTED_IX_DATA_LEN = 4: our caller-supplied floor is a u32 (4 bytes LE).",
          "CB_LIMIT_IX_LEN = 5: a ComputeBudget SetComputeUnitLimit ix is 1 disc byte + u32 limit.",
          "SET_CU_LIMIT_DISC = 2: the discriminator the ComputeBudget program uses for SetComputeUnitLimit.",
        ],
      },
      {
        startLine: 11,
        endLine: 23,
        title: "Verify account 0 is the Instructions sysvar",
        commentary: [
          "Same four-chunk pubkey compare. Mismatch exits 3.",
        ],
      },
      {
        startLine: 25,
        endLine: 37,
        title: "Locate our own ix",
        commentary: [
          "Same sysvar walk: r3 = data ptr, r5 = current_instruction_index (last 2 bytes), r9 = offsets[current_idx] (our own ix offset).",
          "r4 = r3 + r9 = base of our ix's per-ix serialization.",
        ],
      },
      {
        startLine: 39,
        endLine: 50,
        title: "Skip header, validate length, read floor",
        commentary: [
          "r9 = num_accounts * 33 + 34 + r4 = pointer to our ix_data_len.",
          "Validate ix_data_len == 4 (we expect exactly 4 bytes, one u32 LE floor). Mismatch exits 2.",
          "ldxw r6, [r9 + 2] reads the u32 floor into r6 (zero-extended into the high half of the 64-bit register).",
        ],
      },
      {
        startLine: 52,
        endLine: 54,
        title: "Loop init with found flag",
        commentary: [
          "r8 = num_instructions. r7 = 0 (outer counter). r2 = 0 (found flag). The guard requires at least one SetComputeUnitLimit ≥ floor; r2 flips to 1 if we see one.",
        ],
      },
      {
        startLine: 56,
        endLine: 73,
        title: "Loop, compute ix r7 program_id pointer",
        commentary: [
          "jge r7, r8, check_found exits the loop into the found-flag check.",
          "Same pattern as fee_ceiling: offsets[r7] gives ix r7's offset. r5 = pointer to its program_id.",
        ],
      },
      {
        startLine: 74,
        endLine: 90,
        title: "Is this ix ComputeBudget?",
        commentary: [
          "Load cb_program_id constant. Four-chunk u64 compare. First mismatch branches to next_ix.",
        ],
      },
      {
        startLine: 92,
        endLine: 101,
        title: "Is it specifically SetComputeUnitLimit, and does it meet the floor?",
        commentary: [
          "ix_data_len at offset 32 must equal 5. Discriminator at offset 34 must equal 2 (SetComputeUnitLimit, not SetComputeUnitPrice).",
          "If both match, ldxw r4, [r5 + 35] reads the u32 units (zero-extended).",
          "jlt r4, r6, cu_too_low. Strict less-than: if units < floor, exit 1 immediately. Even one undersized SetComputeUnitLimit fails the whole tx.",
          "Otherwise, mov64 r2, 1 marks 'found' and continues the loop.",
        ],
      },
      {
        startLine: 103,
        endLine: 108,
        title: "Advance, check found flag",
        commentary: [
          "next_ix: r7 += 1, ja loop. Walk every ix to catch a second undersized SetComputeUnitLimit too.",
          "check_found: jeq r2, 0, cu_too_low. If we never saw a SetComputeUnitLimit at all, exit 1. The guard treats 'no limit declared' as a violation, not a 'default applies' scenario.",
        ],
      },
      {
        startLine: 110,
        endLine: 112,
        title: "Happy path exit",
        commentary: [
          "ok: mov64 r0, 0; exit. Found at least one SetComputeUnitLimit ≥ floor, and none below it.",
        ],
      },
      {
        startLine: 114,
        endLine: 133,
        title: "Three failure exits",
        commentary: [
          "cu_too_low (exit 1): 'cu too low' (10 bytes). Either no SetComputeUnitLimit found, or one was below floor.",
          "bad_ix_data (exit 2): 'bad ix data' (11 bytes). Our own ix data was not exactly 4 bytes.",
          "bad_account (exit 3): 'bad account' (11 bytes). Account 0 was not the Instructions sysvar.",
        ],
      },
      {
        startLine: 135,
        endLine: 140,
        title: "Rodata",
        commentary: [
          "Sysvar pubkey, ComputeBudget program id, and three log strings.",
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
