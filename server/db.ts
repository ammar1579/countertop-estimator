import { and, desc, eq, like, or, sql, asc } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  clients,
  inventory,
  orderLineItems,
  orders,
  payments,
  priceListItems,
  priceLists,
  quoteEmailLogs,
  quoteLineItems,
  quoteRevisions,
  quotes,
  users,
  type InsertClient,
  type InsertInventory,
  type InsertOrder,
  type InsertOrderLineItem,
  type InsertPayment,
  type InsertPriceList,
  type InsertPriceListItem,
  type InsertQuote,
  type InsertQuoteLineItem,
  type InsertUser,
} from "../drizzle/schema";
import { ENV } from "./_core/env";

let _db: ReturnType<typeof drizzle> | null = null;

type QuoteFinancialTotals = Pick<InsertQuote, "subtotal" | "taxAmount" | "totalAmount" | "totalSqft">;

type ConvertQuoteToOrderInput = {
  quoteId: number;
  fallbackSalespersonId: number;
  orderNumber: string;
};

export const ORDER_QUOTE_ID_UNIQUE_INDEX_NAME = "orders_quoteId_unique";

export const ORDER_QUOTE_ID_DUPLICATE_AUDIT_SQL = `
SELECT quoteId, COUNT(*) AS count
FROM orders
WHERE quoteId IS NOT NULL
GROUP BY quoteId
HAVING COUNT(*) > 1;
`.trim();

export type DuplicateOrderQuoteId = {
  quoteId: number;
  count: number;
};

export function isDuplicateOrderQuoteIdError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const candidate = error as { code?: unknown; errno?: unknown; sqlMessage?: unknown; message?: unknown };
  const isDuplicateKey = candidate.code === "ER_DUP_ENTRY" || candidate.errno === 1062;
  if (!isDuplicateKey) return false;

  const message = [candidate.sqlMessage, candidate.message]
    .filter((value): value is string => typeof value === "string")
    .join(" ");
  return message.includes(ORDER_QUOTE_ID_UNIQUE_INDEX_NAME);
}

export async function withOrderQuoteUniquenessFallback<T>(
  quoteId: number,
  createOrderAttempt: () => Promise<T>,
  loadExistingOrder: (quoteId: number) => Promise<T | undefined>,
): Promise<T> {
  try {
    return await createOrderAttempt();
  } catch (error) {
    if (!isDuplicateOrderQuoteIdError(error)) throw error;
    const existingOrder = await loadExistingOrder(quoteId);
    if (existingOrder) return existingOrder;
    throw error;
  }
}

export async function getDb() {
  if (!_db && ENV.databaseUrl) {
    try {
      _db = drizzle(ENV.databaseUrl);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

// ─── Users ────────────────────────────────────────────────────────────────────
export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) return;
  const values: InsertUser = { openId: user.openId };
  const updateSet: Record<string, unknown> = {};
  const textFields = ["name", "email", "loginMethod"] as const;
  textFields.forEach((field) => {
    const value = user[field];
    if (value === undefined) return;
    const normalized = value ?? null;
    values[field] = normalized;
    updateSet[field] = normalized;
  });
  if (user.lastSignedIn !== undefined) {
    values.lastSignedIn = user.lastSignedIn;
    updateSet.lastSignedIn = user.lastSignedIn;
  }
  if (user.role !== undefined) {
    values.role = user.role;
    updateSet.role = user.role;
  } else if (user.email && ENV.auth.adminEmails.includes(user.email.toLowerCase())) {
    values.role = "admin";
    updateSet.role = "admin";
  }
  if (!values.lastSignedIn) values.lastSignedIn = new Date();
  if (Object.keys(updateSet).length === 0) updateSet.lastSignedIn = new Date();
  await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
}

export async function countUsers(): Promise<number> {
  const db = await getDb();
  if (!db) return 0;
  const result = await db.select({ count: sql<number>`COUNT(*)` }).from(users);
  return Number(result[0]?.count ?? 0);
}

export async function createLocalUser(user: InsertUser) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  await db.insert(users).values(user);
  const created = await getUserByOpenId(user.openId);
  if (!created) throw new Error("Created user could not be loaded");
  return created;
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result[0];
}

export async function getUserById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return result[0];
}

export async function getUserByEmail(email: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.email, email)).limit(1);
  return result[0];
}

export async function getAllUsers() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(users).orderBy(asc(users.name));
}

export async function updateUserLastSignedIn(userId: number, lastSignedIn: Date) {
  const db = await getDb();
  if (!db) return;
  await db.update(users).set({ lastSignedIn }).where(eq(users.id, userId));
}

