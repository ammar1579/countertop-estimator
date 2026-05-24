import { describe, expect, it, vi } from "vitest";
import {
  ORDER_QUOTE_ID_DUPLICATE_AUDIT_SQL,
  isDuplicateOrderQuoteIdError,
  withOrderQuoteUniquenessFallback,
} from "./db";

describe("order quote uniqueness hardening", () => {
  it("documents the duplicate order audit query using the actual quoteId column", () => {
    expect(ORDER_QUOTE_ID_DUPLICATE_AUDIT_SQL).toContain("SELECT quoteId, COUNT(*) AS count");
    expect(ORDER_QUOTE_ID_DUPLICATE_AUDIT_SQL).toContain("FROM orders");
    expect(ORDER_QUOTE_ID_DUPLICATE_AUDIT_SQL).toContain("GROUP BY quoteId");
    expect(ORDER_QUOTE_ID_DUPLICATE_AUDIT_SQL).toContain("HAVING COUNT(*) > 1");
    expect(ORDER_QUOTE_ID_DUPLICATE_AUDIT_SQL).not.toContain("quote_id");
  });

  it("recognizes MySQL duplicate-key errors for the order quoteId unique index only", () => {
    expect(
      isDuplicateOrderQuoteIdError({
        code: "ER_DUP_ENTRY",
        errno: 1062,
        sqlMessage: "Duplicate entry '42' for key 'orders_quoteId_unique'",
      }),
    ).toBe(true);

    expect(
      isDuplicateOrderQuoteIdError({
        code: "ER_DUP_ENTRY",
        errno: 1062,
        sqlMessage: "Duplicate entry 'ORD-2026-0001' for key 'orders_orderNumber_unique'",
      }),
    ).toBe(false);
  });

  it("returns the existing order when a concurrent conversion hits the quoteId unique index", async () => {
    const existingOrder = {
      id: 99,
      quoteId: 42,
      orderNumber: "ORD-2026-0001",
    };
    const createAttempt = vi.fn().mockRejectedValue({
      code: "ER_DUP_ENTRY",
      errno: 1062,
      sqlMessage: "Duplicate entry '42' for key 'orders_quoteId_unique'",
    });
    const loadExistingOrder = vi.fn().mockResolvedValue(existingOrder);

    await expect(
      withOrderQuoteUniquenessFallback(42, createAttempt, loadExistingOrder),
    ).resolves.toBe(existingOrder);
    expect(loadExistingOrder).toHaveBeenCalledWith(42);
  });

  it("rethrows duplicate quoteId errors when the existing order cannot be loaded", async () => {
    const duplicateError = {
      code: "ER_DUP_ENTRY",
      errno: 1062,
      sqlMessage: "Duplicate entry '42' for key 'orders_quoteId_unique'",
    };

    await expect(
      withOrderQuoteUniquenessFallback(
        42,
        () => Promise.reject(duplicateError),
        () => Promise.resolve(undefined),
      ),
    ).rejects.toBe(duplicateError);
  });
});
