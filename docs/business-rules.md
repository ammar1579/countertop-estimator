# Business Rules

This document describes the business rules implemented by the current Quick Quartz application.

## Users And Access

- Users authenticate with local email/password credentials.
- Passwords must be at least 12 characters at registration.
- Sessions are stored in the `app_session_id` HTTP-only cookie.
- User roles are `user` and `admin`.
- Protected application procedures require an authenticated user.
- Admin-only procedures require the `admin` role.
- If `ALLOW_FIRST_USER_ADMIN=true`, the first registered local user can become an admin.
- `ADMIN_EMAILS` can promote matching emails during user upsert.
- In production, `ALLOW_SIGNUPS=false` and `ALLOW_FIRST_USER_ADMIN=false` are expected after initial setup.

## Clients

- A client requires `firstName` and `lastName`.
- Client email is optional, but when supplied it must be a valid email address.
- Lead source values are `Website`, `Phone`, `Referral`, `Walk-in`, and `Other`.
- Client records can be searched by first name, last name, email, phone, and company.
- Client records can be filtered by lead source.
- Quotes and orders can be listed for a specific client.

## Price Lists

- Price lists are managed by admins.
- Active price lists are returned to users; inactive lists are hidden from the normal list.
- A price list has a name, optional description, revision, active flag, waste factor, and tax rate.
- New price lists default to revision `1` and active.
- Price list items are managed by admins.
- Price list item categories are `material`, `edge`, `splash`, `accessory`, and `fixture`.
- Price list item units are `sqft`, `linft`, and `each`.
- Deleting a price list item soft-deactivates it by setting `isActive=false`.
- Only active price list items are returned for estimating.

## Quotes

- Quotes require a client, price list, and title.
- Quote numbers are generated as `QQ-YYYY-NNNN` when the database is available.
- Quote statuses are `Draft`, `Active`, and `Expired`.
- New quotes default to `Draft` unless an allowed status is supplied.
- New quotes default to revision `1`.
- New quotes default to an expiration date 30 days from creation when no date is supplied.
- The salesperson is the authenticated user creating the quote.
- Quote totals should not be trusted from the client when line items are saved.
- Saving line items replaces the full current line item set for the quote.
- Saving line items recomputes each line total, subtotal, tax amount, total amount, and material square footage on the server.
- Quote revisions can store a revision number, change note, user, and snapshot data.
- Quote email logs record recipient, subject, revision, sender, send time, and view metadata.

## Orders

- Orders are created by converting an existing quote.
- Order numbers are generated as `ORD-YYYY-NNNN` when the database is available.
- Converted orders copy the quote's client, salesperson, title, price list, square feet, subtotal, tax, and total.
- Converted orders start with project status `Pending`.
- Converted orders start with payment status `Unpaid`.
- Converting a quote updates the source quote status to `Active`.
- Orders read line items from their source quote rather than storing a separate order line item copy.
- Project status values are `Pending`, `In Progress`, `Completed`, and `Invoiced`.
- Payment status values are `Unpaid`, `Partial`, and `Paid`.

## Payments

- Payments belong to orders.
- Payment methods are `Cash`, `Cheque`, `Credit Card`, `E-Transfer`, and `Other`.
- A payment records amount, method, optional reference, optional notes, paid date, and recording user.
- After a payment is added, the order payment status is recalculated from all payments for that order.
- If total paid is greater than or equal to the order total and the order total is greater than zero, status becomes `Paid`.
- If total paid is greater than zero but less than the order total, status becomes `Partial`.
- Otherwise, status remains `Unpaid`.

## Inventory

- Inventory records track color, brand, thickness, finish, slab dimensions, quantity, location, cost per square foot, low-stock threshold, and notes.
- Inventory can be searched by color name or brand.
- Low-stock inventory is any record where `quantity <= lowStockThreshold`.
- Inventory deletion removes the inventory record.

## Analytics

- Analytics summary includes quote counts, order count, revenue, pipeline value, client count, low-stock count, and conversion rate.
- Pipeline value currently includes `Draft` and `Active` quote totals.
- Revenue by month aggregates order totals by `saleDate`.
- Salesperson metrics aggregate orders, revenue, and square footage by salesperson.
- Quote and order status charts aggregate counts and total value by status.

## Current Limits

- Waste factor is stored on price lists but is not currently applied by the pricing engine.
- Orders do not snapshot line items independently; they reference the source quote line items.
- Quote revision snapshots are caller-provided and are not yet automatically generated from canonical server state.
- The pricing engine does not yet implement minimum charges, discounts, jurisdiction-specific tax rules, locked revisions, or slab optimization.
