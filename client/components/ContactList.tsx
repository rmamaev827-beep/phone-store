import { type Contact, type ContactKind, contactHref, contactKind, opensInNewTab } from "@/lib/contacts";
import { ChatIcon, ChevronRightIcon, InstagramIcon, LinkIcon, MailIcon, PhoneCallIcon, SendIcon } from "./ui/Icons";

const ICONS: Record<ContactKind, typeof LinkIcon> = {
  phone: PhoneCallIcon,
  mail: MailIcon,
  whatsapp: ChatIcon,
  telegram: SendIcon,
  instagram: InstagramIcon,
  link: LinkIcon,
};

export function ContactIcon({ url, className }: { url: string; className?: string }) {
  const Icon = ICONS[contactKind(url)];
  return <Icon className={className} />;
}

/** Свойства ссылки контакта. Адрес уходит только в href — в тексте он нигде не показывается. */
export function contactLinkProps(contact: Contact, message?: string) {
  return {
    href: contactHref(contact, message),
    ...(opensInNewTab(contact.url) ? { target: "_blank", rel: "noopener noreferrer" } : {}),
  };
}

/** Контакты крупными строками — для окна «Связаться» */
export function ContactList({
  contacts,
  message,
  onNavigate,
}: {
  contacts: Contact[];
  message?: string;
  onNavigate?: () => void;
}) {
  return (
    <ul className="space-y-2">
      {contacts.map((contact) => (
        <li key={contact.id}>
          <a
            {...contactLinkProps(contact, message)}
            onClick={onNavigate}
            className="flex items-center gap-3 rounded-lg border border-line bg-surface px-3.5 py-3 transition-colors hover:border-zinc-300 hover:bg-zinc-50"
          >
            <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-accent-soft text-accent-fg">
              <ContactIcon url={contact.url} className="size-4.5" />
            </span>
            <span className="min-w-0 flex-1 text-sm font-medium [overflow-wrap:anywhere]">{contact.label}</span>
            <ChevronRightIcon className="size-4 text-muted" />
          </a>
        </li>
      ))}
    </ul>
  );
}
