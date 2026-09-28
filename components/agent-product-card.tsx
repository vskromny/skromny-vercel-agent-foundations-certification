"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowRightIcon } from "lucide-react";
import type { ProductDetailsToolInvocation } from "@/lib/agent";
import { formatPrice } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

interface AgentProductCardProps {
  invocation: ProductDetailsToolInvocation;
}

/** Live stock from the tool, phrased for a shopper. */
function StockLine({
  stock,
}: {
  stock: { quantity: number; inStock: boolean; lowStock: boolean } | null;
}) {
  if (!stock) {
    return null;
  }

  if (!stock.inStock) {
    return <span className="text-destructive text-xs">Out of stock</span>;
  }

  return (
    <span
      className={
        stock.lowStock
          ? "text-xs text-amber-600 dark:text-amber-500"
          : "text-muted-foreground text-xs"
      }
    >
      {stock.lowStock ? `Only ${stock.quantity} left` : "In stock"}
    </span>
  );
}

/**
 * Renders a `getProductDetails` call as a full product card: image, price,
 * description, tags, live stock, and a link into the store.
 */
export function AgentProductCard({ invocation }: AgentProductCardProps) {
  if (
    invocation.state === "input-streaming" ||
    invocation.state === "input-available"
  ) {
    return <Skeleton className="h-44 w-full rounded-lg" />;
  }

  if (invocation.state === "output-error") {
    return (
      <p className="text-destructive text-xs">
        Couldn’t load that product just now.
      </p>
    );
  }

  if (invocation.state !== "output-available") {
    return null;
  }

  const product = invocation.output;
  const image = product.images[0];

  return (
    <div className="w-full overflow-hidden rounded-lg border border-border bg-card">
      <div className="flex gap-3 p-3">
        <div className="relative size-20 shrink-0 overflow-hidden rounded-md bg-secondary">
          {image && (
            <Image
              alt={product.name}
              className="object-cover"
              fill
              sizes="80px"
              src={image}
            />
          )}
        </div>

        <div className="min-w-0 flex-1">
          <p className="font-medium text-foreground text-sm">{product.name}</p>
          <p className="mt-0.5 font-semibold text-foreground text-sm">
            {formatPrice(product.price, product.currency)}
          </p>
          <div className="mt-1">
            <StockLine stock={product.stock} />
          </div>
        </div>
      </div>

      <p className="line-clamp-3 px-3 text-muted-foreground text-xs">
        {product.description}
      </p>

      {product.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 px-3 pt-2">
          {product.tags.slice(0, 4).map((tag) => (
            <Badge className="text-[10px]" key={tag} variant="secondary">
              {tag}
            </Badge>
          ))}
        </div>
      )}

      <Link
        className="mt-3 flex items-center gap-1 border-border border-t px-3 py-2 font-medium text-foreground text-xs transition-colors hover:bg-secondary"
        href={product.url}
      >
        View product
        <ArrowRightIcon className="size-3" />
      </Link>
    </div>
  );
}
