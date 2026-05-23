.equ INSTRUCTION_DATA_LEN, 0x0008
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
  msg_bad:  .ascii "bad ix data"
