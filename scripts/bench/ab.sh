#!/bin/bash
# ab.sh <patch> <outdir> <rounds> <head-label> <patched-label> <bench-file> <test-name-pattern>
# ab.sh --print-order <rounds> <head-label> <patched-label>
#
# An interleaved A/B of one bench file, filtered by vitest's `-t <test-name-pattern>`. The head arm
# runs the tree as committed; the patched arm runs it after `git apply <patch>`, reversed after the
# run, with no worktree and no branch switch. The arm order alternates by round: odd rounds run the
# head arm first, even rounds the patched arm, so neither arm always runs on a warmer or a colder
# host. `--print-order` prints that order, one `<label>-<round>` per line, and runs nothing.
#
# The patch may touch `packages/` only, and `packages/` must be clean at the start, after every run
# and at exit. The run refuses to start beside another vitest bench or Stryker run, or on a busy
# host: a 1-minute load average above the CPU count, or a process above 100% CPU. The load and the
# top processes are logged around every run. `node scripts/bench/analyze.mjs` reads the output.
# Phases 59, 66 and 67 each ran their own copy, which ran the arms in one fixed order; those copies
# stay as the records of the runs they made.
#
# Exit codes: 2 usage / refused start, 3 the patch does not apply, 4 a bench run failed,
# 5 packages/ was not restored, 6 the host is busy, 130 / 143 stopped by INT / TERM.
set -u

usage() {
  echo "usage: ab.sh <patch> <outdir> <rounds> <head-label> <patched-label> <bench-file> <test-name-pattern>" >&2
  echo "       ab.sh --print-order <rounds> <head-label> <patched-label>" >&2
  exit 2
}
rounds_ok() { case "$1" in '' | *[!0-9]* | 0 | 0[0-9]*) return 1 ;; esac; }

# The runs in order, one `<label> <round>` per line: round i runs the head arm first when i is odd,
# the patched arm first when i is even.
order() {
  for i in $(seq 1 "$1"); do
    if [ $((i % 2)) = 1 ]; then
      printf '%s %s\n%s %s\n' "$2" "$i" "$3" "$i"
    else
      printf '%s %s\n%s %s\n' "$3" "$i" "$2" "$i"
    fi
  done
}

if [ "${1:-}" = "--print-order" ]; then
  [ "$#" -eq 4 ] && rounds_ok "$2" && [ -n "$3" ] && [ -n "$4" ] && [ "$3" != "$4" ] || usage
  order "$2" "$3" "$4" | tr ' ' '-'
  exit 0
fi

[ "$#" -eq 7 ] || usage
PATCH=$1; OUT=$2; ROUNDS=$3; HEAD_LABEL=$4; PATCHED_LABEL=$5; BENCH=$6; PATTERN=$7
rounds_ok "$ROUNDS" || usage
[ "$HEAD_LABEL" != "$PATCHED_LABEL" ] || usage
[ -n "$HEAD_LABEL" ] && [ -n "$PATCHED_LABEL" ] && [ -n "$PATTERN" ] || usage

