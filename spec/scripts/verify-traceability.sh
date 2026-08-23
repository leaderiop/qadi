#!/usr/bin/env bash
#
# Verifies the structural integrity of spec/.
#
# The predecessor specification allowed orphaned documents to accumulate
# because nothing checked that the files on disk matched the declared registry.
# Every check here exists to make one class of drift impossible to merge.
#
# Usage: bash spec/scripts/verify-traceability.sh [--strict]
#   --strict  treat SKIP as FAIL (the merge gate always passes it)

set -uo pipefail

STRICT=0
[[ "${1:-}" == "--strict" ]] && STRICT=1

SPEC_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ROOT_DIR="$(cd "$SPEC_DIR/.." && pwd)"

PASS=0
FAIL=0
SKIP=0

report() { # status, check, detail
  printf '| %-6s | %-42s | %s\n' "$1" "$2" "$3"
  case "$1" in
    PASS) PASS=$((PASS + 1)) ;;
    FAIL) FAIL=$((FAIL + 1)) ;;
    SKIP) if [[ $STRICT -eq 1 ]]; then FAIL=$((FAIL + 1)); else SKIP=$((SKIP + 1)); fi ;;
  esac
}

echo
echo "Qadi specification verification"
echo "| Status | Check                                      | Detail"
echo "| ------ | ------------------------------------------ | ------"

