.equ ACCT0_KEY,             0x0010
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
  msg_acct:       .ascii "bad account"
