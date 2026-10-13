#!/usr/bin/env bash
# One-time history squash before the first push (Phase 3, D-03).
#
# The detailed development history (240-plus commits, planning churn, agent branches) is kept
# locally. The public repository gets six baseline commits instead, one per phase boundary. The
# trees are copied unchanged, so the final tree is byte-identical to the tree of the tip before
# the squash. The script moves the checked-out branch only after that equality is proven.
#
# Usage (run once, from the repository root, on the branch that will be published):
#   PUBLISH_NAME="Your Name" PUBLISH_EMAIL="you@example.com" \
#     bash scripts/publish-squash.sh --bundle /path/outside/the/repo/pre-publish.bundle
#
# Needs gitleaks on the PATH. With the pinned nixpkgs revision:
#   nix shell github:NixOS/nixpkgs/c59305bab2065cfecc4944690d9eedbb56f3a9fa#gitleaks --command \
#     bash scripts/publish-squash.sh --bundle ...
#
# What it does, in order:
#   1. Checks the inputs, refuses a bundle path inside the repository, refuses to run once a
#      github.com remote exists (published history must never be rewritten), and refuses to run
#      when tracked files are modified.
#   2. Confirms every boundary commit exists and is an ancestor of HEAD.
#   3. Creates the local tag archive/pre-publish at HEAD and a verified bundle of all refs.
#   4. Builds the chain with git commit-tree, one commit per boundary tree.
#   5. Aborts before any ref moves unless the new tip has the same tree as HEAD.
#   6. Moves the checked-out branch with git reset --hard to the new tip.
#   7. Runs gitleaks over the new history and over the working tree.
#   8. Prints an old-to-new hash table for the publish log.
#
# It never pushes and never touches remotes. Only the branch that this script rewrites is ever
# pushed; the archive tag, the bundle and any stray local branch stay local.
#
# To undo before publishing: git reset --hard archive/pre-publish

set -euo pipefail

TRAILER="Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
ARCHIVE_TAG="archive/pre-publish"

# Boundary commits and the message title each one gets. HEAD is the last entry.
BOUNDARY_HASHES=(1588263 b26685a 0d669b2 50fc088 ec44a26 HEAD)
BOUNDARY_TITLES=(
  "Baseline: project setup, research and roadmap"
  "Phase 1: Foundation and token playground"
  "Phase 2: BPE stepper and real-tokenizer comparison"
  "Phase 2.1: Replace the toy tokenizer with GPT-2"
  "Phase 2.2: Rework widgets"
  "Phase 3 planning: MVP pivot and phase context"
)

usage() {
  echo "usage: PUBLISH_NAME=... PUBLISH_EMAIL=... bash scripts/publish-squash.sh --bundle PATH" >&2
  echo "  PATH must be outside the repository, for example ../pre-publish.bundle" >&2
  exit 2
}

die() {
  echo "publish-squash: $*" >&2
  exit 1
}

# --- 1. Inputs and guards ---------------------------------------------------------------------

BUNDLE=""
while [ "$#" -gt 0 ]; do
  case "$1" in
    --bundle)
      [ "$#" -ge 2 ] || usage
      BUNDLE="$2"
      shift 2
      ;;
    *) usage ;;
  esac
done

[ -n "${PUBLISH_NAME:-}" ] || usage
[ -n "${PUBLISH_EMAIL:-}" ] || usage
[ -n "$BUNDLE" ] || usage

TOP="$(git rev-parse --show-toplevel)"
cd "$TOP"

