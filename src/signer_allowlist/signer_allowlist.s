.equ INSTRUCTION_DATA_LEN, 0x2868
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
  msg_bad:         .ascii "bad ix data"
