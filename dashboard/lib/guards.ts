export type Guard = {
  slug: string;
  name: string;
  oneLiner: string;
  cu: number;
  cuNote: string;
  accounts: string;
  ixData: string;
  conditionFailed: string;
  programId: string;
};

export const guards: Guard[] = [
  {
    slug: "slot_deadline",
    name: "slot_deadline",
    oneLiner: "Abort if the current slot is past the deadline you signed for.",
    cu: 152,
    cuNote: "happy",
    accounts: "0 accounts",
    ixData: "u64 max_slot (LE)",
    conditionFailed: "deadline missed",
    programId: "SLDyTxMbunLA51WADZKpXNZ49mFnhsPxtZSp4Rbr4ja",
  },
  {
    slug: "slippage",
    name: "slippage",
    oneLiner: "Abort if the SPL token account balance is below the floor.",
    cu: 7,
    cuNote: "happy",
    accounts: "1 token account",
    ixData: "u64 min_amount (LE)",
    conditionFailed: "insufficient",
    programId: "SLDChznvxmWVQpGQbweD1oXK8KcaxgaCD1qyDWB3Tps",
  },
  {
    slug: "balance_floor",
    name: "balance_floor",
    oneLiner: "Abort if an account's lamports balance is below the floor.",
    cu: 7,
    cuNote: "happy",
    accounts: "1 account",
    ixData: "u64 min_lamports (LE)",
    conditionFailed: "below floor",
    programId: "SLDwNtfXVRXuW29kMWLkvs8QX6xkdg8qjPuV6WQ25Hb",
  },
  {
    slug: "signer_allowlist",
    name: "signer_allowlist",
    oneLiner: "Abort if the signer is not one of the caller's allowed pubkeys.",
    cu: 25,
    cuNote: "N=1",
    accounts: "1 signer",
    ixData: "u8 count, [32]u8 × N",
    conditionFailed: "not allowed",
    programId: "SLDPp75MazNodaDGQVqduNNGYYbJVYk3EKWLFppYtvh",
  },
  {
    slug: "fee_ceiling",
    name: "fee_ceiling",
    oneLiner: "Abort if any SetComputeUnitPrice exceeds the priority fee ceiling.",
    cu: 86,
    cuNote: "2-ix",
    accounts: "1 sysvar",
    ixData: "u64 max_micro_lamports (LE)",
    conditionFailed: "fee too high",
    programId: "SLDM7koS4UYLni15NGVoNW1DMG8ueZJmcGAA6UqMzQQ",
  },
  {
    slug: "program_allowlist",
    name: "program_allowlist",
    oneLiner: "Abort if any other top-level ix targets a non-allowlisted program.",
    cu: 80,
    cuNote: "N=1",
    accounts: "1 sysvar",
    ixData: "u8 count, [32]u8 × N",
    conditionFailed: "not allowed",
    programId: "SLDHxogaum69jT7C8V4jV16AK7jnuQM8y8EfCJ9RGeK",
  },
  {
    slug: "compute_unit_floor",
    name: "compute_unit_floor",
    oneLiner: "Abort if SetComputeUnitLimit is missing or below the floor.",
    cu: 93,
    cuNote: "3-ix",
    accounts: "1 sysvar",
    ixData: "u32 min_units (LE)",
    conditionFailed: "cu too low",
    programId: "SLDfqR7EtW1Fgb8y8oEM6aFuho6Yccf8a3j2ebrGQEy",
  },
];

export const externalLinks = {
  npm: "https://www.npmjs.com/package/@solana-asm/shield",
  github: "https://github.com/solana-asm/shield",
  book: "https://sbpf.dev",
} as const;
