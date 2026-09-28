import { DurableAgent } from "@workflow/ai/agent";
import { getWritable } from "workflow";
import {
  convertToModelMessages,
  type UIMessage,
  type UIMessageChunk,
} from "ai";
import { shoppingTools } from "@/lib/tools";
import { shoppingInstructions } from "@/lib/agent";

/**
 * The whole conversation as a durable workflow.
 *
 * Same agent as `shoppingAgent`, but the tool loop is checkpointed: the run
 * survives a serverless timeout, a crash, or a redeploy mid-answer, and the
 * client can reconnect to the stream where it left off.
 */
export async function chatFlow(messages: UIMessage[]) {
  "use workflow";

  const modelMessages = await convertToModelMessages(messages);

  const agent = new DurableAgent({
    model: "anthropic/claude-sonnet-4.6",
    instructions: shoppingInstructions,
    tools: shoppingTools,
  });

  await agent.stream({
    messages: modelMessages,
    writable: getWritable<UIMessageChunk>(),
  });
}
