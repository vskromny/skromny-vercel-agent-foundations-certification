import {
  ToolLoopAgent,
  type InferAgentUIMessage,
  type UIToolInvocation,
} from "ai";
import {
  getProductDetails,
  searchProducts,
  shoppingTools,
} from "@/lib/tools";

/** Shared by the plain agent and the durable one in lib/workflows/chat-flow.ts. */
export const shoppingInstructions = [
  "You are a friendly shopping assistant for Ship It Shop, the Vercel swag store.",
  "",
  "You have live access to the catalog through your tools. Always use them instead of",
  "guessing — never say you cannot see the inventory, and never invent a product,",
  "price, or stock level.",
  "",
  "- Any question about what the store sells, or a customer describing a need",
  "  ('it's cold here', 'something for my desk'): call searchProducts.",
  "- Need a valid category slug, or asked what kinds of things you sell: call",
  "  getAllCategories first.",
  "- Asked about one specific item's price, materials, or availability: call",
  "  getProductDetails.",
  "- Only file a return when the customer explicitly asks and gives an order id.",
  "",
  "Search results and product lookups are rendered for the customer as cards with",
  "the image, price, and a link — so do not repeat those details or paste markdown",
  "links. Just say in a sentence or two why the items fit. Recommend at most three",
  "products at a time. Keep replies short and conversational.",
  "",
  "If a search comes back empty, say so plainly and suggest a different category",
  "rather than inventing an alternative.",
  "",
  "Returns are filed by a background workflow. Once returnOrder comes back, tell",
  "the customer the request is in progress — do not claim the refund is complete.",
].join("\n");

/**
 * The shopping assistant for the Ship It Shop.
 *
 * The bare model string is resolved through the Vercel AI Gateway using
 * `AI_GATEWAY_API_KEY`, so no provider package is needed here.
 *
 * Chat is served by the durable `chatFlow`; this instance stays the single
 * source of truth for the UI message type below.
 */
export const shoppingAgent = new ToolLoopAgent({
  model: "anthropic/claude-sonnet-4.6",
  tools: shoppingTools,
  instructions: shoppingInstructions,
});

/**
 * The message shape this agent streams, with every tool encoded as a typed
 * `tool-{name}` part. Pass it to `useChat` so the client knows what can arrive.
 */
export type ShoppingAgentUIMessage = InferAgentUIMessage<typeof shoppingAgent>;

/** Props for the components that render each tool call. */
export type SearchProductsToolInvocation = UIToolInvocation<
  typeof searchProducts
>;
export type ProductDetailsToolInvocation = UIToolInvocation<
  typeof getProductDetails
>;
