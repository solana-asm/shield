#!/usr/bin/env bash
# Run SDK examples against the given cluster.
# env:
#   MODE=send|simulate                        defaults to simulate

set -euo pipefail

RPC_URL="${1:?usage: scripts/example.sh <rpc_url> [example_name]}"
ONLY="${2:-}"

cd "$(dirname "$0")/.."

KEYPAIR=$(solana config get | grep Keypair | cut -b 15- | tr -d '[:space:]')
export SIGNER=$(cat "$KEYPAIR")
export RPC_URL
export MODE="${MODE:-simulate}"

if [[ -n "$ONLY" ]]; then
  target="sdk/examples/${ONLY}.ts"
  [[ -f "$target" ]] || { echo "no example at ${target}"; exit 1; }
  exec bun run "$target"
fi

# Default: run every example. Order is pedagogical: simple guards first,
# composition last. Files prefixed with _ are shared helpers, not examples.
EXAMPLES=(
  slot_deadline
  balance_floor
  signer_allowlist
  slippage
  fee_ceiling
  compose-guards
)

for name in "${EXAMPLES[@]}"; do
  target="sdk/examples/${name}.ts"
  [[ -f "$target" ]] || { echo "missing: ${target}"; exit 1; }
  bun run "$target"
done
