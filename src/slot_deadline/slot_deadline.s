# slot_deadline — Shield guard
#
# Aborts the enclosing transaction if the current slot has passed a caller-
# supplied deadline. Stateless, takes no accounts.
#
# instruction data: [u64 max_slot]  (8 bytes, little-endian)
# exit codes:
#   0 — current_slot <= max_slot                (success)
#   1 — current_slot >  max_slot                (deadline missed)
#   2 — instruction data length != 8            (malformed input)

# Input layout when num_accounts == 0:
#   0x0000  u64  num_accounts
#   0x0008  u64  instruction_data_len
#   0x0010  [..] instruction_data
.equ INSTRUCTION_DATA_LEN, 0x0008
.equ INSTRUCTION_DATA,     0x0010

# Clock sysvar buffer is 40 bytes; slot is the first field.
.equ CLOCK_BUF_SIZE, 40
.equ CLOCK_SLOT_OFF, 0

.globl entrypoint
entrypoint:
  # --- validate ix data length ---
  ldxdw r2, [r1 + INSTRUCTION_DATA_LEN]
  jne r2, 8, bad_ix_data

  # --- load max_slot into a callee-saved register so the syscall can't clobber it ---
  ldxdw r6, [r1 + INSTRUCTION_DATA]

  # --- fetch clock sysvar into a stack buffer ---
  mov64 r1, r10
  sub64 r1, CLOCK_BUF_SIZE
  call sol_get_clock_sysvar

  # --- read current_slot from the buffer ---
  mov64 r2, r10
  sub64 r2, CLOCK_BUF_SIZE
  ldxdw r3, [r2 + CLOCK_SLOT_OFF]

  # --- if current_slot > max_slot, deadline missed ---
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
