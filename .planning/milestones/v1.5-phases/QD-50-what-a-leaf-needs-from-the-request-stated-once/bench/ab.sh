#!/bin/bash
# ab.sh <patch> <outdir> <rounds> <head-label> <patched-label>
#
# Interleaved A/B of packages/core/bench/Evaluate.bench.ts: head, patched, head, patched, ...
# The patched arm is `git apply <patch>` before its run and reversed after it; no worktree, no
# branch switch. Nothing is ever committed from here.
#
# Exit codes: 2 usage / refused start, 3 patch does not apply, 4 a bench run failed,
# 5 packages/core/src was not restored (a revert failed, or src is dirty after a run or at exit),
# 130 / 143 stopped by INT / TERM (after the bench run in progress returns; src reverted).
set -u

usage() { echo "usage: ab.sh <patch> <outdir> <rounds> <head-label> <patched-label>" >&2; exit 2; }
[ "$#" -eq 5 ] || usage
PATCH=$1; OUT=$2; ROUNDS=$3; HEAD_LABEL=$4; PATCHED_LABEL=$5
case "$ROUNDS" in ''|*[!0-9]*|0|0[0-9]*) usage ;; esac
[ "$HEAD_LABEL" != "$PATCHED_LABEL" ] || usage
[ -n "$HEAD_LABEL" ] && [ -n "$PATCHED_LABEL" ] || usage

# Resolve both to absolute paths before moving to the repo root.
case "$PATCH" in /*) ;; *) PATCH="$PWD/$PATCH" ;; esac
case "$OUT" in /*) ;; *) OUT="$PWD/$OUT" ;; esac
ROOT=$(git rev-parse --show-toplevel) || exit 2
cd "$ROOT" || exit 2

SRC=packages/core/src
src_clean() { [ -z "$(git status --porcelain --untracked-files=all -- "$SRC")" ]; }

src_clean || { echo "ab.sh: $SRC is dirty or has untracked files; refusing" >&2; exit 2; }
if pgrep -f "[v]itest bench" > /dev/null || pgrep -f "[s]tryker run" > /dev/null; then
  echo "ab.sh: another vitest bench or stryker run is running; refusing" >&2
  exit 2
fi
git apply --check "$PATCH" 2> /dev/null || { echo "ab.sh: patch does not apply: $PATCH" >&2; exit 3; }

mkdir -p "$OUT" || exit 2
{
  echo "head: $(git rev-parse HEAD)"
  echo "patch: $PATCH"
  echo "patch_sha256: $(shasum -a 256 "$PATCH" | cut -d' ' -f1)"
  echo "head_label: $HEAD_LABEL"
  echo "patched_label: $PATCHED_LABEL"
  echo "rounds: $ROUNDS"
  echo "node: $(node --version)"
  echo "cpu: $(sysctl -n machdep.cpu.brand_string 2> /dev/null || echo unknown)"
  echo "start: $(date -u +%Y-%m-%dT%H:%M:%SZ)"
} > "$OUT/meta.txt"

# applied=1 from just before `git apply` until a revert is attempted, so a signal that
# lands while `git apply` runs still reverts. reverted=1 from that attempt until src is
# seen clean, so a revert that fails says so even when a signal ends cleanup first.
applied=0
reverted=0
# Ends with src clean, or says why not and exits 5; never carries on.
cleanup() {
  if [ "$applied" = 1 ]; then
    applied=0
    reverted=1
    git apply -R "$PATCH"
  fi
  if src_clean; then
    reverted=0
  elif [ "$reverted" = 1 ]; then
    trap - EXIT # said once: an exit from a direct call would run cleanup again
    echo "ab.sh: could not revert $PATCH; $SRC is left patched" >&2
    exit 5
  else
    trap - EXIT
    echo "ab.sh: $SRC is not clean" >&2
    exit 5
  fi
}
# A handler for INT or TERM does not end a bash script by itself: the signal traps
# exit, and the EXIT trap is the one place that reverts.
trap cleanup EXIT
trap 'exit 130' INT
trap 'exit 143' TERM

for i in $(seq 1 "$ROUNDS"); do
  for arm in "$HEAD_LABEL" "$PATCHED_LABEL"; do
    if [ "$arm" = "$PATCHED_LABEL" ]; then
      applied=1
      git apply "$PATCH" || {
        applied=0
        echo "ab.sh: patch no longer applies before $arm-$i" >&2
        exit 3
      }
    fi
    # No wait for a quiet machine: the load is logged around every run instead.
    { date +%T; uptime; } > "$OUT/$arm-$i.load-before"
    if ! pnpm exec vitest bench --run --reporter=json --outputFile="$OUT/$arm-$i.json" \
      packages/core/bench/Evaluate.bench.ts > "$OUT/$arm-$i.log" 2>&1; then
      echo "ab.sh: bench run $arm-$i failed; see $OUT/$arm-$i.log" >&2
      exit 4
    fi
    { date +%T; uptime; } > "$OUT/$arm-$i.load-after"
    cleanup
  done
done

trap - EXIT INT TERM
cleanup
echo "src restored to HEAD" > "$OUT/done.txt"
