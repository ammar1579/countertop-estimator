# Phase 3.5 — Order Conversion Uniqueness Hardening

## Goal

Close the remaining race-condition gap in quote-to-order conversion by enforcing one order per quote at the database level.

Phase 3 made conversion idempotent in normal app flow and added order line-item snapshots. Phase 3.5 adds DB-level protection so concurrent conversion attempts cannot create duplicate orders.

## Background

Current behavior:
- `convertQuoteToOrder` checks for an existing order before creating a new one.
- This is safe in normal app flow.
- Without a DB unique constraint/index, concurrent requests can still race.

MySQL unique indexes enforce uniqueness at the database level, and Drizzle supports unique constraints/indexes in schema definitions. Add a migration only after auditing for existing duplicate `quoteId` values. Existing duplicates would cause a unique index creation to fail.  [oai_citation:0‡Drizzle ORM](https://orm.drizzle.team/docs/indexes-constraints?utm_source=chatgpt.com)

## Scope

Implement Phase 3.5 only.

Do not implement:
- quote revisions
- admin pricing UI
- new pricing rules
- frontend redesign
- broad schema redesign
- unrelated cleanup

## Requirements

### 1. Audit duplicate orders by quote id

Add a safe audit query/helper or migration pre-check for duplicates:

```sql
SELECT quoteId, COUNT(*) AS count
FROM orders
WHERE quoteId IS NOT NULL
GROUP BY quoteId
HAVING COUNT(*) > 1;
```

The actual column name in the current schema is `quoteId`.
