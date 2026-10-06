"use client";

import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { Badge } from "@/components/ui/Badge";
import { Button, ButtonLink } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { ReceiptIcon } from "@/components/ui/Icons";
import { Loading, Skeleton } from "@/components/ui/Skeleton";
import { toast } from "@/components/ui/Toast";
import { type Order, api, formatPrice } from "@/lib/api";

// Имитация страницы оплаты провайдера. Намеренно без полей карты:
// настоящие данные карт вводятся только на странице платёжного провайдера.
function DemoPayment() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();
  const key = useSearchParams().get("key") || "";
  const [order, setOrder] = useState<Order | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState<"success" | "fail" | null>(null);

  const orderUrl = `/order/${id}?key=${encodeURIComponent(key)}`;

  useEffect(() => {
    api<Order>(`/orders/${id}/public?key=${encodeURIComponent(key)}`)
      .then(setOrder)
      .catch((e) => setError(e.message));
  }, [id, key]);

  async function finish(result: "success" | "fail") {
    setBusy(result);
    try {
      await api(`/payments/demo/${id}`, { method: "POST", json: { key, result } });
      router.replace(orderUrl);
    } catch (e) {
      toast.error((e as Error).message);
      setBusy(null);
    }
  }

  if (error) {
    return (
      <EmptyState
        icon={<ReceiptIcon />}
        title="Платёж не найден"
        text={error}
        action={<ButtonLink href="/#catalog">Перейти в каталог</ButtonLink>}
      />
    );
  }

  if (!order) {
    return (
      <Loading label="Загрузка платежа">
        <Skeleton className="mx-auto h-80 max-w-md rounded-xl" />
      </Loading>
    );
  }

  if (order.payment_status === "paid") {
    return (
      <EmptyState
        icon={<ReceiptIcon />}
        title="Заказ уже оплачен"
        action={<ButtonLink href={orderUrl}>Открыть заказ</ButtonLink>}
      />
    );
  }

  return (
    <div className="card mx-auto max-w-md animate-fade p-5 sm:p-7">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-lg font-semibold tracking-tight">Оплата картой</h1>
        <Badge tone="warning">Демо-режим</Badge>
      </div>

      <dl className="mt-5 space-y-2 text-sm">
        <div className="flex justify-between gap-4">
          <dt className="text-muted">Магазин</dt>
          <dd>PhoneShop</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-muted">Заказ</dt>
          <dd>№{order.id}</dd>
        </div>
        <div className="flex justify-between gap-4 border-t border-line pt-3 text-base font-semibold">
          <dt>К оплате</dt>
          <dd className="tabular-nums">{formatPrice(order.total_price)}</dd>
        </div>
      </dl>

      <p className="mt-5 rounded-lg border border-line bg-zinc-50 px-3 py-2.5 text-[13px] text-muted">
        Это имитация платёжной страницы: данные карты не запрашиваются и деньги не списываются. После подключения
        платёжного провайдера здесь будет его защищённая форма для карт Элкарт, Visa и Mastercard.
      </p>

      <div className="mt-5 space-y-2">
        <Button size="lg" onClick={() => finish("success")} loading={busy === "success"} disabled={busy !== null} className="w-full">
          Оплатить {formatPrice(order.total_price)}
        </Button>
        <Button variant="outline" onClick={() => finish("fail")} loading={busy === "fail"} disabled={busy !== null} className="w-full">
          Отклонить платёж
        </Button>
      </div>
    </div>
  );
}

export default function DemoPaymentPage() {
  return (
    <Suspense>
      <DemoPayment />
    </Suspense>
  );
}
