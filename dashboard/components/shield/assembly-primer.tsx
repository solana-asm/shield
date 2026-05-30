export function AssemblyPrimer() {
  return (
    <aside className="rounded-md border border-border bg-secondary px-5 py-4">
      <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
        reading the assembly
      </p>
      <div className="mt-3 flex flex-col gap-3 text-sm leading-6 text-muted-foreground">
        <p>
          <span className="text-foreground">Input region.</span>{" "}
          <code className="font-mono text-foreground">r1</code> enters pointing
          at a block of bytes the Solana runtime laid out for you: account
          count, per-account headers (flags, pubkey, owner, lamports, data),
          your instruction data, program metadata. Constants like{" "}
          <code className="font-mono text-foreground">ACCT0_TOKEN_AMOUNT</code>{" "}
          or{" "}
          <code className="font-mono text-foreground">INSTRUCTION_DATA_LEN</code>{" "}
          are fixed byte offsets into that block. Read the offset, compare,
          done. No deserialization, no parser, no allocator.
        </p>
        <p>
          <span className="text-foreground">Registers.</span> Eleven 64-bit
          registers, <code className="font-mono text-foreground">r0</code>{" "}
          through <code className="font-mono text-foreground">r10</code>.{" "}
          <code className="font-mono text-foreground">r0</code> is the exit
          code (0 = success, non-zero aborts the whole transaction).{" "}
          <code className="font-mono text-foreground">r1</code> is the input
          pointer on entry and the first argument to any syscall.{" "}
          <code className="font-mono text-foreground">r10</code> is the stack
          frame pointer.{" "}
          <code className="font-mono text-foreground">r2</code>-
          <code className="font-mono text-foreground">r9</code> are scratch.
        </p>
        <p>
          <span className="text-foreground">Loads.</span>{" "}
          <code className="font-mono text-foreground">ldxdw</code>/
          <code className="font-mono text-foreground">ldxw</code>/
          <code className="font-mono text-foreground">ldxh</code>/
          <code className="font-mono text-foreground">ldxb</code> read 8/4/2/1
          bytes from memory into a register, zero-extended.{" "}
          <code className="font-mono text-foreground">stx*</code> writes the
          other direction.{" "}
          <code className="font-mono text-foreground">lddw</code> drops an
          8-byte immediate (often a{" "}
          <code className="font-mono text-foreground">.rodata</code> address)
          into a register.
        </p>
        <p>
          <span className="text-foreground">Jumps and arithmetic.</span>{" "}
          <code className="font-mono text-foreground">jeq</code>,{" "}
          <code className="font-mono text-foreground">jne</code>,{" "}
          <code className="font-mono text-foreground">jlt</code>,{" "}
          <code className="font-mono text-foreground">jgt</code>,{" "}
          <code className="font-mono text-foreground">jge</code>,{" "}
          <code className="font-mono text-foreground">jle</code> compare two
          values and conditionally jump to a label.{" "}
          <code className="font-mono text-foreground">ja</code> jumps
          unconditionally.{" "}
          <code className="font-mono text-foreground">mov64</code>,{" "}
          <code className="font-mono text-foreground">add64</code>,{" "}
          <code className="font-mono text-foreground">sub64</code>,{" "}
          <code className="font-mono text-foreground">mul64</code>,{" "}
          <code className="font-mono text-foreground">lsh64</code> are the
          64-bit arithmetic and shift ops.
        </p>
        <p>
          <span className="text-foreground">Syscalls and exit.</span>{" "}
          <code className="font-mono text-foreground">call sol_*</code> invokes
          a Solana runtime syscall (the CU budget includes the syscall cost).
          The ABI lets the runtime overwrite{" "}
          <code className="font-mono text-foreground">r0</code>-
          <code className="font-mono text-foreground">r5</code> during the
          call, so anything you need to keep alive has to sit in{" "}
          <code className="font-mono text-foreground">r6</code>-
          <code className="font-mono text-foreground">r9</code>.{" "}
          <code className="font-mono text-foreground">exit</code> returns{" "}
          <code className="font-mono text-foreground">r0</code> to the runtime.
        </p>
        <p>
          <span className="text-foreground">Endianness.</span> Solana's ABI is
          little-endian end to end. When the prose says{" "}
          <code className="font-mono text-foreground">u64 LE</code>, it means 8
          bytes least-significant first, read straight into a register.
        </p>
      </div>
    </aside>
  );
}
