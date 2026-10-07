---
"@qadi/core": minor
---

`diffTraces` no longer reports `FieldsChanged` for two field sets that disclose the same fields. `["title"]` against `["title.**"]`, and `["address.**", "address.street"]` against `["address.**"]`, are one set spelled two ways; a what-if or replay whose sides spell a set differently marked an unchanged edit as changed. Field equality is now `sameVisibleFields`, a new export beside `intersectFields`/`unionFields`/`mergeFields` (mutual per-spec containment; sound and conservative). `FieldsChanged.before`/`after` still carry the authored text.
