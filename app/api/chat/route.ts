import type { UIMessage } from "ai";
import { createUIMessageStreamResponse } from "ai";
import { start } from "workflow/api";
import { chatFlow } from "@/lib/workflows/chat-flow";

/**
 * Starts a durable run and streams its output. The run id goes out as a header
 * so the client can reconnect to the same stream after a refresh.
 */
export async function POST(req: Request) {
  const { messages }: { messages: UIMessage[] } = await req.json();

  const run = await start(chatFlow, [messages]);

  return createUIMessageStreamResponse({
    stream: run.readable,
    headers: {
      "x-workflow-run-id": run.runId,
    },
  });
}