case "$PATCH" in /*) ;; *) PATCH="$PWD/$PATCH" ;; esac
case "$OUT" in /*) ;; *) OUT="$PWD/$OUT" ;; esac
ROOT=$(git rev-parse --show-toplevel) || exit 2
cd "$ROOT" || exit 2

TREE=packages
tree_clean() { [ -z "$(git status --porcelain --untracked-files=all -- "$TREE")" ]; }

tree_clean || { echo "ab.sh: $TREE is dirty or has untracked files; refusing" >&2; exit 2; }
[ -f "$BENCH" ] && git ls-files --error-unmatch -- "$BENCH" > /dev/null 2>&1 || { echo "ab.sh: $BENCH is not a tracked file; refusing" >&2; exit 2; }
git apply --check "$PATCH" 2> /dev/null || { echo "ab.sh: patch does not apply: $PATCH" >&2; exit 3; }
outside=$(git apply --numstat "$PATCH" | cut -f3 | grep -v "^$TREE/")
[ -z "$outside" ] || { echo "ab.sh: the patch touches a path outside $TREE/: $outside" >&2; exit 2; }
if pgrep -f "[v]itest bench" > /dev/null || pgrep -f "[s]tryker run" > /dev/null; then
  echo "ab.sh: another vitest bench or stryker run is running; refusing" >&2
  exit 2
fi
quiet=$(node -e '
  const os = require("node:os");
  const [load] = os.loadavg();
  const cpus = os.availableParallelism();
  const top = Number(process.argv[1]) || 0;
  const line = `load ${load.toFixed(2)} on ${cpus} cpus, top process at ${top}%`;
  console.log(load <= cpus && top <= 100 ? `quiet: ${line}` : `busy: ${line}`);
' "$(ps -Ao pcpu= | sort -rn | head -1 | tr -d ' ')")
echo "$quiet"
case "$quiet" in quiet:*) ;; *) exit 6 ;; esac

mkdir -p "$OUT" || exit 2
{
  echo "head: $(git rev-parse HEAD)"
  echo "patch: $PATCH"
  echo "patch_sha256: $(shasum -a 256 "$PATCH" | cut -d' ' -f1)"
  echo "head_label: $HEAD_LABEL"
  echo "patched_label: $PATCHED_LABEL"
  echo "rounds: $ROUNDS"
  echo "order: $(order "$ROUNDS" "$HEAD_LABEL" "$PATCHED_LABEL" | tr ' ' '-' | paste -sd' ' -)"
  echo "bench_file: $BENCH"
  echo "pattern: $PATTERN"
  echo "host: $quiet"
  echo "node: $(node --version)"
  echo "cpu: $(sysctl -n machdep.cpu.brand_string 2> /dev/null || uname -m)"
  echo "start: $(date -u +%Y-%m-%dT%H:%M:%SZ)"
} > "$OUT/meta.txt"

# applied=1 from just before `git apply` until a revert is attempted, so a signal that lands while
# `git apply` runs still reverts. reverted=1 from that attempt until the tree is seen clean, so a
# revert that fails says so even when a signal ends cleanup first.
applied=0
reverted=0
# Ends with the tree clean, or says why not and exits 5; never carries on.
cleanup() {
  if [ "$applied" = 1 ]; then
    applied=0
    reverted=1
    git apply -R "$PATCH"
  fi
  if tree_clean; then
    reverted=0
  elif [ "$reverted" = 1 ]; then
    trap - EXIT # said once: an exit from a direct call would run cleanup again
    echo "ab.sh: could not revert $PATCH; $TREE is left patched" >&2
    exit 5
  else
    trap - EXIT
    echo "ab.sh: $TREE is not clean" >&2
    exit 5
  fi
}
# A handler for INT or TERM does not end a bash script by itself: the signal traps exit, and the
# EXIT trap is the one place that reverts.
trap cleanup EXIT
trap 'exit 130' INT
trap 'exit 143' TERM

load() { { date +%T; uptime; ps -Ao pcpu,comm -r | head -5; } > "$1"; }

# Process substitution, not a pipe: the loop must run in this shell, where the traps and `applied` live.
while read -r arm i; do
  if [ "$arm" = "$PATCHED_LABEL" ]; then
    applied=1
    git apply "$PATCH" || {
      applied=0
      echo "ab.sh: patch no longer applies before $arm-$i" >&2
      exit 3
    }
  fi
  load "$OUT/$arm-$i.load-before"
  if ! pnpm exec vitest bench --run --reporter=json --outputFile="$OUT/$arm-$i.json" \
    -t "$PATTERN" "$BENCH" < /dev/null > "$OUT/$arm-$i.log" 2>&1; then
    echo "ab.sh: bench run $arm-$i failed; see $OUT/$arm-$i.log" >&2
    exit 4
  fi
  load "$OUT/$arm-$i.load-after"
  cleanup
done < <(order "$ROUNDS" "$HEAD_LABEL" "$PATCHED_LABEL")

trap - EXIT INT TERM
cleanup
echo "packages/ restored to HEAD" > "$OUT/done.txt"
