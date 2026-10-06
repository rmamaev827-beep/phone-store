"use client";

import { useSyncExternalStore } from "react";

export type Theme = "light" | "dark";

const KEY = "phone-shop-theme";
const listeners = new Set<() => void>();

const read = (): Theme => (document.documentElement.dataset.theme === "dark" ? "dark" : "light");

function apply(theme: Theme) {
  const root = document.documentElement;
  // класс включает плавный переход цветов только на время переключения
  root.classList.add("theme-switching");
  root.dataset.theme = theme;
  setTimeout(() => root.classList.remove("theme-switching"), 300);
  listeners.forEach((l) => l());
}

export function setTheme(theme: Theme) {
  try {
    localStorage.setItem(KEY, theme);
  } catch {}
  apply(theme);
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  // пока пользователь не выбрал тему сам, следуем за системной
  const media = matchMedia("(prefers-color-scheme: dark)");
  const onSystem = () => {
    let saved: string | null = null;
    try {
      saved = localStorage.getItem(KEY);
    } catch {}
    if (saved !== "light" && saved !== "dark") apply(media.matches ? "dark" : "light");
  };
  media.addEventListener("change", onSystem);
  return () => {
    listeners.delete(listener);
    media.removeEventListener("change", onSystem);
  };
}

export function useTheme(): Theme {
  return useSyncExternalStore(subscribe, read, () => "light");
}
