type QuoteLineInput = {
  category: "material" | "edge" | "splash" | "accessory" | "fixture";
  quantity: string | number;
  unit: "sqft" | "linft" | "each";
  pricePerUnit: string | number;
  lineTotal?: string | number;
};

type CalculatedLine<T extends QuoteLineInput> = Omit<T, "quantity" | "pricePerUnit" | "lineTotal"> & {
  quantity: string;
  pricePerUnit: string;
  lineTotal: string;
};

const toNumber = (value: string | number | null | undefined) => {
  const parsed = typeof value === "number" ? value : Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
};

const roundCents = (value: number) => Math.round((value + Number.EPSILON) * 100);
const money = (cents: number) => (cents / 100).toFixed(2);
const quantity = (value: number) => (Math.round((value + Number.EPSILON) * 100) / 100).toFixed(2);

export function calculateQuoteTotals<T extends QuoteLineInput>(
  items: T[],
  taxRate: string | number | null | undefined = "0.1300",
) {
  const calculatedItems: CalculatedLine<T>[] = items.map((item) => {
    const itemQuantity = toNumber(item.quantity);
    const itemPrice = toNumber(item.pricePerUnit);
    const lineTotalCents = roundCents(itemQuantity * itemPrice);

    return {
      ...item,
      quantity: quantity(itemQuantity),
      pricePerUnit: money(roundCents(itemPrice)),
      lineTotal: money(lineTotalCents),
    };
  });

  const subtotalCents = calculatedItems.reduce(
    (sum, item) => sum + roundCents(toNumber(item.lineTotal)),
    0,
  );
  const taxCents = roundCents((subtotalCents / 100) * toNumber(taxRate));
  const totalSqft = calculatedItems
    .filter((item) => item.category === "material" && item.unit === "sqft")
    .reduce((sum, item) => sum + toNumber(item.quantity), 0);

  return {
    items: calculatedItems,
    subtotal: money(subtotalCents),
    taxAmount: money(taxCents),
    totalAmount: money(subtotalCents + taxCents),
    totalSqft: quantity(totalSqft),
  };
}
