#!/usr/bin/env bash
# Run mocha against the given cluster.
#
# usage:
#   scripts/test.sh <rpc_url>              run every tests/*.test.ts
#   scripts/test.sh <rpc_url> <name>       run only tests/<name>.test.ts
#
# env:
#   MODE=send|simulate                     defaults to send

set -euo pipefail

RPC_URL="${1:?usage: scripts/test.sh <rpc_url> [program_name]}"
ONLY="${2:-}"

cd "$(dirname "$0")/.."

KEYPAIR=$(solana config get | grep Keypair | cut -b 15- | tr -d '[:space:]')
export SIGNER=$(cat "$KEYPAIR")
export RPC_URL
export MODE="${MODE:-send}"

if [[ -n "$ONLY" ]]; then
  target="tests/${ONLY}.test.ts"
  [[ -f "$target" ]] || { echo "no test file at ${target}"; exit 1; }
  exec mocha --import=tsx "$target"
else
  exec mocha --import=tsx tests/**/*.ts
fi
