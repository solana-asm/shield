.equ INSTRUCTION_DATA_LEN, 0x2910
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
  msg_bad:          .ascii "bad ix data"
