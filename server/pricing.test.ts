import { describe, expect, it } from "vitest";
import { calculateQuoteTotals } from "./pricing";

describe("calculateQuoteTotals", () => {
  it("recomputes line totals, subtotal, configured tax, total, and material square feet", () => {
    const result = calculateQuoteTotals(
      [
        {
          category: "material",
          quantity: "25",
          unit: "sqft",
          pricePerUnit: "45",
          lineTotal: "0.00",
        },
        {
          category: "edge",
          quantity: "15",
          unit: "linft",
          pricePerUnit: "12",
          lineTotal: "999.99",
        },
      ],
      "0.1300",
    );

    expect(result.items).toEqual([
      expect.objectContaining({ lineTotal: "1125.00" }),
      expect.objectContaining({ lineTotal: "180.00" }),
    ]);
    expect(result.subtotal).toBe("1305.00");
    expect(result.taxAmount).toBe("169.65");
    expect(result.totalAmount).toBe("1474.65");
    expect(result.totalSqft).toBe("25.00");
  });

  it("rounds money to cents and only counts material square-foot quantities", () => {
    const result = calculateQuoteTotals(
      [
        {
          category: "material",
          quantity: "10.005",
          unit: "sqft",
          pricePerUnit: "99.995",
          lineTotal: "0",
        },
        {
          category: "splash",
          quantity: "10",
          unit: "sqft",
          pricePerUnit: "5.125",
          lineTotal: "0",
        },
      ],
      "0.05",
    );

    expect(result.items[0]?.lineTotal).toBe("1000.45");
    expect(result.items[1]?.lineTotal).toBe("51.25");
    expect(result.subtotal).toBe("1051.70");
    expect(result.taxAmount).toBe("52.59");
    expect(result.totalAmount).toBe("1104.29");
    expect(result.totalSqft).toBe("10.01");
  });
});
