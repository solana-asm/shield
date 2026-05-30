import { PublicKey } from "@solana/web3.js";

export const PROGRAM_IDS = {
  slot_deadline: new PublicKey("SLDyTxMbunLA51WADZKpXNZ49mFnhsPxtZSp4Rbr4ja"),
  slippage: new PublicKey("SLDChznvxmWVQpGQbweD1oXK8KcaxgaCD1qyDWB3Tps"),
  balance_floor: new PublicKey("SLDwNtfXVRXuW29kMWLkvs8QX6xkdg8qjPuV6WQ25Hb"),
  signer_allowlist: new PublicKey("SLDPp75MazNodaDGQVqduNNGYYbJVYk3EKWLFppYtvh"),
  fee_ceiling: new PublicKey("SLDM7koS4UYLni15NGVoNW1DMG8ueZJmcGAA6UqMzQQ"),
  program_allowlist: new PublicKey("SLDHxogaum69jT7C8V4jV16AK7jnuQM8y8EfCJ9RGeK"),
  compute_unit_floor: new PublicKey("SLDfqR7EtW1Fgb8y8oEM6aFuho6Yccf8a3j2ebrGQEy"),
} as const;

export const DEFAULT_FEE_PAYER =
  process.env.DASHBOARD_FEE_PAYER ??
  "7dcFLm6QsT8Zo7MAXQFrmJaDDxf5RDZb7VuiHupuiNwZ";

export const RPC_URLS = {
  devnet:
    process.env.DASHBOARD_DEVNET_RPC ?? "https://api.devnet.solana.com",
  mainnet:
    process.env.DASHBOARD_MAINNET_RPC ??
    "https://api.mainnet-beta.solana.com",
} as const;
