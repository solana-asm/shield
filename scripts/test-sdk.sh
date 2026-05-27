#!/usr/bin/env bash
# Run SDK unit tests (offline, no validator).
#
# usage:
#   scripts/test-sdk.sh                    run every sdk/test/*.test.ts
#   scripts/test-sdk.sh <name>             run only sdk/test/<name>.test.ts

set -euo pipefail

ONLY="${1:-}"

cd "$(dirname "$0")/.."

if [[ -n "$ONLY" ]]; then
  target="sdk/test/${ONLY}.test.ts"
  [[ -f "$target" ]] || { echo "no test file at ${target}"; exit 1; }
  exec bun test "$target"
else
  exec bun test sdk/test/
fi
