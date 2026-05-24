import {
  int,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  varchar,
  decimal,
  boolean,
  json,
  uniqueIndex,
} from "drizzle-orm/mysql-core";

// ─── Users ───────────────────────────────────────────────────────────────────
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }).unique(),
  passwordHash: varchar("passwordHash", { length: 255 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// ─── Clients ─────────────────────────────────────────────────────────────────
export const clients = mysqlTable("clients", {
  id: int("id").autoincrement().primaryKey(),
  firstName: varchar("firstName", { length: 100 }).notNull(),
  lastName: varchar("lastName", { length: 100 }).notNull(),
  email: varchar("email", { length: 320 }),
  phone: varchar("phone", { length: 30 }),
  address: text("address"),
  city: varchar("city", { length: 100 }),
  province: varchar("province", { length: 50 }).default("Ontario"),
  postalCode: varchar("postalCode", { length: 10 }),
  company: varchar("company", { length: 200 }),
  leadSource: mysqlEnum("leadSource", ["Website", "Phone", "Referral", "Walk-in", "Other"]).default("Other"),
  notes: text("notes"),
  createdBy: int("createdBy"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Client = typeof clients.$inferSelect;
export type InsertClient = typeof clients.$inferInsert;

// ─── Price Lists ──────────────────────────────────────────────────────────────
export const priceLists = mysqlTable("priceLists", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  description: text("description"),
  revision: int("revision").default(1).notNull(),
  isActive: boolean("isActive").default(true).notNull(),
  wasteFactor: decimal("wasteFactor", { precision: 5, scale: 4 }).default("0.0800"),
  taxRate: decimal("taxRate", { precision: 5, scale: 4 }).default("0.1300"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type PriceList = typeof priceLists.$inferSelect;
export type InsertPriceList = typeof priceLists.$inferInsert;

// ─── Price List Items (materials, edges, accessories, fixtures) ───────────────
export const priceListItems = mysqlTable("priceListItems", {
  id: int("id").autoincrement().primaryKey(),
  priceListId: int("priceListId").notNull(),
  category: mysqlEnum("category", ["material", "edge", "splash", "accessory", "fixture"]).notNull(),
  name: varchar("name", { length: 200 }).notNull(),
  description: text("description"),
  brand: varchar("brand", { length: 100 }),
  colorCode: varchar("colorCode", { length: 50 }),
  unit: mysqlEnum("unit", ["sqft", "linft", "each"]).notNull(),
  pricePerUnit: decimal("pricePerUnit", { precision: 10, scale: 2 }).notNull(),
  isActive: boolean("isActive").default(true).notNull(),
  sortOrder: int("sortOrder").default(0),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type PriceListItem = typeof priceListItems.$inferSelect;
export type InsertPriceListItem = typeof priceListItems.$inferInsert;

// ─── Quotes ───────────────────────────────────────────────────────────────────
export const quotes = mysqlTable("quotes", {
  id: int("id").autoincrement().primaryKey(),
  quoteNumber: varchar("quoteNumber", { length: 30 }).notNull().unique(),
  clientId: int("clientId").notNull(),
  priceListId: int("priceListId").notNull(),
  salespersonId: int("salespersonId"),
  status: mysqlEnum("status", ["Draft", "Active", "Expired"]).default("Draft").notNull(),
  revision: int("revision").default(1).notNull(),
  title: varchar("title", { length: 300 }).notNull(),
  notes: text("notes"),
  internalNotes: text("internalNotes"),
  paymentTerms: varchar("paymentTerms", { length: 100 }).default("No Deposit"),
  expiresAt: timestamp("expiresAt"),
  sentAt: timestamp("sentAt"),
  lastViewedAt: timestamp("lastViewedAt"),
  viewCount: int("viewCount").default(0),
  signatureData: text("signatureData"),
  signedAt: timestamp("signedAt"),
  canvasData: json("canvasData"),
  subtotal: decimal("subtotal", { precision: 10, scale: 2 }).default("0.00"),
  taxAmount: decimal("taxAmount", { precision: 10, scale: 2 }).default("0.00"),
  totalAmount: decimal("totalAmount", { precision: 10, scale: 2 }).default("0.00"),
  totalSqft: decimal("totalSqft", { precision: 10, scale: 2 }).default("0.00"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Quote = typeof quotes.$inferSelect;
export type InsertQuote = typeof quotes.$inferInsert;

// ─── Quote Line Items ─────────────────────────────────────────────────────────
export const quoteLineItems = mysqlTable("quoteLineItems", {
  id: int("id").autoincrement().primaryKey(),
  quoteId: int("quoteId").notNull(),
  areaLabel: varchar("areaLabel", { length: 100 }).default("Area #1"),
  priceListItemId: int("priceListItemId"),
  category: mysqlEnum("category", ["material", "edge", "splash", "accessory", "fixture"]).notNull(),
  description: varchar("description", { length: 300 }).notNull(),
  quantity: decimal("quantity", { precision: 10, scale: 2 }).notNull(),
  unit: mysqlEnum("unit", ["sqft", "linft", "each"]).notNull(),
  pricePerUnit: decimal("pricePerUnit", { precision: 10, scale: 2 }).notNull(),
  lineTotal: decimal("lineTotal", { precision: 10, scale: 2 }).notNull(),
  sortOrder: int("sortOrder").default(0),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type QuoteLineItem = typeof quoteLineItems.$inferSelect;
export type InsertQuoteLineItem = typeof quoteLineItems.$inferInsert;

// ─── Quote Revisions (change log) ─────────────────────────────────────────────
export const quoteRevisions = mysqlTable("quoteRevisions", {
  id: int("id").autoincrement().primaryKey(),
  quoteId: int("quoteId").notNull(),
  revision: int("revision").notNull(),
  changedBy: int("changedBy"),
  changeNote: text("changeNote"),
  snapshotData: json("snapshotData"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type QuoteRevision = typeof quoteRevisions.$inferSelect;

// ─── Quote Email Tracking ─────────────────────────────────────────────────────
export const quoteEmailLogs = mysqlTable("quoteEmailLogs", {
  id: int("id").autoincrement().primaryKey(),
  quoteId: int("quoteId").notNull(),
  sentBy: int("sentBy"),
  sentTo: varchar("sentTo", { length: 320 }).notNull(),
  subject: varchar("subject", { length: 300 }),
  revision: int("revision").notNull(),
  viewCount: int("viewCount").default(0),
  lastViewedAt: timestamp("lastViewedAt"),
  sentAt: timestamp("sentAt").defaultNow().notNull(),
});

export type QuoteEmailLog = typeof quoteEmailLogs.$inferSelect;

// ─── Orders ───────────────────────────────────────────────────────────────────
export const orders = mysqlTable("orders", {
  id: int("id").autoincrement().primaryKey(),
  orderNumber: varchar("orderNumber", { length: 30 }).notNull().unique(),
  quoteId: int("quoteId").notNull(),
  clientId: int("clientId").notNull(),
  salespersonId: int("salespersonId"),
  title: varchar("title", { length: 300 }).notNull(),
  projectStatus: mysqlEnum("projectStatus", ["Pending", "In Progress", "Completed", "Invoiced"]).default("Pending").notNull(),
  paymentStatus: mysqlEnum("paymentStatus", ["Unpaid", "Partial", "Paid"]).default("Unpaid").notNull(),
  priceListId: int("priceListId"),
  totalSqft: decimal("totalSqft", { precision: 10, scale: 2 }).default("0.00"),
  subtotal: decimal("subtotal", { precision: 10, scale: 2 }).default("0.00"),
  taxAmount: decimal("taxAmount", { precision: 10, scale: 2 }).default("0.00"),
  totalAmount: decimal("totalAmount", { precision: 10, scale: 2 }).default("0.00"),
  amountPaid: decimal("amountPaid", { precision: 10, scale: 2 }).default("0.00"),
  notes: text("notes"),
  scheduledDate: timestamp("scheduledDate"),
  completedAt: timestamp("completedAt"),
  invoicedAt: timestamp("invoicedAt"),
  saleDate: timestamp("saleDate").defaultNow().notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => [
  uniqueIndex("orders_quoteId_unique").on(table.quoteId),
]);

export type Order = typeof orders.$inferSelect;
export type InsertOrder = typeof orders.$inferInsert;

// ─── Order Line Item Snapshots ───────────────────────────────────────────────
export const orderLineItems = mysqlTable("orderLineItems", {
  id: int("id").autoincrement().primaryKey(),
  orderId: int("orderId").notNull(),
  sourceQuoteLineItemId: int("sourceQuoteLineItemId"),
  areaLabel: varchar("areaLabel", { length: 100 }).default("Area #1"),
  priceListItemId: int("priceListItemId"),
  category: mysqlEnum("category", ["material", "edge", "splash", "accessory", "fixture"]).notNull(),
  description: varchar("description", { length: 300 }).notNull(),
  quantity: decimal("quantity", { precision: 10, scale: 2 }).notNull(),
  unit: mysqlEnum("unit", ["sqft", "linft", "each"]).notNull(),
  pricePerUnit: decimal("pricePerUnit", { precision: 10, scale: 2 }).notNull(),
  lineTotal: decimal("lineTotal", { precision: 10, scale: 2 }).notNull(),
  sortOrder: int("sortOrder").default(0),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type OrderLineItem = typeof orderLineItems.$inferSelect;
export type InsertOrderLineItem = typeof orderLineItems.$inferInsert;

// ─── Payments ─────────────────────────────────────────────────────────────────
export const payments = mysqlTable("payments", {
  id: int("id").autoincrement().primaryKey(),
  orderId: int("orderId").notNull(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  method: mysqlEnum("method", ["Cash", "Cheque", "Credit Card", "E-Transfer", "Other"]).default("Other"),
  reference: varchar("reference", { length: 100 }),
  notes: text("notes"),
  paidAt: timestamp("paidAt").defaultNow().notNull(),
  recordedBy: int("recordedBy"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Payment = typeof payments.$inferSelect;
export type InsertPayment = typeof payments.$inferInsert;

// ─── Inventory ────────────────────────────────────────────────────────────────
export const inventory = mysqlTable("inventory", {
  id: int("id").autoincrement().primaryKey(),
  colorName: varchar("colorName", { length: 200 }).notNull(),
  brand: varchar("brand", { length: 100 }),
  thickness: varchar("thickness", { length: 20 }).default("3cm"),
  finish: varchar("finish", { length: 50 }).default("Polished"),
  slabWidth: decimal("slabWidth", { precision: 8, scale: 2 }),
  slabHeight: decimal("slabHeight", { precision: 8, scale: 2 }),
  quantity: int("quantity").default(0).notNull(),
  location: varchar("location", { length: 100 }),
  costPerSqft: decimal("costPerSqft", { precision: 10, scale: 2 }),
  lowStockThreshold: int("lowStockThreshold").default(2),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Inventory = typeof inventory.$inferSelect;
export type InsertInventory = typeof inventory.$inferInsert;
