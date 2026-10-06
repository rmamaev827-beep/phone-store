"use client";

import { useState } from "react";
import { type StatProduct, formatPrice, productCategory, productSection } from "@/lib/api";
import { PhoneImage } from "./ProductCard";
import { Badge, StockBadge } from "./ui/Badge";
import { EmptyState } from "./ui/EmptyState";
import { SearchIcon } from "./ui/Icons";
import { Select } from "./ui/Input";

type StockFilter = "all" | "in" | "out";
type SalesFilter = "all" | "sold" | "unsold";
type Sort = "sold" | "revenue" | "stock" | "name";

const TH = "px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted";
const groupId = (p: StatProduct) => `${p.kind}:${productCategory(p)}`;
const byName = (a: StatProduct, b: StatProduct) => a.name.localeCompare(b.name, "ru");

const SORTERS: Record<Sort, (a: StatProduct, b: StatProduct) => number> = {
  sold: (a, b) => b.sold - a.sold || byName(a, b),
  revenue: (a, b) => b.revenue - a.revenue || byName(a, b),
  stock: (a, b) => a.stock - b.stock || byName(a, b),
  name: byName,
};

function Preset({
  active,
  onClick,
  label,
  count,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  count: number;
}) {
  return (
    <button
      onClick={onClick}
      aria-pressed={active}
      className={`flex h-9 shrink-0 cursor-pointer items-center gap-2 rounded-full border px-3.5 text-sm transition-colors duration-150 ${
        active ? "border-accent bg-accent text-white" : "border-line bg-surface hover:border-zinc-300 hover:bg-zinc-50"
      }`}
    >
      {label}
      <span className={`text-xs tabular-nums ${active ? "text-white/80" : "text-muted"}`}>{count}</span>
    </button>
  );
}

function Statuses({ product }: { product: StatProduct }) {
  return (
    <div className="flex flex-wrap gap-1">
      <StockBadge stock={product.stock} />
      {product.sold <= 0 && <Badge>Не продавался</Badge>}
    </div>
  );
}

