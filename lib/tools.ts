import { tool } from "ai";
import { z } from "zod";
import {
  createReturn,
  getCategories,
  getOrder,
  getProductById,
  getProducts,
  getProductStock,
  notifyReturnInProcess,
  preauthorizeRefund,
} from "@/lib/api";
import type { Product } from "@/lib/types";

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
    "File a return for an order. Only call this when the customer explicitly asks " +
    "to return items and has given an order id. Looks up the order, notifies the " +
    "customer, pre-authorizes the refund, and files the return.",
  inputSchema: z.object({
    orderId: z.string().describe("The order id to return items from"),
    items: z
      .array(
        z.object({
          productId: z.string(),
          quantity: z.number().int().min(1),
        }),
      )
      .min(1)
      .describe("Which items from the order to return, and how many of each"),
    reason: z.string().describe("The customer's reason for returning"),
  }),
  execute: async ({ orderId, items, reason }) => {
    const order = await getOrder(orderId);

    await notifyReturnInProcess(order.id);
    const preauthorization = await preauthorizeRefund(order.id);
    const filedReturn = await createReturn({ orderId: order.id, items, reason });

    return {
      returnId: filedReturn.id,
      status: filedReturn.status,
      refundPreauthorized: preauthorization.amount,
      currency: preauthorization.currency,
    };
  },
});

export const shoppingTools = {
  searchProducts,
  getAllCategories,
  getProductDetails,
  returnOrder,
};
