"use server";

import {
  ComputeBudgetProgram,
  Connection,
  PublicKey,
  SystemProgram,
  TransactionInstruction,
  TransactionMessage,
  VersionedTransaction,
} from "@solana/web3.js";
import {
  balanceFloorIx,
  computeUnitFloorIx,
  feeCeilingIx,
  programAllowlistIx,
  signerAllowlistIx,
  slippageIx,
  slotDeadlineIx,
} from "@solana-asm/shield";
import { PROGRAM_IDS, DEFAULT_FEE_PAYER, RPC_URLS } from "@/lib/build/program-ids";
import type { GuardSlug } from "@/lib/build/form-spec";

export type BuildRequest = {
  network: "devnet" | "mainnet";
  enabled: Record<GuardSlug, boolean>;
  params: Record<GuardSlug, Record<string, string>>;
  signerOverride?: string;
};

export type CompiledIxView = {
  programIdIndex: number;
  programId: string;
  programLabel: string;
  accountKeyIndexes: number[];
  dataHex: string;
  dataLen: number;
};

export type CompiledMessageView = {
  header: {
    numRequiredSignatures: number;
    numReadonlySignedAccounts: number;
    numReadonlyUnsignedAccounts: number;
  };
  recentBlockhash: string;
  accountKeys: string[];
  instructions: CompiledIxView[];
  byteLength: number;
};

export type SimulationResult =
  | {
      ok: true;
      network: "devnet" | "mainnet";
      logs: string[];
      unitsConsumed: number;
      err: null;
      failedAt: number | null;
      programs: {
        slug: GuardSlug;
        name: string;
        programId: string;
        cu: number | null;
      }[];
      compiled: CompiledMessageView;
    }
  | {
      ok: false;
      message: string;
    };

function parsePubkey(value: string, fieldLabel: string): PublicKey {
  const trimmed = value.trim();
  if (!trimmed) throw new Error(`${fieldLabel}: pubkey required`);
  return new PublicKey(trimmed);
}

function parsePubkeyList(value: string): PublicKey[] {
  return value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .map((line) => new PublicKey(line));
}

function buildGuardInstruction(
  slug: GuardSlug,
  rawParams: Record<string, string>,
  ctx: {
    feePayer: PublicKey;
    signerOverride: PublicKey | null;
    currentSlot: number;
  }
): TransactionInstruction {
  switch (slug) {
    case "slot_deadline": {
      const raw = rawParams.maxSlot?.trim();
      const maxSlot = raw ? BigInt(raw) : BigInt(ctx.currentSlot + 100);
      return slotDeadlineIx({
        programId: PROGRAM_IDS.slot_deadline,
        maxSlot,
      });
    }
    case "slippage": {
      const tokenAccount = parsePubkey(
        rawParams.tokenAccount ?? "",
        "slippage.tokenAccount"
      );
      const minAmount = BigInt(rawParams.minAmount?.trim() || "0");
      return slippageIx({
        programId: PROGRAM_IDS.slippage,
        tokenAccount,
        minAmount,
      });
    }
    case "balance_floor": {
      const accountRaw = rawParams.account?.trim();
      const account = accountRaw
        ? new PublicKey(accountRaw)
        : ctx.feePayer;
      const minLamports = BigInt(rawParams.minLamports?.trim() || "0");
      return balanceFloorIx({
        programId: PROGRAM_IDS.balance_floor,
        account,
        minLamports,
      });
    }
    case "signer_allowlist": {
      const signerPubkey = ctx.signerOverride ?? ctx.feePayer;
      const allowedRaw = rawParams.allowed ?? "";
      const allowed = allowedRaw.trim()
        ? parsePubkeyList(allowedRaw)
        : [signerPubkey];
      return signerAllowlistIx({
        programId: PROGRAM_IDS.signer_allowlist,
        signer: signerPubkey,
        allowed,
      });
    }
    case "fee_ceiling": {
      const maxMicroLamports = BigInt(
        rawParams.maxMicroLamports?.trim() || "0"
      );
      return feeCeilingIx({
        programId: PROGRAM_IDS.fee_ceiling,
        maxMicroLamports,
      });
    }
    case "program_allowlist": {
      const allowedRaw = rawParams.allowed ?? "";
      const allowed = parsePubkeyList(allowedRaw);
      if (allowed.length === 0) {
        throw new Error("program_allowlist: at least one allowed program required");
      }
      return programAllowlistIx({
        programId: PROGRAM_IDS.program_allowlist,
        allowed,
      });
    }
    case "compute_unit_floor": {
      const minUnits = Number(rawParams.minUnits?.trim() || "0");
      return computeUnitFloorIx({
        programId: PROGRAM_IDS.compute_unit_floor,
        minUnits,
      });
    }
  }
}

const GUARD_ORDER: GuardSlug[] = [
  "slot_deadline",
  "signer_allowlist",
  "fee_ceiling",
  "program_allowlist",
  "compute_unit_floor",
  "balance_floor",
  "slippage",
];

const SYSTEM_PROGRAM_ID = "11111111111111111111111111111111";
const COMPUTE_BUDGET_PROGRAM_ID = "ComputeBudget111111111111111111111111111111";

