# Retrieval comparison — baseline vs. hybrid

| Retriever | Recall@5 | MRR | Filter-aware |
|---|---|---|---|
| Baseline (vector-only) | **0.9917** | 1.0000 | ❌ |
| Hybrid (vector + BM25 + price filter + soft category/brand AND) | **0.9917** | 1.0000 | ✅ |

## Honest read of the numbers

On this catalog (86 products, ~half duplicates, descriptive product names) **pure vector search is already near-perfect** — recall@5 saturates around 0.99 because most queries are exact or near-exact name matches. There is little room for hybrid to push aggregate recall higher; the lone sub-1.0 query ("gold bracelet") fails the same way under both retrievers because the only true bracelets in the catalog are #5/#25, and vector embeddings of three-word product names can't perfectly distinguish "gold bracelet" from "gold ring".

What hybrid actually adds, that the eval metric doesn't measure:

1. **Hard price filtering.** `"cheap t-shirts"` extracts `price_max: 30`. Pure vector ignores this — it returns shirts ranked by similarity regardless of price. Hybrid caps results at $30.
2. **Soft category/brand boost.** When the LLM extracts ≥2 soft conditions, products that satisfy ALL of them get an RRF contribution. We deliberately gate this on ≥2 conditions because a single broad category (e.g. "electronics") would pull in 50 unrelated items.
3. **Robustness to LLM extraction errors.** Wrong categories (e.g. Airpods classified as `electronics` instead of `mobile-accessories`) don't filter out correct results — only price is a hard gate.
4. **Filter exposure to the UI.** The endpoint returns the extracted filters, so the frontend can render filter chips ("Under $30") and let the user untoggle them.

## Tuning history (lessons)

The path from baseline-tied to baseline-tied-plus-filter-compliance was non-trivial:

| Version | R@5 | What changed | Why it failed/worked |
|---|---|---|---|
| Hard filters on everything | 0.8450 | Filtered out correct results when LLM misclassified | "Apple Airpods" → `electronics` filter, but products are `mobile-accessories` |
| Soft list with OR | 0.9483 | Broad category boosts (e.g. all electronics) added noise | Sub-relevant items got fused-rank slots |
| Soft list with AND, ≥2 conds, rawQuery to vec | 0.9917 | Vector embeds the full query, soft list only fires when precise | Tied baseline; price filters still work |

## Configuration shipped

- `rrf(weights = { vec: 1.5, bm: 0.3, soft: 0.5 })` — vector dominates because catalog has short descriptive names; BM25 contributes a small boost for exact brand/model hits.
- Vector retrieval uses the **raw user query**, not the LLM's stripped `semantic_query` (preserves discriminative tokens like "for women").
- Soft filter list only fires when ≥2 of `{category, brand, color}` are populated (precision over recall).
- Only `price_min` and `price_max` are hard `WHERE` clauses — they're numeric and unambiguous.
