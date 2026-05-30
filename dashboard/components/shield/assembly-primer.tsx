export function AssemblyPrimer() {
  return (
    <aside className="rounded-md border border-border bg-secondary px-5 py-4">
      <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
        reading the assembly
      </p>
      <div className="mt-3 flex flex-col gap-3 text-sm leading-6 text-muted-foreground">
        <p>
          Every sBPF program enters with a single argument in{" "}
          <code className="font-mono text-foreground">r1</code>: a pointer to a
          memory region that the Solana runtime has pre-formatted with the
          accounts you declared, your instruction data, signer flags, lamports,
          owner pubkeys, and program metadata. Constants like{" "}
          <code className="font-mono text-foreground">ACCT0_TOKEN_AMOUNT</code>{" "}
          or{" "}
          <code className="font-mono text-foreground">INSTRUCTION_DATA_LEN</code>{" "}
          are fixed byte offsets into that region. The guard reads the right
          offsets and compares them. No deserialization, no parser library, no
          allocator.
        </p>
        <p>
          <span className="text-foreground">Registers.</span>{" "}
          <code className="font-mono text-foreground">r0</code>-
          <code className="font-mono text-foreground">r10</code>, 64-bit.{" "}
          <code className="font-mono text-foreground">r0</code> is the return
          code at <code className="font-mono text-foreground">exit</code> (0 =
          success, non-zero = failure that aborts the whole transaction).{" "}
          <code className="font-mono text-foreground">r1</code> carries the
          input pointer and also acts as the first argument of any syscall.{" "}
          <code className="font-mono text-foreground">r10</code> is the stack
          frame pointer.{" "}
          <code className="font-mono text-foreground">r2</code>-
          <code className="font-mono text-foreground">r9</code> are scratch.
        </p>
        <p>
          <span className="text-foreground">Memory and jumps.</span>{" "}
          <code className="font-mono text-foreground">ldxdw</code>/
          <code className="font-mono text-foreground">ldxw</code>/
          <code className="font-mono text-foreground">ldxh</code>/
          <code className="font-mono text-foreground">ldxb</code> load 8/4/2/1
          bytes from memory, zero-extended into a 64-bit register. Stores are{" "}
          <code className="font-mono text-foreground">stx*</code> with matching
          widths.{" "}
          <code className="font-mono text-foreground">jeq</code>/
          <code className="font-mono text-foreground">jne</code>/
          <code className="font-mono text-foreground">jlt</code>/
          <code className="font-mono text-foreground">jgt</code>/
          <code className="font-mono text-foreground">jge</code>/
          <code className="font-mono text-foreground">jle</code> compare two
          registers (or a register and an immediate) and conditionally jump to
          a label.{" "}
          <code className="font-mono text-foreground">call sol_*</code> invokes
          a Solana runtime syscall (the CU budget includes the syscall cost).{" "}
          <code className="font-mono text-foreground">exit</code> returns{" "}
          <code className="font-mono text-foreground">r0</code> to the runtime.
        </p>
        <p>
          All numeric values are little-endian; Solana's ABI is LE end to end.
          If the explanation calls a value{" "}
          <code className="font-mono text-foreground">u64 LE</code>, it means 8
          bytes, least significant byte first, read straight into a register.
        </p>
      </div>
    </aside>
  );
}
