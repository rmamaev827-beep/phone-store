"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { PhoneImage } from "@/components/ProductCard";
import { Badge } from "@/components/ui/Badge";
import { Button, ButtonLink } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { AlertIcon, CartIcon } from "@/components/ui/Icons";
import { Input, Textarea } from "@/components/ui/Input";
import { Loading, Skeleton } from "@/components/ui/Skeleton";
import { toast } from "@/components/ui/Toast";
import { type CheckoutOptions, type Order, api, deliveryCost, formatPrice, phoneTitle } from "@/lib/api";
import { useCart } from "@/lib/cart";

type Errors = Partial<Record<"customer_name" | "phone" | "address", string>>;
type PaymentMethod = "card" | "cash";

// те же правила, что проверяет сервер
function validate(form: FormData, needsAddress: boolean): Errors {
  const errors: Errors = {};
  const text = (key: string) => String(form.get(key) ?? "").trim();
  if (text("customer_name").length < 2) errors.customer_name = "Укажите имя";
  if (!text("phone")) errors.phone = "Укажите номер телефона";
  else if (text("phone").replace(/\D/g, "").length < 9) errors.phone = "Номер слишком короткий — минимум 9 цифр";
  if (needsAddress && text("address").length < 5) errors.address = "Укажите адрес доставки";
  return errors;
}

