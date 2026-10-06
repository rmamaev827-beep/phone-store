"use client";

import { useParams, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";
import { Badge } from "@/components/ui/Badge";
import { Button, ButtonLink } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { AlertIcon, CheckIcon, ReceiptIcon } from "@/components/ui/Icons";
import { Loading, Skeleton } from "@/components/ui/Skeleton";
import { toast } from "@/components/ui/Toast";
import { type Order, api, formatPrice } from "@/lib/api";

const POLL_MS = 3000;
const POLL_LIMIT = 20;

function OrderView() {
  const { id } = useParams<{ id: string }>();
  const key = useSearchParams().get("key") || "";
  const [order, setOrder] = useState<Order | null>(null);
  const [error, setError] = useState("");
  const [paying, setPaying] = useState(false);
  const polls = useRef(0);

  useEffect(() => {
    let stale = false;
    let timer: ReturnType<typeof setTimeout>;
    const load = () =>
      api<Order>(`/orders/${id}/public?key=${encodeURIComponent(key)}`)
        .then((o) => {
          if (stale) return;
          setOrder(o);
          // провайдер подтверждает оплату с небольшой задержкой — ждём, пока статус изменится
          if (o.payment_status === "pending" && polls.current++ < POLL_LIMIT) timer = setTimeout(load, POLL_MS);
        })
        .catch((e) => !stale && setError(e.message));
    load();
    return () => {
      stale = true;
      clearTimeout(timer);
    };
  }, [id, key]);

  async function pay() {
    setPaying(true);
    try {
      const { payment_url } = await api<{ payment_url: string }>(`/orders/${id}/pay?key=${encodeURIComponent(key)}`, {
        method: "POST",
      });
      window.location.assign(payment_url);
    } catch (e) {
      toast.error((e as Error).message);
      setPaying(false);
    }
  }

  if (error) {
    return (
      <EmptyState
        icon={<ReceiptIcon />}
        title="Заказ не найден"
        text="Проверьте ссылку: она должна быть такой же, как после оформления заказа."
        action={<ButtonLink href="/#catalog">Перейти в каталог</ButtonLink>}
      />
    );
  }

  if (!order) {
    return (
      <Loading label="Загрузка заказа">
        <Skeleton className="mx-auto h-[28rem] max-w-lg rounded-xl" />
      </Loading>
    );
  }

  const card = order.payment_method === "card";
  const failed = card && order.payment_status === "failed";
  const pending = card && order.payment_status === "pending";
  const paid = card && order.payment_status === "paid";
  const itemsTotal = order.total_price - order.delivery_price;

  const head = failed
    ? { title: "Оплата не прошла", text: "Заказ сохранён. Попробуйте оплатить ещё раз или выберите другую карту." }
    : pending
      ? { title: "Ожидаем оплату", text: "Если вы уже оплатили, статус обновится автоматически в течение минуты." }
      : { title: "Заказ успешно оформлен", text: "Мы свяжемся с вами для подтверждения заказа." };

  return (
    <div className="card mx-auto max-w-lg animate-fade px-5 py-8 sm:px-8 sm:py-10">
      <div className="text-center">
        <div
          className={`mx-auto mb-4 flex size-14 items-center justify-center rounded-full ${
            failed ? "bg-red-50 text-red-600" : pending ? "bg-amber-50 text-amber-700" : "bg-emerald-50 text-emerald-600"
          }`}
        >
          {failed || pending ? <AlertIcon className="size-7" /> : <CheckIcon className="size-7" strokeWidth={2.25} />}
        </div>
        <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">{head.title}</h1>
        <p className="mt-2 text-sm">
          {failed || pending ? `Заказ №${order.id}` : `Заказ №${order.id} успешно создан`}
        </p>
        <p className="mt-1 text-sm text-muted">{head.text}</p>
        <div className="mt-3 flex justify-center">
          {paid ? (
            <Badge tone="success">Оплачен картой</Badge>
          ) : failed ? (
            <Badge tone="danger">Не оплачен</Badge>
          ) : pending ? (
            <Badge tone="warning">Ожидает оплаты</Badge>
          ) : (
            <Badge>Оплата при получении</Badge>
          )}
        </div>
      </div>

      {(failed || pending) && (
        <Button size="lg" onClick={pay} loading={paying} className="mt-6 w-full">
          {failed ? "Оплатить ещё раз" : "Перейти к оплате"} · {formatPrice(order.total_price)}
        </Button>
      )}

      <dl className="mt-6 space-y-2 border-t border-line pt-4 text-sm">
        <div className="flex justify-between gap-4">
          <dt className="text-muted">Получатель</dt>
          <dd className="text-right">
            {order.customer_name}, {order.phone}
          </dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-muted">Доставка</dt>
          <dd className="text-right">{order.delivery_title}</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-muted">Адрес</dt>
          <dd className="text-right">{order.address}</dd>
        </div>
      </dl>

      <ul className="mt-4 divide-y divide-line border-y border-line text-sm">
        {order.items?.map((i) => (
          <li key={i.id} className="flex justify-between gap-4 py-2.5">
            <span>
              {i.product_name} <span className="text-muted">× {i.quantity}</span>
            </span>
            <span className="whitespace-nowrap font-medium tabular-nums">{formatPrice(i.price * i.quantity)}</span>
          </li>
        ))}
      </ul>
      <dl className="mt-3 space-y-1.5 text-sm">
        <div className="flex justify-between gap-4">
          <dt className="text-muted">Товары</dt>
          <dd className="tabular-nums">{formatPrice(itemsTotal)}</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-muted">Доставка</dt>
          <dd className="tabular-nums">{order.delivery_price === 0 ? "Бесплатно" : formatPrice(order.delivery_price)}</dd>
        </div>
        <div className="flex justify-between gap-4 pt-1 text-base font-semibold">
          <dt>Итого</dt>
          <dd className="tabular-nums">{formatPrice(order.total_price)}</dd>
        </div>
      </dl>

      <ButtonLink href="/#catalog" variant={failed || pending ? "outline" : "primary"} size="lg" className="mt-6 w-full">
        Вернуться в каталог
      </ButtonLink>
    </div>
  );
}

export default function OrderPage() {
  return (
    <Suspense>
      <OrderView />
    </Suspense>
  );
}
