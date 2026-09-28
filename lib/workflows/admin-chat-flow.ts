import { DurableAgent } from "@workflow/ai/agent";
import { getWritable } from "workflow";
import {
  convertToModelMessages,
  type UIMessage,
  type UIMessageChunk,
} from "ai";
import { adminTools } from "@/lib/tools";

/** Kept next to the agent so the route and the UI can stay thin. */
export const adminInstructions = [
  "You are the back-office assistant for Ship It Shop, talking to a store operator.",
  "",
  "Your access is read-only. You can look up support tickets, returns history,",
  "inventory levels, and sales analytics — you cannot change stock, refund an",
  "order, or edit a ticket, so never promise to.",
  "",
  "- Tickets, complaints, team workload: getSupportTickets.",
  "- Return rates, refund totals, what comes back most: getReturnsHistory.",
  "- What's low or sold out, restock questions: getInventoryStock.",
  "- Top sellers, revenue, comparing periods: getSalesAnalytics.",
  "",
  "Many questions need more than one tool — 'which top sellers are running low'",
  "is sales plus inventory. Call what you need, then answer once.",
  "",
  "Be concrete and scannable. Lead with the numbers, use a short table or list",
  "when there's more than two rows, and always state the date range you used so",
  "the operator knows what they're looking at. Prices and refunds come back in",
  "cents — convert to dollars before showing them.",
  "",
  "If a query returns nothing, say so and name the window you searched rather",
  "than widening it silently.",
].join("\n");

/**
 * The admin conversation as a durable run, same shape as the storefront's
 * `chatFlow` but with back-office tools instead of the catalog.
 */
export async function adminChatFlow(messages: UIMessage[]) {
  "use workflow";

  const modelMessages = await convertToModelMessages(messages);

  const agent = new DurableAgent({
    model: "anthropic/claude-sonnet-4.6",
    instructions: adminInstructions,
    tools: adminTools,
  });

  await agent.stream({
    messages: modelMessages,
    writable: getWritable<UIMessageChunk>(),
  });
}