export async function updateUserRole(userId: number, role: "user" | "admin") {
  const db = await getDb();
  if (!db) return;
  await db.update(users).set({ role }).where(eq(users.id, userId));
}

// ─── Clients ─────────────────────────────────────────────────────────────────
export async function getClients(search?: string, leadSource?: string) {
  const db = await getDb();
  if (!db) return [];
  const conditions = [];
  if (search) {
    conditions.push(
      or(
        like(clients.firstName, `%${search}%`),
        like(clients.lastName, `%${search}%`),
        like(clients.email, `%${search}%`),
        like(clients.phone, `%${search}%`),
        like(clients.company, `%${search}%`)
      )
    );
  }
  if (leadSource) {
    conditions.push(eq(clients.leadSource, leadSource as any));
  }
  const query = db.select().from(clients).orderBy(desc(clients.createdAt));
  if (conditions.length > 0) {
    return query.where(and(...conditions));
  }
  return query;
}

export async function getClientById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(clients).where(eq(clients.id, id)).limit(1);
  return result[0];
}

export async function createClient(data: InsertClient) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  const result = await db.insert(clients).values(data);
  return result[0];
}

export async function updateClient(id: number, data: Partial<InsertClient>) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  await db.update(clients).set(data).where(eq(clients.id, id));
}

export async function deleteClient(id: number) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  await db.delete(clients).where(eq(clients.id, id));
}

// ─── Price Lists ──────────────────────────────────────────────────────────────
export async function getPriceLists() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(priceLists).where(eq(priceLists.isActive, true)).orderBy(asc(priceLists.name));
}

export async function getPriceListById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(priceLists).where(eq(priceLists.id, id)).limit(1);
  return result[0];
}

export async function getPriceListItems(priceListId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(priceListItems)
    .where(and(eq(priceListItems.priceListId, priceListId), eq(priceListItems.isActive, true)))
    .orderBy(asc(priceListItems.sortOrder));
}

export async function createPriceList(data: InsertPriceList) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  await db.insert(priceLists).values(data);
  const inserted = await db.select().from(priceLists).where(eq(priceLists.name, data.name)).orderBy(desc(priceLists.id)).limit(1);
  return inserted[0];
}

export async function updatePriceList(id: number, data: Partial<InsertPriceList>) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  await db.update(priceLists).set(data).where(eq(priceLists.id, id));
}

export async function createPriceListItem(data: InsertPriceListItem) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  const result = await db.insert(priceListItems).values(data);
  return result[0];
}

export async function updatePriceListItem(id: number, data: Partial<InsertPriceListItem>) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  await db.update(priceListItems).set(data).where(eq(priceListItems.id, id));
}

export async function deletePriceListItem(id: number) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  await db.update(priceListItems).set({ isActive: false }).where(eq(priceListItems.id, id));
}

// ─── Quotes ───────────────────────────────────────────────────────────────────
export async function getQuotes(filters?: { status?: string; clientId?: number; salespersonId?: number; search?: string }) {
  const db = await getDb();
  if (!db) return [];
  const conditions = [];
  if (filters?.status) conditions.push(eq(quotes.status, filters.status as any));
  if (filters?.clientId) conditions.push(eq(quotes.clientId, filters.clientId));
  if (filters?.salespersonId) conditions.push(eq(quotes.salespersonId, filters.salespersonId));
  if (filters?.search) {
    conditions.push(
      or(like(quotes.quoteNumber, `%${filters.search}%`), like(quotes.title, `%${filters.search}%`))
    );
  }
  const query = db
    .select({
      quote: quotes,
      client: clients,
      priceList: priceLists,
    })
    .from(quotes)
    .leftJoin(clients, eq(quotes.clientId, clients.id))
    .leftJoin(priceLists, eq(quotes.priceListId, priceLists.id))
    .orderBy(desc(quotes.createdAt));
  if (conditions.length > 0) return query.where(and(...conditions));
  return query;
}

export async function getQuoteById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db
    .select({ quote: quotes, client: clients, priceList: priceLists })
    .from(quotes)
    .leftJoin(clients, eq(quotes.clientId, clients.id))
    .leftJoin(priceLists, eq(quotes.priceListId, priceLists.id))
    .where(eq(quotes.id, id))
    .limit(1);
  return result[0];
}

export async function getQuoteLineItems(quoteId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(quoteLineItems)
    .where(eq(quoteLineItems.quoteId, quoteId))
    .orderBy(asc(quoteLineItems.sortOrder));
}