# ---------------------------------------------------------------------------
# 1. Every index.yaml entry resolves to a file on disk, and vice versa.
# ---------------------------------------------------------------------------
for index in "$SPEC_DIR"/*/index.yaml; do
  [[ -e "$index" ]] || continue
  dir="$(dirname "$index")"
  name="$(basename "$dir")"

  missing=""
  declared=""
  while IFS= read -r file; do
    declared="${declared} ${file}"
    [[ -f "$dir/$file" ]] || missing="${missing} ${file}"
  done < <(grep -oE '^\s+file:\s*"[^"]+"' "$index" | sed -E 's/.*"([^"]+)".*/\1/')

  if [[ -n "$missing" ]]; then
    report FAIL "$name/index.yaml -> disk" "missing:${missing}"
  else
    count=$(wc -w <<< "$declared" | tr -d ' ')
    report PASS "$name/index.yaml -> disk" "$count entr(y|ies) resolve"
  fi

  # Reverse: any .md on disk not declared in the registry is an orphan.
  orphans=""
  for f in "$dir"/*.md; do
    [[ -e "$f" ]] || continue
    base="$(basename "$f")"
    [[ "$base" == "README.md" ]] && continue
    grep -q "\"$base\"" "$index" || orphans="${orphans} ${base}"
  done

  if [[ -n "$orphans" ]]; then
    report FAIL "$name/ disk -> index.yaml" "orphaned:${orphans}"
  else
    report PASS "$name/ disk -> index.yaml" "no orphans"
  fi
done

# ---------------------------------------------------------------------------
# 2. Every INV-QD-NNN in invariants.md appears in traceability.md.
# ---------------------------------------------------------------------------
if [[ -f "$SPEC_DIR/invariants.md" && -f "$SPEC_DIR/traceability.md" ]]; then
  untraced=""
  while IFS= read -r inv; do
    grep -q "$inv" "$SPEC_DIR/traceability.md" || untraced="${untraced} ${inv}"
  done < <(grep -oE 'INV-QD-[0-9]{3}' "$SPEC_DIR/invariants.md" | sort -u)

  if [[ -n "$untraced" ]]; then
    report FAIL "invariants -> traceability" "untraced:${untraced}"
  else
    n=$(grep -ocE 'INV-QD-[0-9]{3}' "$SPEC_DIR/invariants.md" 2>/dev/null || echo 0)
    report PASS "invariants -> traceability" "all invariants traced"
  fi
else
  report SKIP "invariants -> traceability" "invariants.md or traceability.md absent"
fi

# ---------------------------------------------------------------------------
# 3. Every ADR file maps to an ADR-QD-NNN present in traceability.md.
# ---------------------------------------------------------------------------
if [[ -d "$SPEC_DIR/decisions" && -f "$SPEC_DIR/traceability.md" ]]; then
  untraced=""
  found=0
  for f in "$SPEC_DIR"/decisions/[0-9][0-9][0-9]-*.md; do
    [[ -e "$f" ]] || continue
    found=$((found + 1))
    num="$(basename "$f" | cut -c1-3)"
    grep -q "ADR-QD-$num" "$SPEC_DIR/traceability.md" || untraced="${untraced} ADR-QD-$num"
  done

  if [[ $found -eq 0 ]]; then
    report SKIP "decisions -> traceability" "no ADR files yet"
  elif [[ -n "$untraced" ]]; then
    report FAIL "decisions -> traceability" "untraced:${untraced}"
  else
    report PASS "decisions -> traceability" "$found ADR(s) traced"
  fi
else
  report SKIP "decisions -> traceability" "decisions/ or traceability.md absent"
fi

# ---------------------------------------------------------------------------
# 3b. Every URS-QD-NNN declared in urs.md appears in its traceability table.
#
# The heading declares a requirement; the table is where it is tied to a
# behavior and a test. A requirement added without a row is a requirement
# nobody has to satisfy.
# ---------------------------------------------------------------------------
if [[ -f "$SPEC_DIR/urs.md" ]]; then
  untraced=""
  declared=0
  while IFS= read -r urs; do
    declared=$((declared + 1))
    # Count occurrences: one is the heading alone, so it is untraced.
    n=$(grep -c "$urs" "$SPEC_DIR/urs.md")
    [[ "$n" -ge 2 ]] || untraced="${untraced} ${urs}"
  done < <(grep -oE '^### (URS|NFR)-QD-[0-9]{3}' "$SPEC_DIR/urs.md" | sed -E 's/^### //' | sort -u)

  if [[ $declared -eq 0 ]]; then
    report SKIP "urs -> traceability table" "no requirements declared"
  elif [[ -n "$untraced" ]]; then
    report FAIL "urs -> traceability table" "untraced:${untraced}"
  else
    report PASS "urs -> traceability table" "$declared requirement(s) traced"
  fi
else
  report SKIP "urs -> traceability table" "urs.md absent"
fi

# ---------------------------------------------------------------------------
# 4. Every REQ-QD-NNN tag used in a .feature file is defined in traceability.md.
# ---------------------------------------------------------------------------
if [[ -d "$ROOT_DIR/features/features" && -f "$SPEC_DIR/traceability.md" ]]; then
  undefined=""
  tags=$(grep -rhoE '@REQ-QD-[0-9]{3}' "$ROOT_DIR/features/features" 2>/dev/null | sort -u)
  if [[ -z "$tags" ]]; then
    report SKIP "features -> traceability" "no .feature tags yet"
  else
    while IFS= read -r tag; do
      grep -q "${tag#@}" "$SPEC_DIR/traceability.md" || undefined="${undefined} ${tag}"
    done <<< "$tags"
    if [[ -n "$undefined" ]]; then
      report FAIL "features -> traceability" "undefined:${undefined}"
    else
      report PASS "features -> traceability" "all REQ tags defined"
    fi
  fi
else
  report SKIP "features -> traceability" "features/ or traceability.md absent"
fi

# ---------------------------------------------------------------------------
# 5. No broken relative markdown links.
#
# Links inside fenced code blocks are illustrative syntax examples, not real
# references, and are skipped — otherwise every doc that documents the link
# format reports itself as broken.
#
# A target that exists but is **gitignored** counts as broken, and that is not
# a refinement — it is the whole reason this check was insufficient. Three
# links into `.scratch/` shipped in ADR-QD-036 and ADR-QD-037 and resolved
# perfectly on the author's machine while failing on every clone, so CI was red
# for five commits with nothing local to show for it. `-e` alone asks "can *I*
# read this", which is the wrong question for a document other people have to
# read.
# ---------------------------------------------------------------------------
broken=""
untracked=""
checked=0
while IFS= read -r md; do
  dir="$(dirname "$md")"
  while IFS= read -r target; do
    [[ -z "$target" ]] && continue
    case "$target" in
      http*|mailto*|\#*) continue ;;
    esac
    path="${target%%#*}"
    [[ -z "$path" ]] && continue
    checked=$((checked + 1))
    if [[ ! -e "$dir/$path" ]]; then
      broken="${broken} $(basename "$md")->${path}"
    elif git -C "$ROOT_DIR" check-ignore -q "$dir/$path" 2>/dev/null; then
      untracked="${untracked} $(basename "$md")->${path}"
    fi
  done < <(awk '/^[[:space:]]*```/ { fence = !fence; next } !fence' "$md" \
    | grep -oE '\]\([^)]+\)' | sed -E 's/^\]\((.*)\)$/\1/')
done < <(find "$SPEC_DIR" -name '*.md' -type f)

if [[ -n "$broken" ]]; then
  report FAIL "relative link integrity" "broken:${broken}"
elif [[ -n "$untracked" ]]; then
  report FAIL "relative link integrity" "gitignored, so broken for everyone else:${untracked}"
else
  report PASS "relative link integrity" "$checked link(s) resolve, none gitignored"
fi

# ---------------------------------------------------------------------------
# Summary
# ---------------------------------------------------------------------------
echo
echo "PASS: $PASS   FAIL: $FAIL   SKIP: $SKIP$([[ $STRICT -eq 1 ]] && echo ' (strict: skips count as failures)')"
echo

[[ $FAIL -eq 0 ]] || exit 1
