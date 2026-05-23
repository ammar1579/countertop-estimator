import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { COOKIE_NAME } from "@shared/const";
import {
  loginWithPassword,
  registerWithPassword,
  setSessionCookie,
} from "./_core/auth";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import { calculateQuoteTotals } from "./pricing";
import {
  createClient,
  createInventoryItem,
  createOrder,
  createPayment,
  createPriceList,
  createPriceListItem,
  createQuote,
  deleteClient,
  deleteInventoryItem,
  deletePriceListItem,
  generateOrderNumber,
  generateQuoteNumber,
  getAllUsers,
  getAnalyticsSummary,
  getClientById,
  getClientOrders,
  getClientQuotes,
  getClients,
  getInventory,
  getLowStockInventory,
  getOrderById,
  getOrderPayments,
  getOrders,
  getPriceListById,
  getPriceListItems,
  getPriceLists,
  getQuotes,
  getQuoteById,
  getQuoteEmailLogs,
  getQuoteLineItems,
  getQuoteRevisions,
  getQuotesByStatus,
  getOrdersByStatus,
  getRevenueByMonth,
  getSalespersonMetrics,
  logQuoteEmail,
  saveQuoteLineItems,
  saveQuoteRevision,
  updateClient,
  updateInventoryItem,
  updateOrder,
  updatePriceList,
  updatePriceListItem,
  updateQuote,
  updateUserRole,
} from "./db";

// Admin guard middleware
const adminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== "admin") {
    throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
  }
  return next({ ctx });
});

