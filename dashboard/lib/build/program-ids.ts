import { PublicKey } from "@solana/web3.js";

export const PROGRAM_ID_STRINGS = {
  slot_deadline: "SLDyTxMbunLA51WADZKpXNZ49mFnhsPxtZSp4Rbr4ja",
  slippage: "SLDChznvxmWVQpGQbweD1oXK8KcaxgaCD1qyDWB3Tps",
  balance_floor: "SLDwNtfXVRXuW29kMWLkvs8QX6xkdg8qjPuV6WQ25Hb",
  signer_allowlist: "SLDPp75MazNodaDGQVqduNNGYYbJVYk3EKWLFppYtvh",
  fee_ceiling: "SLDM7koS4UYLni15NGVoNW1DMG8ueZJmcGAA6UqMzQQ",
  program_allowlist: "SLDHxogaum69jT7C8V4jV16AK7jnuQM8y8EfCJ9RGeK",
  compute_unit_floor: "SLDfqR7EtW1Fgb8y8oEM6aFuho6Yccf8a3j2ebrGQEy",
} as const;

export const PROGRAM_IDS = {
  slot_deadline: new PublicKey(PROGRAM_ID_STRINGS.slot_deadline),
  slippage: new PublicKey(PROGRAM_ID_STRINGS.slippage),
  balance_floor: new PublicKey(PROGRAM_ID_STRINGS.balance_floor),
  signer_allowlist: new PublicKey(PROGRAM_ID_STRINGS.signer_allowlist),
  fee_ceiling: new PublicKey(PROGRAM_ID_STRINGS.fee_ceiling),
  program_allowlist: new PublicKey(PROGRAM_ID_STRINGS.program_allowlist),
  compute_unit_floor: new PublicKey(PROGRAM_ID_STRINGS.compute_unit_floor),
} as const;

// Shield's on-chain upgrade authority on devnet and mainnet.
// Public info; used only as the simulated fee payer for the builder.
export const DEFAULT_FEE_PAYER =
  process.env.DASHBOARD_FEE_PAYER ??
  "8gm5X1Nq8f28qu5XPTXk236FVmEufFprFmceRssYzMuk";

// Mirror for the client. Keep in sync with DEFAULT_FEE_PAYER.
export const PUBLIC_FEE_PAYER = "8gm5X1Nq8f28qu5XPTXk236FVmEufFprFmceRssYzMuk";

export const RPC_URLS = {
  devnet:
    process.env.DASHBOARD_DEVNET_RPC ?? "https://api.devnet.solana.com",
  mainnet:
    process.env.DASHBOARD_MAINNET_RPC ??
    "https://api.mainnet-beta.solana.com",
} as const;
