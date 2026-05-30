export type FieldType = "pubkey" | "bigint" | "number" | "pubkey-list";

export type FieldSpec = {
  name: string;
  label: string;
  placeholder: string;
  defaultValue: string;
  helper?: string;
  type: FieldType;
};

export type GuardSlug =
  | "slot_deadline"
  | "slippage"
  | "balance_floor"
  | "signer_allowlist"
  | "fee_ceiling"
  | "program_allowlist"
  | "compute_unit_floor";

export type GuardFormSpec = {
  slug: GuardSlug;
  name: string;
  oneLiner: string;
  failsWhen: string;
  fields: FieldSpec[];
};

export const guardForms: GuardFormSpec[] = [
  {
    slug: "slot_deadline",
    name: "slot_deadline",
    oneLiner: "Abort if past a deadline slot.",
    failsWhen: "Set Max slot to a value below the current slot.",
    fields: [
      {
        name: "maxSlot",
        label: "Max slot",
        placeholder: "auto (currentSlot + 100)",
        defaultValue: "",
        helper: "Leave blank to use currentSlot + 100. Passes by default.",
        type: "bigint",
      },
    ],
  },
  {
    slug: "slippage",
    name: "slippage",
    oneLiner: "Abort if SPL token balance is below the floor.",
    failsWhen: "Set Min amount above the live token balance.",
    fields: [
      {
        name: "tokenAccount",
        label: "Token account (base58 pubkey)",
        placeholder: "DXrXJpMRcwT7PdAjymsAt5JLm5xQ7XYHkmZqsQYzFGSe",
        defaultValue: "",
        helper:
          "An SPL token account that exists on the chosen network. Required.",
        type: "pubkey",
      },
      {
        name: "minAmount",
        label: "Min amount (base units)",
        placeholder: "150000000",
        defaultValue: "1",
        type: "bigint",
      },
    ],
  },
  {
    slug: "balance_floor",
    name: "balance_floor",
    oneLiner: "Abort if an account's lamports are below the floor.",
    failsWhen:
      "Set Min lamports above the account balance, or use an account that does not exist.",
    fields: [
      {
        name: "account",
        label: "Account (base58 pubkey)",
        placeholder: "leave blank for fee payer",
        defaultValue: "",
        helper: "Defaults to the demo fee payer.",
        type: "pubkey",
      },
      {
        name: "minLamports",
        label: "Min lamports",
        placeholder: "1000000",
        defaultValue: "1000",
        type: "bigint",
      },
    ],
  },
  {
    slug: "signer_allowlist",
    name: "signer_allowlist",
    oneLiner: "Abort if the signer is not in the allowlist.",
    failsWhen:
      "Provide an allowlist that does not include the fee payer pubkey.",
    fields: [
      {
        name: "allowed",
        label: "Allowed pubkeys (one per line)",
        placeholder: "base58 pubkey per line",
        defaultValue: "",
        helper:
          "Leave blank to default to the fee payer (passes). Add pubkeys, one per line, to enforce an explicit set.",
        type: "pubkey-list",
      },
    ],
  },
  {
    slug: "fee_ceiling",
    name: "fee_ceiling",
    oneLiner: "Abort if SetComputeUnitPrice exceeds the ceiling.",
    failsWhen:
      "Add a SetComputeUnitPrice ix higher than the ceiling (not built into this UI yet).",
    fields: [
      {
        name: "maxMicroLamports",
        label: "Max micro-lamports per CU",
        placeholder: "1000",
        defaultValue: "1000",
        type: "bigint",
      },
    ],
  },
  {
    slug: "program_allowlist",
    name: "program_allowlist",
    oneLiner: "Abort if any non-self ix targets a non-allowlisted program.",
    failsWhen: "Remove System Program from the allowlist.",
    fields: [
      {
        name: "allowed",
        label: "Allowed program IDs (one per line)",
        placeholder: "base58 per line",
        defaultValue:
          "11111111111111111111111111111111\nComputeBudget111111111111111111111111111111",
        helper:
          "System Program and ComputeBudget pre-filled because the demo tx uses both. Strip either to trigger an abort.",
        type: "pubkey-list",
      },
    ],
  },
  {
    slug: "compute_unit_floor",
    name: "compute_unit_floor",
    oneLiner: "Abort if SetComputeUnitLimit is missing or below floor.",
    failsWhen: "Set Min units above 200,000 (the auto-added CU limit).",
    fields: [
      {
        name: "minUnits",
        label: "Min compute units",
        placeholder: "100000",
        defaultValue: "100000",
        type: "number",
      },
    ],
  },
];
