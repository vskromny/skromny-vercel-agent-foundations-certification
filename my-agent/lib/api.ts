const BASE_URL = process.env.API_BASE_URL;
const BYPASS_TOKEN = process.env.BYPASS_SECRET;

type Params = Record<string, string | number | undefined>;

async function apiGet(path: string, params?: Params) {
  if (!BASE_URL || !BYPASS_TOKEN) {
    throw new Error("API_BASE_URL and BYPASS_SECRET must be set in .env.local");
  }

  const url = new URL(BASE_URL + path);
  for (const [key, value] of Object.entries(params ?? {})) {
    if (value !== undefined) url.searchParams.set(key, String(value));
  }

  const res = await fetch(url, {
    headers: { "x-vercel-protection-bypass": BYPASS_TOKEN },
  });

  if (!res.ok) throw new Error(`API ${res.status}: ${await res.text()}`);

  return res.json();
}

/** Every back-office endpoint is a GET with optional query params, so bind the path once. */
const endpoint =
  <T extends Params>(path: string) =>
  (params?: T) =>
    apiGet(path, params);

export const listProducts = endpoint<{
  page?: number;
  limit?: number;
  category?: string;
  search?: string;
  featured?: "true" | "false";
}>("/products");

export const getProductDetails = (idOrSlug: string) =>
  apiGet(`/products/${idOrSlug}`);

export const listHistoricalReturns = endpoint<{
  from?: string;
  to?: string;
  status?: "pending" | "processing" | "completed";
  decision?: "approved" | "rejected" | "needs_info";
  limit?: number;
}>("/back-office/returns");

export const listSupportTickets = endpoint<{
  from?: string;
  to?: string;
  status?: "open" | "pending" | "resolved" | "closed";
  priority?: "low" | "normal" | "high" | "urgent";
  category?:
    | "shipping"
    | "returns"
    | "product_quality"
    | "sizing"
    | "billing"
    | "payment"
    | "account"
    | "other";
  assignee?: string;
  limit?: number;
}>("/back-office/support-tickets");

export const listStockLevelForProducts = endpoint<{
  productIds?: string;
  lowStock?: "true" | "false";
  inStock?: "true" | "false";
  page?: number;
  limit?: number;
}>("/back-office/inventory/stock");

export const salesTotalsByProduct = endpoint<{
  from?: string;
  to?: string;
  productId?: string;
}>("/back-office/analytics/sales");
