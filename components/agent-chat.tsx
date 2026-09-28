"use client";

import { useChat } from "@ai-sdk/react";
import { WorkflowChatTransport } from "@workflow/ai";
import { ShoppingBagIcon } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import type { ShoppingAgentUIMessage } from "@/lib/agent";
import { AgentProductCard } from "@/components/agent-product-card";
import { AgentProductList } from "@/components/agent-product-list";
import {
  Conversation,
  ConversationContent,
  ConversationEmptyState,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import {
  Message,
  MessageContent,
  MessageResponse,
} from "@/components/ai-elements/message";
import {
  PromptInput,
  PromptInputBody,
  PromptInputFooter,
  type PromptInputMessage,
  PromptInputSubmit,
  PromptInputTextarea,
  PromptInputTools,
} from "@/components/ai-elements/prompt-input";

/**
 * Streamdown treats every link as external and shows an "are you sure" modal.
 * Product links the agent emits are same-origin store routes, so let those
 * through and keep the interstitial for anything off-site.
 */
const linkSafety = {
  enabled: true,
  onLinkCheck: (url: string) => url.startsWith("/"),
};

/** Where the id of the run currently streaming is parked across reloads. */
const RUN_ID_KEY = "active-workflow-run-id";

export function AgentChat() {
  // Read once on mount: if a run was still streaming when the page went away,
  // reconnect to it instead of dropping the half-finished answer.
  const [resumeRunId] = useState(() =>
    typeof window === "undefined"
      ? null
      : window.localStorage.getItem(RUN_ID_KEY),
  );

  const transport = useMemo(
    () =>
      new WorkflowChatTransport<ShoppingAgentUIMessage>({
        api: "/api/chat",
        onChatSendMessage: (response) => {
          const runId = response.headers.get("x-workflow-run-id");
          if (runId) {
            window.localStorage.setItem(RUN_ID_KEY, runId);
          }
        },
        onChatEnd: () => window.localStorage.removeItem(RUN_ID_KEY),
        // Replay from chunk 0. Resuming nearer the tail is tempting, but the
        // message can only be rebuilt if the client sees the chunks that opened
        // it — start from a later index and the answer renders as nothing.
        initialStartIndex: 0,
        prepareReconnectToStreamRequest: ({ api, ...rest }) => {
          const runId = window.localStorage.getItem(RUN_ID_KEY);
          if (!runId) {
            throw new Error("No active workflow run to reconnect to");
          }

          return {
            ...rest,
            api: `/api/chat/${encodeURIComponent(runId)}/stream`,
          };
        },
      }),
    [],
  );

  const { messages, sendMessage, status, stop, error, resumeStream } =
    useChat<ShoppingAgentUIMessage>({ transport });

  // `useChat({ resume: true })` reconnects from an effect with no guard, so
  // React Strict Mode fires it twice and two reconnects race over the same
  // run — the answer lands in the list twice. Do it once by hand instead.
  const hasResumed = useRef(false);

  useEffect(() => {
    if (hasResumed.current || !resumeRunId) {
      return;
    }

    hasResumed.current = true;
    resumeStream();
  }, [resumeRunId, resumeStream]);

  const handleSubmit = (message: PromptInputMessage) => {
    const text = message.text.trim();

    if (!text || status === "submitted" || status === "streaming") {
      return;
    }

    sendMessage({ text });
  };

  return (
    <div className="flex h-full min-h-0 flex-col">
      <Conversation className="flex-1">
        <ConversationContent>
          {messages.length === 0 ? (
            <ConversationEmptyState
              description="Ask about products, sizing, or what to pair with your hoodie."
              icon={<ShoppingBagIcon className="size-5" />}
              title="Shopping assistant"
            />
          ) : (
            messages.map((message) => (
              <Message from={message.role} key={message.id}>
                <MessageContent>
                  {message.parts.map((part, index) => {
                    const key = `${message.id}-${index}`;

                    switch (part.type) {
                      case "text":
                        return (
                          <MessageResponse key={key} linkSafety={linkSafety}>
                            {part.text}
                          </MessageResponse>
                        );
                      case "tool-searchProducts":
                        return <AgentProductList invocation={part} key={key} />;
                      case "tool-getProductDetails":
                        return <AgentProductCard invocation={part} key={key} />;
                      default:
                        return null;
                    }
                  })}
                </MessageContent>
              </Message>
            ))
          )}

          {error && (
            <p className="text-destructive text-sm">
              Something went wrong. Please try again.
            </p>
          )}
        </ConversationContent>
        <ConversationScrollButton />
      </Conversation>

      <div className="border-t p-3">
        <PromptInput onSubmit={handleSubmit}>
          <PromptInputBody>
            <PromptInputTextarea placeholder="Ask the agent" />
          </PromptInputBody>
          <PromptInputFooter>
            <PromptInputTools />
            <PromptInputSubmit onStop={stop} status={status} />
          </PromptInputFooter>
        </PromptInput>
      </div>
    </div>
  );
}
