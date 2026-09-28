import { Sandbox } from "@vercel/sandbox";

/**
 * One long-lived sandbox shared by every admin conversation. The name is the
 * handle: `getOrCreate` resumes the existing machine (and its filesystem) when
 * one is already around, so files the agent wrote in an earlier chat are still
 * in /tmp on the next question.
 */
export const SANDBOX_NAME = "admin-agent-sandbox";

/** Seven days — long enough to survive a weekend, short enough to stay cheap. */
const SNAPSHOT_EXPIRATION = 7 * 24 * 60 * 60 * 1000;

/** 45 minutes of idle before the sandbox stops and snapshots itself. */
const TIMEOUT = 45 * 60 * 1000;

/**
 * `getOrCreate` rather than the `get`-then-catch-then-`create` pair: it also
 * covers the case where the sandbox record exists but its snapshot has expired,
 * which `get` reports as an error and a bare `create` then rejects as a
 * duplicate name.
 */
export const createOrGetSandbox = async (name: string) =>
  Sandbox.getOrCreate({
    name,
    snapshotExpiration: SNAPSHOT_EXPIRATION,
    timeout: TIMEOUT,
  });