BUNDLE_ABS="$(realpath -m "$BUNDLE")"
case "$BUNDLE_ABS/" in
  "$TOP"/*) die "the bundle path $BUNDLE_ABS is inside the repository; put the archive outside it" ;;
esac
[ ! -e "$BUNDLE_ABS" ] || die "the bundle $BUNDLE_ABS already exists; refusing to overwrite it"

if git config --get-regexp '^remote\..*\.(url|pushurl)$' | grep -qi 'github\.com'; then
  die "a github.com remote is configured; history must not be rewritten after publishing"
fi

# Tracked files only: untracked files (this script in a scratch clone) must not block the run.
git diff-index --quiet HEAD -- || die "tracked files are modified; commit or restore them first"

BRANCH="$(git symbolic-ref --short -q HEAD)" || die "HEAD is detached; check out the branch to publish"

# --- 2. Boundaries ----------------------------------------------------------------------------

HEAD_FULL="$(git rev-parse HEAD)"
RESOLVED=()
for ref in "${BOUNDARY_HASHES[@]}"; do
  git cat-file -e "${ref}^{commit}" 2>/dev/null || die "boundary commit $ref does not exist"
  full="$(git rev-parse "${ref}^{commit}")"
  git merge-base --is-ancestor "$full" "$HEAD_FULL" || die "boundary commit $ref is not an ancestor of HEAD"
  RESOLVED+=("$full")
done

# --- 3. Archive -------------------------------------------------------------------------------

git rev-parse -q --verify "refs/tags/$ARCHIVE_TAG" >/dev/null && die "the tag $ARCHIVE_TAG already exists"
OLD_COUNT="$(git rev-list --count HEAD)"
git tag "$ARCHIVE_TAG" "$HEAD_FULL"
git bundle create "$BUNDLE_ABS" --all
git bundle verify "$BUNDLE_ABS"

# --- 4. Build the chain by tree ---------------------------------------------------------------

export GIT_AUTHOR_NAME="$PUBLISH_NAME" GIT_AUTHOR_EMAIL="$PUBLISH_EMAIL"
export GIT_COMMITTER_NAME="$PUBLISH_NAME" GIT_COMMITTER_EMAIL="$PUBLISH_EMAIL"

NEW_HASHES=()
PARENT=""
for i in "${!RESOLVED[@]}"; do
  old="${RESOLVED[$i]}"
  when="$(git log -1 --format=%cI "$old")"
  export GIT_AUTHOR_DATE="$when" GIT_COMMITTER_DATE="$when"
  parent_args=()
  [ -z "$PARENT" ] || parent_args=(-p "$PARENT")
  PARENT="$(git commit-tree "${old}^{tree}" "${parent_args[@]}" -m "${BOUNDARY_TITLES[$i]}" -m "$TRAILER")"
  NEW_HASHES+=("$PARENT")
done
NEW_TIP="$PARENT"
unset GIT_AUTHOR_DATE GIT_COMMITTER_DATE

# --- 5. Tree equality, before any ref moves ---------------------------------------------------

OLD_TREE="$(git rev-parse "${HEAD_FULL}^{tree}")"
NEW_TREE="$(git rev-parse "${NEW_TIP}^{tree}")"
if [ "$OLD_TREE" != "$NEW_TREE" ]; then
  echo "publish-squash: tree mismatch, no ref was moved (old $OLD_TREE, new $NEW_TREE)" >&2
  echo "The archive tag $ARCHIVE_TAG and the bundle were created; delete the tag to retry." >&2
  exit 1
fi

# --- 6. Move the checked-out branch -----------------------------------------------------------
# git branch -f fails on a checked-out branch, so use reset --hard (the tree is identical).

git reset --hard "$NEW_TIP" >/dev/null
echo "publish-squash: $BRANCH moved from $OLD_COUNT commits to $(git rev-list --count HEAD), tree $NEW_TREE"

# --- 7. Secret scans --------------------------------------------------------------------------

command -v gitleaks >/dev/null 2>&1 || die "gitleaks is not on the PATH (see the usage note at the top of this script)"
gitleaks git --no-banner --redact . || die "gitleaks found a leak in the squashed history"
gitleaks dir --no-banner --redact . || die "gitleaks found a leak in the working tree"

# --- 8. Old-to-new table ----------------------------------------------------------------------

echo
echo "| Old commit | New commit | Title |"
echo "|------------|------------|-------|"
for i in "${!RESOLVED[@]}"; do
  echo "| ${RESOLVED[$i]:0:7} | ${NEW_HASHES[$i]:0:7} | ${BOUNDARY_TITLES[$i]} |"
done
echo
git log --oneline "$BRANCH"
echo
echo "archive tag: $ARCHIVE_TAG ($HEAD_FULL)"
echo "bundle: $BUNDLE_ABS"
