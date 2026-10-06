"use client";

import { useCallback, useEffect, useState } from "react";
import { ContactsForm } from "@/components/ContactsForm";
import { ProductForm } from "@/components/ProductForm";
import { ProductTable } from "@/components/ProductTable";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { AlertIcon, BoxIcon, CheckIcon, LogoutIcon, PhoneIcon, PlusIcon, ReceiptIcon } from "@/components/ui/Icons";
import { Input, Select } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Loading, Skeleton, TableSkeleton } from "@/components/ui/Skeleton";
import { toast } from "@/components/ui/Toast";
import { type Order, type Product, ApiError, api, formatPrice, getToken, setToken } from "@/lib/api";

const STATUSES: Record<string, { label: string; tone: "accent" | "warning" | "success" | "neutral" }> = {
  new: { label: "Новый", tone: "accent" },
  processing: { label: "В обработке", tone: "warning" },
  done: { label: "Выполнен", tone: "success" },
  cancelled: { label: "Отменён", tone: "neutral" },
};

function PaymentBadge({ order }: { order: Order }) {
  if (order.payment_method !== "card") return <Badge>При получении</Badge>;
  if (order.payment_status === "paid") return <Badge tone="success">Оплачен картой</Badge>;
  if (order.payment_status === "failed") return <Badge tone="danger">Оплата не прошла</Badge>;
  return <Badge tone="warning">Ожидает оплаты</Badge>;
}

const formatDate = (iso: string) => new Date(iso).toLocaleString("ru-RU", { dateStyle: "short", timeStyle: "short" });

/* ---------- Вход ---------- */

function Login({ onLogin }: { onLogin: () => void }) {
  const [errors, setErrors] = useState<{ login?: string; password?: string; form?: string }>({});
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (busy) return;
    const form = new FormData(e.currentTarget);
    const login = String(form.get("login") ?? "").trim();
    const password = String(form.get("password") ?? "");
    const found = {
      login: login ? undefined : "Введите логин",
      password: password ? undefined : "Введите пароль",
    };
    setErrors(found);
    if (found.login || found.password) return;

    setBusy(true);
    try {
      const { token } = await api<{ token: string }>("/auth/login", { method: "POST", json: { login, password } });
      setToken(token);
      onLogin();
    } catch (err) {
      setErrors({ form: (err as Error).message });
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} noValidate className="card mx-auto mt-4 max-w-sm space-y-4 p-5 sm:mt-10 sm:p-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Вход в админ-панель</h1>
        <p className="mt-1 text-[13px] text-muted">Логин и пароль задаются в файле server/.env</p>
      </div>
      <Input label="Логин" name="login" required autoComplete="username" disabled={busy} error={errors.login} />
      <Input
        label="Пароль"
        name="password"
        type="password"
        required
        autoComplete="current-password"
        disabled={busy}
        error={errors.password}
      />
      {errors.form && (
        <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700">
          {errors.form}
        </p>
      )}
      <Button type="submit" loading={busy} className="w-full">
        {busy ? "Входим…" : "Войти"}
      </Button>
    </form>
  );
}

/* ---------- Статистика ---------- */

function StatCard({
  icon,
  label,
  value,
  tone = "bg-zinc-100 text-muted",
}: {
  icon: React.ReactNode;
  label: string;
  value: number | null;
  tone?: string;
}) {
  return (
    <div className="card flex flex-col items-start gap-2.5 p-3 sm:flex-row sm:items-center sm:gap-3 sm:p-4">
      <span className={`flex size-10 shrink-0 items-center justify-center rounded-lg ${tone}`}>{icon}</span>
      <div className="min-w-0">
        <p className="text-[13px] leading-tight text-muted">{label}</p>
        {value === null ? (
          <Skeleton className="mt-1 h-6 w-10" />
        ) : (
          <p className="text-xl font-semibold tabular-nums tracking-tight">{value}</p>
        )}
      </div>
    </div>
  );
}

/* ---------- Заказы ---------- */

