"use client";

import { type Product, formatPrice, formatStorage } from "@/lib/api";
import { PhoneImage } from "./ProductCard";
import { StockBadge } from "./ui/Badge";
import { Button } from "./ui/Button";
import { EditIcon, TrashIcon } from "./ui/Icons";
import { Stepper } from "./ui/Stepper";

type Props = {
  products: Product[];
  /** id товаров, по которым сейчас идёт запрос */
  busy: number[];
  onStock: (product: Product, stock: number) => void;
  onEdit: (product: Product) => void;
  onDelete: (product: Product) => void;
};

const STOCK_LABELS = { decrease: "Уменьшить остаток", increase: "Увеличить остаток" };
const TH = "px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted";

function Actions({ product, onEdit, onDelete }: Pick<Props, "onEdit" | "onDelete"> & { product: Product }) {
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

/** Таблица товаров: на md+ — таблица, на мобильных — карточки без горизонтальной прокрутки */
export function ProductTable({ products, busy, onStock, onEdit, onDelete }: Props) {
  return (
    <>
      <div className="card hidden overflow-hidden md:block">
        <table className="w-full text-sm">
          <thead className="border-b border-line bg-zinc-50/60">
            <tr>
              <th scope="col" className={TH}>Фото</th>
              <th scope="col" className={TH}>Название</th>
              <th scope="col" className={TH}>Бренд</th>
              <th scope="col" className={TH}>Цена</th>
              <th scope="col" className={TH}>Остаток</th>
              <th scope="col" className={`${TH} text-right`}>Действия</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {products.map((p) => (
              <tr key={p.id} className="transition-colors hover:bg-zinc-50">
                <td className="px-4 py-2.5">
                  <PhoneImage src={p.image} alt="" className="size-12 rounded-lg" />
                </td>
                <td className="px-4 py-2.5">
                  <span className="block font-medium">{p.name}</span>
                  <span className="whitespace-nowrap text-[13px] text-muted">
                    {formatStorage(p.storage)} · {p.ram} GB RAM
                  </span>
                </td>
                <td className="px-4 py-2.5 text-muted">{p.brand}</td>
                <td className="whitespace-nowrap px-4 py-2.5 font-medium tabular-nums">{formatPrice(p.price)}</td>
                <td className="px-4 py-2.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <Stepper value={p.stock} onChange={(v) => onStock(p, v)} disabled={busy.includes(p.id)} labels={STOCK_LABELS} />
                    <StockBadge stock={p.stock} />
                  </div>
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

      <ul className="space-y-3 md:hidden">
        {products.map((p) => (
          <li key={p.id} className="card p-3">
            <div className="flex gap-3">
              <PhoneImage src={p.image} alt="" className="size-16 shrink-0 rounded-lg" />
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-medium uppercase tracking-wider text-muted">{p.brand}</p>
                <p className="font-medium leading-snug [overflow-wrap:anywhere]">{p.name}</p>
                <p className="text-[13px] text-muted">
                  {formatStorage(p.storage)} · {p.ram} GB RAM
                </p>
                <p className="mt-1 font-semibold tabular-nums">{formatPrice(p.price)}</p>
              </div>
              <div className="-mr-1 -mt-1">
                <Actions product={p} onEdit={onEdit} onDelete={onDelete} />
              </div>
            </div>
            <div className="mt-3 flex items-center justify-between gap-3 border-t border-line pt-3">
              <span className="text-[13px] text-muted">Остаток</span>
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
