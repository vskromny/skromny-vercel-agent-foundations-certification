import type { UIMessage } from "ai";
import { createUIMessageStreamResponse } from "ai";
import { start } from "workflow/api";
import { adminChatFlow } from "@/lib/workflows/admin-chat-flow";

/**
 * Back-office chat. Same durable-run pattern as /api/chat, minus the resume
 * wiring — admin answers are short enough not to need it.
 */
export async function POST(req: Request) {
  const { messages }: { messages: UIMessage[] } = await req.json();

  const run = await start(adminChatFlow, [messages]);

  return createUIMessageStreamResponse({
    stream: run.readable,
  });
}
