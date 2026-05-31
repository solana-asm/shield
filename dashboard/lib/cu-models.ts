import type { CuModel } from "@/components/shield/cu-calculator";

export const signerAllowlistCuModel: CuModel = {
  axes: [{ id: "n", label: "allowlist size (N)", initial: 1, min: 1, max: 20 }],
  compute: ({ n }) => ({
    best: 25,
    worst: 25 + (n - 1) * 11,
    bestSub: "signer matches first entry",
    worstSub: `signer matches at position ${n}`,
  }),
  footnote:
    "Roughly 17 + 11×N CU overall. Best case is signer-at-first-entry, worst case is signer-at-last-entry. Independent of the rest of the transaction.",
};

export const programAllowlistCuModel: CuModel = {
  axes: [
    { id: "n", label: "allowlist size (N)", initial: 1, min: 1, max: 20 },
    {
      id: "ixs",
      label: "top-level ixs in tx (M)",
      initial: 2,
      min: 2,
      max: 15,
    },
  ],
  compute: ({ n, ixs }) => {
    const extraIxs = Math.max(0, ixs - 2);
    return {
      best: 80 + extraIxs * 20,
      worst: 80 + extraIxs * 20 + (n - 1) * 30,
      bestSub: "every non-self ix matches first entry",
      worstSub: `every non-self ix matches at position ${n}`,
    };
  },
  txModel: "guard + (M − 1) other top-level ixs",
  footnote:
    "Walks the Instructions sysvar, so cost scales with both N and the number of top-level ixs in the transaction. Each extra non-self ix adds ~20 CU at best, more if it has to walk further into the allowlist before matching.",
};

export const feeCeilingCuModel: CuModel = {
  axes: [
    {
      id: "ixs",
      label: "top-level ixs in tx (M)",
      initial: 2,
      min: 2,
      max: 15,
    },
  ],
  compute: ({ ixs }) => {
    const extra = Math.max(0, ixs - 2);
    return {
      best: 86 + extra * 8,
      bestSub: "no SetComputeUnitPrice match in tx",
    };
  },
  txModel: "guard + (M − 1) other top-level ixs",
  footnote:
    "Walks the Instructions sysvar to inspect every top-level ix. Add ~30 CU per SetComputeUnitPrice match encountered in the loop.",
};

export const computeUnitFloorCuModel: CuModel = {
  axes: [
    {
      id: "ixs",
      label: "top-level ixs in tx (M)",
      initial: 3,
      min: 3,
      max: 15,
    },
  ],
  compute: ({ ixs }) => {
    const extra = Math.max(0, ixs - 3);
    return {
      best: 93 + extra * 15,
      bestSub: "SetComputeUnitLimit declared at or above floor",
    };
  },
  txModel: "limit + guard + (M − 2) other top-level ixs",
  footnote:
    "Walks the Instructions sysvar looking for SetComputeUnitLimit. Each extra top-level ix adds ~15 CU to the walk.",
};

export const cuModels: Partial<Record<string, CuModel>> = {
  signer_allowlist: signerAllowlistCuModel,
  program_allowlist: programAllowlistCuModel,
  fee_ceiling: feeCeilingCuModel,
  compute_unit_floor: computeUnitFloorCuModel,
};
