"use client";

import { useSyncExternalStore } from "react";
import { AlertIcon, CheckIcon } from "./Icons";

type ToastItem = { id: number; kind: "success" | "error"; text: string; leaving: boolean };

const EMPTY: ToastItem[] = [];
const LIFETIME = 3200;
const EXIT = 180;

let items: ToastItem[] = EMPTY;
let nextId = 1;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

function dismiss(id: number) {
  if (!items.some((t) => t.id === id && !t.leaving)) return;
  items = items.map((t) => (t.id === id ? { ...t, leaving: true } : t));
  emit();
  setTimeout(() => {
    items = items.filter((t) => t.id !== id);
    emit();
  }, EXIT);
}

function push(kind: ToastItem["kind"], text: string) {
  const id = nextId++;
  // не копим больше трёх уведомлений
  items = [...items.slice(-2), { id, kind, text, leaving: false }];
  emit();
  setTimeout(() => dismiss(id), LIFETIME);
}

export const toast = {
  success: (text: string) => push("success", text),
  error: (text: string) => push("error", text || "Произошла ошибка"),
};

const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
};

export function Toaster() {
  const list = useSyncExternalStore(
    subscribe,
    () => items,
    () => EMPTY,
  );

  return (
    <div
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 bottom-4 z-[60] flex flex-col items-center gap-2 px-4 sm:items-end sm:px-6"
    >
      {list.map((t) => (
        <div
          key={t.id}
          role={t.kind === "error" ? "alert" : "status"}
          onClick={() => dismiss(t.id)}
          className={`pointer-events-auto flex max-w-sm cursor-pointer items-center gap-2.5 rounded-lg border border-white/10 bg-zinc-900 py-2.5 pl-3 pr-4 text-sm text-white shadow-pop ${
            t.leaving ? "animate-toast-out" : "animate-toast-in"
          }`}
        >
          <span
            className={`flex size-5 items-center justify-center rounded-full ${
              t.kind === "error" ? "bg-red-500" : "bg-emerald-500"
            }`}
          >
            {t.kind === "error" ? <AlertIcon className="size-3.5" /> : <CheckIcon className="size-3.5" strokeWidth={2.5} />}
          </span>
          {t.text}
        </div>
      ))}
    </div>
  );
}
