"use client";

import { Suspense, useEffect, useState } from "react";
import { ActiveFilters, FilterPanel, SORTS, useFilters } from "@/components/FilterPanel";
import ProductCard, { PRODUCT_GRID, ProductCardSkeleton } from "@/components/ProductCard";
import { Button, ButtonLink, buttonClass } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { AlertIcon, FilterIcon, SearchIcon } from "@/components/ui/Icons";
import { Select } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Loading } from "@/components/ui/Skeleton";
import { type Product, api } from "@/lib/api";

function plural(n: number, [one, few, many]: [string, string, string]) {
  const d = n % 10;
  const h = n % 100;
  if (d === 1 && h !== 11) return one;
  if (d >= 2 && d <= 4 && (h < 12 || h > 14)) return few;
  return many;
}

function Hero() {
  return (
    <section className="card mb-6 bg-linear-to-br from-surface from-40% to-accent-soft px-5 py-7 sm:mb-8 sm:px-10 sm:py-10">
      <p className="mb-2 text-xs font-medium uppercase tracking-wider text-accent-fg">Магазин смартфонов</p>
      <h1 className="text-2xl font-semibold tracking-tight sm:text-4xl">Смартфоны для любых задач</h1>
      <p className="mt-2 max-w-xl text-sm text-muted sm:mt-3 sm:text-base">
        Выберите подходящий смартфон по характеристикам и цене
      </p>
      <a href="#catalog" className={buttonClass({ size: "lg", className: "mt-5 sm:mt-6" })}>
        Перейти в каталог
      </a>
    </section>
  );
}

function Catalog() {
  const filters = useFilters();
  const { qs } = filters;
  const q = filters.get("q");

  const [products, setProducts] = useState<Product[] | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [attempt, setAttempt] = useState(0);
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    let stale = false;
    setLoading(true);
    api<Product[]>(`/products${qs ? `?${qs}` : ""}`)
      .then((data) => {
        if (stale) return;
        setProducts(data);
        setError("");
      })
      .catch((e) => !stale && setError(e.message))
      .finally(() => !stale && setLoading(false));
    return () => {
      stale = true;
    };
  }, [qs, attempt]);

  const activeCount = filters.chips.filter((c) => c.id !== "q").length;
  const found = products
    ? `${products.length} ${plural(products.length, ["товар", "товара", "товаров"])}`
    : "";

  return (
    <>
      {!q && <Hero />}

      <section id="catalog" aria-labelledby="catalog-title" className="scroll-mt-32 md:scroll-mt-24">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-x-4 gap-y-3">
          <div className="min-w-0">
            <h2 id="catalog-title" className="truncate text-xl font-semibold tracking-tight sm:text-2xl">
              {q ? `Результаты поиска: «${q}»` : "Каталог"}
            </h2>
            <p className="mt-0.5 h-5 text-sm text-muted" aria-live="polite">
              {found}
            </p>
          </div>
          <div className="flex w-full items-center gap-2 sm:w-auto">
            <Button variant="outline" onClick={() => setDrawerOpen(true)} className="flex-1 sm:flex-none lg:hidden">
              <FilterIcon className="size-4" />
              Фильтры
              {activeCount > 0 && (
                <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-accent px-1 text-[11px] font-semibold text-white">
                  {activeCount}
                </span>
              )}
            </Button>
            <Select
              aria-label="Сортировка"
              value={filters.get("sort") || "new"}
              onChange={(e) => filters.set("sort", e.target.value === "new" ? "" : e.target.value)}
              className="flex-1 sm:w-44 sm:flex-none"
            >
              {SORTS.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[15rem_minmax(0,1fr)]">
          <aside aria-label="Фильтры" className="card sticky top-22 hidden max-h-[calc(100dvh-7rem)] overflow-y-auto p-4 [scrollbar-width:thin] lg:block">
            <FilterPanel filters={filters} />
          </aside>

          <div className="min-w-0">
            <ActiveFilters filters={filters} />

            {error ? (
              <EmptyState
                tone="danger"
                icon={<AlertIcon />}
                title="Не удалось загрузить каталог"
                text={error}
                action={
                  <Button variant="outline" onClick={() => setAttempt((n) => n + 1)}>
                    Повторить
                  </Button>
                }
              />
            ) : !products ? (
              <Loading label="Загрузка каталога">
                <div className={PRODUCT_GRID}>
                  {Array.from({ length: 8 }, (_, i) => (
                    <ProductCardSkeleton key={i} />
                  ))}
                </div>
              </Loading>
            ) : products.length === 0 ? (
              <EmptyState
                icon={<SearchIcon />}
                title="Товары не найдены"
                text="Попробуйте изменить параметры поиска или фильтрации."
                action={
                  filters.chips.length > 0 && (
                    <Button variant="outline" onClick={filters.reset}>
                      Сбросить фильтры
                    </Button>
                  )
                }
              />
            ) : (
              <ul className={`${PRODUCT_GRID} transition-opacity duration-200 ${loading ? "opacity-50" : ""}`}>
                {products.map((p) => (
                  <li key={p.id} className="animate-fade">
                    <ProductCard product={p} />
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </section>

      <section aria-labelledby="accessories-promo" className="card mt-8 flex flex-col gap-4 px-5 py-6 sm:mt-10 sm:flex-row sm:items-center sm:justify-between sm:px-8">
        <div>
          <h2 id="accessories-promo" className="text-lg font-semibold tracking-tight">
            Аксессуары для телефона
          </h2>
          <p className="mt-1 text-sm text-muted">Чехлы, защитные стёкла, зарядные устройства, кабели и наушники.</p>
        </div>
        <ButtonLink href="/accessories" variant="outline" className="w-full sm:w-auto">
          Перейти в аксессуары
        </ButtonLink>
      </section>

      <Modal
        variant="drawer"
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title="Фильтры"
        footer={
          <>
            <Button variant="outline" onClick={filters.reset} disabled={filters.chips.length === 0} className="flex-1">
              Сбросить
            </Button>
            <Button onClick={() => setDrawerOpen(false)} className="flex-1">
              {products ? `Показать: ${products.length}` : "Показать"}
            </Button>
          </>
        }
      >
        <FilterPanel filters={filters} />
      </Modal>
    </>
  );
}

export default function Page() {
  return (
    <Suspense>
      <Catalog />
    </Suspense>
  );
}
