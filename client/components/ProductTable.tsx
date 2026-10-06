"use client";

import { type StatProduct, formatPrice, productCategory, productSpecs } from "@/lib/api";
import { PhoneImage } from "./ProductCard";
import { StockBadge } from "./ui/Badge";
import { Button } from "./ui/Button";
import { EditIcon, TrashIcon } from "./ui/Icons";
import { Stepper } from "./ui/Stepper";

type Props = {
  products: StatProduct[];
  /** телефоны или аксессуары: от этого зависят подписи и третья колонка */
  variant: "phone" | "accessory";
  /** id товаров, по которым сейчас идёт запрос */
  busy: number[];
  onStock: (product: StatProduct, stock: number) => void;
  onEdit: (product: StatProduct) => void;
  onDelete: (product: StatProduct) => void;
};

const STOCK_LABELS = { decrease: "Уменьшить остаток", increase: "Увеличить остаток" };
const TH = "px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted";

function Actions({ product, onEdit, onDelete }: Pick<Props, "onEdit" | "onDelete"> & { product: StatProduct }) {
  return (
    <div className="flex gap-1">
      <Button variant="ghost" size="icon" onClick={() => onEdit(product)} aria-label={`Изменить ${product.name}`} title="Изменить">
        <EditIcon className="size-4.5" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => onDelete(product)}
        aria-label={`Удалить ${product.name}`}
        title="Удалить"
        className="hover:bg-red-50 hover:text-red-600"
      >
        <TrashIcon className="size-4.5" />
      </Button>
    </div>
  );
}

/** Таблица товаров админки: на широком экране — таблица, на узком — карточки без горизонтальной прокрутки */
export function ProductTable({ products, variant, busy, onStock, onEdit, onDelete }: Props) {
  const accessory = variant === "accessory";
  const placeholder = accessory ? "box" : "phone";

  return (
    <>
      <div className="card hidden overflow-hidden lg:block">
        <table className="w-full text-sm">
          <thead className="border-b border-line bg-zinc-50/60">
            <tr>
              <th scope="col" className={TH}>Фото</th>
              <th scope="col" className={TH}>Название</th>
              <th scope="col" className={TH}>{accessory ? "Категория" : "Бренд"}</th>
              <th scope="col" className={TH}>Цена</th>
              <th scope="col" className={TH}>Остаток</th>
              <th scope="col" className={TH}>Продано</th>
              <th scope="col" className={TH}>Статус</th>
              <th scope="col" className={`${TH} text-right`}>Действия</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {products.map((p) => (
              <tr key={p.id} className="transition-colors hover:bg-zinc-50">
                <td className="px-4 py-2.5">
                  <PhoneImage src={p.image} alt="" placeholder={placeholder} className="size-12 rounded-lg" />
                </td>
                <td className="px-4 py-2.5">
                  <span className="block font-medium">{p.name}</span>
                  {!accessory && <span className="whitespace-nowrap text-[13px] text-muted">{productSpecs(p)}</span>}
                </td>
                <td className="px-4 py-2.5 text-muted">{productCategory(p)}</td>
                <td className="whitespace-nowrap px-4 py-2.5 font-medium tabular-nums">{formatPrice(p.price)}</td>
                <td className="px-4 py-2.5">
                  <Stepper value={p.stock} onChange={(v) => onStock(p, v)} disabled={busy.includes(p.id)} labels={STOCK_LABELS} />
                </td>
                <td className="whitespace-nowrap px-4 py-2.5 tabular-nums">{p.sold} шт.</td>
                <td className="px-4 py-2.5">
                  <StockBadge stock={p.stock} />
                </td>
                <td className="px-4 py-2.5">
                  <div className="flex justify-end">
                    <Actions product={p} onEdit={onEdit} onDelete={onDelete} />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ul className="grid gap-3 sm:grid-cols-2 lg:hidden">
        {products.map((p) => (
          <li key={p.id} className="card p-3">
            <div className="flex gap-3">
              <PhoneImage src={p.image} alt="" placeholder={placeholder} className="size-16 shrink-0 rounded-lg" />
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-medium uppercase tracking-wider text-muted">{productCategory(p)}</p>
                <p className="font-medium leading-snug [overflow-wrap:anywhere]">{p.name}</p>
                {!accessory && <p className="text-[13px] text-muted">{productSpecs(p)}</p>}
                <p className="mt-1 font-semibold tabular-nums">{formatPrice(p.price)}</p>
              </div>
              <div className="-mr-1 -mt-1">
                <Actions product={p} onEdit={onEdit} onDelete={onDelete} />
              </div>
            </div>
            <div className="mt-3 flex flex-wrap items-center justify-between gap-x-3 gap-y-2 border-t border-line pt-3">
              <span className="text-[13px] text-muted">Продано: {p.sold} шт.</span>
              <div className="flex items-center gap-2">
                <StockBadge stock={p.stock} />
                <Stepper value={p.stock} onChange={(v) => onStock(p, v)} disabled={busy.includes(p.id)} labels={STOCK_LABELS} />
              </div>
            </div>
          </li>
        ))}
      </ul>
    </>
  );
}
