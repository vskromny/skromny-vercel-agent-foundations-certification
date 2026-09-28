"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { BotIcon } from "lucide-react";
import { useMemo } from "react";
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
import { AgentTerminal } from "@/components/agent-terminal";
import { Suggestion, Suggestions } from "@/components/ai-elements/suggestion";
import type { AdminAgentUIMessage } from "@/lib/agent";

const SUGGESTIONS = [
  "Show me low-stock items",
  "What were yesterday's top sellers?",
  "Summarize this week's revenue",
  "Which top sellers are running low?",
  "Which products have the worst return rate?",
];

/** Same reasoning as the storefront panel: don't gate our own routes. */
const linkSafety = {
  enabled: true,
  onLinkCheck: (url: string) => url.startsWith("/"),
};

export function AdminAgentChat() {
  const transport = useMemo(
    () =>
      new DefaultChatTransport<AdminAgentUIMessage>({
        api: "/api/admin/chat",
      }),
    [],
  );

  const { messages, sendMessage, status, stop, error } =
    useChat<AdminAgentUIMessage>({ transport });

  const isBusy = status === "submitted" || status === "streaming";

  const ask = (text: string) => {
    if (!text.trim() || isBusy) {
      return;
    }

    sendMessage({ text });
  };

  const handleSubmit = (message: PromptInputMessage) => {
    ask(message.text);
  };

  return (
    <div className="flex h-full min-h-0 flex-col">
      <Conversation className="flex-1">
        <ConversationContent>
          {messages.length === 0 ? (
            <ConversationEmptyState
              description="Ask about tickets, returns, stock, or sales. Read-only — I can look, not change."
              icon={<BotIcon className="size-5" />}
              title="Store admin agent"
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
                      case "tool-bash":
                        return <AgentTerminal invocation={part} key={key} />;
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

      <div className="flex flex-col gap-3 border-t p-3">
        <Suggestions>
          {SUGGESTIONS.map((suggestion) => (
            <Suggestion key={suggestion} onClick={ask} suggestion={suggestion} />
          ))}
        </Suggestions>
        <PromptInput onSubmit={handleSubmit}>
          <PromptInputBody>
            <PromptInputTextarea placeholder="Ask the admin agent…" />
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
