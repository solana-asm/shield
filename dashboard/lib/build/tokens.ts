export type UserToken = {
  pubkey: string; // associated token account
  mint: string;
  amount: string; // raw u64 as string (bigint-safe through JSON)
  decimals: number;
};

export type CachedTokens = {
  tokens: UserToken[];
  updatedAt: number;
};

export const TOKEN_PROGRAM_ID = "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA";

// A tiny manual mint → symbol map. Solana doesn't have a canonical on-chain
// registry, so we just label the most common ones. Anything not on this list
// renders as an abbreviated mint pubkey.
export const KNOWN_MINTS: Record<string, string> = {
  EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v: "USDC",
  "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU": "USDC (devnet)",
  Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB: "USDT",
  So11111111111111111111111111111111111111112: "wSOL",
  DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263: "BONK",
  J1toso1uCk3RLmjorhTtrVwY9HJ7X8V9yYac6Y7kGCPn: "JitoSOL",
};

export function storageKey(
  walletAddress: string,
  network: "devnet" | "mainnet"
): string {
  return `shield:tokens:${walletAddress}:${network}`;
}

export function loadCachedTokens(key: string): CachedTokens | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CachedTokens;
    if (!parsed || !Array.isArray(parsed.tokens)) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function saveCachedTokens(key: string, tokens: UserToken[]): void {
  if (typeof window === "undefined") return;
  try {
    const payload: CachedTokens = { tokens, updatedAt: Date.now() };
    window.localStorage.setItem(key, JSON.stringify(payload));
  } catch {
    // quota exceeded or storage unavailable; silent
  }
}

export function formatTokenAmount(token: UserToken): string {
  const amount = BigInt(token.amount);
  if (amount === 0n) return "0";
  const divisor = 10n ** BigInt(token.decimals);
  const whole = amount / divisor;
  const remainder = amount % divisor;
  if (remainder === 0n) return whole.toLocaleString();
  const fraction = remainder.toString().padStart(token.decimals, "0");
  // trim trailing zeros from fraction
  const trimmed = fraction.replace(/0+$/, "");
  return trimmed.length > 0
    ? `${whole.toLocaleString()}.${trimmed.slice(0, 6)}`
    : whole.toLocaleString();
}

export function tokenLabel(token: UserToken): string {
  const symbol = KNOWN_MINTS[token.mint];
  if (symbol) return symbol;
  return `${token.mint.slice(0, 4)}…${token.mint.slice(-4)}`;
}
