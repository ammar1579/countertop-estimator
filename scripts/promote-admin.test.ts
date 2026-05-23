import { describe, expect, it } from "vitest";
import { parsePromotionArgs } from "./promote-admin";

describe("parsePromotionArgs", () => {
  it("normalizes the email address argument", () => {
    expect(parsePromotionArgs(["node", "promote-admin", "OWNER@EXAMPLE.COM"])).toEqual({
      email: "owner@example.com",
    });
  });

  it("requires an email address argument", () => {
    expect(() => parsePromotionArgs(["node", "promote-admin"])).toThrow(
      "Usage: pnpm promote-admin owner@example.com",
    );
  });
});
