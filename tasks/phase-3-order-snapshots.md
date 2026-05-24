# Phase 3 — Immutable Order Snapshots and Conversion Safety

## Goal

Make order conversion safe and historically accurate.

When a quote is converted into an order, the order must snapshot the accepted quote’s financial totals and line items so later quote edits, price-list changes, or pricing logic changes do not alter historical order scope or totals.

## Background

Phase 1 hardened quote financial writes and atomic quote line-item persistence.

Phase 2 hardened the pricing contract and numeric handling.

Current risk:
- Orders copy some quote header totals.
- Order views may still depend on mutable quote line items.
- Quote edits after conversion can make historical orders inconsistent.

## Scope

Implement Phase 3 only.

Do not implement:
- full quote revision workflow
- admin pricing UI
- new pricing rules
- waste factor/minimum charges
- frontend redesign
- broad database redesign

## Requirements

### 1. Add order line item snapshots

Orders must have their own persisted line items.

Create a new order line items table/model if one does not already exist.

Each order line item snapshot should preserve, at minimum:

- order id
- source quote line item id, if available
- description
- item type/category
- quantity
- unit
- price per unit
- line total
- sort/order position, if available
- created timestamp

Use the current quote line item data shape as the source of truth.

### 2. Snapshot order totals at conversion

When converting a quote to an order, persist:

- subtotal
- tax amount
- total amount
- total square footage
- copied line items

These values should come from the server-side quote/pricing state, not client input.

### 3. Make conversion atomic

Quote-to-order conversion must happen in a transaction.

In one atomic operation:

- create order
- copy order line item snapshots
- update quote status/conversion fields as currently required

If any step fails, nothing should be partially converted.

### 4. Prevent duplicate conversion

Converting the same quote repeatedly should not create duplicate orders.

Use one of:

- existing order lookup by quote id
- unique DB constraint
- idempotent conversion behavior
- explicit conflict error

Prefer idempotent return of the existing order if that matches current API behavior. Otherwise return a clear conflict error.

### 5. Preserve current UI behavior

Do not redesign the UI.

Update server responses and existing order detail/list logic only as needed so orders display their own snapshotted line items instead of quote line items.

### 6. Add tests

Add or update tests proving:

- conversion creates order line item snapshots
- editing quote line items after conversion does not change order line items
- order totals remain unchanged after quote edits
- duplicate conversion does not create a second order
- failed conversion does not leave partial order data, if testable with current DB/test setup

### 7. Update docs

Update:

- `docs/architecture.md`
- `docs/business-rules.md`

Mention that orders snapshot quote data at conversion time.

Do not claim quote revisions exist unless implemented.

## Verification

Run:

```bash
pnpm lint
pnpm check
pnpm test
pnpm build
```
