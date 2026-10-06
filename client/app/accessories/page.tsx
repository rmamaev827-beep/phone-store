"use client";

import { Suspense, useEffect, useState } from "react";
import { AccessoryCard, AccessoryCardSkeleton } from "@/components/AccessoryCard";
import { PriceInput, SORTS, useFilters } from "@/components/FilterPanel";
import { PRODUCT_GRID } from "@/components/ProductCard";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { AlertIcon, SearchIcon } from "@/components/ui/Icons";
import { Select } from "@/components/ui/Input";
import { Loading } from "@/components/ui/Skeleton";
import { ACCESSORY_CATEGORIES } from "@/lib/accessories";
import { type Product, api } from "@/lib/api";

const CHIP =
  "flex h-9 shrink-0 cursor-pointer items-center rounded-full border px-3.5 text-sm transition-colors duration-150";
const chipClass = (active: boolean) =>
  `${CHIP} ${active ? "border-accent bg-accent text-white" : "border-line bg-surface text-ink hover:border-zinc-300 hover:bg-zinc-50"}`;

function Accessories() {
  const filters = useFilters("/accessories");
  const { qs } = filters;
  const q = filters.get("q");
  const selected = filters.list("category");
  const inStock = filters.get("inStock") === "1";

  const [products, setProducts] = useState<Product[] | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let stale = false;
    setLoading(true);
    api<Product[]>(`/products?kind=accessory${qs ? `&${qs}` : ""}`)
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

  const hasFilters = Boolean(selected.length || inStock || q || filters.get("minPrice") || filters.get("maxPrice"));

  return (
    <>
      <header className="mb-5 sm:mb-6">
        <p className="mb-1 text-xs font-medium uppercase tracking-wider text-accent-fg">Для вашего телефона</p>
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
          {q ? `Аксессуары: «${q}»` : "Аксессуары"}
        </h1>
        <p className="mt-1.5 max-w-xl text-sm text-muted">
          Чехлы, защитные стёкла, зарядные устройства, кабели, наушники и другое для вашего телефона.
        </p>
      </header>

      {/* категории: на телефоне листаются по горизонтали */}
      <div role="group" aria-label="Категория" className="-mx-4 mb-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] sm:mx-0 sm:flex-wrap sm:px-0">
        <button onClick={() => filters.set("category", "")} aria-pressed={selected.length === 0} className={chipClass(selected.length === 0)}>
          Все
        </button>
        {ACCESSORY_CATEGORIES.map((c) => (
          <button key={c} onClick={() => filters.toggle("category", c)} aria-pressed={selected.includes(c)} className={chipClass(selected.includes(c))}>
            {c}
          </button>
        ))}
      </div>

      <div className="card mb-5 grid grid-cols-2 items-end gap-3 p-3 sm:flex sm:flex-wrap sm:p-4">
        <div className="col-span-2 sm:w-56">
          <span className="label">Цена, сом</span>
          <div className="grid grid-cols-2 gap-2">
            <PriceInput label="От" value={filters.get("minPrice")} onCommit={(v) => filters.set("minPrice", v)} />
            <PriceInput label="До" value={filters.get("maxPrice")} onCommit={(v) => filters.set("maxPrice", v)} />
          </div>
        </div>
        <label className="col-span-2 flex h-10 cursor-pointer items-center gap-2.5 text-sm sm:col-span-1">
          <input
            type="checkbox"
            checked={inStock}
            onChange={() => filters.set("inStock", inStock ? "" : "1")}
            className="size-4 cursor-pointer accent-accent"
          />
          Только в наличии
        </label>
        <div className="col-span-2 sm:ml-auto sm:w-44">
          <label htmlFor="accessory-sort" className="label">
            Сортировка
          </label>
          <Select
            id="accessory-sort"
            value={filters.get("sort") || "new"}
            onChange={(e) => filters.set("sort", e.target.value === "new" ? "" : e.target.value)}
          >
            {SORTS.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </Select>
        </div>
      </div>

      <div className="mb-3 flex min-h-6 items-center justify-between gap-3">
        <p className="text-sm text-muted" aria-live="polite">
          {products ? `Найдено: ${products.length}` : ""}
        </p>
        {hasFilters && (
          <button onClick={filters.reset} className="cursor-pointer text-[13px] font-medium text-accent-fg transition-opacity hover:opacity-80">
            Сбросить фильтры
          </button>
        )}
      </div>

      {error ? (
        <EmptyState
          tone="danger"
          icon={<AlertIcon />}
          title="Не удалось загрузить аксессуары"
          text={error}
          action={
            <Button variant="outline" onClick={() => setAttempt((n) => n + 1)}>
              Повторить
            </Button>
          }
        />
      ) : !products ? (
        <Loading label="Загрузка аксессуаров">
          <div className={PRODUCT_GRID}>
            {Array.from({ length: 8 }, (_, i) => (
              <AccessoryCardSkeleton key={i} />
            ))}
          </div>
        </Loading>
      ) : products.length === 0 ? (
        <EmptyState
          icon={<SearchIcon />}
          title="Аксессуары не найдены"
          text="Попробуйте изменить параметры поиска или фильтрации."
          action={
            hasFilters && (
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
              <AccessoryCard product={p} />
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

export default function AccessoriesPage() {
  return (
    <Suspense>
      <Accessories />
    </Suspense>
  );
}