/** Аналитика товаров: быстрые срезы, фильтры, таблица и сводка по категориям */
export function AnalyticsPanel({ products }: { products: StatProduct[] }) {
  const [category, setCategory] = useState("");
  const [stock, setStock] = useState<StockFilter>("all");
  const [sales, setSales] = useState<SalesFilter>("all");
  const [minSold, setMinSold] = useState("");
  const [sort, setSort] = useState<Sort>("sold");

  // категории: у телефонов — бренды, у аксессуаров — их категории
  const groups = new Map<string, { id: string; section: string; name: string; items: StatProduct[] }>();
  for (const p of products) {
    const id = groupId(p);
    if (!groups.has(id)) groups.set(id, { id, section: productSection(p), name: productCategory(p), items: [] });
    groups.get(id)!.items.push(p);
  }
  // «Телефоны» раньше «Аксессуаров», внутри раздела — по алфавиту
  const categories = [...groups.values()].sort(
    (a, b) => b.section.localeCompare(a.section, "ru") || a.name.localeCompare(b.name, "ru"),
  );
  const sections = [...new Set(categories.map((c) => c.section))];

  const min = Math.max(0, Number(minSold) || 0);
  const rows = products
    .filter((p) => {
      if (category.startsWith("section:")) {
        if (productSection(p) !== category.slice("section:".length)) return false;
      } else if (category && groupId(p) !== category) return false;
      if (stock === "in" && p.stock <= 0) return false;
      if (stock === "out" && p.stock > 0) return false;
      if (sales === "sold" && p.sold <= 0) return false;
      if (sales === "unsold" && p.sold > 0) return false;
      return p.sold >= min;
    })
    .sort(SORTERS[sort]);

  const count = (test: (p: StatProduct) => boolean) => products.filter(test).length;
  const applyPreset = (s: StockFilter, v: SalesFilter, order: Sort) => {
    setStock(s);
    setSales(v);
    setSort(order);
    setMinSold("");
  };
  const isPreset = (s: StockFilter, v: SalesFilter) => stock === s && sales === v && !minSold;
  const filtered = Boolean(category || stock !== "all" || sales !== "all" || minSold);

  return (
    <div className="space-y-8">
      <section aria-labelledby="analytics-products" className="scroll-mt-24" id="analytics-products-section">
        <h2 id="analytics-products" className="mb-3 text-lg font-semibold tracking-tight">
          Товары
        </h2>

        <div className="-mx-4 mb-3 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] sm:mx-0 sm:flex-wrap sm:px-0">
          <Preset active={isPreset("all", "all")} onClick={() => applyPreset("all", "all", "sold")} label="Все" count={products.length} />
          <Preset active={isPreset("in", "all")} onClick={() => applyPreset("in", "all", "stock")} label="В наличии" count={count((p) => p.stock > 0)} />
          <Preset active={isPreset("out", "all")} onClick={() => applyPreset("out", "all", "name")} label="Нет в наличии — пополнить" count={count((p) => p.stock <= 0)} />
          <Preset active={isPreset("all", "sold")} onClick={() => applyPreset("all", "sold", "sold")} label="Продавались" count={count((p) => p.sold > 0)} />
          <Preset active={isPreset("all", "unsold")} onClick={() => applyPreset("all", "unsold", "name")} label="Не продавались" count={count((p) => p.sold <= 0)} />
        </div>

        <div className="card mb-3 grid grid-cols-2 gap-3 p-3 sm:p-4 lg:grid-cols-5">
          <div className="col-span-2 lg:col-span-1">
            <label htmlFor="an-category" className="label">
              Категория
            </label>
            <Select id="an-category" value={category} onChange={(e) => setCategory(e.target.value)}>
              <option value="">Все категории</option>
              {sections.map((section) => (
                <optgroup key={section} label={section}>
                  <option value={`section:${section}`}>Все {section.toLowerCase()}</option>
                  {categories
                    .filter((c) => c.section === section)
                    .map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                </optgroup>
              ))}
            </Select>
          </div>
          <div>
            <label htmlFor="an-stock" className="label">
              Наличие
            </label>
            <Select id="an-stock" value={stock} onChange={(e) => setStock(e.target.value as StockFilter)}>
              <option value="all">Любое</option>
              <option value="in">В наличии</option>
              <option value="out">Нет в наличии</option>
            </Select>
          </div>
          <div>
            <label htmlFor="an-sales" className="label">
              Продажи
            </label>
            <Select id="an-sales" value={sales} onChange={(e) => setSales(e.target.value as SalesFilter)}>
              <option value="all">Все</option>
              <option value="sold">Продавался</option>
              <option value="unsold">Не продавался</option>
            </Select>
          </div>
          <div>
            <label htmlFor="an-min" className="label">
              Продано от, шт.
            </label>
            <input
              id="an-min"
              type="number"
              min={0}
              step={1}
              inputMode="numeric"
              placeholder="0"
              value={minSold}
              onChange={(e) => setMinSold(e.target.value)}
              className="control"
            />
          </div>
          <div>
            <label htmlFor="an-sort" className="label">
              Сортировка
            </label>
            <Select id="an-sort" value={sort} onChange={(e) => setSort(e.target.value as Sort)}>
              <option value="sold">По продажам</option>
              <option value="revenue">По сумме продаж</option>
              <option value="stock">По остатку ↑</option>
              <option value="name">По названию</option>
            </Select>
          </div>
        </div>

        <div className="mb-3 flex min-h-6 items-center justify-between gap-3">
          <p className="text-sm text-muted" aria-live="polite">
            Показано: {rows.length} из {products.length}
          </p>
          {filtered && (
            <button
              onClick={() => {
                setCategory("");
                applyPreset("all", "all", "sold");
              }}
              className="cursor-pointer text-[13px] font-medium text-accent-fg transition-opacity hover:opacity-80"
            >
              Сбросить фильтры
            </button>
          )}
        </div>

        {rows.length === 0 ? (
          <EmptyState icon={<SearchIcon />} title="Товаров с такими условиями нет" text="Измените фильтры, чтобы увидеть товары." />
        ) : (
          <>
            <div className="card hidden overflow-hidden lg:block">
              <table className="w-full text-sm">
                <thead className="border-b border-line bg-zinc-50/60">
                  <tr>
                    <th scope="col" className={TH}>Товар</th>
                    <th scope="col" className={TH}>Категория</th>
                    <th scope="col" className={TH}>Цена</th>
                    <th scope="col" className={TH}>Остаток</th>
                    <th scope="col" className={TH}>Продано</th>
                    <th scope="col" className={TH}>Заказов</th>
                    <th scope="col" className={TH}>Сумма продаж</th>
                    <th scope="col" className={TH}>Статус</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {rows.map((p) => (
                    <tr key={p.id} className="transition-colors hover:bg-zinc-50">
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-3">
                          <PhoneImage
                            src={p.image}
                            alt=""
                            placeholder={p.kind === "accessory" ? "box" : "phone"}
                            className="size-10 shrink-0 rounded-lg"
                          />
                          <span className="font-medium">{p.name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-2.5">
                        <span className="block">{productCategory(p)}</span>
                        <span className="text-xs text-muted">{productSection(p)}</span>
                      </td>
                      <td className="whitespace-nowrap px-4 py-2.5 tabular-nums">{formatPrice(p.price)}</td>
                      <td className={`px-4 py-2.5 tabular-nums ${p.stock <= 0 ? "font-medium text-red-600" : ""}`}>{p.stock}</td>
                      <td className="px-4 py-2.5 font-medium tabular-nums">{p.sold}</td>
                      <td className="px-4 py-2.5 tabular-nums">{p.orders_count}</td>
                      <td className="whitespace-nowrap px-4 py-2.5 tabular-nums">{p.revenue > 0 ? formatPrice(p.revenue) : "—"}</td>
                      <td className="px-4 py-2.5">
                        <Statuses product={p} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <ul className="grid gap-3 sm:grid-cols-2 lg:hidden">
              {rows.map((p) => (
                <li key={p.id} className="card p-3">
                  <div className="flex gap-3">
                    <PhoneImage
                      src={p.image}
                      alt=""
                      placeholder={p.kind === "accessory" ? "box" : "phone"}
                      className="size-14 shrink-0 rounded-lg"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-[11px] font-medium uppercase tracking-wider text-muted">
                        {productSection(p)} · {productCategory(p)}
                      </p>
                      <p className="font-medium leading-snug [overflow-wrap:anywhere]">{p.name}</p>
                      <p className="mt-0.5 text-sm tabular-nums">{formatPrice(p.price)}</p>
                    </div>
                  </div>
                  <dl className="mt-3 grid grid-cols-3 gap-2 border-t border-line pt-3 text-center text-sm">
                    <div>
                      <dt className="text-xs text-muted">Остаток</dt>
                      <dd className={`font-semibold tabular-nums ${p.stock <= 0 ? "text-red-600" : ""}`}>{p.stock}</dd>
                    </div>
                    <div>
                      <dt className="text-xs text-muted">Продано</dt>
                      <dd className="font-semibold tabular-nums">{p.sold}</dd>
                    </div>
                    <div>
                      <dt className="text-xs text-muted">Заказов</dt>
                      <dd className="font-semibold tabular-nums">{p.orders_count}</dd>
                    </div>
                  </dl>
                  <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                    <Statuses product={p} />
                    {p.revenue > 0 && <span className="text-[13px] text-muted">Продажи: {formatPrice(p.revenue)}</span>}
                  </div>
                </li>
              ))}
            </ul>
          </>
        )}
      </section>

      <section aria-labelledby="analytics-categories">
        <h2 id="analytics-categories" className="mb-3 text-lg font-semibold tracking-tight">
          По категориям
        </h2>
        <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {categories.map((c) => {
            const inStock = c.items.filter((p) => p.stock > 0).length;
            const out = c.items.length - inStock;
            const sold = c.items.reduce((n, p) => n + p.sold, 0);
            const best = [...c.items].sort(SORTERS.sold)[0];
            const unsold = c.items.filter((p) => p.sold <= 0);
            return (
              <li key={c.id} className="card flex flex-col p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[11px] font-medium uppercase tracking-wider text-muted">{c.section}</p>
                    <h3 className="font-semibold">{c.name}</h3>
                  </div>
                  <button
                    onClick={() => {
                      setCategory(c.id);
                      document.getElementById("analytics-products-section")?.scrollIntoView({ behavior: "smooth", block: "start" });
                    }}
                    className="shrink-0 cursor-pointer text-[13px] font-medium text-accent-fg transition-opacity hover:opacity-80"
                  >
                    Показать товары
                  </button>
                </div>
                <dl className="mt-3 grid grid-cols-4 gap-2 text-center text-sm">
                  <div>
                    <dt className="text-xs text-muted">Товаров</dt>
                    <dd className="font-semibold tabular-nums">{c.items.length}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-muted">В наличии</dt>
                    <dd className="font-semibold tabular-nums text-emerald-700">{inStock}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-muted">Нет</dt>
                    <dd className={`font-semibold tabular-nums ${out > 0 ? "text-red-600" : ""}`}>{out}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-muted">Продано</dt>
                    <dd className="font-semibold tabular-nums">{sold}</dd>
                  </div>
                </dl>
                <div className="mt-3 space-y-1 border-t border-line pt-3 text-[13px]">
                  <p>
                    <span className="text-muted">Лучше всего продаётся: </span>
                    {best && best.sold > 0 ? `${best.name} — ${best.sold} шт.` : "продаж пока нет"}
                  </p>
                  <p>
                    <span className="text-muted">Не продаются: </span>
                    {unsold.length === 0
                      ? "таких нет"
                      : unsold.length <= 3
                        ? unsold.map((p) => p.name).join(", ")
                        : `${unsold
                            .slice(0, 3)
                            .map((p) => p.name)
                            .join(", ")} и ещё ${unsold.length - 3}`}
                  </p>
                </div>
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}
