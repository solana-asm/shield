export const SBPF_DOCS: Record<string, string> = {
  ldxdw: "load 8 bytes from memory (zero-extended into a 64-bit register)",
  ldxw: "load 4 bytes from memory (zero-extended)",
  ldxh: "load 2 bytes from memory (zero-extended)",
  ldxb: "load 1 byte from memory (zero-extended)",
  stxdw: "store 8 bytes to memory",
  stxw: "store 4 bytes to memory",
  stxh: "store 2 bytes to memory",
  stxb: "store 1 byte to memory",
  lddw: "load an 8-byte immediate (often a .rodata address) into a register",
  mov64: "copy a register or immediate into a register",
  add64: "64-bit addition",
  sub64: "64-bit subtraction",
  mul64: "64-bit multiplication",
  lsh64: "64-bit left shift (shifting by N is the same as multiplying by 2^N)",
  jeq: "jump if equal",
  jne: "jump if not equal",
  jlt: "jump if less than (unsigned)",
  jgt: "jump if greater than (unsigned)",
  jge: "jump if greater than or equal (unsigned)",
  jle: "jump if less than or equal (unsigned)",
  ja: "unconditional jump",
  call: "invoke a Solana runtime syscall (CU budget includes the syscall cost; r0-r5 may be overwritten)",
  exit: "return r0 to the runtime (0 = success, non-zero aborts the whole transaction)",
  ".equ": "assembler directive: define a named constant (.equ NAME, VALUE)",
  ".globl": "assembler directive: mark a symbol as global so the loader can find it (entrypoint)",
  ".rodata": "begin the read-only data section (string constants, pubkey bytes)",
  ".ascii": "raw ASCII string literal (no null terminator)",
  ".byte": "raw byte literal (one or more u8 values)",
};

export function buildSbpfFirstOccurrence(
  assembly: string
): Record<string, number> {
  const out: Record<string, number> = {};
  const lines = assembly.split("\n");
  const keys = Object.keys(SBPF_DOCS);
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    for (const k of keys) {
      if (out[k] !== undefined) continue;
      const pattern = k.startsWith(".")
        ? new RegExp(`\\${k}\\b`)
        : new RegExp(`\\b${k}\\b`);
      if (pattern.test(line)) {
        out[k] = i + 1;
      }
    }
  }
  return out;
}