export async function getQuoteRevisions(quoteId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(quoteRevisions)
    .where(eq(quoteRevisions.quoteId, quoteId))
    .orderBy(desc(quoteRevisions.revision));
}

export async function getQuoteEmailLogs(quoteId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(quoteEmailLogs)
    .where(eq(quoteEmailLogs.quoteId, quoteId))
    .orderBy(desc(quoteEmailLogs.sentAt));
}

export async function generateQuoteNumber(): Promise<string> {
  const db = await getDb();
  if (!db) return `QQ-${Date.now()}`;
  const result = await db
    .select({ count: sql<number>`COUNT(*)` })
    .from(quotes);
  const count = (result[0]?.count ?? 0) + 1;
  const year = new Date().getFullYear();
  return `QQ-${year}-${String(count).padStart(4, "0")}`;
}

export async function createQuote(data: InsertQuote) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  await db.insert(quotes).values(data);
  const result = await db.select().from(quotes).where(eq(quotes.quoteNumber, data.quoteNumber!)).limit(1);
  return result[0];
}

export async function updateQuote(id: number, data: Partial<InsertQuote>) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  await db.update(quotes).set(data).where(eq(quotes.id, id));
}

export async function replaceQuoteLineItems(quoteId: number, items: InsertQuoteLineItem[]) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  await db.delete(quoteLineItems).where(eq(quoteLineItems.quoteId, quoteId));
  if (items.length > 0) {
    await db.insert(quoteLineItems).values(items);
  }
}

export async function saveQuoteLineItems(
  quoteId: number,
  items: InsertQuoteLineItem[],
  totals: QuoteFinancialTotals,
) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  await db.transaction(async (tx) => {
    await tx.delete(quoteLineItems).where(eq(quoteLineItems.quoteId, quoteId));
    if (items.length > 0) {
      await tx.insert(quoteLineItems).values(items);
    }
    await tx.update(quotes).set(totals).where(eq(quotes.id, quoteId));
  });
}

export async function saveQuoteRevision(quoteId: number, revision: number, changedBy: number | null, changeNote: string, snapshotData: unknown) {
  const db = await getDb();
  if (!db) return;
  await db.insert(quoteRevisions).values({ quoteId, revision, changedBy, changeNote, snapshotData });
}

export async function logQuoteEmail(data: typeof quoteEmailLogs.$inferInsert) {
  const db = await getDb();
  if (!db) return;
  await db.insert(quoteEmailLogs).values(data);
}

// ─── Orders ───────────────────────────────────────────────────────────────────
export async function generateOrderNumber(): Promise<string> {
  const db = await getDb();
  if (!db) return `ORD-${Date.now()}`;
  const result = await db.select({ count: sql<number>`COUNT(*)` }).from(orders);
  const count = (result[0]?.count ?? 0) + 1;
  const year = new Date().getFullYear();
  return `ORD-${year}-${String(count).padStart(4, "0")}`;
}

export async function getOrders(filters?: { projectStatus?: string; paymentStatus?: string; clientId?: number }) {
  const db = await getDb();
  if (!db) return [];
  const conditions = [];
  if (filters?.projectStatus) conditions.push(eq(orders.projectStatus, filters.projectStatus as any));
  if (filters?.paymentStatus) conditions.push(eq(orders.paymentStatus, filters.paymentStatus as any));
  if (filters?.clientId) conditions.push(eq(orders.clientId, filters.clientId));
  const query = db
    .select({ order: orders, client: clients, priceList: priceLists })
    .from(orders)
    .leftJoin(clients, eq(orders.clientId, clients.id))
    .leftJoin(priceLists, eq(orders.priceListId, priceLists.id))
    .orderBy(desc(orders.createdAt));
  if (conditions.length > 0) return query.where(and(...conditions));
  return query;
}

export async function getOrderById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db
    .select({ order: orders, client: clients, priceList: priceLists, quote: quotes })
    .from(orders)
    .leftJoin(clients, eq(orders.clientId, clients.id))
    .leftJoin(priceLists, eq(orders.priceListId, priceLists.id))
    .leftJoin(quotes, eq(orders.quoteId, quotes.id))
    .where(eq(orders.id, id))
    .limit(1);
  return result[0];
}

export async function getOrderByQuoteId(quoteId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(orders).where(eq(orders.quoteId, quoteId)).limit(1);
  return result[0];
}

export async function getDuplicateOrderQuoteIds(): Promise<DuplicateOrderQuoteId[]> {
  const db = await getDb();
  if (!db) return [];
  return db
    .select({
      quoteId: orders.quoteId,
      count: sql<number>`COUNT(*)`,
    })
    .from(orders)
    .where(sql`${orders.quoteId} IS NOT NULL`)
    .groupBy(orders.quoteId)
    .having(sql`COUNT(*) > 1`);
}

