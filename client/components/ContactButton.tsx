"use client";

import { useState } from "react";
import { type Product, phoneTitle } from "@/lib/api";
import { useContacts } from "@/lib/contacts";
import { ContactList, contactLinkProps } from "./ContactList";
import { Button, ButtonLink, buttonClass } from "./ui/Button";
import { ChatIcon } from "./ui/Icons";
import { Modal } from "./ui/Modal";

type Size = "sm" | "md" | "lg";

/**
 * «Связаться»: один контакт — сразу переход, несколько — окно с выбором.
 * Пока админ не добавил ни одного контакта, показывается запасная ссылка «Подробнее».
 */
export function ContactButton({
  product,
  size = "sm",
  className = "",
  fallbackHref,
}: {
  product: Product;
  size?: Size;
  className?: string;
  /** куда вести, если контактов нет; без него кнопка просто не показывается */
  fallbackHref?: string;
}) {
  const contacts = useContacts();
  const [open, setOpen] = useState(false);

  const title = phoneTitle(product);
  const message = `Здравствуйте! Интересует ${title}.`;

  if (contacts && contacts.length === 0) {
    if (!fallbackHref) return null;
    return (
      <ButtonLink href={fallbackHref} variant="outline" size={size} className={className}>
        Подробнее
      </ButtonLink>
    );
  }

  const label = (
    <>
      <ChatIcon className="size-4" />
      Связаться
    </>
  );

  if (contacts?.length === 1) {
    return (
      <a
        {...contactLinkProps(contacts[0], message)}
        aria-label={`${contacts[0].label} — ${title}`}
        className={buttonClass({ variant: "outline", size, className })}
      >
        {label}
      </a>
    );
  }

  return (
    <>
      {/* пока контакты загружаются, кнопка уже на месте — вёрстка не прыгает */}
      <Button variant="outline" size={size} className={className} disabled={!contacts} onClick={() => setOpen(true)}>
        {label}
      </Button>
      <Modal open={open} onClose={() => setOpen(false)} title="Связаться с нами" size="sm">
        <p className="mb-3 text-sm text-muted">Выберите удобный способ связи по поводу «{title}».</p>
        <ContactList contacts={contacts ?? []} message={message} onNavigate={() => setOpen(false)} />
      </Modal>
    </>
  );
}
