"use client";

import { useContacts } from "@/lib/contacts";
import { ContactIcon, contactLinkProps } from "./ContactList";

/** Блок «Контакты» в подвале каждой страницы. Скрыт, пока контактов нет. */
export function FooterContacts() {
  const contacts = useContacts();
  if (!contacts || contacts.length === 0) return null;

  return (
    <section id="contacts" aria-labelledby="contacts-title" className="container-page scroll-mt-24 border-b border-line py-6 sm:py-8">
      <h2 id="contacts-title" className="text-lg font-semibold tracking-tight">
        Контакты
      </h2>
      <p className="mt-1 text-sm text-muted">Ответим на вопросы и поможем с выбором.</p>
      <ul className="mt-4 flex flex-wrap gap-2">
        {contacts.map((contact) => (
          <li key={contact.id} className="max-w-full">
            <a
              {...contactLinkProps(contact)}
              className="flex h-10 max-w-full items-center gap-2 rounded-lg border border-line bg-surface px-3.5 text-sm font-medium transition-colors hover:border-zinc-300 hover:bg-zinc-50"
            >
              <ContactIcon url={contact.url} className="size-4.5 text-accent-fg" />
              <span className="truncate">{contact.label}</span>
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
}
