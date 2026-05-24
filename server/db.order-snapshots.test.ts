import { describe, expect, it } from "vitest";
import { buildOrderLineItemSnapshots } from "./db";

describe("buildOrderLineItemSnapshots", () => {
  it("copies quote line item values into independent order snapshots", () => {
    const quoteLineItems = [
      {
        id: 10,
        quoteId: 42,
        areaLabel: "Kitchen",
        priceListItemId: 1,
        category: "material" as const,
        description: "Accepted Quartz",
        quantity: "25.00",
        unit: "sqft" as const,
        pricePerUnit: "45.00",
        lineTotal: "1125.00",
        sortOrder: 0,
        createdAt: new Date("2026-01-01"),
      },
    ];

    const snapshots = buildOrderLineItemSnapshots(99, quoteLineItems);
    quoteLineItems[0]!.description = "Edited Quote Line";
    quoteLineItems[0]!.lineTotal = "1.00";

    expect(snapshots).toEqual([
      {
        orderId: 99,
        sourceQuoteLineItemId: 10,
        areaLabel: "Kitchen",
        priceListItemId: 1,
        category: "material",
        description: "Accepted Quartz",
        quantity: "25.00",
        unit: "sqft",
        pricePerUnit: "45.00",
        lineTotal: "1125.00",
        sortOrder: 0,
      },
    ]);
  });
});
