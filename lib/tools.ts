import { tool } from "ai";
import { start } from "workflow/api";
import { z } from "zod";
import {
  getBackOfficeReturns,
  getBackOfficeSales,
  getBackOfficeStock,
  getBackOfficeSupportTickets,
  getCategories,
  getProductById,
  getProducts,
  getProductStock,
} from "@/lib/api";
import type { Product } from "@/lib/types";
import { returnFlow } from "@/lib/workflows/return-flow";

/** Products are routed by id: see app/(store)/products/[param]. */
const productUrl = (product: Product) => `/products/${product.id}`;

/**
 * Trim a product to what the model needs to talk about it and link to it.
 * Sending the full record (every image, tags, timestamps) burns context for no
 * gain. The single thumbnail is the exception: the UI renders these results as
 * product cards, and one URL per product is cheap.
 */
const summarize = (product: Product) => ({
  id: product.id,
  name: product.name,
  description: product.description,
  price: product.price,
  currency: product.currency,
  category: product.category,
  image: product.images[0] ?? null,
  url: productUrl(product),
});

export const searchProducts = tool({
  description:
    "Search the Ship It Shop catalog. Use for any question about what the store sells, " +
    "or to find products matching a need (warm clothing, gifts, desk gear). " +
    "Omit both arguments to browse the whole catalog. " +
    "Call getAllCategories first if you need a valid category slug.",
  inputSchema: z.object({
    query: z
      .string()
      .optional()
      .describe("Free-text search over product names and descriptions"),
    category: z
      .string()
      .optional()
      .describe("Category slug from getAllCategories, e.g. 'hoodies'"),
    limit: z
      .number()
      .int()
      .min(1)
      .max(20)
      .optional()
      .describe("Max products to return. Defaults to 8."),
  }),
  execute: async ({ query, category, limit }) => {
    "use step";

    const products = await getProducts({
      search: query,
      category,
      limit: limit ?? 8,
    });

    return {
      count: products.length,
      products: products.map(summarize),
    };
  },
});

export const getAllCategories = tool({
  description:
    "List the store's product categories with the number of products in each. " +
    "Use this to discover valid category slugs before calling searchProducts, " +
    "or to answer 'what kinds of things do you sell'.",
  inputSchema: z.object({}),
  execute: async () => {
    "use step";

    const categories = await getCategories();

    return {
      categories: categories.map((category) => ({
        slug: category.slug,
        name: category.name,
        productCount: category.productCount,
      })),
    };
  },
});

export const getProductDetails = tool({
  description:
    "Get full detail for ONE product, including live stock. " +
    "Use after searchProducts when the customer asks about a specific item " +
    "(availability, exact price, what it's made of). " +
    "Do not use to browse — that is searchProducts.",
  inputSchema: z.object({
    productId: z
      .string()
      .describe("Product id or slug, as returned by searchProducts"),
  }),
  execute: async ({ productId }) => {
    "use step";

    const product = await getProductById(productId);

    // Stock is a separate, uncached endpoint; a failure here shouldn't sink
    // the whole answer.
    let stock: Awaited<ReturnType<typeof getProductStock>> | null = null;
    try {
      stock = await getProductStock(productId);
    } catch {
      stock = null;
    }

    return {
      ...summarize(product),
      tags: product.tags,
      featured: product.featured,
      images: product.images,
      stock: stock
        ? {
            quantity: stock.stock,
            inStock: stock.inStock,
            lowStock: stock.lowStock,
          }
        : null,
    };
  },
});

export const returnOrder = tool({
  description:
    "File a return for one of the customer's past orders. Only call this when " +
    "the customer explicitly asks to return something and has given an order id " +
    "and a reason — ask for whichever is missing. Example order ids: 11111, " +
    "22222, 33333. This hands off to a background workflow and comes back " +
    "immediately; do not promise the refund is already done.",
  inputSchema: z.object({
    orderId: z.string().describe("The order id the customer wants to return"),
    reason: z
      .string()
      .min(10)
      .max(500)
      .describe("Why the customer is returning the order"),
  }),
  execute: async ({ orderId, reason }) => {
    "use step";

    // `start` queues the workflow and returns at once, so the customer isn't
    // left waiting ~30s on the refund pre-authorization.
    const run = await start(returnFlow, [orderId, reason]);

    return {
      runId: run.runId,
      message: `Return request received for order ${orderId}. We'll email you as it progresses.`,
    };
  },
});

export const shoppingTools = {
  searchProducts,
  getAllCategories,
  getProductDetails,
  returnOrder,
};

// ---------------------------------------------------------------------------
// Back-office tools. These power the admin agent at /admin and are read-only —
// nothing here mutates store data.
// ---------------------------------------------------------------------------

