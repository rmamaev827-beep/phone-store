"use client";

import Link from "next/link";
import { PhoneImage } from "@/components/ProductCard";
import { Button, ButtonLink } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { CartIcon, TrashIcon } from "@/components/ui/Icons";
import { Loading, Skeleton } from "@/components/ui/Skeleton";
import { Stepper } from "@/components/ui/Stepper";
import { toast } from "@/components/ui/Toast";
import { formatPrice, formatStorage, phoneTitle } from "@/lib/api";
import { useCart } from "@/lib/cart";

export default function CartPage() {
  const { items, ready, count, total, setQuantity, remove, clear } = useCart();

  if (!ready) {
    return (
      <Loading label="Загрузка корзины">
        <Skeleton className="mb-5 h-8 w-40" />
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
          <Skeleton className="h-64 rounded-xl" />
          <Skeleton className="h-44 rounded-xl" />
        </div>
      </Loading>
    );
  }

  if (items.length === 0) {
    return (
      <EmptyState
        icon={<CartIcon />}
        title="Ваша корзина пуста"
        text="Добавьте товары, чтобы оформить заказ"
        action={<ButtonLink href="/#catalog">Перейти в каталог</ButtonLink>}
      />
    );
  }

  return (
    <>
      <div className="mb-4 flex items-center justify-between gap-4 sm:mb-6">
        <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">Корзина</h1>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            clear();
            toast.success("Корзина очищена");
          }}
          className="-mr-2 hover:text-red-600"
        >
          <TrashIcon className="size-4" />
          Очистить корзину
        </Button>
      </div>

      <div className="grid grid-cols-1 items-start gap-4 sm:gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <ul className="card divide-y divide-line">
          {items.map((item) => {
            const title = phoneTitle(item);
            return (
              <li key={item.id} className="flex gap-3 p-3 sm:gap-4 sm:p-4">
                <Link href={`/products/${item.id}`} className="shrink-0 rounded-lg" aria-label={title}>
                  <PhoneImage src={item.image} alt={title} className="size-16 rounded-lg min-[360px]:size-20 sm:size-24" />
                </Link>

                <div className="flex min-w-0 flex-1 flex-col">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <Link href={`/products/${item.id}`} className="font-medium leading-snug transition-colors hover:text-accent-fg">
                        {title}
                      </Link>
                      <p className="mt-0.5 text-[13px] text-muted">
                        {formatStorage(item.storage)} · {item.ram} GB RAM
                      </p>
                      <p className="mt-0.5 text-[13px] text-muted">{formatPrice(item.price)} за шт.</p>
                    </div>
                    <button
                      onClick={() => {
                        remove(item.id);
                        toast.success("Товар удалён из корзины");
                      }}
                      aria-label={`Удалить ${title} из корзины`}
                      className="-mr-1.5 -mt-1 flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-lg text-muted transition-colors hover:bg-red-50 hover:text-red-600"
                    >
                      <TrashIcon className="size-4.5" />
                    </button>
                  </div>

                  <div className="mt-auto flex flex-wrap items-center gap-x-3 gap-y-2 pt-3">
                    <Stepper
                      value={item.quantity}
                      onChange={(q) => setQuantity(item.id, q)}
                      min={1}
                      max={item.stock}
                      labels={{ decrease: "Уменьшить количество", increase: "Увеличить количество" }}
                      maxTitle="Больше нет на складе"
                    />
                    <span key={item.quantity} className="ml-auto animate-fade whitespace-nowrap font-semibold tabular-nums">
                      {formatPrice(item.price * item.quantity)}
                    </span>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>

        <aside aria-label="Итог заказа" className="card p-4 sm:p-5 lg:sticky lg:top-24">
          <h2 className="mb-3 font-semibold">Ваш заказ</h2>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-muted">Товары, {count} шт.</dt>
              <dd className="tabular-nums">{formatPrice(total)}</dd>
            </div>
            <div className="flex justify-between gap-4 border-t border-line pt-3 text-base font-semibold">
              <dt>Итого</dt>
              <dd key={total} className="animate-fade tabular-nums">
                {formatPrice(total)}
              </dd>
            </div>
          </dl>
          <ButtonLink href="/checkout" size="lg" className="mt-4 w-full">
            Оформить заказ
          </ButtonLink>
          <ButtonLink href="/#catalog" variant="ghost" size="sm" className="mt-2 w-full">
            Продолжить покупки
          </ButtonLink>
        </aside>
      </div>
    </>
  );
}