function OrderDetails({ order }: { order: Order | undefined }) {
  if (!order) {
    return (
      <Loading label="Загрузка заказа">
        <div className="space-y-2">
          <Skeleton className="h-4 w-2/3" />
          <Skeleton className="h-4 w-1/2" />
        </div>
      </Loading>
    );
  }
  return (
    <div className="animate-fade text-sm">
      <p>
        <span className="text-muted">Доставка:</span> {order.delivery_title} ·{" "}
        {order.delivery_price > 0 ? formatPrice(order.delivery_price) : "бесплатно"}
      </p>
      <p className="mt-1">
        <span className="text-muted">Адрес:</span> {order.address}
      </p>
      {order.comment && (
        <p className="mt-1">
          <span className="text-muted">Комментарий:</span> {order.comment}
        </p>
      )}
      <ul className="mt-2 max-w-md space-y-1">
        {order.items?.map((i) => (
          <li key={i.id} className="flex justify-between gap-4">
            <span>
              {i.product_name} <span className="text-muted">× {i.quantity}</span>
            </span>
            <span className="whitespace-nowrap tabular-nums">{formatPrice(i.price * i.quantity)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function StatusSelect({ order, onChange }: { order: Order; onChange: (status: string) => void }) {
  return (
    <Select
      value={order.status}
      onChange={(e) => onChange(e.target.value)}
      aria-label={`Статус заказа №${order.id}`}
      className="h-9! w-40"
    >
      {Object.entries(STATUSES).map(([value, s]) => (
        <option key={value} value={value}>
          {s.label}
        </option>
      ))}
    </Select>
  );
}

function OrdersList({
  orders,
  onStatus,
  onError,
}: {
  orders: Order[];
  onStatus: (id: number, status: string) => void;
  onError: (e: unknown) => void;
}) {
  const [openId, setOpenId] = useState<number | null>(null);
  const [details, setDetails] = useState<Record<number, Order>>({});

  function toggle(id: number) {
    if (openId === id) return setOpenId(null);
    setOpenId(id);
    if (!details[id]) {
      api<Order>(`/orders/${id}`)
        .then((o) => setDetails((d) => ({ ...d, [id]: o })))
        .catch(onError);
    }
  }

  if (orders.length === 0) {
    return <EmptyState icon={<ReceiptIcon />} title="Заказов пока нет" text="Новые заказы появятся здесь." />;
  }

  const th = "px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted";

  return (
    <>
      <div className="card hidden overflow-hidden md:block">
        <table className="w-full text-sm">
          <thead className="border-b border-line bg-zinc-50/60">
            <tr>
              <th scope="col" className={th}>№</th>
              <th scope="col" className={th}>Дата</th>
              <th scope="col" className={th}>Клиент</th>
              <th scope="col" className={th}>Сумма</th>
              <th scope="col" className={th}>Статус</th>
              <th scope="col" className={`${th} text-right`}>Состав</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {orders.map((o) => (
              <OrderRow key={o.id} order={o} open={openId === o.id} details={details[o.id]} onToggle={toggle} onStatus={onStatus} />
            ))}
          </tbody>
        </table>
      </div>

      <ul className="space-y-3 md:hidden">
        {orders.map((o) => (
          <li key={o.id} className="card p-3">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="font-semibold">Заказ №{o.id}</p>
                <p className="text-[13px] text-muted">{formatDate(o.created_at)}</p>
              </div>
              <Badge tone={STATUSES[o.status]?.tone}>{STATUSES[o.status]?.label ?? o.status}</Badge>
            </div>
            <p className="mt-2 text-sm">{o.customer_name}</p>
            <a href={`tel:${o.phone.replace(/[^\d+]/g, "")}`} className="text-[13px] text-accent-fg">
              {o.phone}
            </a>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <span className="font-semibold tabular-nums">{formatPrice(o.total_price)}</span>
              <PaymentBadge order={o} />
            </div>
            <div className="mt-3 flex items-center justify-between gap-2 border-t border-line pt-3">
              <StatusSelect order={o} onChange={(s) => onStatus(o.id, s)} />
              <Button variant="outline" size="sm" onClick={() => toggle(o.id)} aria-expanded={openId === o.id}>
                {openId === o.id ? "Скрыть" : "Состав"}
              </Button>
            </div>
            {openId === o.id && (
              <div className="mt-3 border-t border-line pt-3">
                <OrderDetails order={details[o.id]} />
              </div>
            )}
          </li>
        ))}
      </ul>
    </>
  );
}

function OrderRow({
  order,
  open,
  details,
  onToggle,
  onStatus,
}: {
  order: Order;
  open: boolean;
  details: Order | undefined;
  onToggle: (id: number) => void;
  onStatus: (id: number, status: string) => void;
}) {
  return (
    <>
      <tr className="transition-colors hover:bg-zinc-50">
        <td className="px-4 py-3 font-medium tabular-nums">{order.id}</td>
        <td className="whitespace-nowrap px-4 py-3 text-muted">{formatDate(order.created_at)}</td>
        <td className="px-4 py-3">
          <span className="block">{order.customer_name}</span>
          <span className="text-[13px] text-muted">{order.phone}</span>
        </td>
        <td className="whitespace-nowrap px-4 py-3">
          <span className="block font-medium tabular-nums">{formatPrice(order.total_price)}</span>
          <PaymentBadge order={order} />
        </td>
        <td className="px-4 py-3">
          <StatusSelect order={order} onChange={(s) => onStatus(order.id, s)} />
        </td>
        <td className="px-4 py-3 text-right">
          <Button variant="outline" size="sm" onClick={() => onToggle(order.id)} aria-expanded={open}>
            {open ? "Скрыть" : "Показать"}
          </Button>
        </td>
      </tr>
      {open && (
        <tr className="bg-zinc-50/60">
          <td colSpan={6} className="px-4 py-3">
            <OrderDetails order={details} />
          </td>
        </tr>
      )}
    </>
  );
}

/* ---------- Панель ---------- */

function Dashboard({ onLogout }: { onLogout: () => void }) {
  const [tab, setTab] = useState<"products" | "orders" | "contacts">("products");
  const [products, setProducts] = useState<Product[] | null>(null);
  const [orders, setOrders] = useState<Order[] | null>(null);
  const [loadError, setLoadError] = useState("");
  const [busy, setBusy] = useState<number[]>([]);
  const [editing, setEditing] = useState<Product | "new" | null>(null);
  const [deleting, setDeleting] = useState<Product | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);

  const onError = useCallback(
    (e: unknown) => {
      if (e instanceof ApiError && e.status === 401) return onLogout();
      toast.error((e as Error).message);
    },
    [onLogout],
  );

  const load = useCallback(() => {
    setLoadError("");
    Promise.all([api<Product[]>("/products?sort=new"), api<Order[]>("/orders")])
      .then(([p, o]) => {
        setProducts(p);
        setOrders(o);
      })
      .catch((e) => {
        if (e instanceof ApiError && e.status === 401) return onLogout();
        setLoadError((e as Error).message);
      });
  }, [onLogout]);
  useEffect(load, [load]);

  async function changeStock(p: Product, stock: number) {
    if (stock < 0 || busy.includes(p.id)) return;
    setBusy((b) => [...b, p.id]);
    try {
      const updated = await api<Product>(`/products/${p.id}`, { method: "PATCH", json: { stock } });
      setProducts((list) => list && list.map((x) => (x.id === p.id ? { ...x, stock: updated.stock } : x)));
    } catch (e) {
      onError(e);
    } finally {
      setBusy((b) => b.filter((id) => id !== p.id));
    }
  }

  async function confirmDelete() {
    if (!deleting) return;
    setDeleteBusy(true);
    try {
      await api(`/products/${deleting.id}`, { method: "DELETE" });
      setProducts((list) => list && list.filter((x) => x.id !== deleting.id));
      toast.success("Телефон удалён");
      setDeleting(null);
    } catch (e) {
      onError(e);
    } finally {
      setDeleteBusy(false);
    }
  }

  async function changeStatus(id: number, status: string) {
    try {
      await api(`/orders/${id}`, { method: "PATCH", json: { status } });
      setOrders((list) => list && list.map((o) => (o.id === id ? { ...o, status } : o)));
      toast.success("Статус заказа обновлён");
    } catch (e) {
      onError(e);
    }
  }

  function onSaved(saved: Product) {
    setProducts((list) => {
      if (!list) return list;
      return list.some((x) => x.id === saved.id) ? list.map((x) => (x.id === saved.id ? { ...x, ...saved } : x)) : [saved, ...list];
    });
    setEditing(null);
  }

  const inStock = products ? products.filter((p) => p.stock > 0).length : null;

  return (
    <>
      <div className="mb-4 flex items-center justify-between gap-3 sm:mb-6">
        <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">Админ-панель</h1>
        <Button variant="outline" size="sm" onClick={onLogout}>
          <LogoutIcon className="size-4" />
          Выйти
        </Button>
      </div>

      <section aria-label="Статистика" className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard icon={<PhoneIcon />} label="Всего товаров" value={products ? products.length : null} tone="bg-accent-soft text-accent-fg" />
        <StatCard icon={<CheckIcon />} label="В наличии" value={inStock} tone="bg-emerald-50 text-emerald-600" />
        <StatCard
          icon={<BoxIcon />}
          label="Нет в наличии"
          value={products && inStock !== null ? products.length - inStock : null}
          tone="bg-red-50 text-red-600"
        />
        <StatCard icon={<ReceiptIcon />} label="Всего заказов" value={orders ? orders.length : null} />
      </section>

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div role="tablist" aria-label="Разделы" className="inline-flex rounded-lg bg-zinc-200/70 p-1">
          {(["products", "orders", "contacts"] as const).map((t) => (
            <button
              key={t}
              role="tab"
              aria-selected={tab === t}
              onClick={() => setTab(t)}
              className={`h-8 cursor-pointer rounded-md px-4 text-sm font-medium transition-colors duration-150 ${
                tab === t ? "bg-surface text-ink shadow-card" : "text-muted hover:text-ink"
              }`}
            >
              {t === "products" ? "Телефоны" : t === "orders" ? "Заказы" : "Контакты"}
            </button>
          ))}
        </div>
        {tab === "products" && (
          <Button onClick={() => setEditing("new")} className="w-full sm:w-auto">
            <PlusIcon className="size-4" />
            Добавить телефон
          </Button>
        )}
      </div>

      <div key={tab} role="tabpanel" className="animate-fade">
        {loadError ? (
          <EmptyState
            tone="danger"
            icon={<AlertIcon />}
            title="Не удалось загрузить данные"
            text={loadError}
            action={
              <Button variant="outline" onClick={load}>
                Повторить
              </Button>
            }
          />
        ) : !products || !orders ? (
          <TableSkeleton />
        ) : tab === "contacts" ? (
          <ContactsForm onError={onError} />
        ) : tab === "orders" ? (
          <OrdersList orders={orders} onStatus={changeStatus} onError={onError} />
        ) : products.length === 0 ? (
          <EmptyState
            icon={<PhoneIcon />}
            title="Телефонов пока нет"
            text="Добавьте первый телефон, чтобы он появился в каталоге."
            action={<Button onClick={() => setEditing("new")}>Добавить телефон</Button>}
          />
        ) : (
          <ProductTable products={products} busy={busy} onStock={changeStock} onEdit={setEditing} onDelete={setDeleting} />
        )}
      </div>

      {editing && (
        <ProductForm product={editing === "new" ? null : editing} onClose={() => setEditing(null)} onSaved={onSaved} />
      )}

      <Modal
        open={deleting !== null}
        onClose={() => !deleteBusy && setDeleting(null)}
        title="Удалить телефон?"
        size="sm"
        footer={
          <>
            <Button variant="outline" onClick={() => setDeleting(null)} disabled={deleteBusy}>
              Отмена
            </Button>
            <Button variant="danger" onClick={confirmDelete} loading={deleteBusy}>
              Удалить
            </Button>
          </>
        }
      >
        <p className="text-sm text-muted">
          «{deleting?.name}» будет удалён из каталога. Это действие нельзя отменить. В истории заказов название
          сохранится.
        </p>
      </Modal>
    </>
  );
}

export default function AdminPage() {
  // null — ещё проверяем сохранённый токен
  const [authed, setAuthed] = useState<boolean | null>(null);

  useEffect(() => {
    if (!getToken()) return setAuthed(false);
    api("/auth/me")
      .then(() => setAuthed(true))
      .catch(() => {
        setToken(null);
        setAuthed(false);
      });
  }, []);

  const logout = useCallback(() => {
    setToken(null);
    setAuthed(false);
  }, []);

  if (authed === null) {
    return (
      <Loading>
        <Skeleton className="mb-6 h-8 w-48" />
        <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
          {Array.from({ length: 4 }, (_, i) => (
            <Skeleton key={i} className="h-18 rounded-xl" />
          ))}
        </div>
        <TableSkeleton />
      </Loading>
    );
  }
  if (!authed) return <Login onLogin={() => setAuthed(true)} />;
  return <Dashboard onLogout={logout} />;
}
