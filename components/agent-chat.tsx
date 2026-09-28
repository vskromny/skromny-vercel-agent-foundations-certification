"use client";

import { useChat } from "@ai-sdk/react";
import { ShoppingBagIcon } from "lucide-react";
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

export function AgentChat() {
  const { messages, sendMessage, status, stop, error } = useChat();

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
                  {message.parts.map((part, index) =>
                    part.type === "text" ? (
                      <MessageResponse
                        key={`${message.id}-${index}`}
                        linkSafety={linkSafety}
                      >
                        {part.text}
                      </MessageResponse>
                    ) : null
                  )}
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
