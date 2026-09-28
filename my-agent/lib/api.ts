type Params = Record<string, string | number | undefined>;

/**
 * Read the environment per call, not once at module scope. The deployed bundle
 * is built before Vercel's sensitive env vars exist, so a top-level
 * `process.env.API_BASE_URL` gets inlined as undefined and every request fails
 * with "Invalid URL" — with the values sitting correctly in the dashboard.
 */
function credentials() {
  const baseUrl = process.env.API_BASE_URL;
  const bypassToken = process.env.BYPASS_SECRET;

  if (!baseUrl || !bypassToken) {
    throw new Error(
      "API_BASE_URL and BYPASS_SECRET must be set (locally in .env.local, in " +
        "production as Vercel project environment variables)",
    );
  }

  return { baseUrl, bypassToken };
}

async function apiGet(path: string, params?: Params) {
  const { baseUrl, bypassToken } = credentials();

  const url = new URL(baseUrl + path);
  for (const [key, value] of Object.entries(params ?? {})) {
    if (value !== undefined) url.searchParams.set(key, String(value));
  }

  const res = await fetch(url, {
    headers: { "x-vercel-protection-bypass": bypassToken },
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
