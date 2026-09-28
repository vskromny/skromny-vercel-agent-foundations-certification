"use client";

import Image from "next/image";
import Link from "next/link";
import type { SearchProductsToolInvocation } from "@/lib/agent";
import { formatPrice } from "@/lib/format";
import { Skeleton } from "@/components/ui/skeleton";

interface AgentProductListProps {
  invocation: SearchProductsToolInvocation;
}

/**
 * Renders a `searchProducts` call as product cards instead of leaving the model
 * to describe the results in prose.
 */
export function AgentProductList({ invocation }: AgentProductListProps) {
  // While the call is still forming, `input` is a partial object.
  if (
    invocation.state === "input-streaming" ||
    invocation.state === "input-available"
  ) {
    const query = invocation.input?.query;

    return (
      <div className="w-full">
        <p className="text-muted-foreground text-xs">
          Searching{query ? ` for “${query}”` : " the catalog"}…
        </p>
        <div className="mt-2 flex flex-col gap-2">
          {[0, 1, 2].map((i) => (
            <Skeleton className="h-16 w-full rounded-lg" key={i} />
          ))}
        </div>
      </div>
    );
  }

  if (invocation.state === "output-error") {
    return (
      <p className="text-destructive text-xs">
        Couldn’t search the catalog just now.
      </p>
    );
  }

  if (invocation.state !== "output-available") {
    return null;
  }

  // Nothing found — the model says so in its own words, no empty card needed.
  if (invocation.output.count === 0) {
    return null;
  }

  return (
    <div className="flex w-full flex-col gap-2">
      {invocation.output.products.map((product) => (
        <Link
          className="flex items-center gap-3 rounded-lg border border-border bg-card p-2 transition-colors hover:border-foreground/20"
          href={product.url}
          key={product.id}
        >
          <div className="relative size-14 shrink-0 overflow-hidden rounded-md bg-secondary">
            {product.image && (
              <Image
                alt={product.name}
                className="object-cover"
                fill
                sizes="56px"
                src={product.image}
              />
            )}
          </div>
          <div className="min-w-0">
            <p className="truncate font-medium text-foreground text-sm">
              {product.name}
            </p>
            <p className="text-muted-foreground text-xs">
              {formatPrice(product.price, product.currency)}
            </p>
          </div>
        </Link>
      ))}
    </div>
  );
}
