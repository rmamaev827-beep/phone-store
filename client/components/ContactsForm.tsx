"use client";

import { useEffect, useRef, useState } from "react";
import { ApiError, api } from "@/lib/api";
import { type Contact, setContacts, useContacts } from "@/lib/contacts";
import { ContactIcon } from "./ContactList";
import { Button } from "./ui/Button";
import { ChevronDownIcon, ChevronUpIcon, PlusIcon, TrashIcon } from "./ui/Icons";
import { Input } from "./ui/Input";
import { Loading, Skeleton } from "./ui/Skeleton";
import { toast } from "./ui/Toast";

type Row = { id: string; label: string; url: string };
type RowError = { index: number; field: "label" | "url"; message: string };

const MAX_CONTACTS = 12;

// Заготовки: подставляют понятный текст и подсказку, какую ссылку вставить
const PRESETS: { name: string; label: string; placeholder: string }[] = [
  { name: "Телефон", label: "Позвонить нам", placeholder: "+996 555 123 456" },
  { name: "WhatsApp", label: "Написать в WhatsApp", placeholder: "https://wa.me/996555123456" },
  { name: "Telegram", label: "Написать в Telegram", placeholder: "https://t.me/example" },
  { name: "Instagram", label: "Написать нам в Instagram", placeholder: "https://instagram.com/example" },
  { name: "Другое", label: "", placeholder: "https://… , номер телефона или e-mail" },
];
const DEFAULT_PLACEHOLDER = PRESETS[PRESETS.length - 1].placeholder;

const newId = () => (typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : String(Math.random()).slice(2));

const ICON_BTN =
  "flex size-8 cursor-pointer items-center justify-center rounded-md text-muted transition-colors hover:bg-zinc-100 hover:text-ink disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent";

