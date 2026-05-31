# shield dashboard

The Next.js app served at [shield.sbpf.dev](https://shield.sbpf.dev). It walks through the seven Shield guards, lets you compose up to four into a transaction, and simulates the result against devnet or mainnet so you can see the per-guard CU cost and the abort log without sending anything.

The dashboard installs the SDK from npm (`@solana-asm/shield`), not from the workspace. The guard program IDs the dashboard uses are the same on devnet and mainnet and are pinned in `lib/guards.ts`.

## Routes

- `/` catalog of all seven guards.
- `/guards/[slug]` per-guard walkthrough with assembly, exit codes, and a CS-friendly primer.
- `/build` interactive composer: pick guards, pick a destination instruction (memo or token transfer), connect a wallet, simulate against the chosen cluster.

## Development

```bash
cd dashboard
bun install
bun run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Scripts

```bash
bun run dev          # next dev
bun run build        # next build
bun run start        # next start (serves the production build)
bun run typecheck    # tsc --noEmit (also enforced by the repo-root husky pre-commit hook)
bun run lint         # eslint
```

## Stack

- Next.js 16 (App Router) on React 19.
- Tailwind v4 with shadcn/ui primitives.
- `@solana/web3.js` + `@solana/kit` for transaction building and simulation.
- `@solana/wallet-adapter-react` for wallet connection. The demo wallet on the live site is `8gm5X1Nq8f28qu5XPTXk236FVmEufFprFmceRssYzMuk`.

## Notes

- Simulations use `VersionedTransaction` with `sigVerify: false` and `replaceRecentBlockhash: true`, so the builder works without a connected wallet.
- The CU numbers shown per guard come from real simulation runs, not hard-coded constants.
