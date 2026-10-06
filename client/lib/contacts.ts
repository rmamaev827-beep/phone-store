"use client";

import { useSyncExternalStore } from "react";
import { api } from "./api";

/** label — текст для покупателя, url — куда ведёт нажатие (покупателю не показывается) */
export type Contact = { id: string; label: string; url: string };
export type ContactKind = "phone" | "mail" | "whatsapp" | "telegram" | "instagram" | "link";

const EMPTY: Contact[] = [];

// Контакты одни на весь сайт: загружаем один раз и делим между всеми компонентами
let cache: Contact[] | null = null;
let loading = false;
const listeners = new Set<() => void>();

function load() {
  if (loading || cache) return;
  loading = true;
  api<Contact[]>("/settings/contacts")
    .then((list) => setContacts(Array.isArray(list) ? list : EMPTY))
    .catch(() => setContacts(EMPTY))
    .finally(() => {
      loading = false;
    });
}

/** Обновляет контакты сразу на всех страницах — вызывается после сохранения в админке */
export function setContacts(next: Contact[]) {
  cache = next;
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  load();
  return () => {
    listeners.delete(listener);
  };
}

/** null — ещё загружаются */
export function useContacts(): Contact[] | null {
  return useSyncExternalStore(
    subscribe,
    () => cache,
    () => null,
  );
}

const host = (url: string) => {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
};

/** Вид контакта определяется по ссылке — нужен только для иконки */
export function contactKind(url: string): ContactKind {
  if (url.startsWith("tel:")) return "phone";
  if (url.startsWith("mailto:")) return "mail";
  const h = host(url);
  if (h === "wa.me" || h.endsWith("whatsapp.com")) return "whatsapp";
  if (h === "t.me" || h === "telegram.me") return "telegram";
  if (h.endsWith("instagram.com") || h === "ig.me") return "instagram";
  return "link";
}

/** Ссылка для перехода; в WhatsApp можно подставить готовый текст сообщения */
export function contactHref(contact: Contact, message?: string) {
  if (!message || host(contact.url) !== "wa.me") return contact.url;
  try {
    const url = new URL(contact.url);
    if (!url.searchParams.has("text")) url.searchParams.set("text", message);
    return url.toString();
  } catch {
    return contact.url;
  }
}

/** Телефон и почта открываются на месте, остальное — в новой вкладке */
export const opensInNewTab = (url: string) => /^https?:/i.test(url);
