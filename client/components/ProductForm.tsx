"use client";

import { useEffect, useRef, useState } from "react";
import { ACCESSORY_CATEGORIES } from "@/lib/accessories";
import { type Product, type ProductKind, api } from "@/lib/api";
import { PhoneImage } from "./ProductCard";
import { Button } from "./ui/Button";
import { Input, Select, Textarea } from "./ui/Input";
import { Modal } from "./ui/Modal";
import { toast } from "./ui/Toast";

const FORM_ID = "product-form";
const KNOWN_BRANDS = ["Apple", "Samsung", "Xiaomi", "Google", "Huawei"];
const PHOTO_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const PHOTO_MAX = 4 * 1024 * 1024;

type Errors = Record<string, string | undefined>;

const TEXTS: Record<ProductKind, { add: string; edit: string; added: string }> = {
  phone: { add: "Добавить телефон", edit: "Редактировать телефон", added: "Телефон добавлен" },
  accessory: { add: "Добавить аксессуар", edit: "Редактировать аксессуар", added: "Аксессуар добавлен" },
};

function validate(form: FormData, kind: ProductKind, available: boolean): Errors {
  const errors: Errors = {};
  const text = (key: string) => String(form.get(key) ?? "").trim();
  const int = (key: string, label: string, min: number) => {
    const raw = text(key);
    if (!raw) return (errors[key] = `Укажите ${label}`);
    const n = Number(raw);
    if (!Number.isInteger(n) || n < min) errors[key] = min > 0 ? "Целое число больше нуля" : "Целое неотрицательное число";
  };

  if (!text("name")) errors.name = "Укажите название";
  int("price", "цену", 0);
  if (kind === "phone") {
    if (!text("brand")) errors.brand = "Укажите бренд";
    int("ram", "объём RAM", 1);
    int("storage", "объём памяти", 1);
    int("stock", "количество", 0);
  } else {
    if (!text("category")) errors.category = "Выберите категорию";
    // «В наличии» подразумевает хотя бы одну штуку на складе
    int("stock", "количество", available ? 1 : 0);
  }

  const photo = form.get("photo");
  if (photo instanceof File && photo.size > 0) {
    if (!PHOTO_TYPES.includes(photo.type)) errors.photo = "Формат фото: JPG, PNG, WEBP или GIF";
    else if (photo.size > PHOTO_MAX) errors.photo = "Фото больше 4 МБ";
  }
  return errors;
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <fieldset className="border-t border-line pt-5 first:border-0 first:pt-0">
      <legend className="float-left mb-3 w-full text-sm font-semibold">{title}</legend>
      <div className="clear-both grid gap-4 sm:grid-cols-2">{children}</div>
    </fieldset>
  );
}

