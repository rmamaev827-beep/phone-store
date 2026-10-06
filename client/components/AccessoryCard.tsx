"use client";

import Link from "next/link";
import { type Product, formatPrice } from "@/lib/api";
import { AddToCartButton, PhoneImage, StockLine } from "./ProductCard";
import { Badge } from "./ui/Badge";
import { Skeleton } from "./ui/Skeleton";

export function AccessoryCard({ product }: { product: Product }) {
  const href = `/products/${product.id}`;

  return (
    <article className="group card flex h-full flex-col overflow-hidden transition-[box-shadow,border-color] duration-200 hover:border-zinc-300 hover:shadow-lift">
      <Link href={href} className="relative block" aria-label={product.name}>
        <PhoneImage
          src={product.image}
          alt={product.name}
          placeholder="box"
          className="aspect-[4/3] w-full"
          imgClassName="group-hover:scale-[1.04]"
        />
        {product.stock <= 0 && (
          <span className="absolute left-2.5 top-2.5">
            <Badge>Нет в наличии</Badge>
          </span>
        )}
      </Link>

      <div className="flex flex-1 flex-col p-3 sm:p-4">
        <span className="text-[11px] font-medium uppercase tracking-wider text-muted">{product.category}</span>
        <Link href={href} className="mt-0.5 font-medium leading-snug transition-colors hover:text-accent-fg">
          {product.name}
        </Link>
        {product.description && <p className="mt-1 line-clamp-2 text-[13px] text-muted">{product.description}</p>}

        <div className="mt-auto pt-3">
          <div className="text-[17px] font-semibold tracking-tight">{formatPrice(product.price)}</div>
          <StockLine stock={product.stock} />
          <AddToCartButton product={product} className="mt-3 w-full" />
        </div>
      </div>
    </article>
  );
}

export function AccessoryCardSkeleton() {
  return (
    <div className="card overflow-hidden" aria-hidden="true">
      <Skeleton className="aspect-[4/3] w-full rounded-none" />
      <div className="space-y-2.5 p-3 sm:p-4">
        <Skeleton className="h-3 w-1/4" />
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-3 w-full" />
        <Skeleton className="mt-4 h-5 w-2/5" />
        <Skeleton className="h-9 w-full" />
      </div>
    </div>
  );
}
