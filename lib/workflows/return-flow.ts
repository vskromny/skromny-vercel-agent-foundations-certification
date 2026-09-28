import {
  createReturn,
  getOrder,
  notifyReturnInProcess,
  preauthorizeRefund,
} from "@/lib/api";
import type { Order, Return } from "@/lib/types";

/**
 * Filing a return is slow (the refund pre-auth alone blocks ~30s) and the last
 * call fails intermittently. As a plain async function a failure replays the
 * whole thing — notifying the customer twice and re-running the pre-auth.
 *
 * `"use workflow"` makes this a durable orchestrator: each `"use step"` below
 * is executed once, cached, and retried on its own (up to 3 times). A crash or
 * a redeploy mid-run resumes from the last completed step.
 */
export async function returnFlow(orderId: string, reason: string) {
  "use workflow";

  const order = await getOrderStep(orderId);
  await notifyReturnInProcessStep(orderId);
  await preauthorizeRefundStep(orderId);
  const filed = await createReturnStep(order, reason);

  return { orderId, returnId: filed.id };
}

async function getOrderStep(orderId: string): Promise<Order> {
  "use step";

  return getOrder(orderId);
}

async function notifyReturnInProcessStep(orderId: string): Promise<void> {
  "use step";

  await notifyReturnInProcess(orderId);
}

async function preauthorizeRefundStep(orderId: string): Promise<void> {
  "use step";

  await preauthorizeRefund(orderId);
}

async function createReturnStep(order: Order, reason: string): Promise<Return> {
  "use step";

  return createReturn({
    orderId: order.id,
    items: order.items.map((item) => ({
      productId: item.productId,
      quantity: item.quantity,
    })),
    reason,
  });
}
