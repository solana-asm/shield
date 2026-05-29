#!/usr/bin/env bash
# Bump sdk/package.json, commit, tag, and push.
# The tag push triggers .github/workflows/publish.yml which runs tests, builds,
# and publishes @solana-asm/shield to npm with a matching GitHub Release.
#
# usage:
#   scripts/release.sh <patch|minor|major>

set -euo pipefail

BUMP="${1:?usage: scripts/release.sh <patch|minor|major>}"

case "$BUMP" in
  patch|minor|major) ;;
  *) echo "error: bump must be one of patch, minor, major (got: $BUMP)" >&2; exit 1 ;;
esac

cd "$(dirname "$0")/.."

# refuse to operate on a dirty tree, the release commit must contain only the
# version bump in sdk/package.json
if [[ -n "$(git status --porcelain)" ]]; then
  echo "error: working tree is dirty; commit or stash first" >&2
  git status --short >&2
  exit 1
fi

CURRENT=$(node -p "require('./sdk/package.json').version")
IFS='.' read -r MAJOR MINOR PATCH <<<"$CURRENT"

case "$BUMP" in
  patch) NEW="${MAJOR}.${MINOR}.$((PATCH + 1))" ;;
  minor) NEW="${MAJOR}.$((MINOR + 1)).0" ;;
  major) NEW="$((MAJOR + 1)).0.0" ;;
esac

TAG="v${NEW}"

if git rev-parse "$TAG" >/dev/null 2>&1; then
  echo "error: tag $TAG already exists locally" >&2
  exit 1
fi

if git ls-remote --tags origin "$TAG" 2>/dev/null | grep -q "refs/tags/${TAG}$"; then
  echo "error: tag $TAG already exists on origin" >&2
  exit 1
fi

BRANCH=$(git rev-parse --abbrev-ref HEAD)

cat <<EOF

Release plan
  bump:             ${BUMP}
  sdk/package.json: ${CURRENT}  ->  ${NEW}
  commit:           sdk: release ${TAG}
  tag:              ${TAG}
  push to:          origin ${BRANCH} (--follow-tags)

This will commit and push. The tag push triggers the npm publish workflow.

EOF

read -r -p "press enter to continue, Ctrl-C to abort: " _

(cd sdk && npm version "$NEW" --no-git-tag-version >/dev/null)

git add sdk/package.json
git commit -m "sdk: release ${TAG}"
git tag "$TAG"
git push --follow-tags

cat <<EOF

released ${TAG} on ${BRANCH}
  npm:    https://www.npmjs.com/package/@solana-asm/shield/v/${NEW}
  follow: gh run watch --workflow=publish.yml
EOF
