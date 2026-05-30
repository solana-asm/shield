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
};

export type SimulationResult =
  | {
      ok: true;
      network: "devnet" | "mainnet";
      logs: string[];
      unitsConsumed: number;
      err: null;
      failedAt: number | null;
      programs: { slug: GuardSlug; name: string; programId: string }[];
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
  ctx: { feePayer: PublicKey; currentSlot: number }
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
      const allowedRaw = rawParams.allowed ?? "";
      const allowed = allowedRaw.trim()
        ? parsePubkeyList(allowedRaw)
        : [ctx.feePayer];
      return signerAllowlistIx({
        programId: PROGRAM_IDS.signer_allowlist,
        signer: ctx.feePayer,
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

export async function simulateShieldedTransaction(
  req: BuildRequest
): Promise<SimulationResult> {
  try {
    const feePayer = new PublicKey(DEFAULT_FEE_PAYER);
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

    return {
      ok: true,
      network: req.network,
      logs: sim.value.logs ?? [],
      unitsConsumed: sim.value.unitsConsumed ?? 0,
      err: null,
      failedAt,
      programs: programsUsed,
    };
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return { ok: false, message };
  }
}
