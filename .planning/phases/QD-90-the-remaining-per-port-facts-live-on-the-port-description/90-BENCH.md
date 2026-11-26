# Phase 90 bench of record (PFACT-03, D-16, D-16a)

One run, made once, on a quiet host. It measures the routing (the spike's (f)+(g) diff, `routing.patch`) against the
committed base source, over the 37 workloads of `bench/workloads.txt` (Phase 68's 35 and the two scoped-heavy
workloads added by `c4349bf6`, `test(90-06): add the scoped-heavy bench workloads`) in
`packages/core/bench/Evaluate.bench.ts`, on `scripts/bench/ab.sh`, 4 + 4 rounds with the arm order alternating by
round. The run was not repeated, whatever the gate said.

## The patch of record

- Patch of record: `routing.patch` (`bench/routing.patch`), the diff of `spike/f.patch` then `spike/g.patch` on HEAD
  (`packages/core/src/LeafNeeds.ts`, `PortAccess.ts`, `ScopedLeaf.ts`).
- SHA-256: `fedbbea7e812b446f6c6c26b79472606d2bca8143d0782b16c43b2c2d6b04e84` (equal to `bench/routing.patch.sha256`
  and to the `patch_sha256:` of the run's `meta.txt`).
- Fixing commit: `77a2209f2f867c018b5e457633066591541cb77f`, `docs(90-06): fix the routing patch before its bench`,
  which holds exactly the patch and its `.sha256` and precedes the run. The run's `meta.txt` says `head:` that commit.
- The hoisted-predicate variant (`routing-hoisted.patch`) was not measured: the first form passed, so the plan's
  fallback was not reached and no hoisted patch, sidecar, meta or analysis exists.
- The per-call closure form of the `ByScope` arm is therefore the form that is measured, and the form that lands.

## The gate, fixed before the run

- No workload more than 5% slower (`max_slowdown_pct: 5.0`), judged on the median of the per-run minima (D-16a).
- A geometric mean of the deltas no worse than +2% (`max_geomean_pct: 2.0`).
- The verdict is the analysis's last `# gate:` line and nothing else.

## Invocations

```text
scripts/bench/ab.sh .planning/phases/QD-90-the-remaining-per-port-facts-live-on-the-port-description/bench/routing.patch <S>/bench-routing 4 base routing packages/core/bench/Evaluate.bench.ts .
node scripts/bench/analyze.mjs <S>/bench-routing base routing .planning/phases/QD-90-the-remaining-per-port-facts-live-on-the-port-description/bench/workloads.txt
```

`<S>` is the scratch root `qd90` under the temporary directory. `ab.sh` exited 0, started with
`quiet: load 3.47 on 12 cpus, top process at 27.7%`, and left `packages/` clean (`packages/ restored to HEAD`).

## Meta (`bench/routing.meta.txt`, verbatim)

```text
head: 77a2209f2f867c018b5e457633066591541cb77f
patch: /Users/mohammadalmechkor/Projects/Perso/qadi/.planning/phases/QD-90-the-remaining-per-port-facts-live-on-the-port-description/bench/routing.patch
patch_sha256: fedbbea7e812b446f6c6c26b79472606d2bca8143d0782b16c43b2c2d6b04e84
head_label: base
patched_label: routing
rounds: 4
order: base-1 routing-1 routing-2 base-2 base-3 routing-3 routing-4 base-4
bench_file: packages/core/bench/Evaluate.bench.ts
pattern: .
host: quiet: load 3.47 on 12 cpus, top process at 27.7%
node: v26.13.0
cpu: Apple M3 Pro
start: 2026-11-26T08:46:22Z
```

## The two scoped-heavy workloads

The workloads the routing is for, `readScoped` on every leaf of the eight:

| workload | base min (ns) | routing min (ns) | delta of minima | base spread | verdict |
| -------- | ------------- | ---------------- | --------------- | ----------- | ------- |
| `scoped-heavy — allOf of 8 resource-scoped port leaves, id present` | 66604 | 67292 | +1.0% | 1.7% | ok |
| `scoped-heavy — allOf of 8 Any-scoped port leaves` | 54729 | 56021 | +2.4% | 1.4% | ok |

The deltas of the other 35 workloads run from -1.3% to +3.0%; the largest, +3.0%, is
`evaluate :: field-heavy — allOf of 8 under Intersection` (reference spread 5.5%) and
`evaluate — depth scaling :: depth 40` (reference spread 6.4%), neither of which reads a scoped port.

## Analysis summary (`bench/analysis.txt`, the `#` lines verbatim)

```text
# workloads: 37
# slower: 0
# geomean_d_min_pct: 0.75
# max_slowdown_pct: 5.0
# max_geomean_pct: 2.0
# worst_d_min: 3.0 evaluate :: field-heavy — allOf of 8 under Intersection
# gate: pass
```

All 37 workloads read `ok`; the per-workload table is `bench/analysis.txt`. The geometric mean of the 37 deltas is
+0.75%.

## Run-to-run noise

The reference arm's per-workload spread (`ref_min_spread_pct`, the range of its four per-run minima over their median),
over the 37 workloads: minimum 0.8%, median 2.9%, maximum 6.4%. Both scoped-heavy deltas are above their own
reference spread (1.7% and 1.4%) and below the 5% limit; this record does not read them as zero cost. The routing adds
about 1% to 2.4% to an evaluation whose eight leaves all take the read, and nothing measurable to the workloads that take
none.

## Host load (`uptime` 1-minute load average, 12 CPUs, before each run)

| run | load |
| --- | ---- |
| base-1 | 3.47 |
| routing-1 | 3.25 |
| routing-2 | 3.23 |
| base-2 | 2.82 |
| base-3 | 2.50 |
| routing-3 | 2.54 |
| routing-4 | 2.36 |
| base-4 | 2.56 |

## Raw run files (SHA-256, left in `<S>/bench-routing`)

```text
b2741a40dc9ebce9328c0d0777d557d1a0605e13dd86784372622c2ea4efaa16  base-1.json
4665d36d7173e137a3f6e32592779bbd0d3a4c3cb48370635fc34bbd60ef53c5  base-2.json
fc2346c049d161c4043e09342ba2c03429ae7fc94f3628db671240e729c61c3f  base-3.json
0ed9b6ab1aaf5e30ef7a692a1b56ce92c8416a8bbb019631e01f4051c4cc5f4b  base-4.json
a7a4f305aa101c5c12f7360b9df48f71a4fe111e893571485decb90e0b6cc9a4  routing-1.json
39052f3b91028cb9a20f8a6fc050bdd824cc5743b890dd170b673d7f7c5b26e1  routing-2.json
4d747df3b6f1bcc54e963b2ea66f0f3733138040e2eea51f84c0bf0d0b250ed5  routing-3.json
8001d28c78391bc010914170f236f84269cffdc16a3c1e57a50990cbccf2cb63  routing-4.json
```

## Verdict

# gate: pass

The routing may land (plan 12). The bench file is held byte for byte from `c4349bf6`; a re-measure is one `ab.sh` run
of `bench/routing.patch`.
