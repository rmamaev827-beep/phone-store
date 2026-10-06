"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { type Product, formatPrice, formatStorage, phoneTitle } from "@/lib/api";
import { useCart } from "@/lib/cart";
import { ContactButton } from "./ContactButton";
import { Badge } from "./ui/Badge";
import { Button } from "./ui/Button";
import { CartIcon, CheckIcon, PhoneIcon } from "./ui/Icons";
import { Skeleton } from "./ui/Skeleton";
import { toast } from "./ui/Toast";

const NEW_DAYS = 7;
const isNew = (p: Product) => Date.now() - new Date(p.created_at).getTime() < NEW_DAYS * 86_400_000;

/** Фото телефона: плавно проявляется после загрузки, без фото — нейтральная заглушка */
export function PhoneImage({
  src,
  alt,
  className = "",
  imgClassName = "",
}: {
  src: string;
  alt: string;
  className?: string;
  imgClassName?: string;
}) {
  const img = useRef<HTMLImageElement>(null);
  const [loaded, setLoaded] = useState(false);

  // картинка из кэша может загрузиться раньше, чем React повесит onLoad
  useEffect(() => {
    setLoaded(Boolean(img.current?.complete));
  }, [src]);

  return (
    <div className={`overflow-hidden bg-white ${className}`}>
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          ref={img}
          src={src}
          alt={alt}
          loading="lazy"
          onLoad={() => setLoaded(true)}
          onError={() => setLoaded(true)}
          className={`size-full object-contain transition-[opacity,transform] duration-300 ${
            loaded ? "opacity-100" : "opacity-0"
          } ${imgClassName}`}
        />
      ) : (
        <div role={alt ? "img" : undefined} aria-label={alt || undefined} className="flex size-full items-center justify-center text-zinc-300">
          <PhoneIcon className="size-1/3" strokeWidth={1} />
        </div>
      )}
    </div>
  );
}

/** Наличие одной строкой — для карточек каталога */
export function StockLine({ stock }: { stock: number }) {
  if (stock <= 0) return <span className="text-[13px] text-red-600">Нет в наличии</span>;
  if (stock <= 3) return <span className="text-[13px] text-amber-700">Осталось {stock} шт.</span>;
  return (
    <span className="inline-flex items-center gap-1 text-[13px] text-emerald-700">
      <CheckIcon className="size-3.5" strokeWidth={2.5} />В наличии
    </span>
  );
}

export function AddToCartButton({
  product,
  size = "sm",
  className = "",
  fullLabel = false,
}: {
  product: Product;
  size?: "sm" | "md" | "lg";
  className?: string;
  /** длинная подпись — для страницы товара */
  fullLabel?: boolean;
}) {
  const { items, add } = useCart();
  const inCart = items.find((i) => i.id === product.id)?.quantity ?? 0;
  const soldOut = product.stock <= 0;
  const maxed = inCart >= product.stock;

  return (
    <Button
      size={size}
      variant={soldOut ? "secondary" : "primary"}
      onClick={() => {
        add(product);
        toast.success("Товар добавлен в корзину");
      }}
      disabled={soldOut || maxed}
      title={maxed && !soldOut ? "В корзине уже весь остаток" : undefined}
      className={className}
    >
      {!soldOut && <CartIcon className="size-4" />}
      {soldOut ? "Нет в наличии" : inCart > 0 ? `В корзине: ${inCart}` : fullLabel ? "Добавить в корзину" : "В корзину"}
    </Button>
  );
}

export default function ProductCard({ product }: { product: Product }) {
  const href = `/products/${product.id}`;
  const title = phoneTitle(product);

  return (
    <article className="group card @container flex h-full flex-col overflow-hidden transition-[box-shadow,border-color] duration-200 hover:border-zinc-300 hover:shadow-lift">
      <Link href={href} className="relative block" aria-label={title}>
        <PhoneImage
          src={product.image}
          alt={title}
          className="aspect-square w-full"
          imgClassName="group-hover:scale-[1.04]"
        />
        <span className="absolute left-2.5 top-2.5 flex flex-col items-start gap-1">
          {product.stock <= 0 ? <Badge>Нет в наличии</Badge> : isNew(product) && <Badge tone="accent">Новинка</Badge>}
        </span>
      </Link>

      <div className="flex flex-1 flex-col p-3 sm:p-4">
        <span className="text-[11px] font-medium uppercase tracking-wider text-muted">{product.brand}</span>
        <Link href={href} className="mt-0.5 font-medium leading-snug transition-colors hover:text-accent-fg">
          {product.name}
        </Link>
        <span className="mt-1 text-[13px] text-muted">
          {formatStorage(product.storage)} · {product.ram} GB RAM
        </span>

        <div className="mt-auto pt-3">
          <div className="text-[17px] font-semibold tracking-tight">{formatPrice(product.price)}</div>
          <StockLine stock={product.stock} />
          <div className="mt-3 flex flex-col gap-2 @[15rem]:flex-row">
            <ContactButton product={product} fallbackHref={href} className="@[15rem]:flex-1" />
            <AddToCartButton product={product} className="@[15rem]:flex-1" />
          </div>
        </div>
      </div>
    </article>
  );
}

export function ProductCardSkeleton() {
  return (
    <div className="card overflow-hidden" aria-hidden="true">
      <Skeleton className="aspect-square w-full rounded-none" />
      <div className="space-y-2.5 p-3 sm:p-4">
        <Skeleton className="h-3 w-1/4" />
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-3 w-1/2" />
        <Skeleton className="mt-4 h-5 w-2/5" />
        <Skeleton className="h-9 w-full" />
      </div>
    </div>
  );
}

export const PRODUCT_GRID = "grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 xl:grid-cols-4";
