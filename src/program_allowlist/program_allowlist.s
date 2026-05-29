.equ ACCT0_KEY,             0x0010
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
  msg_acct:         .ascii "bad account"