export function ProductForm({
  kind,
  product,
  onClose,
  onSaved,
}: {
  kind: ProductKind;
  /** null — добавление нового товара */
  product: Product | null;
  onClose: () => void;
  onSaved: (saved: Product) => void;
}) {
  const [errors, setErrors] = useState<Errors>({});
  const [busy, setBusy] = useState(false);
  const inFlight = useRef(false);
  const [preview, setPreview] = useState<string | null>(null);
  // статус аксессуара: «Нет в наличии» обнуляет остаток
  const [available, setAvailable] = useState(product ? product.stock > 0 : true);

  const accessory = kind === "accessory";
  const texts = TEXTS[kind];

  useEffect(
    () => () => {
      if (preview) URL.revokeObjectURL(preview);
    },
    [preview],
  );

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (inFlight.current) return;
    const formEl = e.currentTarget;
    const form = new FormData(formEl);
    // выключенное поле количества в FormData не попадает — подставляем ноль сами
    if (accessory && !available) form.set("stock", "0");

    const found = validate(form, kind, available);
    setErrors(found);
    const firstInvalid = Object.keys(found)[0];
    if (firstInvalid) {
      formEl.querySelector<HTMLElement>(`[name="${firstInvalid}"]`)?.focus();
      return;
    }

    // пустой файл не отправляем, чтобы при редактировании осталось прежнее фото
    const photo = form.get("photo");
    if (photo instanceof File && photo.size === 0) form.delete("photo");
    form.set("kind", kind);

    inFlight.current = true;
    setBusy(true);
    try {
      const saved = await api<Product>(product ? `/products/${product.id}` : "/products", {
        method: product ? "PATCH" : "POST",
        body: form,
      });
      toast.success(product ? "Товар успешно изменён" : texts.added);
      onSaved(saved);
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  }

  function onChange(e: React.FormEvent<HTMLFormElement>) {
    const target = e.target as HTMLInputElement;
    if (errors[target.name]) setErrors((prev) => ({ ...prev, [target.name]: undefined }));
    if (target.name === "photo") {
      const file = target.files?.[0];
      setPreview(file && PHOTO_TYPES.includes(file.type) ? URL.createObjectURL(file) : null);
    }
  }

  const value = (key: keyof Product, fallback = "") => (product ? String(product[key] ?? "") : fallback);
  const field = (name: keyof Product) => ({ name, defaultValue: value(name), error: errors[name], disabled: busy });
  const number = { type: "number", inputMode: "numeric" as const, min: 0, step: 1 };

  const photoField = (
    <div className="flex items-start gap-3">
      <PhoneImage
        src={preview ?? product?.image ?? ""}
        alt="Фото товара"
        placeholder={accessory ? "box" : "phone"}
        className="mt-6 size-10 shrink-0 rounded-lg"
      />
      <Input
        wrapperClassName="min-w-0 flex-1"
        label="Фото"
        name="photo"
        type="file"
        accept={PHOTO_TYPES.join(",")}
        disabled={busy}
        error={errors.photo}
        hint={product ? "До 4 МБ. Пусто — фото не изменится" : "JPG, PNG, WEBP или GIF, до 4 МБ"}
      />
    </div>
  );

  return (
    <Modal
      open
      onClose={busy ? () => {} : onClose}
      title={product ? texts.edit : texts.add}
      size="lg"
      footer={
        <>
          <Button type="button" variant="outline" onClick={onClose} disabled={busy}>
            Отмена
          </Button>
          <Button type="submit" form={FORM_ID} loading={busy}>
            {busy ? "Сохраняем…" : product ? "Сохранить" : texts.add}
          </Button>
        </>
      }
    >
      <form id={FORM_ID} onSubmit={submit} onChange={onChange} noValidate className="space-y-5">
        {accessory ? (
          <>
            <Section title="Основная информация">
              <Input label="Название" required placeholder="Силиконовый чехол для iPhone 15" {...field("name")} />
              <div>
                <label htmlFor="accessory-category" className="label">
                  Категория{" "}
                  <span className="text-red-600" aria-hidden="true">
                    *
                  </span>
                </label>
                <Select
                  id="accessory-category"
                  name="category"
                  required
                  defaultValue={value("category")}
                  disabled={busy}
                  aria-invalid={errors.category ? true : undefined}
                >
                  <option value="">Выберите категорию</option>
                  {ACCESSORY_CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </Select>
                {errors.category && (
                  <p role="alert" className="mt-1.5 text-xs text-red-600">
                    {errors.category}
                  </p>
                )}
              </div>
              <Input label="Цена, сом" required placeholder="900" {...number} {...field("price")} />
              {photoField}
            </Section>

            <Section title="Наличие">
              <div>
                <label htmlFor="accessory-status" className="label">
                  Статус
                </label>
                <Select
                  id="accessory-status"
                  value={available ? "1" : "0"}
                  onChange={(e) => {
                    setAvailable(e.target.value === "1");
                    setErrors((prev) => ({ ...prev, stock: undefined }));
                  }}
                  disabled={busy}
                >
                  <option value="1">В наличии</option>
                  <option value="0">Нет в наличии</option>
                </Select>
              </div>
              {/* key: при смене статуса поле пересоздаётся с подходящим значением */}
              <Input
                key={available ? "in" : "out"}
                label="Количество на складе"
                required={available}
                {...number}
                name="stock"
                defaultValue={available ? (product && product.stock > 0 ? String(product.stock) : "1") : "0"}
                disabled={busy || !available}
                error={errors.stock}
                hint={available ? undefined : "Остаток обнулится — товар нельзя будет купить"}
              />
            </Section>

            <Section title="Описание">
              <Textarea
                wrapperClassName="sm:col-span-2"
                label="Краткое описание"
                name="description"
                rows={3}
                defaultValue={value("description")}
                disabled={busy}
                placeholder="Одно-два предложения: материал, совместимость, особенности"
                hint="Необязательно. Показывается на карточке аксессуара"
              />
            </Section>
          </>
        ) : (
          <>
            <Section title="Основная информация">
              <Input label="Название" required placeholder="iPhone 15 Pro" {...field("name")} />
              <Input label="Бренд" required placeholder="Apple" list="brand-options" {...field("brand")} />
              <datalist id="brand-options">
                {KNOWN_BRANDS.map((b) => (
                  <option key={b} value={b} />
                ))}
              </datalist>
              <Input label="Цена, сом" required placeholder="85000" {...number} {...field("price")} />
              {photoField}
            </Section>

            <Section title="Характеристики">
              <Input label="RAM, GB" required placeholder="8" {...number} {...field("ram")} />
              <Input label="Память, GB" required placeholder="256" hint="1 TB = 1024" {...number} {...field("storage")} />
              <Input label="Цвет" placeholder="Чёрный" {...field("color")} />
              <Input label="Процессор" placeholder="Snapdragon 8 Gen 3" hint="Необязательно" {...field("processor")} />
              <Input label="Камера" placeholder="50 + 12 МП" {...field("camera")} />
              <Input label="Батарея" placeholder="5000 мА·ч" {...field("battery")} />
            </Section>

            <Section title="Остаток">
              <Input label="Количество на складе" required {...number} {...field("stock")} defaultValue={value("stock", "0")} />
            </Section>

            <Section title="Описание">
              <Textarea
                wrapperClassName="sm:col-span-2"
                label="Описание товара"
                name="description"
                rows={4}
                defaultValue={value("description")}
                disabled={busy}
                placeholder="Коротко о главных особенностях модели"
                hint="Необязательно"
              />
            </Section>
          </>
        )}
      </form>
    </Modal>
  );
}
