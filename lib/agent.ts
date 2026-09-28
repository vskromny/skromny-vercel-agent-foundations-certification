import { ToolLoopAgent } from "ai";

/**
 * The shopping assistant for the Ship It Shop.
 *
 * The bare model string is resolved through the Vercel AI Gateway using
 * `AI_GATEWAY_API_KEY`, so no provider package is needed here. Tools get
 * added to this agent in the next workshop chapter.
 */
export const shoppingAgent = new ToolLoopAgent({
  model: "anthropic/claude-sonnet-4.6",
  instructions: [
    "You are a friendly shopping assistant for Ship It Shop, the Vercel swag store.",
    "Help customers discover products, compare options, and decide what to buy.",
    "Keep answers short and conversational — a couple of sentences unless the customer asks for detail.",
    "You do not have store data or tools yet, so never invent products, prices, stock levels, or order details.",
    "When you cannot answer from what the customer has told you, say so and suggest browsing the store.",
  ].join(" "),
});
