"use client";

import { TerminalIcon } from "lucide-react";
import type { BashToolInvocation } from "@/lib/agent";

/**
 * Trim to a peek — the model gets the full text either way. This matters most
 * for the command itself: a heredoc carrying a few hundred rows of JSON is a
 * perfectly good command and a terrible thing to paste into a chat bubble.
 */
const MAX_LINES = 20;

/**
 * Both caps are needed: a heredoc's payload is usually a single line holding
 * the whole JSON document, so a line count alone clamps nothing.
 */
const MAX_CHARS = 1200;

function clamp(text: string) {
  const lines = text.trimEnd().split("\n");
  const dropped = lines.length - MAX_LINES;
  let out = lines.slice(0, MAX_LINES).join("\n");
  let note = dropped > 0 ? `${dropped} more line${dropped === 1 ? "" : "s"}` : "";

  if (out.length > MAX_CHARS) {
    out = out.slice(0, MAX_CHARS);
    note = note ? `truncated, ${note}` : "truncated";
  }

  return note ? `${out}\n… ${note}` : out;
}

function Clamped({ className, text }: { className: string; text: string }) {
  return (
    <pre className={`whitespace-pre-wrap break-all ${className}`}>
      {clamp(text)}
    </pre>
  );
}

/**
 * The sandbox as a terminal the operator can read over the agent's shoulder.
 * Without this the whole computation is invisible and the answer looks like a
 * guess; showing the command is what makes the number checkable.
 */
export function AgentTerminal({
  invocation,
}: {
  invocation: BashToolInvocation;
}) {
  const running = invocation.state !== "output-available";

  return (
    <div className="my-2 overflow-hidden rounded-lg border border-neutral-800 bg-neutral-900 font-mono text-sm">
      <div className="flex items-center gap-2 border-neutral-800 border-b bg-neutral-800/50 px-3 py-2 text-neutral-400">
        <TerminalIcon className="size-4" />
        <span className="text-xs">{running ? "Running…" : "Terminal"}</span>
      </div>

      <div className="px-3 py-2">
        <Clamped
          className="font-semibold text-neutral-100"
          text={`$ ${invocation.input?.command ?? ""}`}
        />

        {invocation.state === "output-available" ? (
          <div className="mt-1 space-y-1">
            {invocation.output.stdout && (
              <Clamped className="text-neutral-300" text={invocation.output.stdout} />
            )}
            {invocation.output.stderr && (
              <Clamped className="text-red-400" text={invocation.output.stderr} />
            )}
            {invocation.output.exitCode !== 0 && (
              <p className="text-red-400 text-xs">
                exited {invocation.output.exitCode}
              </p>
            )}
          </div>
        ) : invocation.state === "output-error" ? (
          <p className="mt-1 text-red-400">{invocation.errorText}</p>
        ) : (
          <div className="mt-1 text-neutral-500">
            <span className="animate-pulse">▊</span>
          </div>
        )}
      </div>
    </div>
  );
}