/** Every back-office range query takes the same optional window. */
const dateRange = {
  from: z
    .string()
    .optional()
    .describe("Start of the window, YYYY-MM-DD. Defaults to 30 days before `to`."),
  to: z
    .string()
    .optional()
    .describe("End of the window, YYYY-MM-DD. Defaults to today."),
};

export const getSupportTickets = tool({
  description:
    "List support tickets from the back office within a date range. Use for " +
    "questions about customer complaints, open workload, or what people are " +
    "writing in about. Filter to narrow down; omit filters to see everything.",
  inputSchema: z.object({
    ...dateRange,
    status: z.enum(["open", "pending", "resolved", "closed"]).optional(),
    priority: z.enum(["low", "normal", "high", "urgent"]).optional(),
    category: z
      .enum([
        "shipping",
        "returns",
        "product_quality",
        "sizing",
        "billing",
        "payment",
        "account",
        "other",
      ])
      .optional(),
    assignee: z
      .string()
      .optional()
      .describe("Staff username, e.g. 'alex'. Excludes unassigned tickets."),
    limit: z.number().int().min(1).max(500).optional().describe("Default 25."),
  }),
  execute: async (params) => {
    "use step";

    const { data, meta } = await getBackOfficeSupportTickets(params);

    return {
      range: { from: meta.from, to: meta.to },
      count: meta.count,
      tickets: data.map((ticket) => ({
        id: ticket.id,
        subject: ticket.subject,
        status: ticket.status,
        priority: ticket.priority,
        category: ticket.category,
        assignee: ticket.assignee,
        relatedOrderId: ticket.relatedOrderId,
        createdAt: ticket.createdAt,
        lastMessageAt: ticket.lastMessageAt,
      })),
    };
  },
});

export const getReturnsHistory = tool({
  description:
    "List historical returns from the back office within a date range, with " +
    "the decision and refund amount for each. Use for return rates, refund " +
    "totals, or which products come back most.",
  inputSchema: z.object({
    ...dateRange,
    status: z.enum(["pending", "processing", "completed"]).optional(),
    decision: z.enum(["approved", "rejected", "needs_info"]).optional(),
    limit: z.number().int().min(1).max(500).optional().describe("Default 25."),
  }),
  execute: async (params) => {
    "use step";

    const { data, meta } = await getBackOfficeReturns(params);

    return {
      range: { from: meta.from, to: meta.to },
      count: meta.count,
      returns: data.map((filed) => ({
        id: filed.id,
        orderId: filed.orderId,
        status: filed.status,
        decision: filed.decision,
        // Cents, like every other price in the API.
        refundAmount: filed.refundAmount,
        reason: filed.reason,
        items: filed.items,
        createdAt: filed.createdAt,
        processedAt: filed.processedAt,
      })),
    };
  },
});

export const getInventoryStock = tool({
  description:
    "Current stock levels for all products, lowest first. Use for restock " +
    "questions, what's out of stock, or what's running low.",
  inputSchema: z.object({
    lowStock: z
      .boolean()
      .optional()
      .describe("True for products with 1-5 units left; false to exclude them."),
    inStock: z
      .boolean()
      .optional()
      .describe("False to see only sold-out products."),
    productIds: z
      .array(z.string())
      .optional()
      .describe("Restrict to specific product ids."),
    limit: z.number().int().min(1).max(200).optional().describe("Default 50."),
  }),
  execute: async (params) => {
    "use step";

    const { data } = await getBackOfficeStock(params);

    return {
      count: data.length,
      // Ascending, so the answer to "what's running low" is at the top.
      products: [...data]
        .sort((a, b) => a.stock - b.stock)
        .map((entry) => ({
          productId: entry.productId,
          name: entry.product.name,
          category: entry.product.category,
          stock: entry.stock,
          inStock: entry.inStock,
          lowStock: entry.lowStock,
          url: `/products/${entry.productId}`,
        })),
    };
  },
});

export const getSalesAnalytics = tool({
  description:
    "Sales totals by product within a date range — units sold, order count, " +
    "and revenue, plus the totals for the window. Use for top sellers, " +
    "revenue questions, or comparing periods.",
  inputSchema: z.object({
    ...dateRange,
    productId: z
      .string()
      .optional()
      .describe("Restrict to a single product instead of the whole catalog."),
  }),
  execute: async (params) => {
    "use step";

    const { data, meta } = await getBackOfficeSales(params);

    return {
      range: { from: meta.from, to: meta.to, days: meta.days },
      currency: meta.currency,
      totals: meta.totals,
      products: data.map((row) => ({
        productId: row.productId,
        name: row.product.name,
        category: row.product.category,
        unitsSold: row.unitsSold,
        ordersCount: row.ordersCount,
        // Cents.
        revenue: row.revenue,
        url: `/products/${row.productId}`,
      })),
    };
  },
});

/** Read-only back-office access for the admin agent. */
export const adminTools = {
  getSupportTickets,
  getReturnsHistory,
  getInventoryStock,
  getSalesAnalytics,
};