export async function createOrder(data: InsertOrder) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  await db.insert(orders).values(data);
  const result = await db.select().from(orders).where(eq(orders.orderNumber, data.orderNumber!)).limit(1);
  return result[0];
}

export function buildOrderLineItemSnapshots(
  orderId: number,
  items: Array<typeof quoteLineItems.$inferSelect>,
): InsertOrderLineItem[] {
  return items.map((item) => ({
    orderId,
    sourceQuoteLineItemId: item.id,
    areaLabel: item.areaLabel,
    priceListItemId: item.priceListItemId,
    category: item.category,
    description: item.description,
    quantity: item.quantity,
    unit: item.unit,
    pricePerUnit: item.pricePerUnit,
    lineTotal: item.lineTotal,
    sortOrder: item.sortOrder,
  }));
}

export async function convertQuoteToOrder({
  quoteId,
  fallbackSalespersonId,
  orderNumber,
}: ConvertQuoteToOrderInput) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");

  return withOrderQuoteUniquenessFallback(
    quoteId,
    () =>
      db.transaction(async (tx) => {
        const existingOrder = await tx.select().from(orders).where(eq(orders.quoteId, quoteId)).limit(1);
        if (existingOrder[0]) return existingOrder[0];

        const quoteResult = await tx.select().from(quotes).where(eq(quotes.id, quoteId)).limit(1);
        const quote = quoteResult[0];
        if (!quote) throw new Error("QUOTE_NOT_FOUND");

        await tx.insert(orders).values({
          orderNumber,
          quoteId: quote.id,
          clientId: quote.clientId,
          salespersonId: quote.salespersonId ?? fallbackSalespersonId,
          title: quote.title,
          priceListId: quote.priceListId,
          totalSqft: quote.totalSqft ?? "0.00",
          subtotal: quote.subtotal ?? "0.00",
          taxAmount: quote.taxAmount ?? "0.00",
          totalAmount: quote.totalAmount ?? "0.00",
          projectStatus: "Pending",
          paymentStatus: "Unpaid",
        });

        const createdOrder = await tx.select().from(orders).where(eq(orders.orderNumber, orderNumber)).limit(1);
        const order = createdOrder[0];
        if (!order) throw new Error("Created order could not be loaded");

        const quoteItems = await tx
          .select()
          .from(quoteLineItems)
          .where(eq(quoteLineItems.quoteId, quoteId))
          .orderBy(asc(quoteLineItems.sortOrder));
        const snapshotItems = buildOrderLineItemSnapshots(order.id, quoteItems);
        if (snapshotItems.length > 0) {
          await tx.insert(orderLineItems).values(snapshotItems);
        }

        await tx.update(quotes).set({ status: "Active" }).where(eq(quotes.id, quoteId));

        return order;
      }),
    async (existingQuoteId) => {
      const existingOrder = await db.select().from(orders).where(eq(orders.quoteId, existingQuoteId)).limit(1);
      return existingOrder[0];
    },
  );
}

export async function getOrderLineItems(orderId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(orderLineItems)
    .where(eq(orderLineItems.orderId, orderId))
    .orderBy(asc(orderLineItems.sortOrder));
}

export async function updateOrder(id: number, data: Partial<InsertOrder>) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  await db.update(orders).set(data).where(eq(orders.id, id));
}

export async function getOrderPayments(orderId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(payments).where(eq(payments.orderId, orderId)).orderBy(desc(payments.paidAt));
}

export async function createPayment(data: InsertPayment) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  await db.insert(payments).values(data);
}

// ─── Inventory ────────────────────────────────────────────────────────────────
export async function getInventory(search?: string) {
  const db = await getDb();
  if (!db) return [];
  const query = db.select().from(inventory);
  if (search) {
    return query.where(or(like(inventory.colorName, `%${search}%`), like(inventory.brand, `%${search}%`))).orderBy(asc(inventory.brand), asc(inventory.colorName));
  }
  return query.orderBy(asc(inventory.brand), asc(inventory.colorName));
}

export async function getLowStockInventory() {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(inventory)
    .where(sql`${inventory.quantity} <= ${inventory.lowStockThreshold}`)
    .orderBy(asc(inventory.quantity));
}

export async function createInventoryItem(data: InsertInventory) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  await db.insert(inventory).values(data);
}

export async function updateInventoryItem(id: number, data: Partial<InsertInventory>) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  await db.update(inventory).set(data).where(eq(inventory.id, id));
}

