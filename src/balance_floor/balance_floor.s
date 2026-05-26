.equ INSTRUCTION_DATA_LEN, 0x2868
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
  msg_bad:   .ascii "bad ix data"
