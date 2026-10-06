type IconProps = React.SVGProps<SVGSVGElement>;

function icon(paths: React.ReactNode) {
  return function Icon({ className = "size-5", ...props }: IconProps) {
    return (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.75}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
        className={`shrink-0 ${className}`}
        {...props}
      >
        {paths}
      </svg>
    );
  };
}

export const SearchIcon = icon(<><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></>);
export const CartIcon = icon(<><path d="M3 4h2l2.4 11.2a1 1 0 0 0 1 .8h8.9a1 1 0 0 0 1-.8L20 8H6.2" /><circle cx="9.5" cy="19.5" r="1.25" /><circle cx="17" cy="19.5" r="1.25" /></>);
export const UserIcon = icon(<><circle cx="12" cy="8" r="3.5" /><path d="M5 20c.8-3.4 3.6-5 7-5s6.200 1.600 7 5" /></>);
export const MenuIcon = icon(<path d="M4 7h16M4 12h16M4 17h16" />);
export const CloseIcon = icon(<path d="M6 6l12 12M18 6 6 18" />);
export const CheckIcon = icon(<path d="m5 12.500 4.500 4.500L19 7.500" />);
export const PlusIcon = icon(<path d="M12 5v14M5 12h14" />);
export const MinusIcon = icon(<path d="M5 12h14" />);
export const TrashIcon = icon(<><path d="M4 7h16M10 11v6M14 11v6" /><path d="M6 7l1 12a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1l1-12M9 7V4.500h6V7" /></>);
export const EditIcon = icon(<><path d="M4 20h4L19 9l-4-4L4 16v4z" /><path d="m13.500 6.500 4 4" /></>);
export const FilterIcon = icon(<path d="M4 6h16M7 12h10M10 18h4" />);
export const ChevronRightIcon = icon(<path d="m9 6 6 6-6 6" />);
export const PhoneIcon = icon(<><rect x="7" y="2.500" width="10" height="19" rx="2.500" /><path d="M11 18.500h2" /></>);
export const BoxIcon = icon(<><path d="M3.500 8 12 3.500 20.500 8v8L12 20.500 3.500 16V8z" /><path d="M3.500 8 12 12.500 20.500 8M12 12.500v8" /></>);
export const AlertIcon = icon(<><circle cx="12" cy="12" r="9" /><path d="M12 8v4.500M12 16h.01" /></>);
export const ReceiptIcon = icon(<><path d="M6 3.500h12v17l-3-1.800-3 1.800-3-1.800-3 1.800v-17z" /><path d="M9 8.500h6M9 12.500h6" /></>);
export const SunIcon = icon(<><circle cx="12" cy="12" r="4" /><path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M5.3 18.7l1.4-1.4M17.3 6.7l1.4-1.4" /></>);
export const MoonIcon = icon(<path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z" />);
export const ChatIcon = icon(<path d="M4.5 5.5h15v10.5h-8l-4.5 3.5v-3.5h-2.5z" />);
export const ChevronUpIcon = icon(<path d="m6 15 6-6 6 6" />);
export const ChevronDownIcon = icon(<path d="m6 9 6 6 6-6" />);
export const LinkIcon = icon(<><path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.700-5.700l-1 1" /><path d="M14 10a4 4 0 0 0-5.700 0l-3 3a4 4 0 0 0 5.700 5.700l1-1" /></>);
export const MailIcon = icon(<><rect x="3.5" y="5.5" width="17" height="13" rx="2" /><path d="m4 7 8 6 8-6" /></>);
export const SendIcon = icon(<path d="M20.500 4 3.500 10.500l6 2.500m11-9-8.500 16-2.500-7m11-9-11 9" />);
export const InstagramIcon = icon(<><rect x="4" y="4" width="16" height="16" rx="4.500" /><circle cx="12" cy="12" r="3.500" /><path d="M16.500 7.500h.01" /></>);
export const PhoneCallIcon = icon(<path d="M6.500 4h3l1.500 4-2 1.500a11 11 0 0 0 5.500 5.500l1.500-2 4 1.500v3a1.500 1.500 0 0 1-1.500 1.500C10.500 19 5 13.500 5 5.500A1.500 1.500 0 0 1 6.500 4z" />);
export const LogoutIcon = icon(<><path d="M14 4.500h4.500v15H14" /><path d="M10 8l-4 4 4 4M6 12h9" /></>);
