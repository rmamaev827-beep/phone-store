"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { ContactButton } from "@/components/ContactButton";
import { AddToCartButton, PhoneImage } from "@/components/ProductCard";
import { StockBadge } from "@/components/ui/Badge";
import { Button, ButtonLink } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { AlertIcon, ChevronRightIcon } from "@/components/ui/Icons";
import { Loading, Skeleton } from "@/components/ui/Skeleton";
import { type Product, ApiError, api, formatPrice, formatStorage, phoneTitle } from "@/lib/api";

function Breadcrumbs({ current, accessory = false }: { current?: string; accessory?: boolean }) {
  const link = "rounded transition-colors hover:text-ink";
  return (
    <nav aria-label="Хлебные крошки" className="mb-4 sm:mb-6">
      <ol className="flex flex-wrap items-center gap-1 text-[13px] text-muted">
        <li>
          <Link href="/" className={link}>
            Главная
          </Link>
        </li>
        <li className="flex items-center gap-1">
          <ChevronRightIcon className="size-3.5" />
          <Link href={accessory ? "/accessories" : "/#catalog"} className={link}>
            {accessory ? "Аксессуары" : "Каталог"}
          </Link>
        </li>
        <li className="flex min-w-0 items-center gap-1">
          <ChevronRightIcon className="size-3.5" />
          {current ? (
            <span aria-current="page" className="truncate text-ink">
              {current}
            </span>
          ) : (
            <Skeleton className="h-3.5 w-28" />
          )}
        </li>
      </ol>
    </nav>
  );
}

function ProductSkeleton() {
  return (
    <Loading label="Загрузка товара">
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 md:gap-10">
        <Skeleton className="aspect-square w-full rounded-xl" />
        <div className="space-y-4">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-8 w-3/4" />
          <Skeleton className="h-8 w-1/3" />
          <Skeleton className="h-5 w-28" />
          <div className="grid grid-cols-3 gap-3 pt-2">
            <Skeleton className="h-16" />
            <Skeleton className="h-16" />
            <Skeleton className="h-16" />
          </div>
          <Skeleton className="h-11 w-full sm:w-64" />
        </div>
      </div>
    </Loading>
  );
}

