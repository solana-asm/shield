import type { AllowlistCuModel } from "@/components/shield/allowlist-cu-calculator";

export const programAllowlistCuModel: AllowlistCuModel = {
  baseCu: 80,
  slopePerEntry: 50,
  txModel: "1 dest ix",
  inputId: "program-allowlist-n",
  bestCaseSub: "first entry matches, N=1",
  worstCaseSub: "last entry compared at N",
  footnote:
    "Tx shape held to guard + one destination ix. Add ~50 CU per extra top-level ix walked. Slope is per additional allowlist position compared.",
};

export const signerAllowlistCuModel: AllowlistCuModel = {
  baseCu: 25,
  slopePerEntry: 11,
  inputId: "signer-allowlist-n",
  bestCaseSub: "signer matches first entry, N=1",
  worstCaseSub: "signer matches last entry at N",
  footnote:
    "Roughly 17 + 11×N CU overall. Slope is per additional allowlist entry walked before a match.",
};

export const allowlistCuModels: Partial<Record<string, AllowlistCuModel>> = {
  program_allowlist: programAllowlistCuModel,
  signer_allowlist: signerAllowlistCuModel,
};
