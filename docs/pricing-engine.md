# Pricing Engine

The pricing engine lives in `server/pricing.ts`. It is the server-side source of truth for persisted quote totals when quote line items are saved.

## Purpose

The frontend can preview quote totals while a salesperson edits a quote, but persisted quote totals are recomputed on the server. This prevents client-supplied `lineTotal`, `subtotal`, `taxAmount`, `totalAmount`, or `totalSqft` values from becoming authoritative.

## Inputs

`calculateQuoteTotals(items, taxRate)` accepts quote line items with:

- `category`: `material`, `edge`, `splash`, `accessory`, or `fixture`.
- `quantity`: string or number.
- `unit`: `sqft`, `linft`, or `each`.
- `pricePerUnit`: string or number.
- `lineTotal`: optional string or number. This is ignored and recomputed.

The tax rate is a decimal multiplier, such as `0.1300` for 13 percent tax. When quote line items are saved, the router uses the quote's price list tax rate and falls back to `0.1300`.

## Calculation Rules

For each line item:

```text
lineTotal = quantity * pricePerUnit
```

Money values are rounded to cents and formatted with two decimal places.

Quantity values are rounded to two decimal places and formatted with two decimal places.

The subtotal is the sum of recomputed line totals:

```text
subtotal = sum(lineTotal)
```

Tax is calculated from the subtotal:

```text
taxAmount = subtotal * taxRate
```

The final total is:

```text
totalAmount = subtotal + taxAmount
```

Material square footage includes only line items where:

```text
category == "material" and unit == "sqft"
```

Other square-foot items, such as splash items, do not contribute to `totalSqft`.

## Persistence Flow

The `quotes.saveLineItems` tRPC mutation performs the persistence flow:

1. Load the quote by `quoteId`.
2. Reject the request if the quote does not exist.
3. Normalize incoming line item sort order.
4. Recompute all line totals and quote totals with `calculateQuoteTotals`.
5. Delete existing quote line items for the quote.
6. Insert the recomputed line items.
7. Update the quote's `subtotal`, `taxAmount`, `totalAmount`, and `totalSqft`.
8. Return the recomputed totals to the caller.

Because line item saving replaces the whole line item set, callers should send the complete current quote item list.

## Rounding Behavior

The engine uses integer cents for money rounding:

```text
roundCents(value) = Math.round((value + Number.EPSILON) * 100)
money(cents) = (cents / 100).toFixed(2)
```

Quantities are rounded to two decimals:

```text
quantity(value) = round(value * 100) / 100
```

Invalid, missing, or non-finite numeric inputs are treated as `0`.

## Example

Given:

```text
25 sqft material at 45.00
15 linft edge at 12.00
taxRate = 0.1300
```

The engine returns:

```text
material line total = 1125.00
edge line total = 180.00
subtotal = 1305.00
taxAmount = 169.65
totalAmount = 1474.65
totalSqft = 25.00
```

## Tests

Pricing behavior is covered by `server/pricing.test.ts`.

The tests verify that:

- Client-supplied line totals are recomputed.
- Subtotal, configured tax, total, and material square footage are calculated.
- Money is rounded to cents.
- `totalSqft` only counts material square-foot quantities.

## Current Limits

- Price list `wasteFactor` is stored but not applied.
- Minimum charges are not applied.
- Discounts are not applied.
- Tax is a single price-list-level rate, not a jurisdiction resolver.
- Quote revisions are not locked against later price list changes.
- Orders copy quote totals on conversion but read line items from the source quote.