/** Админка: контакты магазина. У каждого — текст для клиента и ссылка, куда ведёт нажатие. */
export function ContactsForm({ onError }: { onError: (e: unknown) => void }) {
  const saved = useContacts();
  const [rows, setRows] = useState<Row[] | null>(null);
  const [placeholders, setPlaceholders] = useState<Record<string, string>>({});
  const [error, setError] = useState<RowError | null>(null);
  const [busy, setBusy] = useState(false);
  const inFlight = useRef(false);
  const focusId = useRef<string | null>(null);

  // сохранённые контакты подставляем один раз, дальше форма живёт своим состоянием
  useEffect(() => {
    if (saved && rows === null) setRows(saved.map((c) => ({ ...c })));
  }, [saved, rows]);

  // новый контакт сразу получает фокус
  useEffect(() => {
    if (!focusId.current) return;
    document.getElementById(`contact-label-${focusId.current}`)?.focus();
    focusId.current = null;
  }, [rows]);

  if (!rows) {
    return (
      <Loading label="Загрузка контактов">
        <Skeleton className="h-72 max-w-3xl rounded-xl" />
      </Loading>
    );
  }

  const dirty = JSON.stringify(rows) !== JSON.stringify(saved ?? []);
  const full = rows.length >= MAX_CONTACTS;

  function update(index: number, patch: Partial<Row>) {
    setRows((list) => list && list.map((r, i) => (i === index ? { ...r, ...patch } : r)));
    if (error?.index === index) setError(null);
  }

  function add(preset: (typeof PRESETS)[number]) {
    const id = newId();
    focusId.current = id;
    setPlaceholders((p) => ({ ...p, [id]: preset.placeholder }));
    setRows((list) => [...(list ?? []), { id, label: preset.label, url: "" }]);
    setError(null);
  }

  function move(index: number, delta: number) {
    setRows((list) => {
      if (!list) return list;
      const next = [...list];
      const target = index + delta;
      if (target < 0 || target >= next.length) return list;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
    setError(null);
  }

  function remove(index: number) {
    setRows((list) => list && list.filter((_, i) => i !== index));
    setError(null);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (inFlight.current || !rows) return;

    // пустые поля ловим сразу, не дожидаясь сервера
    for (let index = 0; index < rows.length; index++) {
      const field = !rows[index].label.trim() ? "label" : !rows[index].url.trim() ? "url" : null;
      if (field) {
        setError({ index, field, message: field === "label" ? "Укажите текст, который увидит клиент" : "Укажите ссылку" });
        document.getElementById(`contact-${field}-${rows[index].id}`)?.focus();
        return;
      }
    }

    inFlight.current = true;
    setBusy(true);
    setError(null);
    try {
      const result = await api<Contact[]>("/settings/contacts", { method: "PUT", json: { contacts: rows } });
      setContacts(result);
      setRows(result.map((c) => ({ ...c })));
      toast.success("Контакты сохранены");
    } catch (err) {
      if (err instanceof ApiError && err.status === 400) {
        const data = err.data as { index?: number; field?: "label" | "url" } | undefined;
        if (data && typeof data.index === "number" && data.field) {
          setError({ index: data.index, field: data.field, message: err.message });
          document.getElementById(`contact-${data.field}-${rows[data.index]?.id}`)?.focus();
        }
        toast.error(err.message);
      } else {
        onError(err);
      }
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} noValidate className="max-w-3xl space-y-4">
      <div className="card p-4 sm:p-6">
        <h2 className="font-semibold">Контакты магазина</h2>
        <p className="mt-1 text-[13px] text-muted">
          Клиент видит только текст. Ссылка скрыта: по ней он переходит при нажатии. Контакты показываются внизу каждой
          страницы и в окне «Связаться» на карточке телефона.
        </p>

        {rows.length === 0 ? (
          <p className="mt-5 rounded-lg border border-dashed border-line px-4 py-6 text-center text-sm text-muted">
            Контактов пока нет. Добавьте первый кнопками ниже.
          </p>
        ) : (
          <ol className="mt-5 space-y-3">
            {rows.map((row, index) => {
              const rowError = error?.index === index ? error : null;
              return (
                <li key={row.id} className="rounded-lg border border-line p-3 sm:p-4">
                  <div className="mb-3 flex items-center justify-between gap-2">
                    <span className="flex min-w-0 items-center gap-2 text-[13px] font-medium text-muted">
                      <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-zinc-100 text-ink">
                        <ContactIcon url={row.url} className="size-4" />
                      </span>
                      Контакт {index + 1}
                    </span>
                    <span className="flex shrink-0 items-center">
                      <button type="button" onClick={() => move(index, -1)} disabled={busy || index === 0} aria-label={`Поднять контакт ${index + 1} выше`} title="Выше" className={ICON_BTN}>
                        <ChevronUpIcon className="size-4" />
                      </button>
                      <button type="button" onClick={() => move(index, 1)} disabled={busy || index === rows.length - 1} aria-label={`Опустить контакт ${index + 1} ниже`} title="Ниже" className={ICON_BTN}>
                        <ChevronDownIcon className="size-4" />
                      </button>
                      <button type="button" onClick={() => remove(index)} disabled={busy} aria-label={`Удалить контакт ${index + 1}`} title="Удалить" className={`${ICON_BTN} hover:bg-red-50 hover:text-red-600`}>
                        <TrashIcon className="size-4" />
                      </button>
                    </span>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Input
                      id={`contact-label-${row.id}`}
                      label="Текст для клиента"
                      value={row.label}
                      onChange={(e) => update(index, { label: e.target.value })}
                      maxLength={60}
                      placeholder="Написать нам в Instagram"
                      disabled={busy}
                      error={rowError?.field === "label" ? rowError.message : undefined}
                    />
                    <Input
                      id={`contact-url-${row.id}`}
                      label="Ссылка (клиент её не видит)"
                      value={row.url}
                      onChange={(e) => update(index, { url: e.target.value })}
                      maxLength={500}
                      inputMode="url"
                      autoCapitalize="none"
                      spellCheck={false}
                      placeholder={placeholders[row.id] ?? DEFAULT_PLACEHOLDER}
                      disabled={busy}
                      error={rowError?.field === "url" ? rowError.message : undefined}
                    />
                  </div>
                </li>
              );
            })}
          </ol>
        )}

        <div className="mt-4">
          <p className="mb-2 text-[13px] font-medium">Добавить контакт</p>
          <div className="flex flex-wrap gap-2">
            {PRESETS.map((preset) => (
              <Button key={preset.name} type="button" variant="outline" size="sm" disabled={busy || full} onClick={() => add(preset)}>
                <PlusIcon className="size-4" />
                {preset.name}
              </Button>
            ))}
          </div>
          {full && <p className="mt-2 text-xs text-muted">Можно добавить не больше {MAX_CONTACTS} контактов.</p>}
        </div>
      </div>

      {rows.some((r) => r.label.trim()) && (
        <div className="card p-4 sm:p-6">
          <h3 className="text-sm font-semibold">Так это увидит клиент</h3>
          <ul className="mt-3 flex flex-wrap gap-2">
            {rows
              .filter((r) => r.label.trim())
              .map((r) => (
                <li key={r.id} className="flex h-10 max-w-full items-center gap-2 rounded-lg border border-line bg-surface px-3.5 text-sm font-medium">
                  <ContactIcon url={r.url} className="size-4.5 text-accent-fg" />
                  <span className="truncate">{r.label}</span>
                </li>
              ))}
          </ul>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" loading={busy} disabled={!dirty}>
          {busy ? "Сохраняем…" : "Сохранить"}
        </Button>
        {dirty && <span className="text-[13px] text-muted">Есть несохранённые изменения</span>}
      </div>
    </form>
  );
}
