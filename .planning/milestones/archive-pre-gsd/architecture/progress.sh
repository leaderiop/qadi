#!/usr/bin/env bash
# Per-plan progress: done/total tasks, in-progress count, and frontmatter status.
# Usage: ./progress.sh            (all plans)
#        ./progress.sh 16 17 29   (selected ARCH ids)
cd "$(dirname "$0")" || exit 1
ids=("$@")
files=()
if [ ${#ids[@]} -eq 0 ]; then files=(ARCH-*.md); else for i in "${ids[@]}"; do files+=(ARCH-"$i"-*.md); done; fi
printf '%-48s %7s %5s %s\n' PLAN DONE WIP STATUS
for f in "${files[@]}"; do
  [ -f "$f" ] || continue
  total=$(grep -cE '^### T([0-9]|-)' "$f")
  done_=$(grep -c 'Status:\*\* \[x\]' "$f")
  dropped=$(grep -c 'Status:\*\* \[-\]' "$f")
  wip=$(grep -c 'Status:\*\* \[~\]' "$f")
  status=$(grep -m1 '^status:' "$f" | sed -E 's/^status:[[:space:]]*//; s/[[:space:]]*#.*//')
  printf '%-48s %3s/%-3s %5s %s%s\n' "${f%.md}" "$done_" "$((total - dropped))" "$wip" "$status" "$([ "$dropped" -gt 0 ] && echo " ($dropped dropped)")"
done