function labelForProgramId(
  pid: string,
  guardMap: Map<string, GuardSlug>
): string {
  const guard = guardMap.get(pid);
  if (guard) return guard;
  if (pid === SYSTEM_PROGRAM_ID) return "system_program";
  if (pid === COMPUTE_BUDGET_PROGRAM_ID) return "compute_budget";
  return `${pid.slice(0, 4)}…${pid.slice(-4)}`;
}

const PROGRAM_CU_LINE =
  /^Program (\S+) consumed (\d+) of \d+ compute units$/;

function parsePerProgramCu(logs: string[]): Map<string, number> {
  const map = new Map<string, number>();
  for (const line of logs) {
    const m = line.match(PROGRAM_CU_LINE);
    if (!m) continue;
    const [, pid, cu] = m;
    map.set(pid, (map.get(pid) ?? 0) + Number(cu));
  }
  return map;
}

export async function simulateShieldedTransaction(
  req: BuildRequest
): Promise<SimulationResult> {
  try {
    // Fee payer always stays the demo wallet (has SOL for sim fees on both
    // networks). When a real wallet is connected, it gets layered in as the
    // signer for signer_allowlist only.
    const feePayer = new PublicKey(DEFAULT_FEE_PAYER);
    const signerOverride = req.signerOverride
      ? new PublicKey(req.signerOverride)
      : null;
    const rpcUrl = RPC_URLS[req.network];
    const connection = new Connection(rpcUrl, "confirmed");

    const enabledGuards = GUARD_ORDER.filter((slug) => req.enabled[slug]);
    const currentSlot = await connection.getSlot("confirmed");

    const ixs: TransactionInstruction[] = [];

    // Auto-add SetComputeUnitLimit so compute_unit_floor has something to find,
    // and so the destination self-transfer has budget to run.
    ixs.push(
      ComputeBudgetProgram.setComputeUnitLimit({ units: 200_000 })
    );

    const programsUsed: {
      slug: GuardSlug;
      name: string;
      programId: string;
    }[] = [];

    for (const slug of enabledGuards) {
      const ix = buildGuardInstruction(slug, req.params[slug] ?? {}, {
        feePayer,
        signerOverride,
        currentSlot,
      });
      ixs.push(ix);
      programsUsed.push({
        slug,
        name: slug,
        programId: PROGRAM_IDS[slug].toBase58(),
      });
    }

    // Destination ix: a self-transfer of 1 lamport. Represents "the action you
    // were protecting." Aborts cleanly if any guard before it fails.
    ixs.push(
      SystemProgram.transfer({
        fromPubkey: feePayer,
        toPubkey: feePayer,
        lamports: 1,
      })
    );

    const { blockhash } = await connection.getLatestBlockhash("confirmed");

    const message = new TransactionMessage({
      payerKey: feePayer,
      recentBlockhash: blockhash,
      instructions: ixs,
    }).compileToV0Message();

    const tx = new VersionedTransaction(message);

    const sim = await connection.simulateTransaction(tx, {
      sigVerify: false,
      replaceRecentBlockhash: true,
      commitment: "confirmed",
    });

    let failedAt: number | null = null;
    const errAny = sim.value.err as unknown;
    if (errAny && typeof errAny === "object" && "InstructionError" in errAny) {
      const ie = (errAny as { InstructionError: [number, unknown] })
        .InstructionError;
      if (Array.isArray(ie) && typeof ie[0] === "number") failedAt = ie[0];
    }

    const logs = sim.value.logs ?? [];
    const cuByProgram = parsePerProgramCu(logs);

    const programsWithCu = programsUsed.map((p) => ({
      ...p,
      cu: cuByProgram.get(p.programId) ?? null,
    }));

    const guardPidToSlug = new Map<string, GuardSlug>(
      programsUsed.map((p) => [p.programId, p.slug])
    );

    const accountKeys = message.staticAccountKeys.map((k) => k.toBase58());
    const compiledInstructions = message.compiledInstructions.map((ix) => {
      const pid = accountKeys[ix.programIdIndex];
      const dataBuf = Buffer.from(ix.data);
      return {
        programIdIndex: ix.programIdIndex,
        programId: pid,
        programLabel: labelForProgramId(pid, guardPidToSlug),
        accountKeyIndexes: Array.from(ix.accountKeyIndexes),
        dataHex: dataBuf.toString("hex"),
        dataLen: dataBuf.length,
      };
    });

    const serialized = tx.serialize();

    return {
      ok: true,
      network: req.network,
      logs,
      unitsConsumed: sim.value.unitsConsumed ?? 0,
      err: null,
      failedAt,
      programs: programsWithCu,
      compiled: {
        header: {
          numRequiredSignatures: message.header.numRequiredSignatures,
          numReadonlySignedAccounts: message.header.numReadonlySignedAccounts,
          numReadonlyUnsignedAccounts:
            message.header.numReadonlyUnsignedAccounts,
        },
        recentBlockhash: message.recentBlockhash,
        accountKeys,
        instructions: compiledInstructions,
        byteLength: serialized.length,
      },
    };
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return { ok: false, message };
  }
}