export default function ProductPage() {
  const { id } = useParams<{ id: string }>();
  const [product, setProduct] = useState<Product | null>(null);
  const [variants, setVariants] = useState<Product[]>([]);
  const [error, setError] = useState<{ message: string; notFound: boolean } | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let stale = false;
    api<Product>(`/products/${id}`)
      .then((p) => {
        if (stale) return;
        setProduct(p);
        if (p.kind === "accessory") return;
        // та же модель в других цветах — если такие добавлены в каталог
        api<Product[]>(`/products?q=${encodeURIComponent(p.name)}`)
          .then((all) => {
            if (stale) return;
            setVariants(all.filter((v) => v.name === p.name && v.brand === p.brand && v.color));
          })
          .catch(() => {});
      })
      .catch((e) => !stale && setError({ message: e.message, notFound: e instanceof ApiError && e.status === 404 }));
    return () => {
      stale = true;
    };
  }, [id, attempt]);

  if (error) {
    return (
      <>
        <Breadcrumbs current={error.notFound ? "Товар не найден" : "Ошибка"} />
        {error.notFound ? (
          <EmptyState
            icon={<AlertIcon />}
            title="Товар не найден"
            text="Возможно, товар был удалён или ссылка устарела."
            action={<ButtonLink href="/#catalog">Перейти в каталог</ButtonLink>}
          />
        ) : (
          <EmptyState
            tone="danger"
            icon={<AlertIcon />}
            title="Не удалось загрузить товар"
            text={error.message}
            action={
              <Button
                variant="outline"
                onClick={() => {
                  setError(null);
                  setAttempt((n) => n + 1);
                }}
              >
                Повторить
              </Button>
            }
          />
        )}
      </>
    );
  }

  if (!product) {
    return (
      <>
        <Breadcrumbs />
        <ProductSkeleton />
      </>
    );
  }

  const title = phoneTitle(product);
  // у аксессуара нет памяти, RAM и прочих характеристик телефона
  const accessory = product.kind === "accessory";
  const colors = accessory ? [] : variants.length > 1 ? variants : product.color ? [product] : [];
  const highlights: [string, string][] = accessory
    ? []
    : [
        ["Память", formatStorage(product.storage)],
        ["RAM", `${product.ram} GB`],
        ["Батарея", product.battery],
      ];
  const specs: [string, string][] = accessory
    ? [
        ["Категория", product.category],
        ["Бренд", product.brand],
        ["Цвет", product.color],
      ]
    : [
        ["Бренд", product.brand],
        ["Процессор", product.processor],
        ["RAM", `${product.ram} GB`],
        ["Память", formatStorage(product.storage)],
        ["Камера", product.camera],
        ["Аккумулятор", product.battery],
        ["Цвет", product.color],
      ];

  return (
    <>
      <Breadcrumbs current={title} accessory={accessory} />

      <div className="grid grid-cols-1 items-start gap-6 md:grid-cols-2 md:gap-10">
        <PhoneImage
          src={product.image}
          alt={title}
          placeholder={accessory ? "box" : "phone"}
          className="aspect-square w-full rounded-xl border border-line md:sticky md:top-24"
        />

        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-muted">{accessory ? product.category : product.brand}</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">{product.name}</h1>

          <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2">
            <span className="text-2xl font-semibold tracking-tight sm:text-3xl">{formatPrice(product.price)}</span>
            <StockBadge stock={product.stock} />
          </div>
          {product.stock > 0 && <p className="mt-1.5 text-[13px] text-muted">На складе: {product.stock} шт.</p>}

          <dl className={`mt-5 grid grid-cols-3 gap-2 sm:gap-3 ${highlights.length ? "" : "hidden"}`}>
            {highlights
              .filter(([, value]) => value)
              .map(([label, value]) => (
                <div key={label} className="rounded-lg border border-line bg-surface px-2.5 py-2.5 sm:px-3">
                  <dt className="text-xs text-muted">{label}</dt>
                  <dd className="mt-0.5 text-sm font-medium">{value}</dd>
                </div>
              ))}
          </dl>

          {colors.length > 0 && (
            <div className="mt-5">
              <p id="color-label" className="mb-2 text-[13px] font-medium">
                Цвет
              </p>
              <ul aria-labelledby="color-label" className="flex flex-wrap gap-2">
                {colors.map((v) => {
                  const selected = v.id === product.id;
                  return (
                    <li key={v.id}>
                      <Link
                        href={`/products/${v.id}`}
                        aria-current={selected ? "true" : undefined}
                        className={`flex h-9 items-center rounded-lg border px-3 text-sm transition-colors ${
                          selected
                            ? "border-accent bg-accent-soft font-medium text-accent-fg"
                            : "border-line bg-surface hover:border-zinc-300"
                        }`}
                      >
                        {v.color}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}

          <div className="mt-6 flex flex-col gap-2 sm:flex-row">
            <AddToCartButton product={product} size="lg" fullLabel className="w-full sm:w-64" />
            <ContactButton product={product} size="lg" className="w-full sm:w-auto" />
          </div>
          <p className="mt-3 text-[13px] text-muted">Оплата при получении · Гарантия 12 месяцев</p>
        </div>
      </div>

      <div className="mt-8 grid grid-cols-1 gap-6 md:mt-12 md:grid-cols-2 md:gap-10">
        {product.description && (
          <section aria-labelledby="description-title">
            <h2 id="description-title" className="mb-3 text-lg font-semibold">
              Описание
            </h2>
            <p className="whitespace-pre-line text-sm leading-relaxed text-zinc-700">{product.description}</p>
          </section>
        )}

        <section aria-labelledby="specs-title">
          <h2 id="specs-title" className="mb-3 text-lg font-semibold">
            Характеристики
          </h2>
          <dl className="card grid divide-y divide-line text-sm">
            {specs
              .filter(([, value]) => value)
              .map(([label, value]) => (
                <div key={label} className="grid grid-cols-[minmax(0,2fr)_minmax(0,3fr)] gap-4 px-4 py-2.5">
                  <dt className="text-muted">{label}</dt>
                  <dd className="font-medium">{value}</dd>
                </div>
              ))}
          </dl>
        </section>
      </div>
    </>
  );
}
