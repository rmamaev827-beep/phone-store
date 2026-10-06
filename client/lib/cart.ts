"use client";

import { useSyncExternalStore } from "react";
import type { Product } from "./api";

export type CartItem = Pick<Product, "id" | "name" | "brand" | "price" | "image" | "stock" | "storage" | "ram"> & {
  // необязательные: в корзинах, сохранённых до появления аксессуаров, этих полей нет
  kind?: Product["kind"];
  category?: string;
  quantity: number;
};

type Cart = {
  items: CartItem[];
  ready: boolean;
  count: number;
  total: number;
  add: (product: Product) => void;
  setQuantity: (id: number, quantity: number) => void;
  remove: (id: number) => void;
  clear: () => void;
};

const KEY = "phone-shop-cart";
const EMPTY: CartItem[] = [];

// Корзина хранится в localStorage. Внешнее хранилище + useSyncExternalStore
// дают корректную гидрацию: на сервере корзина всегда пустая, в браузере — сохранённая.
let cache: CartItem[] | null = null;
const listeners = new Set<() => void>();

function read(): CartItem[] {
  if (cache) return cache;
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) || "[]");
    cache = Array.isArray(saved) ? saved : EMPTY;
  } catch {
    cache = EMPTY;
  }
  return cache;
}

function write(next: CartItem[]) {
  cache = next;
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {}
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  // изменения корзины в другой вкладке
  const onStorage = (e: StorageEvent) => {
    if (e.key !== KEY) return;
    cache = null;
    listener();
  };
  listeners.add(listener);
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

const add = (p: Product) => {
  const items = read();
  if (items.some((i) => i.id === p.id)) {
    return write(
      items.map((i) =>
        i.id === p.id ? { ...i, price: p.price, stock: p.stock, quantity: Math.min(i.quantity + 1, p.stock) } : i,
      ),
    );
  }
  if (p.stock < 1) return;
  const { id, name, brand, price, image, stock, storage, ram, kind, category } = p;
  write([...items, { id, name, brand, price, image, stock, storage, ram, kind, category, quantity: 1 }]);
};

const setQuantity = (id: number, quantity: number) =>
  write(read().map((i) => (i.id === id ? { ...i, quantity: Math.max(1, Math.min(quantity, i.stock)) } : i)));

const remove = (id: number) => write(read().filter((i) => i.id !== id));
const clear = () => write(EMPTY);

const isReady = () => true;
const notReady = () => false;
const emptyCart = () => EMPTY;

// Каждый компонент подписывается сам: при гидрации он получает серверный снимок
// (пустую корзину) и только потом — сохранённую, поэтому разметка всегда совпадает.
export function useCart(): Cart {
  const items = useSyncExternalStore(subscribe, read, emptyCart);
  const ready = useSyncExternalStore(subscribe, isReady, notReady);

  const count = items.reduce((n, i) => n + i.quantity, 0);
  const total = items.reduce((n, i) => n + i.price * i.quantity, 0);

  return { items, ready, count, total, add, setQuantity, remove, clear };
}
