"use client";

import { useCallback, useEffect, useState } from "react";
import { Connection, PublicKey } from "@solana/web3.js";
import {
  loadCachedTokens,
  saveCachedTokens,
  storageKey,
  TOKEN_PROGRAM_ID,
  type UserToken,
} from "./tokens";

const CACHE_TTL_MS = 60_000; // 1 minute

type State = {
  tokens: UserToken[] | null;
  loading: boolean;
  updatedAt: number | null;
};

export function useUserTokens(
  walletPubkey: string | null,
  network: "devnet" | "mainnet",
  rpcUrl: string
): {
  tokens: UserToken[] | null;
  loading: boolean;
  updatedAt: number | null;
  refresh: () => void;
} {
  const [state, setState] = useState<State>({
    tokens: null,
    loading: false,
    updatedAt: null,
  });
  const [refreshNonce, setRefreshNonce] = useState(0);

  const refresh = useCallback(() => setRefreshNonce((n) => n + 1), []);

  useEffect(() => {
    if (!walletPubkey) {
      setState({ tokens: null, loading: false, updatedAt: null });
      return;
    }

    const key = storageKey(walletPubkey, network);

    // Seed from cache immediately so the UI shows previously-seen tokens
    // while the fetch is in flight.
    const cached = loadCachedTokens(key);
    const cacheFresh =
      cached && Date.now() - cached.updatedAt < CACHE_TTL_MS && refreshNonce === 0;

    if (cached) {
      setState({
        tokens: cached.tokens,
        loading: !cacheFresh,
        updatedAt: cached.updatedAt,
      });
    } else {
      setState({ tokens: null, loading: true, updatedAt: null });
    }

    if (cacheFresh) return;

    let cancelled = false;
    const connection = new Connection(rpcUrl, "confirmed");

    connection
      .getParsedTokenAccountsByOwner(new PublicKey(walletPubkey), {
        programId: new PublicKey(TOKEN_PROGRAM_ID),
      })
      .then((result) => {
        if (cancelled) return;

        type ParsedInfo = {
          mint: string;
          tokenAmount: { amount: string; decimals: number };
        };

        const tokens: UserToken[] = result.value
          .map((acc) => {
            const info = (acc.account.data as { parsed: { info: ParsedInfo } })
              .parsed.info;
            return {
              pubkey: acc.pubkey.toBase58(),
              mint: info.mint,
              amount: info.tokenAmount.amount,
              decimals: info.tokenAmount.decimals,
            };
          })
          // Sort: non-zero balances first, then by amount descending
          .sort((a, b) => {
            const aZero = BigInt(a.amount) === 0n;
            const bZero = BigInt(b.amount) === 0n;
            if (aZero !== bZero) return aZero ? 1 : -1;
            return BigInt(b.amount) > BigInt(a.amount) ? 1 : -1;
          });

        saveCachedTokens(key, tokens);
        setState({ tokens, loading: false, updatedAt: Date.now() });
      })
      .catch(() => {
        if (cancelled) return;
        setState((prev) => ({ ...prev, loading: false }));
      });

    return () => {
      cancelled = true;
    };
  }, [walletPubkey, network, rpcUrl, refreshNonce]);

  return {
    tokens: state.tokens,
    loading: state.loading,
    updatedAt: state.updatedAt,
    refresh,
  };
}
