"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { CloseIcon } from "./ui/Icons";

type Option = { value: string; label: string };

export const BRANDS: Option[] = [
  { value: "Apple", label: "Apple" },
  { value: "Samsung", label: "Samsung" },
  { value: "Xiaomi", label: "Xiaomi" },
  { value: "Google", label: "Google" },
  { value: "Huawei", label: "Huawei" },
  { value: "other", label: "Другие" },
];
export const STORAGE: Option[] = [
  { value: "64", label: "64 GB" },
  { value: "128", label: "128 GB" },
  { value: "256", label: "256 GB" },
  { value: "512", label: "512 GB" },
  { value: "1024", label: "1 TB" },
];
export const RAM: Option[] = ["4", "6", "8", "12", "16"].map((v) => ({ value: v, label: `${v} GB` }));
export const SORTS: Option[] = [
  { value: "new", label: "Новинки" },
  { value: "popular", label: "Популярные" },
  { value: "price_asc", label: "По цене ↑" },
  { value: "price_desc", label: "По цене ↓" },
];

const GROUPS = [
  { key: "brand", title: "Бренд", options: BRANDS, chip: (o: Option) => o.label },
  { key: "storage", title: "Память", options: STORAGE, chip: (o: Option) => o.label },
  { key: "ram", title: "RAM", options: RAM, chip: (o: Option) => `${o.label} RAM` },
];
const FILTER_KEYS = ["brand", "storage", "ram", "minPrice", "maxPrice", "q"];

const money = (v: string) => Number(v).toLocaleString("ru-RU");

/** Состояние фильтров живёт в адресной строке и уходит в API как есть */
export function useFilters() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const qs = searchParams.toString();

  // router.replace применяется не мгновенно: при быстрых кликах подряд
  // следующий фильтр должен строиться от уже отправленного, а не от старого URL
  const pending = useRef<string | null>(null);
  useEffect(() => {
    pending.current = null;
  }, [qs]);

  function update(mutate: (params: URLSearchParams) => void) {
    const params = new URLSearchParams(pending.current ?? qs);
    mutate(params);
    const next = params.toString();
    pending.current = next;
    router.replace(next ? `/?${next}` : "/", { scroll: false });
  }

  const get = (key: string) => searchParams.get(key) || "";
  const list = (key: string) => get(key).split(",").filter(Boolean);

  const set = (key: string, value: string) => update((p) => (value ? p.set(key, value) : p.delete(key)));

  const toggle = (key: string, value: string) =>
    update((p) => {
      const current = (p.get(key) || "").split(",").filter(Boolean);
      const next = current.includes(value) ? current.filter((v) => v !== value) : [...current, value];
      if (next.length) p.set(key, next.join(","));
      else p.delete(key);
    });

  // сортировка — не фильтр, при сбросе её сохраняем
  const reset = () => update((p) => FILTER_KEYS.forEach((k) => p.delete(k)));

  const chips: { id: string; label: string; remove: () => void }[] = [];
  if (get("q")) chips.push({ id: "q", label: `Поиск: ${get("q")}`, remove: () => set("q", "") });
  for (const g of GROUPS) {
    for (const value of list(g.key)) {
      const option = g.options.find((o) => o.value === value);
      if (option) chips.push({ id: `${g.key}-${value}`, label: g.chip(option), remove: () => toggle(g.key, value) });
    }
  }
  if (get("minPrice")) chips.push({ id: "min", label: `от ${money(get("minPrice"))} сом`, remove: () => set("minPrice", "") });
  if (get("maxPrice")) chips.push({ id: "max", label: `до ${money(get("maxPrice"))} сом`, remove: () => set("maxPrice", "") });

  return { qs, get, list, set, toggle, reset, chips };
}

export type Filters = ReturnType<typeof useFilters>;

function PriceInput({ label, value, onCommit }: { label: string; value: string; onCommit: (value: string) => void }) {
  const [draft, setDraft] = useState(value);
  useEffect(() => setDraft(value), [value]);

  // применяем через паузу после ввода, чтобы не дёргать API на каждую цифру
  useEffect(() => {
    if (draft === value) return;
    const t = setTimeout(() => onCommit(draft), 400);
    return () => clearTimeout(t);
  }, [draft, value, onCommit]);

  return (
    <input
      type="number"
      min={0}
      step={1000}
      inputMode="numeric"
      placeholder={label}
      aria-label={`Цена ${label.toLowerCase()}, сом`}
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      className="control"
    />
  );
}

export function FilterPanel({ filters }: { filters: Filters }) {
  return (
    <div className="divide-y divide-line">
      {GROUPS.slice(0, 1).map((g) => (
        <CheckGroup key={g.key} group={g} filters={filters} />
      ))}
      <fieldset className="py-3.5">
        <legend className="mb-2.5 float-left w-full text-sm font-semibold">Цена, сом</legend>
        <div className="clear-both grid grid-cols-2 gap-2">
          <PriceInput label="От" value={filters.get("minPrice")} onCommit={(v) => filters.set("minPrice", v)} />
          <PriceInput label="До" value={filters.get("maxPrice")} onCommit={(v) => filters.set("maxPrice", v)} />
        </div>
      </fieldset>
      {GROUPS.slice(1).map((g) => (
        <CheckGroup key={g.key} group={g} filters={filters} />
      ))}
    </div>
  );
}

function CheckGroup({ group, filters }: { group: (typeof GROUPS)[number]; filters: Filters }) {
  const selected = filters.list(group.key);
  return (
    <fieldset className="py-3.5 first:pt-0 last:pb-0">
      <legend className="float-left mb-1.5 w-full text-sm font-semibold">{group.title}</legend>
      <div className="clear-both -mx-2">
        {group.options.map((o) => (
          <label
            key={o.value}
            className="flex cursor-pointer items-center gap-2.5 rounded-md px-2 py-1 text-sm transition-colors hover:bg-zinc-50"
          >
            <input
              type="checkbox"
              checked={selected.includes(o.value)}
              onChange={() => filters.toggle(group.key, o.value)}
              className="size-4 cursor-pointer accent-accent"
            />
            {o.label}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

export function ActiveFilters({ filters }: { filters: Filters }) {
  if (!filters.chips.length) return null;
  return (
    <ul aria-label="Активные фильтры" className="mb-4 flex flex-wrap items-center gap-2">
      {filters.chips.map((chip) => (
        <li key={chip.id} className="animate-fade">
          <button
            onClick={chip.remove}
            aria-label={`Убрать фильтр: ${chip.label}`}
            className="group/chip flex h-8 cursor-pointer items-center gap-1 rounded-full border border-line bg-surface pl-3 pr-2 text-[13px] transition-colors hover:border-zinc-300 hover:bg-zinc-50"
          >
            <span className="max-w-[12rem] truncate">{chip.label}</span>
            <CloseIcon className="size-3.5 text-muted group-hover/chip:text-ink" />
          </button>
        </li>
      ))}
      <li>
        <button
          onClick={filters.reset}
          className="h-8 cursor-pointer rounded-full px-2 text-[13px] font-medium text-accent-fg transition-colors hover:opacity-80"
        >
          Сбросить
        </button>
      </li>
    </ul>
  );
}
