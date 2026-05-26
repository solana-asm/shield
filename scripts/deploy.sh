#!/usr/bin/env bash
# Build and deploy guards via `solana program deploy`.
# Program IDs are pinned by `deploy/<name>-keypair.json`, so redeploys upgrade in place.
#
# usage:
#   scripts/deploy.sh <rpc_url>              deploy all guards
#   scripts/deploy.sh <rpc_url> <name>       deploy only the named guard

set -euo pipefail

RPC_URL="${1:?usage: scripts/deploy.sh <rpc_url> [program_name]}"
ONLY="${2:-}"

cd "$(dirname "$0")/.."

if [[ "$RPC_URL" == *mainnet* ]]; then
  printf '⚠️  Mainnet deploy to %s\n' "$RPC_URL"
  read -r -p '   type "yes" to continue: ' confirm
  [[ "$confirm" == "yes" ]] || { echo "aborted."; exit 1; }
fi

echo "⚡️ building"
sbpf build

if [[ -n "$ONLY" ]]; then
  keypairs=("deploy/${ONLY}-keypair.json")
  [[ -f "${keypairs[0]}" ]] || { echo "no keypair at ${keypairs[0]}"; exit 1; }
else
  keypairs=(deploy/*-keypair.json)
fi

for keypair in "${keypairs[@]}"; do
  name=$(basename "$keypair" -keypair.json)
  so="deploy/${name}.so"
  [[ -f "$so" ]] || { echo "skip ${name}: ${so} missing"; continue; }

  program_id=$(solana-keygen pubkey "$keypair")
  echo "→ deploying ${name} (${program_id}) to ${RPC_URL}"
  solana program deploy "$so" \
    --program-id "$keypair" \
    --url "$RPC_URL"
done

echo "✅ deploy complete (${RPC_URL})"
