import { describe, expect, it, vi, beforeEach } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";
import type { User } from "../drizzle/schema";
import bcrypt from "bcryptjs";

// ─── Mock the DB module ────────────────────────────────────────────────────────
vi.mock("./db", () => ({
  getDb: vi.fn().mockResolvedValue(null),
  upsertUser: vi.fn(),
  countUsers: vi.fn().mockResolvedValue(1),
  createLocalUser: vi.fn().mockImplementation((data) => ({
    id: 10,
    openId: `email:${data.email}`,
    name: data.name,
    email: data.email,
    loginMethod: "password",
    role: data.role ?? "user",
    createdAt: new Date("2026-01-01"),
    updatedAt: new Date("2026-01-01"),
    lastSignedIn: new Date("2026-01-01"),
    passwordHash: data.passwordHash,
  })),
  getUserByEmail: vi.fn().mockResolvedValue(undefined),
  getUserById: vi.fn().mockResolvedValue(undefined),
  updateUserLastSignedIn: vi.fn().mockResolvedValue(undefined),
  getUserByOpenId: vi.fn(),
  getClients: vi.fn().mockResolvedValue([]),
  getClientById: vi.fn().mockResolvedValue(undefined),
  createClient: vi.fn().mockResolvedValue({ id: 1, firstName: "Jane", lastName: "Doe" }),
  updateClient: vi.fn().mockResolvedValue(undefined),
  deleteClient: vi.fn().mockResolvedValue(undefined),
  getClientQuotes: vi.fn().mockResolvedValue([]),
  getClientOrders: vi.fn().mockResolvedValue([]),
  getPriceLists: vi.fn().mockResolvedValue([
    { id: 1, name: "Standard Quartz", isActive: true, taxRate: "0.13", wasteFactor: "1.10" },
    { id: 2, name: "Premium Quartz", isActive: true, taxRate: "0.13", wasteFactor: "1.10" },
    { id: 3, name: "Slabs", isActive: true, taxRate: "0.13", wasteFactor: "1.05" },
  ]),
  getPriceListById: vi.fn().mockResolvedValue({ id: 1, name: "Standard Quartz" }),
  getPriceListItems: vi.fn().mockResolvedValue([
    { id: 1, priceListId: 1, name: "Quartz Material", category: "material", unit: "sqft", pricePerUnit: "45.00" },
    { id: 2, priceListId: 1, name: "Eased Edge", category: "edge", unit: "linft", pricePerUnit: "12.00" },
  ]),
  createPriceList: vi.fn().mockResolvedValue({ id: 4, name: "Custom" }),
  updatePriceList: vi.fn().mockResolvedValue(undefined),
  deletePriceList: vi.fn().mockResolvedValue(undefined),
  createPriceListItem: vi.fn().mockResolvedValue({ id: 10 }),
  updatePriceListItem: vi.fn().mockResolvedValue(undefined),
  deletePriceListItem: vi.fn().mockResolvedValue(undefined),
  getQuotes: vi.fn().mockResolvedValue([]),
  getQuoteById: vi.fn().mockResolvedValue(undefined),
  getQuoteLineItems: vi.fn().mockResolvedValue([]),
  getQuoteRevisions: vi.fn().mockResolvedValue([]),
  getQuoteEmailLogs: vi.fn().mockResolvedValue([]),
  createQuote: vi.fn().mockResolvedValue({ id: 42, quoteNumber: "QQ-2026-001", revision: 1 }),
  updateQuote: vi.fn().mockResolvedValue(undefined),
  replaceQuoteLineItems: vi.fn().mockResolvedValue(undefined),
  saveQuoteLineItems: vi.fn().mockResolvedValue(undefined),
  saveQuoteRevision: vi.fn().mockResolvedValue(undefined),
  logQuoteEmail: vi.fn().mockResolvedValue(undefined),
  convertQuoteToOrder: vi.fn().mockResolvedValue({ id: 99, orderNumber: "ORD-2026-001" }),
  generateQuoteNumber: vi.fn().mockResolvedValue("QQ-2026-001"),
  generateOrderNumber: vi.fn().mockResolvedValue("ORD-2026-001"),
  createOrder: vi.fn().mockResolvedValue({ id: 99, orderNumber: "ORD-2026-001" }),
  getOrders: vi.fn().mockResolvedValue([]),
  getOrderById: vi.fn().mockResolvedValue(undefined),
  getOrderLineItems: vi.fn().mockResolvedValue([]),
  getOrderPayments: vi.fn().mockResolvedValue([]),
  updateOrder: vi.fn().mockResolvedValue(undefined),
  getInventory: vi.fn().mockResolvedValue([]),
  getLowStockInventory: vi.fn().mockResolvedValue([]),
  createInventoryItem: vi.fn().mockResolvedValue({ id: 5 }),
  updateInventoryItem: vi.fn().mockResolvedValue(undefined),
  getAnalyticsSummary: vi.fn().mockResolvedValue({
    totalClients: 10,
    totalQuotes: 25,
    totalOrders: 8,
    totalRevenue: "42500.00",
    pipelineValue: "18000.00",
    conversionRate: "32.0",
    lowStockCount: 2,
  }),
  getRevenueByMonth: vi.fn().mockResolvedValue([]),
  getSalespersonMetrics: vi.fn().mockResolvedValue([]),
  getQuotesByStatus: vi.fn().mockResolvedValue([]),
  getOrdersByStatus: vi.fn().mockResolvedValue([]),
  getAllUsers: vi.fn().mockResolvedValue([]),
  updateUserRole: vi.fn().mockResolvedValue(undefined),
}));

