export type Product = {
  id: number;
  name: string;
  brand: string;
  price: number;
  storage: number;
  ram: number;
  color: string;
  processor: string;
  camera: string;
  battery: string;
  description: string;
  image: string;
  stock: number;
  created_at: string;
  sold?: number;
};

export type OrderItem = {
  id: number;
  order_id: number;
  product_id: number | null;
  product_name: string;
  quantity: number;
  price: number;
};

export type Order = {
  id: number;
  customer_name: string;
  phone: string;
  address: string;
  comment: string;
  total_price: number;
  status: string;
  delivery_method: string;
  delivery_title: string;
  delivery_price: number;
  payment_method: "card" | "cash";
  payment_status: "unpaid" | "pending" | "paid" | "failed";
  access_key: string;
  created_at: string;
  items_count?: number;
  items?: OrderItem[];
};

export type DeliveryOption = {
  id: string;
  title: string;
  note: string;
  price: number;
  freeFrom: number | null;
  needsAddress: boolean;
};

export type CheckoutOptions = {
  delivery: DeliveryOption[];
  payment: { card: { demo: boolean } };
};

export const deliveryCost = (d: DeliveryOption, itemsTotal: number) =>
  d.freeFrom !== null && itemsTotal >= d.freeFrom ? 0 : d.price;

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    /** тело ответа сервера, если оно было */
    public data?: unknown,
  ) {
    super(message);
  }
}

const TOKEN_KEY = "phone-shop-admin-token";

export const getToken = () => (typeof window === "undefined" ? null : localStorage.getItem(TOKEN_KEY));
export const setToken = (token: string | null) =>
  token ? localStorage.setItem(TOKEN_KEY, token) : localStorage.removeItem(TOKEN_KEY);

export async function api<T>(path: string, init: RequestInit & { json?: unknown } = {}): Promise<T> {
  const { json, ...rest } = init;
  const headers = new Headers(rest.headers);
  if (json !== undefined) {
    headers.set("Content-Type", "application/json");
    rest.body = JSON.stringify(json);
  }
  const token = getToken();
  if (token) headers.set("Authorization", `Bearer ${token}`);

  let res: Response;
  try {
    res = await fetch(`/api${path}`, { ...rest, headers });
  } catch {
    throw new ApiError("Нет связи с сервером", 0);
  }
  if (res.status === 204) return undefined as T;
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new ApiError(data?.error || "Сервер недоступен", res.status, data);
  return data as T;
}

export const formatPrice = (value: number) => `${value.toLocaleString("ru-RU")} сом`;
export const formatStorage = (gb: number) => (gb >= 1024 ? `${gb / 1024} TB` : `${gb} GB`);
export const phoneTitle = (p: Pick<Product, "brand" | "name">) =>
  p.name.toLowerCase().includes(p.brand.toLowerCase()) || p.brand === "Apple" ? p.name : `${p.brand} ${p.name}`;