export const appRouter = router({
  system: systemRouter,

  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    register: publicProcedure
      .input(
        z.object({
          name: z.string().trim().min(1).max(120),
          email: z.string().trim().email().max(320),
          password: z.string().min(12).max(128),
        }),
      )
      .mutation(async ({ input, ctx }) => {
        const user = await registerWithPassword(input);
        await setSessionCookie(ctx.req, ctx.res, user);
        return { user } as const;
      }),
    login: publicProcedure
      .input(
        z.object({
          email: z.string().trim().email().max(320),
          password: z.string().min(1).max(128),
        }),
      )
      .mutation(async ({ input, ctx }) => {
        const user = await loginWithPassword(input);
        await setSessionCookie(ctx.req, ctx.res, user);
        return { user } as const;
      }),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),

  // ─── Clients ───────────────────────────────────────────────────────────────
  clients: router({
    list: protectedProcedure
      .input(z.object({ search: z.string().optional(), leadSource: z.string().optional() }).optional())
      .query(({ input }) => getClients(input?.search, input?.leadSource)),

    getById: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(({ input }) => getClientById(input.id)),

    getQuotes: protectedProcedure
      .input(z.object({ clientId: z.number() }))
      .query(({ input }) => getClientQuotes(input.clientId)),

    getOrders: protectedProcedure
      .input(z.object({ clientId: z.number() }))
      .query(({ input }) => getClientOrders(input.clientId)),

    create: protectedProcedure
      .input(
        z.object({
          firstName: z.string().min(1),
          lastName: z.string().min(1),
          email: z.string().email().optional().or(z.literal("")),
          phone: z.string().optional(),
          address: z.string().optional(),
          city: z.string().optional(),
          province: z.string().optional(),
          postalCode: z.string().optional(),
          company: z.string().optional(),
          leadSource: z.enum(["Website", "Phone", "Referral", "Walk-in", "Other"]).optional(),
          notes: z.string().optional(),
        })
      )
      .mutation(({ input, ctx }) =>
        createClient({ ...input, createdBy: ctx.user.id, email: input.email || null })
      ),

    update: protectedProcedure
      .input(
        z.object({
          id: z.number(),
          firstName: z.string().min(1).optional(),
          lastName: z.string().min(1).optional(),
          email: z.string().email().optional().or(z.literal("")),
          phone: z.string().optional(),
          address: z.string().optional(),
          city: z.string().optional(),
          province: z.string().optional(),
          postalCode: z.string().optional(),
          company: z.string().optional(),
          leadSource: z.enum(["Website", "Phone", "Referral", "Walk-in", "Other"]).optional(),
          notes: z.string().optional(),
        })
      )
      .mutation(({ input }) => {
        const { id, ...data } = input;
        return updateClient(id, { ...data, email: data.email || null });
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(({ input }) => deleteClient(input.id)),
  }),

  // ─── Price Lists ───────────────────────────────────────────────────────────
  priceLists: router({
    list: protectedProcedure.query(() => getPriceLists()),

    getById: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(({ input }) => getPriceListById(input.id)),

    getItems: protectedProcedure
      .input(z.object({ priceListId: z.number() }))
      .query(({ input }) => getPriceListItems(input.priceListId)),

    create: adminProcedure
      .input(
        z.object({
          name: z.string().min(1),
          description: z.string().optional(),
          wasteFactor: z.string().optional(),
          taxRate: z.string().optional(),
        })
      )
      .mutation(({ input }) => createPriceList({ ...input, revision: 1, isActive: true })),

    update: adminProcedure
      .input(
        z.object({
          id: z.number(),
          name: z.string().optional(),
          description: z.string().optional(),
          wasteFactor: z.string().optional(),
          taxRate: z.string().optional(),
          isActive: z.boolean().optional(),
        })
      )
      .mutation(({ input }) => {
        const { id, ...data } = input;
        return updatePriceList(id, data);
      }),

    createItem: adminProcedure
      .input(
        z.object({
          priceListId: z.number(),
          category: z.enum(["material", "edge", "splash", "accessory", "fixture"]),
          name: z.string().min(1),
          description: z.string().optional(),
          brand: z.string().optional(),
          colorCode: z.string().optional(),
          unit: z.enum(["sqft", "linft", "each"]),
          pricePerUnit: z.string(),
          sortOrder: z.number().optional(),
        })
      )
      .mutation(({ input }) => createPriceListItem({ ...input, isActive: true })),

    updateItem: adminProcedure
      .input(
        z.object({
          id: z.number(),
          name: z.string().optional(),
          description: z.string().optional(),
          brand: z.string().optional(),
          pricePerUnit: z.string().optional(),
          isActive: z.boolean().optional(),
        })
      )
      .mutation(({ input }) => {
        const { id, ...data } = input;
        return updatePriceListItem(id, data);
      }),

    deleteItem: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(({ input }) => deletePriceListItem(input.id)),
  }),

  // ─── Quotes ────────────────────────────────────────────────────────────────
  quotes: router({
    list: protectedProcedure
      .input(
        z.object({
          status: z.enum(["Draft", "Active", "Expired"]).optional(),
          clientId: z.number().optional(),
          salespersonId: z.number().optional(),
          search: z.string().optional(),
        }).optional()
      )
      .query(({ input }) => getQuotes(input)),

    getById: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(({ input }) => getQuoteById(input.id)),

    getLineItems: protectedProcedure
      .input(z.object({ quoteId: z.number() }))
      .query(({ input }) => getQuoteLineItems(input.quoteId)),

    getRevisions: protectedProcedure
      .input(z.object({ quoteId: z.number() }))
      .query(({ input }) => getQuoteRevisions(input.quoteId)),

    getEmailLogs: protectedProcedure
      .input(z.object({ quoteId: z.number() }))
      .query(({ input }) => getQuoteEmailLogs(input.quoteId)),

    create: protectedProcedure
      .input(
        z.object({
          clientId: z.number(),
          priceListId: z.number(),
          title: z.string().min(1),
          notes: z.string().optional(),
          internalNotes: z.string().optional(),
          paymentTerms: z.string().optional(),
          expiresAt: z.date().optional(),
          canvasData: z.any().optional(),
          status: z.enum(["Draft", "Active"]).optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const quoteNumber = await generateQuoteNumber();
        const expiresAt = input.expiresAt ?? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
        const { status, ...data } = input;
        return createQuote({
          ...data,
          quoteNumber,
          salespersonId: ctx.user.id,
          status: status ?? "Draft",
          revision: 1,
          expiresAt,
        });
      }),

    update: protectedProcedure
      .input(
        z.object({
          id: z.number(),
          title: z.string().optional(),
          status: z.enum(["Draft", "Active", "Expired"]).optional(),
          notes: z.string().optional(),
          internalNotes: z.string().optional(),
          paymentTerms: z.string().optional(),
          expiresAt: z.date().optional(),
          canvasData: z.any().optional(),
          signatureData: z.string().optional(),
          signedAt: z.date().optional(),
          priceListId: z.number().optional(),
        })
      )
      .mutation(({ input }) => {
        const { id, ...data } = input;
        return updateQuote(id, data);
      }),

    saveLineItems: protectedProcedure
      .input(
        z.object({
          quoteId: z.number(),
          items: z.array(
            z.object({
              areaLabel: z.string().optional(),
              priceListItemId: z.number().optional(),
              category: z.enum(["material", "edge", "splash", "accessory", "fixture"]),
              description: z.string(),
              quantity: z.string(),
              unit: z.enum(["sqft", "linft", "each"]),
              pricePerUnit: z.string(),
              lineTotal: z.string(),
              sortOrder: z.number().optional(),
            })
          ),
        })
      )
      .mutation(async ({ input }) => {
        const quoteData = await getQuoteById(input.quoteId);
        if (!quoteData) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Quote not found" });
        }

        const totals = calculateQuoteTotals(
          input.items.map((item, i) => ({
            ...item,
            quoteId: input.quoteId,
            sortOrder: item.sortOrder ?? i,
          })),
          quoteData.priceList?.taxRate ?? "0.1300",
        );

        await saveQuoteLineItems(
          input.quoteId,
          totals.items.map((item) => ({
            ...item,
            quoteId: input.quoteId,
          })),
          {
            subtotal: totals.subtotal,
            taxAmount: totals.taxAmount,
            totalAmount: totals.totalAmount,
            totalSqft: totals.totalSqft,
          },
        );

        return totals;
      }),

    saveRevision: protectedProcedure
      .input(
        z.object({
          quoteId: z.number(),
          revision: z.number(),
          changeNote: z.string().optional(),
          snapshotData: z.any().optional(),
        })
      )
      .mutation(({ input, ctx }) =>
        saveQuoteRevision(
          input.quoteId,
          input.revision,
          ctx.user.id,
          input.changeNote ?? "Quote updated",
          input.snapshotData
        )
      ),

    logEmail: protectedProcedure
      .input(
        z.object({
          quoteId: z.number(),
          sentTo: z.string().email(),
          subject: z.string().optional(),
          revision: z.number(),
        })
      )
      .mutation(({ input, ctx }) =>
        logQuoteEmail({ ...input, sentBy: ctx.user.id })
      ),

    convertToOrder: protectedProcedure
      .input(z.object({ quoteId: z.number() }))
      .mutation(async ({ input, ctx }) => {
        const quoteData = await getQuoteById(input.quoteId);
        if (!quoteData) throw new TRPCError({ code: "NOT_FOUND", message: "Quote not found" });
        const { quote } = quoteData;
        const orderNumber = await generateOrderNumber();
        const order = await createOrder({
          orderNumber,
          quoteId: quote.id,
          clientId: quote.clientId,
          salespersonId: quote.salespersonId ?? ctx.user.id,
          title: quote.title,
          priceListId: quote.priceListId,
          totalSqft: quote.totalSqft ?? "0.00",
          subtotal: quote.subtotal ?? "0.00",
          taxAmount: quote.taxAmount ?? "0.00",
          totalAmount: quote.totalAmount ?? "0.00",
          projectStatus: "Pending",
          paymentStatus: "Unpaid",
        });
        await updateQuote(quote.id, { status: "Active" });
        return order;
      }),
  }),

  // ─── Orders ────────────────────────────────────────────────────────────────
  orders: router({
    list: protectedProcedure
      .input(
        z.object({
          projectStatus: z.enum(["Pending", "In Progress", "Completed", "Invoiced"]).optional(),
          paymentStatus: z.enum(["Unpaid", "Partial", "Paid"]).optional(),
          clientId: z.number().optional(),
        }).optional()
      )
      .query(({ input }) => getOrders(input)),

    getById: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(({ input }) => getOrderById(input.id)),

    getPayments: protectedProcedure
      .input(z.object({ orderId: z.number() }))
      .query(({ input }) => getOrderPayments(input.orderId)),

    getLineItems: protectedProcedure
      .input(z.object({ orderId: z.number() }))
      .query(async ({ input }) => {
        // Orders share line items with their source quote
        const orderData = await getOrderById(input.orderId);
        if (!orderData) return [];
        return getQuoteLineItems(orderData.order.quoteId);
      }),

    update: protectedProcedure
      .input(
        z.object({
          id: z.number(),
          projectStatus: z.enum(["Pending", "In Progress", "Completed", "Invoiced"]).optional(),
          paymentStatus: z.enum(["Unpaid", "Partial", "Paid"]).optional(),
          notes: z.string().optional(),
          scheduledDate: z.date().optional(),
          completedAt: z.date().optional(),
          invoicedAt: z.date().optional(),
        })
      )
      .mutation(({ input }) => {
        const { id, ...data } = input;
        return updateOrder(id, data);
      }),

    addPayment: protectedProcedure
      .input(
        z.object({
          orderId: z.number(),
          amount: z.string(),
          method: z.enum(["Cash", "Cheque", "Credit Card", "E-Transfer", "Other"]).optional(),
          reference: z.string().optional(),
          notes: z.string().optional(),
          paidAt: z.date().optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        await createPayment({ ...input, recordedBy: ctx.user.id, paidAt: input.paidAt ?? new Date() });
        // Recalculate payment status
        const allPayments = await getOrderPayments(input.orderId);
        const orderData = await getOrderById(input.orderId);
        if (orderData) {
          const totalPaid = allPayments.reduce((sum, p) => sum + parseFloat(p.amount), 0);
          const totalAmount = parseFloat(orderData.order.totalAmount ?? "0");
          const amountPaid = totalPaid.toFixed(2);
          let paymentStatus: "Unpaid" | "Partial" | "Paid" = "Unpaid";
          if (totalPaid >= totalAmount && totalAmount > 0) paymentStatus = "Paid";
          else if (totalPaid > 0) paymentStatus = "Partial";
          await updateOrder(input.orderId, { amountPaid, paymentStatus });
        }
        return { success: true };
      }),
  }),

  // ─── Inventory ─────────────────────────────────────────────────────────────
  inventory: router({
    list: protectedProcedure
      .input(z.object({ search: z.string().optional() }).optional())
      .query(({ input }) => getInventory(input?.search)),
    lowStock: protectedProcedure.query(() => getLowStockInventory()),

    create: protectedProcedure
      .input(
        z.object({
          colorName: z.string().min(1),
          brand: z.string().optional(),
          thickness: z.string().optional(),
          finish: z.string().optional(),
          slabWidth: z.string().optional(),
          slabHeight: z.string().optional(),
          quantity: z.number().min(0),
          location: z.string().optional(),
          costPerSqft: z.string().optional(),
          lowStockThreshold: z.number().optional(),
          notes: z.string().optional(),
        })
      )
      .mutation(({ input }) => createInventoryItem(input)),

    update: protectedProcedure
      .input(
        z.object({
          id: z.number(),
          colorName: z.string().optional(),
          brand: z.string().optional(),
          thickness: z.string().optional(),
          finish: z.string().optional(),
          quantity: z.number().optional(),
          location: z.string().optional(),
          costPerSqft: z.string().optional(),
          lowStockThreshold: z.number().optional(),
          notes: z.string().optional(),
        })
      )
      .mutation(({ input }) => {
        const { id, ...data } = input;
        return updateInventoryItem(id, data);
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(({ input }) => deleteInventoryItem(input.id)),
  }),

  // ─── Analytics ─────────────────────────────────────────────────────────────
  analytics: router({
    summary: protectedProcedure.query(() => getAnalyticsSummary()),
    revenueByMonth: protectedProcedure.query(() => getRevenueByMonth()),
    salespersonMetrics: protectedProcedure.query(() => getSalespersonMetrics()),
    quotesByStatus: protectedProcedure.query(() => getQuotesByStatus()),
    ordersByStatus: protectedProcedure.query(() => getOrdersByStatus()),
  }),

  // ─── Admin ─────────────────────────────────────────────────────────────────
  admin: router({
    listUsers: adminProcedure.query(() => getAllUsers()),
    updateUserRole: adminProcedure
      .input(z.object({ userId: z.number(), role: z.enum(["user", "admin"]) }))
      .mutation(({ input }) => updateUserRole(input.userId, input.role)),
  }),
});

export type AppRouter = typeof appRouter;