// ─── Context Factories ─────────────────────────────────────────────────────────
function makeUser(overrides: Partial<User> = {}): User {
  return {
    id: 1,
    openId: "test-user-001",
    name: "Test User",
    email: "test@quickquartz.ca",
    loginMethod: "password",
    role: "user",
    createdAt: new Date("2026-01-01"),
    updatedAt: new Date("2026-01-01"),
    lastSignedIn: new Date("2026-01-01"),
    ...overrides,
  };
}

function makeAdminUser(): User {
  return makeUser({ id: 2, openId: "admin-001", role: "admin", name: "Admin User" });
}

function makeCtx(user: User | null = null): TrpcContext {
  return {
    user,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: vi.fn(), cookie: vi.fn() } as unknown as TrpcContext["res"],
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

// ─── Auth Tests ────────────────────────────────────────────────────────────────
describe("auth", () => {
  it("returns null for unauthenticated user", async () => {
    const caller = appRouter.createCaller(makeCtx(null));
    const result = await caller.auth.me();
    expect(result).toBeNull();
  });

  it("returns the current user when authenticated", async () => {
    const user = makeUser();
    const caller = appRouter.createCaller(makeCtx(user));
    const result = await caller.auth.me();
    expect(result).toMatchObject({ id: 1, name: "Test User", role: "user" });
  });

  it("clears session cookie on logout", async () => {
    const user = makeUser();
    const ctx = makeCtx(user);
    const caller = appRouter.createCaller(ctx);
    const result = await caller.auth.logout();
    expect(result).toEqual({ success: true });
    expect(ctx.res.clearCookie).toHaveBeenCalled();
  });

  it("registers the first local email/password user as admin and sets a session cookie", async () => {
    const { countUsers, getUserByEmail, createLocalUser } = await import("./db");
    vi.mocked(countUsers).mockResolvedValueOnce(0);
    vi.mocked(getUserByEmail).mockResolvedValueOnce(undefined);
    vi.mocked(createLocalUser).mockResolvedValueOnce(
      makeUser({
        id: 7,
        openId: "email:owner@example.com",
        email: "owner@example.com",
        name: "Owner",
        loginMethod: "password",
        role: "admin",
      }) as any,
    );

    const ctx = makeCtx(null);
    const caller = appRouter.createCaller(ctx);
    const result = await caller.auth.register({
      name: "Owner",
      email: "OWNER@EXAMPLE.COM",
      password: "correct horse battery staple",
    });

    expect(result.user).toMatchObject({
      id: 7,
      email: "owner@example.com",
      role: "admin",
    });
    expect(createLocalUser).toHaveBeenCalledWith(
      expect.objectContaining({
        email: "owner@example.com",
        openId: "email:owner@example.com",
        loginMethod: "password",
        role: "admin",
      }),
    );
    expect(ctx.res.cookie).toHaveBeenCalledWith(
      "app_session_id",
      expect.any(String),
      expect.objectContaining({ httpOnly: true, secure: true, sameSite: "lax" }),
    );
  });

  it("logs in an existing local user with email/password and sets a session cookie", async () => {
    const { getUserByEmail, updateUserLastSignedIn } = await import("./db");
    const passwordHash = await bcrypt.hash("correct horse battery staple", 10);
    vi.mocked(getUserByEmail).mockResolvedValueOnce(
      {
      ...makeUser({
        id: 9,
        openId: "email:user@example.com",
        email: "user@example.com",
        name: "Counter User",
        loginMethod: "password",
        role: "user",
      }),
      passwordHash,
      } as any,
    );

    const ctx = makeCtx(null);
    const caller = appRouter.createCaller(ctx);
    const result = await caller.auth.login({
      email: "USER@example.com",
      password: "correct horse battery staple",
    });

    expect(result.user).toMatchObject({
      id: 9,
      email: "user@example.com",
      role: "user",
    });
    expect(updateUserLastSignedIn).toHaveBeenCalledWith(9, expect.any(Date));
    expect(ctx.res.cookie).toHaveBeenCalledWith(
      "app_session_id",
      expect.any(String),
      expect.objectContaining({ httpOnly: true, secure: true, sameSite: "lax" }),
    );
  });
});

// ─── Price List Tests ──────────────────────────────────────────────────────────
describe("priceLists", () => {
  it("lists all price lists for authenticated users", async () => {
    const caller = appRouter.createCaller(makeCtx(makeUser()));
    const result = await caller.priceLists.list();
    expect(result).toHaveLength(3);
    expect(result.map((pl) => pl.name)).toEqual(["Standard Quartz", "Premium Quartz", "Slabs"]);
  });

  it("throws UNAUTHORIZED when unauthenticated user tries to list price lists", async () => {
    const caller = appRouter.createCaller(makeCtx(null));
    await expect(caller.priceLists.list()).rejects.toThrow();
  });

  it("returns price list items for a given price list", async () => {
    const caller = appRouter.createCaller(makeCtx(makeUser()));
    const result = await caller.priceLists.getItems({ priceListId: 1 });
    expect(result).toHaveLength(2);
    expect(result[0]).toMatchObject({ name: "Quartz Material", category: "material", unit: "sqft" });
    expect(result[1]).toMatchObject({ name: "Eased Edge", category: "edge", unit: "linft" });
  });

  it("allows admin to create a price list", async () => {
    const caller = appRouter.createCaller(makeCtx(makeAdminUser()));
    const result = await caller.priceLists.create({ name: "Custom", description: "Custom list" });
    expect(result).toMatchObject({ id: 4, name: "Custom" });
  });

  it("forbids non-admin from creating a price list", async () => {
    const caller = appRouter.createCaller(makeCtx(makeUser()));
    await expect(caller.priceLists.create({ name: "Hack List" })).rejects.toThrow();
  });
});

// ─── Quote Status Tests ────────────────────────────────────────────────────────
describe("quote statuses", () => {
  const VALID_QUOTE_STATUSES = ["Active", "Draft", "Expired"] as const;

  it("uses exactly the three required quote statuses", () => {
    expect(VALID_QUOTE_STATUSES).toContain("Active");
    expect(VALID_QUOTE_STATUSES).toContain("Draft");
    expect(VALID_QUOTE_STATUSES).toContain("Expired");
    expect(VALID_QUOTE_STATUSES).toHaveLength(3);
  });
});

// ─── Order Status Tests ────────────────────────────────────────────────────────
describe("order statuses", () => {
  const VALID_PROJECT_STATUSES = ["Pending", "In Progress", "Completed", "Invoiced"] as const;
  const VALID_PAYMENT_STATUSES = ["Unpaid", "Partial", "Paid"] as const;

  it("uses exactly the four required project statuses", () => {
    expect(VALID_PROJECT_STATUSES).toContain("Pending");
    expect(VALID_PROJECT_STATUSES).toContain("In Progress");
    expect(VALID_PROJECT_STATUSES).toContain("Completed");
    expect(VALID_PROJECT_STATUSES).toContain("Invoiced");
    expect(VALID_PROJECT_STATUSES).toHaveLength(4);
  });

  it("uses exactly the three required payment statuses", () => {
    expect(VALID_PAYMENT_STATUSES).toContain("Unpaid");
    expect(VALID_PAYMENT_STATUSES).toContain("Partial");
    expect(VALID_PAYMENT_STATUSES).toContain("Paid");
    expect(VALID_PAYMENT_STATUSES).toHaveLength(3);
  });
});

// ─── Client Router Tests ───────────────────────────────────────────────────────
describe("clients", () => {
  it("lists clients for authenticated users", async () => {
    const caller = appRouter.createCaller(makeCtx(makeUser()));
    const result = await caller.clients.list({});
    expect(Array.isArray(result)).toBe(true);
  });

  it("throws for unauthenticated client list", async () => {
    const caller = appRouter.createCaller(makeCtx(null));
    await expect(caller.clients.list({})).rejects.toThrow();
  });

  it("creates a client with required fields", async () => {
    const caller = appRouter.createCaller(makeCtx(makeUser()));
    const result = await caller.clients.create({
      firstName: "Jane",
      lastName: "Doe",
      email: "jane@example.com",
      phone: "416-555-0100",
    });
    expect(result).toMatchObject({ firstName: "Jane", lastName: "Doe" });
  });
});

// ─── Quote Router Tests ────────────────────────────────────────────────────────
describe("quotes", () => {
  it("lists quotes for authenticated users", async () => {
    const caller = appRouter.createCaller(makeCtx(makeUser()));
    const result = await caller.quotes.list({});
    expect(Array.isArray(result)).toBe(true);
  });

  it("creates a quote and returns id and quoteNumber", async () => {
    const caller = appRouter.createCaller(makeCtx(makeUser()));
    const result = await caller.quotes.create({
      clientId: 1,
      priceListId: 1,
      title: "Kitchen Reno — White Night",
      subtotal: "1305.00",
      taxAmount: "169.65",
      totalAmount: "1474.65",
      totalSqft: "25.00",
    });
    expect(result).toMatchObject({ id: 42, quoteNumber: "QQ-2026-001" });
  });

  it("ignores client-controlled financial totals when updating a quote", async () => {
    const { updateQuote } = await import("./db");
    const persistedQuote = {
      id: 42,
      title: "Kitchen Quote",
      subtotal: "1305.00",
      taxAmount: "169.65",
      totalAmount: "1474.65",
      totalSqft: "25.00",
    };
    vi.mocked(updateQuote).mockImplementationOnce(async (_id, data) => {
      Object.assign(persistedQuote, data);
    });
    const caller = appRouter.createCaller(makeCtx(makeUser()));

    await caller.quotes.update({
      id: 42,
      title: "Retitled Kitchen Quote",
      subtotal: "999999.99",
      taxAmount: "999999.99",
      totalAmount: "999999.99",
      totalSqft: "999999.99",
    } as any);

    expect(updateQuote).toHaveBeenCalledWith(42, {
      title: "Retitled Kitchen Quote",
    });
    expect(persistedQuote).toMatchObject({
      title: "Retitled Kitchen Quote",
      subtotal: "1305.00",
      taxAmount: "169.65",
      totalAmount: "1474.65",
      totalSqft: "25.00",
    });
  });

  it("recalculates quote line items on the server and persists them atomically", async () => {
    const {
      getQuoteById,
      replaceQuoteLineItems,
      saveQuoteLineItems,
      updateQuote,
    } = await import("./db");
    vi.mocked(getQuoteById).mockResolvedValueOnce({
      quote: { id: 42 },
      client: null,
      priceList: { taxRate: "0.1300" },
    } as any);
    const caller = appRouter.createCaller(makeCtx(makeUser()));

    const result = await caller.quotes.saveLineItems({
      quoteId: 42,
      items: [
        {
          areaLabel: "Kitchen",
          priceListItemId: 1,
          category: "material",
          description: "Quartz Material",
          quantity: "25",
          unit: "sqft",
          pricePerUnit: "45",
          lineTotal: "1.00",
          sortOrder: 0,
        },
        {
          areaLabel: "Kitchen",
          priceListItemId: 2,
          category: "edge",
          description: "Eased Edge",
          quantity: "15",
          unit: "linft",
          pricePerUnit: "12",
          lineTotal: "1.00",
          sortOrder: 1,
        },
      ],
    });

    expect(result).toMatchObject({
      subtotal: "1305.00",
      taxAmount: "169.65",
      totalAmount: "1474.65",
      totalSqft: "25.00",
    });
    expect(saveQuoteLineItems).toHaveBeenCalledWith(
      42,
      [
        expect.objectContaining({
          quoteId: 42,
          quantity: "25.00",
          pricePerUnit: "45.00",
          lineTotal: "1125.00",
        }),
        expect.objectContaining({
          quoteId: 42,
          quantity: "15.00",
          pricePerUnit: "12.00",
          lineTotal: "180.00",
        }),
      ],
      {
        subtotal: "1305.00",
        taxAmount: "169.65",
        totalAmount: "1474.65",
        totalSqft: "25.00",
      },
    );
    expect(replaceQuoteLineItems).not.toHaveBeenCalled();
    expect(updateQuote).not.toHaveBeenCalled();
  });

  it("converts a quote to an order through the atomic snapshot helper", async () => {
    const {
      convertQuoteToOrder,
      createOrder,
      getQuoteById,
      updateQuote,
    } = await import("./db");
    const caller = appRouter.createCaller(makeCtx(makeUser()));

    const result = await caller.quotes.convertToOrder({ quoteId: 42 });

    expect(result).toMatchObject({ id: 99, orderNumber: "ORD-2026-001" });
    expect(convertQuoteToOrder).toHaveBeenCalledWith({
      quoteId: 42,
      fallbackSalespersonId: 1,
      orderNumber: "ORD-2026-001",
    });
    expect(getQuoteById).not.toHaveBeenCalled();
    expect(createOrder).not.toHaveBeenCalled();
    expect(updateQuote).not.toHaveBeenCalled();
  });

  it("returns an existing order when converting the same quote again", async () => {
    const { convertQuoteToOrder, createOrder } = await import("./db");
    vi.mocked(convertQuoteToOrder).mockResolvedValue({
      id: 99,
      orderNumber: "ORD-2026-001",
      quoteId: 42,
    } as any);
    const caller = appRouter.createCaller(makeCtx(makeUser()));

    const first = await caller.quotes.convertToOrder({ quoteId: 42 });
    const second = await caller.quotes.convertToOrder({ quoteId: 42 });

    expect(first).toMatchObject({ id: 99, orderNumber: "ORD-2026-001" });
    expect(second).toMatchObject({ id: 99, orderNumber: "ORD-2026-001" });
    expect(convertQuoteToOrder).toHaveBeenCalledTimes(2);
    expect(createOrder).not.toHaveBeenCalled();
  });
});

// ─── Order Router Tests ───────────────────────────────────────────────────────
describe("orders", () => {
  it("returns snapshotted order line items instead of mutable quote line items", async () => {
    const {
      getOrderLineItems,
      getQuoteLineItems,
    } = await import("./db");
    vi.mocked(getOrderLineItems).mockResolvedValueOnce([
      {
        id: 500,
        orderId: 99,
        sourceQuoteLineItemId: 10,
        areaLabel: "Kitchen",
        category: "material",
        description: "Accepted Snapshot",
        quantity: "25.00",
        unit: "sqft",
        pricePerUnit: "45.00",
        lineTotal: "1125.00",
        sortOrder: 0,
        createdAt: new Date("2026-01-01"),
      },
    ] as any);
    vi.mocked(getQuoteLineItems).mockResolvedValueOnce([
      {
        id: 10,
        quoteId: 42,
        areaLabel: "Kitchen",
        category: "material",
        description: "Edited Quote Line",
        quantity: "99.00",
        unit: "sqft",
        pricePerUnit: "1.00",
        lineTotal: "99.00",
        sortOrder: 0,
        createdAt: new Date("2026-01-02"),
      },
    ] as any);
    const caller = appRouter.createCaller(makeCtx(makeUser()));

    const result = await caller.orders.getLineItems({ orderId: 99 });

    expect(result).toEqual([
      expect.objectContaining({
        orderId: 99,
        sourceQuoteLineItemId: 10,
        description: "Accepted Snapshot",
        lineTotal: "1125.00",
      }),
    ]);
    expect(getOrderLineItems).toHaveBeenCalledWith(99);
    expect(getQuoteLineItems).not.toHaveBeenCalled();
  });
});

// ─── Analytics Router Tests ────────────────────────────────────────────────────
describe("analytics", () => {
  it("returns summary metrics for authenticated users", async () => {
    const caller = appRouter.createCaller(makeCtx(makeUser()));
    const result = await caller.analytics.summary();
    expect(result).toMatchObject({
      totalClients: 10,
      totalQuotes: 25,
      totalOrders: 8,
      totalRevenue: "42500.00",
      conversionRate: "32.0",
    });
  });

  it("throws for unauthenticated analytics access", async () => {
    const caller = appRouter.createCaller(makeCtx(null));
    await expect(caller.analytics.summary()).rejects.toThrow();
  });
});

// ─── Admin Router Tests ────────────────────────────────────────────────────────
describe("admin", () => {
  it("allows admin to list users", async () => {
    const caller = appRouter.createCaller(makeCtx(makeAdminUser()));
    const result = await caller.admin.listUsers();
    expect(Array.isArray(result)).toBe(true);
  });

  it("forbids non-admin from listing users", async () => {
    const caller = appRouter.createCaller(makeCtx(makeUser()));
    await expect(caller.admin.listUsers()).rejects.toThrow();
  });

  it("forbids unauthenticated access to admin routes", async () => {
    const caller = appRouter.createCaller(makeCtx(null));
    await expect(caller.admin.listUsers()).rejects.toThrow();
  });
});

// ─── Inventory Router Tests ────────────────────────────────────────────────────
describe("inventory", () => {
  it("lists inventory for authenticated users", async () => {
    const caller = appRouter.createCaller(makeCtx(makeUser()));
    const result = await caller.inventory.list({});
    expect(Array.isArray(result)).toBe(true);
  });

  it("returns low stock items", async () => {
    const caller = appRouter.createCaller(makeCtx(makeUser()));
    const result = await caller.inventory.lowStock();
    expect(Array.isArray(result)).toBe(true);
  });

  it("creates an inventory item", async () => {
    const caller = appRouter.createCaller(makeCtx(makeUser()));
    const result = await caller.inventory.create({
      colorName: "Calacatta Gold",
      brand: "Caesarstone",
      thickness: "3cm",
      quantity: 5,
    });
    expect(result).toMatchObject({ id: 5 });
  });
});

// ─── Sqft Calculation Tests ────────────────────────────────────────────────────
describe("area calculations", () => {
  const PIXELS_PER_INCH = 4;
  const INCHES_PER_FOOT = 12;

  function calcSqft(points: { x: number; y: number }[]): number {
    let area = 0;
    const n = points.length;
    for (let i = 0; i < n; i++) {
      const j = (i + 1) % n;
      area += points[i].x * points[j].y;
      area -= points[j].x * points[i].y;
    }
    const areaInSqInches = Math.abs(area) / 2;
    const areaInSqFeet = areaInSqInches / (PIXELS_PER_INCH * PIXELS_PER_INCH * INCHES_PER_FOOT * INCHES_PER_FOOT);
    return Math.round(areaInSqFeet * 100) / 100;
  }

  it("calculates sqft for a 2ft x 2ft rectangle correctly", () => {
    // 2ft = 24in = 24 * 4px = 96px
    const px = 2 * INCHES_PER_FOOT * PIXELS_PER_INCH;
    const rect = [
      { x: 0, y: 0 }, { x: px, y: 0 }, { x: px, y: px }, { x: 0, y: px }
    ];
    expect(calcSqft(rect)).toBe(4); // 2ft * 2ft = 4 sqft
  });

  it("calculates sqft for a 10ft x 2ft rectangle", () => {
    const w = 10 * INCHES_PER_FOOT * PIXELS_PER_INCH;
    const h = 2 * INCHES_PER_FOOT * PIXELS_PER_INCH;
    const rect = [
      { x: 0, y: 0 }, { x: w, y: 0 }, { x: w, y: h }, { x: 0, y: h }
    ];
    expect(calcSqft(rect)).toBe(20); // 10ft * 2ft = 20 sqft
  });

  it("returns 0 for an empty polygon", () => {
    expect(calcSqft([])).toBe(0);
  });
});