export async function deleteInventoryItem(id: number) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  await db.delete(inventory).where(eq(inventory.id, id));
}

// ─── Analytics ────────────────────────────────────────────────────────────────
export async function getAnalyticsSummary() {
  const db = await getDb();
  if (!db) return null;

  const [totalQuotes] = await db.select({ count: sql<number>`COUNT(*)` }).from(quotes);
  const [activeQuotes] = await db.select({ count: sql<number>`COUNT(*)` }).from(quotes).where(eq(quotes.status, "Active"));
  const [draftQuotes] = await db.select({ count: sql<number>`COUNT(*)` }).from(quotes).where(eq(quotes.status, "Draft"));
  const [totalOrders] = await db.select({ count: sql<number>`COUNT(*)` }).from(orders);
  const [totalRevenue] = await db.select({ total: sql<string>`COALESCE(SUM(totalAmount), 0)` }).from(orders);
  const [pipelineValue] = await db
    .select({ total: sql<string>`COALESCE(SUM(totalAmount), 0)` })
    .from(quotes)
    .where(or(eq(quotes.status, "Active"), eq(quotes.status, "Draft")));
  const [totalClients] = await db.select({ count: sql<number>`COUNT(*)` }).from(clients);
  const [lowStockCount] = await db
    .select({ count: sql<number>`COUNT(*)` })
    .from(inventory)
    .where(sql`${inventory.quantity} <= ${inventory.lowStockThreshold}`);

  const conversionRate =
    totalQuotes.count > 0 ? ((totalOrders.count / totalQuotes.count) * 100).toFixed(1) : "0.0";

  return {
    totalQuotes: totalQuotes.count,
    activeQuotes: activeQuotes.count,
    draftQuotes: draftQuotes.count,
    totalOrders: totalOrders.count,
    totalRevenue: parseFloat(totalRevenue.total),
    pipelineValue: parseFloat(pipelineValue.total),
    totalClients: totalClients.count,
    lowStockCount: lowStockCount.count,
    conversionRate,
  };
}

export async function getRevenueByMonth() {
  const db = await getDb();
  if (!db) return [];
  return db
    .select({
      month: sql<string>`DATE_FORMAT(saleDate, '%Y-%m')`,
      revenue: sql<string>`COALESCE(SUM(totalAmount), 0)`,
      orderCount: sql<number>`COUNT(*)`,
    })
    .from(orders)
    .groupBy(sql`DATE_FORMAT(saleDate, '%Y-%m')`)
    .orderBy(sql`DATE_FORMAT(saleDate, '%Y-%m')`)
    .limit(12);
}

export async function getSalespersonMetrics() {
  const db = await getDb();
  if (!db) return [];
  return db
    .select({
      salespersonId: orders.salespersonId,
      name: users.name,
      totalOrders: sql<number>`COUNT(${orders.id})`,
      totalRevenue: sql<string>`COALESCE(SUM(${orders.totalAmount}), 0)`,
      totalSqft: sql<string>`COALESCE(SUM(${orders.totalSqft}), 0)`,
    })
    .from(orders)
    .leftJoin(users, eq(orders.salespersonId, users.id))
    .groupBy(orders.salespersonId, users.name)
    .orderBy(desc(sql`SUM(${orders.totalAmount})`));
}

export async function getQuotesByStatus() {
  const db = await getDb();
  if (!db) return [];
  return db
    .select({
      status: quotes.status,
      count: sql<number>`COUNT(*)`,
      totalValue: sql<string>`COALESCE(SUM(totalAmount), 0)`,
    })
    .from(quotes)
    .groupBy(quotes.status);
}

export async function getOrdersByStatus() {
  const db = await getDb();
  if (!db) return [];
  return db
    .select({
      projectStatus: orders.projectStatus,
      count: sql<number>`COUNT(*)`,
      totalValue: sql<string>`COALESCE(SUM(${orders.totalAmount}), 0)`,
    })
    .from(orders)
    .groupBy(orders.projectStatus);
}

export async function getClientQuotes(clientId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select({ quote: quotes, priceList: priceLists })
    .from(quotes)
    .leftJoin(priceLists, eq(quotes.priceListId, priceLists.id))
    .where(eq(quotes.clientId, clientId))
    .orderBy(desc(quotes.createdAt));
}

export async function getClientOrders(clientId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select({ order: orders, priceList: priceLists })
    .from(orders)
    .leftJoin(priceLists, eq(orders.priceListId, priceLists.id))
    .where(eq(orders.clientId, clientId))
    .orderBy(desc(orders.createdAt));
}