/** Карточка-переключатель: способ доставки или оплаты */
function OptionCard({
  name,
  value,
  checked,
  onChange,
  disabled,
  title,
  note,
  aside,
}: {
  name: string;
  value: string;
  checked: boolean;
  onChange: () => void;
  disabled: boolean;
  title: string;
  note: React.ReactNode;
  aside?: React.ReactNode;
}) {
  return (
    <label
      className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition-colors duration-150 has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-accent-fg ${
        checked ? "border-accent bg-accent-soft" : "border-line bg-surface hover:border-zinc-300"
      } ${disabled ? "cursor-not-allowed opacity-60" : ""}`}
    >
      <input
        type="radio"
        name={name}
        value={value}
        checked={checked}
        onChange={onChange}
        disabled={disabled}
        className="mt-0.5 size-4 shrink-0 cursor-pointer accent-accent outline-none"
      />
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-medium">{title}</span>
        <span className="mt-0.5 block text-[13px] text-muted">{note}</span>
      </span>
      {aside && <span className="shrink-0 whitespace-nowrap text-sm font-medium">{aside}</span>}
    </label>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <fieldset className="border-t border-line pt-5 first:border-0 first:pt-0">
      <legend className="float-left mb-3 w-full font-semibold">{title}</legend>
      <div className="clear-both space-y-4">{children}</div>
    </fieldset>
  );
}

export default function CheckoutPage() {
  const router = useRouter();
  const { items, ready, count, total, clear } = useCart();

  const [options, setOptions] = useState<CheckoutOptions | null>(null);
  const [optionsError, setOptionsError] = useState("");
  const [attempt, setAttempt] = useState(0);
  const [deliveryId, setDeliveryId] = useState("courier");
  const [payment, setPayment] = useState<PaymentMethod>("card");

  const [errors, setErrors] = useState<Errors>({});
  const [serverError, setServerError] = useState("");
  const [sending, setSending] = useState(false);
  // после создания заказа корзина пустеет — не показываем «корзина пуста», пока идёт переход
  const [leaving, setLeaving] = useState(false);
  // состояние обновляется не мгновенно — от двойного клика защищает ref
  const inFlight = useRef(false);

  useEffect(() => {
    api<CheckoutOptions>("/checkout/options")
      .then((o) => {
        setOptions(o);
        setOptionsError("");
      })
      .catch((e) => setOptionsError(e.message));
  }, [attempt]);

  const delivery = options?.delivery.find((d) => d.id === deliveryId) ?? options?.delivery[0];
  const shipping = delivery ? deliveryCost(delivery, total) : 0;

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (inFlight.current || !delivery) return;
    const formEl = e.currentTarget;
    const form = new FormData(formEl);

    const found = validate(form, delivery.needsAddress);
    setErrors(found);
    const firstInvalid = Object.keys(found)[0];
    if (firstInvalid) {
      formEl.querySelector<HTMLElement>(`[name="${firstInvalid}"]`)?.focus();
      return;
    }

    inFlight.current = true;
    setSending(true);
    setServerError("");
    try {
      const { order, payment_url } = await api<{ order: Order; payment_url: string | null }>("/orders", {
        method: "POST",
        json: {
          customer_name: form.get("customer_name"),
          phone: form.get("phone"),
          address: form.get("address"),
          comment: form.get("comment"),
          delivery_method: delivery.id,
          payment_method: payment,
          items: items.map((i) => ({ product_id: i.id, quantity: i.quantity })),
        },
      });
      setLeaving(true);
      clear();
      if (payment_url) {
        // страница оплаты провайдера (в демо-режиме — её имитация)
        window.location.assign(payment_url);
      } else {
        if (payment === "cash") toast.success("Заказ успешно создан");
        router.push(`/order/${order.id}?key=${order.access_key}`);
      }
    } catch (err) {
      const message = (err as Error).message;
      setServerError(message);
      toast.error(message);
      inFlight.current = false;
      setSending(false);
    }
  }

  if (optionsError) {
    return (
      <EmptyState
        tone="danger"
        icon={<AlertIcon />}
        title="Не удалось открыть оформление заказа"
        text={optionsError}
        action={
          <Button variant="outline" onClick={() => setAttempt((n) => n + 1)}>
            Повторить
          </Button>
        }
      />
    );
  }

  if (!ready || !options || !delivery || leaving) {
    return (
      <Loading label="Загрузка">
        <Skeleton className="mb-5 h-8 w-56" />
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
          <Skeleton className="h-[34rem] rounded-xl" />
          <Skeleton className="h-64 rounded-xl" />
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

  // ошибка поля пропадает, как только пользователь начинает его исправлять
  const clearError = (e: React.FormEvent<HTMLFormElement>) => {
    const name = (e.target as HTMLInputElement).name as keyof Errors;
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: undefined }));
  };

  const priceLabel = (cost: number) => (cost === 0 ? "Бесплатно" : formatPrice(cost));

  return (
    <>
      <h1 className="mb-4 text-xl font-semibold tracking-tight sm:mb-6 sm:text-2xl">Оформление заказа</h1>

      <div className="grid grid-cols-1 items-start gap-4 sm:gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <form id="checkout-form" onSubmit={submit} onChange={clearError} noValidate className="card space-y-5 p-4 sm:p-6">
          <Section title="Контактные данные">
            <div className="grid gap-4 sm:grid-cols-2">
              <Input
                label="Имя"
                name="customer_name"
                required
                autoComplete="name"
                placeholder="Как к вам обращаться"
                disabled={sending}
                error={errors.customer_name}
              />
              <Input
                label="Телефон"
                name="phone"
                type="tel"
                required
                autoComplete="tel"
                placeholder="+996 555 123 456"
                disabled={sending}
                error={errors.phone}
              />
            </div>
          </Section>

          <Section title="Доставка">
            <div className="space-y-2">
              {options.delivery.map((d) => {
                const cost = deliveryCost(d, total);
                return (
                  <OptionCard
                    key={d.id}
                    name="delivery_method"
                    value={d.id}
                    checked={d.id === delivery.id}
                    onChange={() => setDeliveryId(d.id)}
                    disabled={sending}
                    title={d.title}
                    note={
                      d.freeFrom !== null && cost > 0 ? `${d.note} · бесплатно от ${formatPrice(d.freeFrom)}` : d.note
                    }
                    aside={priceLabel(cost)}
                  />
                );
              })}
            </div>
            {delivery.needsAddress && (
              <Input
                label="Адрес доставки"
                name="address"
                required
                autoComplete="street-address"
                placeholder={delivery.id === "region" ? "Город, улица, дом, квартира" : "Улица, дом, квартира"}
                disabled={sending}
                error={errors.address}
              />
            )}
            <Textarea
              label="Комментарий"
              name="comment"
              rows={2}
              placeholder="Удобное время, подъезд, домофон"
              disabled={sending}
            />
          </Section>

          <Section title="Оплата">
            <div className="space-y-2">
              <OptionCard
                name="payment_method"
                value="card"
                checked={payment === "card"}
                onChange={() => setPayment("card")}
                disabled={sending}
                title="Картой онлайн"
                note={
                  <span className="flex flex-wrap items-center gap-1.5">
                    <Badge>Элкарт</Badge>
                    <Badge>Visa</Badge>
                    <Badge>Mastercard</Badge>
                  </span>
                }
              />
              <OptionCard
                name="payment_method"
                value="cash"
                checked={payment === "cash"}
                onChange={() => setPayment("cash")}
                disabled={sending}
                title="При получении"
                note={delivery.needsAddress ? "Наличными или картой курьеру" : "Наличными или картой в магазине"}
              />
            </div>
            {payment === "card" && (
              <p className="text-[13px] text-muted">
                {options.payment.card.demo
                  ? "Сейчас включён демо-режим оплаты: деньги не списываются, данные карты не запрашиваются."
                  : "Данные карты вводятся на защищённой странице платёжного провайдера — магазин их не видит и не хранит."}
              </p>
            )}
          </Section>

          {serverError && (
            <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700">
              {serverError}
            </p>
          )}
        </form>

        <aside aria-label="Ваш заказ" className="card p-4 sm:p-5 lg:sticky lg:top-24">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-semibold">Ваш заказ</h2>
            <ButtonLink href="/cart" variant="ghost" size="sm" className="-mr-2">
              Изменить
            </ButtonLink>
          </div>
          <ul className="divide-y divide-line">
            {items.map((i) => (
              <li key={i.id} className="flex items-center gap-3 py-2.5">
                <PhoneImage src={i.image} alt="" className="size-12 shrink-0 rounded-md" />
                <div className="min-w-0 flex-1 text-sm">
                  <p className="truncate font-medium">{phoneTitle(i)}</p>
                  <p className="text-[13px] text-muted">
                    {i.quantity} шт. × {formatPrice(i.price)}
                  </p>
                </div>
                <span className="whitespace-nowrap text-sm font-medium tabular-nums">{formatPrice(i.price * i.quantity)}</span>
              </li>
            ))}
          </ul>
          <dl className="mt-1 space-y-2 border-t border-line pt-3 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-muted">Товары, {count} шт.</dt>
              <dd className="tabular-nums">{formatPrice(total)}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted">Доставка</dt>
              <dd key={shipping} className="animate-fade tabular-nums">
                {priceLabel(shipping)}
              </dd>
            </div>
            <div className="flex justify-between gap-4 border-t border-line pt-3 text-base font-semibold">
              <dt>Итого</dt>
              <dd key={total + shipping} className="animate-fade tabular-nums">
                {formatPrice(total + shipping)}
              </dd>
            </div>
          </dl>
          <Button type="submit" form="checkout-form" size="lg" loading={sending} className="mt-4 w-full">
            {sending ? "Отправляем…" : payment === "card" ? "Перейти к оплате" : "Подтвердить заказ"}
          </Button>
        </aside>
      </div>
    </>
  );
}
