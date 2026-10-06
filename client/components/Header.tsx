"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useCart } from "@/lib/cart";
import { useContacts } from "@/lib/contacts";
import { setTheme, useTheme } from "@/lib/theme";
import { CartIcon, CloseIcon, MenuIcon, MoonIcon, PhoneIcon, SearchIcon, SunIcon, UserIcon } from "./ui/Icons";

const NAV_LINK =
  "rounded-lg px-3 py-2 text-sm font-medium text-muted transition-colors hover:bg-zinc-100 hover:text-ink";

function SearchBox({
  value,
  onChange,
  onSubmit,
}: {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
}) {
  return (
    <form
      role="search"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit();
      }}
      className="relative w-full"
    >
      <SearchIcon className="pointer-events-none absolute left-3 top-1/2 size-4.5 -translate-y-1/2 text-muted" />
      <input
        type="text"
        inputMode="search"
        enterKeyHint="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Найти смартфон"
        aria-label="Поиск телефонов"
        className="control bg-zinc-50 pl-9.5 pr-9 focus:bg-surface"
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange("")}
          aria-label="Очистить поиск"
          className="absolute right-1.5 top-1/2 flex size-7 -translate-y-1/2 cursor-pointer items-center justify-center rounded-md text-muted transition-colors hover:bg-zinc-200 hover:text-ink"
        >
          <CloseIcon className="size-4" />
        </button>
      )}
    </form>
  );
}

function ThemeToggle() {
  const theme = useTheme();
  const next = theme === "dark" ? "light" : "dark";
  const label = next === "dark" ? "Включить тёмную тему" : "Включить светлую тему";
  return (
    <button
      type="button"
      onClick={() => setTheme(next)}
      aria-label={label}
      title={label}
      className="flex size-10 cursor-pointer items-center justify-center rounded-lg text-muted transition-colors hover:bg-zinc-100 hover:text-ink"
    >
      {theme === "dark" ? <SunIcon /> : <MoonIcon />}
    </button>
  );
}

export default function Header() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { count } = useCart();
  const hasContacts = (useContacts()?.length ?? 0) > 0;
  const [menuOpen, setMenuOpen] = useState(false);

  const onCatalog = pathname === "/";
  const urlQuery = onCatalog ? searchParams.get("q") || "" : "";
  const [query, setQuery] = useState(urlQuery);

  // что мы сами отправили в URL — чтобы ответ роутера не затирал то, что пользователь печатает дальше
  const sent = useRef(urlQuery);
  useEffect(() => {
    if (urlQuery === sent.current) return;
    sent.current = urlQuery;
    setQuery(urlQuery);
  }, [urlQuery]);

  function search(text: string, mode: "push" | "replace") {
    const q = text.trim();
    sent.current = q;
    // на каталоге сохраняем уже выбранные фильтры
    const params = new URLSearchParams(onCatalog ? searchParams.toString() : "");
    if (q) params.set("q", q);
    else params.delete("q");
    const qs = params.toString();
    router[mode](qs ? `/?${qs}` : "/", { scroll: false });
  }

  // на каталоге ищем по мере ввода, с паузой
  useEffect(() => {
    if (!onCatalog || query.trim() === urlQuery) return;
    const t = setTimeout(() => search(query, "replace"), 350);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, urlQuery, onCatalog]);

  useEffect(() => setMenuOpen(false), [pathname]);
  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setMenuOpen(false);
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [menuOpen]);

  const searchBox = <SearchBox value={query} onChange={setQuery} onSubmit={() => search(query, "push")} />;

  return (
    <header className="sticky top-0 z-30 border-b border-line bg-surface/80 backdrop-blur-md">
      <div className="container-page flex h-14 items-center gap-2 md:h-16 md:gap-4">
        <button
          type="button"
          onClick={() => setMenuOpen((v) => !v)}
          aria-label={menuOpen ? "Закрыть меню" : "Открыть меню"}
          aria-expanded={menuOpen}
          aria-controls="mobile-menu"
          className="-ml-2 flex size-10 cursor-pointer items-center justify-center rounded-lg text-ink transition-colors hover:bg-zinc-100 md:hidden"
        >
          {menuOpen ? <CloseIcon /> : <MenuIcon />}
        </button>

        <Link href="/" className="flex items-center gap-2 rounded-lg text-[17px] font-semibold tracking-tight">
          <span className="flex size-8 items-center justify-center rounded-lg bg-accent text-white">
            <PhoneIcon className="size-4.5" />
          </span>
          PhoneShop
        </Link>

        <nav aria-label="Основная навигация" className="hidden md:flex">
          <Link href="/#catalog" className={NAV_LINK}>
            Каталог
          </Link>
          {hasContacts && (
            <a href="#contacts" className={NAV_LINK}>
              Контакты
            </a>
          )}
        </nav>

        <div className="hidden max-w-md flex-1 md:block">{searchBox}</div>

        <div className="ml-auto flex items-center gap-1">
          <ThemeToggle />
          <Link href="/admin" className={`${NAV_LINK} hidden items-center gap-2 md:flex`}>
            <UserIcon className="size-4.5" />
            Админка
          </Link>
          <Link
            href="/cart"
            aria-label={count > 0 ? `Корзина, товаров: ${count}` : "Корзина"}
            className={`${NAV_LINK} relative -mr-2 flex items-center gap-2 text-ink md:mr-0`}
          >
            <span className="relative">
              <CartIcon />
              {count > 0 && (
                <span
                  key={count}
                  className="absolute -right-2 -top-2 flex h-4.5 min-w-4.5 animate-pop items-center justify-center rounded-full bg-accent px-1 text-[11px] font-semibold leading-none text-white"
                >
                  {count}
                </span>
              )}
            </span>
            <span className="hidden md:inline">Корзина</span>
          </Link>
        </div>
      </div>

      <div className="container-page pb-3 md:hidden">{searchBox}</div>

      {menuOpen && (
        <nav
          id="mobile-menu"
          aria-label="Меню"
          className="absolute inset-x-0 top-full animate-fade border-b border-line bg-surface shadow-lift md:hidden"
        >
          <div className="container-page flex flex-col py-2">
            <Link href="/#catalog" onClick={() => setMenuOpen(false)} className={`${NAV_LINK} py-3 text-ink`}>
              Каталог
            </Link>
            <Link href="/cart" onClick={() => setMenuOpen(false)} className={`${NAV_LINK} flex justify-between py-3 text-ink`}>
              Корзина
              {count > 0 && <span className="text-muted">{count}</span>}
            </Link>
            {hasContacts && (
              <a href="#contacts" onClick={() => setMenuOpen(false)} className={`${NAV_LINK} py-3 text-ink`}>
                Контакты
              </a>
            )}
            <Link href="/admin" onClick={() => setMenuOpen(false)} className={`${NAV_LINK} py-3 text-ink`}>
              Вход / Админка
            </Link>
          </div>
        </nav>
      )}
    </header>
  );
}
