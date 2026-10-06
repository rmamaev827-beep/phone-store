import Link from "next/link";

type Variant = "primary" | "secondary" | "outline" | "danger" | "ghost";
type Size = "sm" | "md" | "lg" | "icon";

const BASE =
  "inline-flex shrink-0 cursor-pointer select-none items-center justify-center gap-2 whitespace-nowrap rounded-lg font-medium transition-colors duration-150 disabled:cursor-not-allowed disabled:opacity-50 data-[loading=true]:opacity-80";

const VARIANTS: Record<Variant, string> = {
  primary: "bg-accent text-white hover:bg-accent-hover active:bg-blue-800",
  secondary: "bg-zinc-100 text-ink hover:bg-zinc-200 active:bg-zinc-300",
  outline: "border border-line bg-surface text-ink hover:border-zinc-300 hover:bg-zinc-50 active:bg-zinc-100",
  danger: "bg-danger text-white hover:bg-danger-hover active:bg-danger-hover",
  ghost: "text-muted hover:bg-zinc-100 hover:text-ink active:bg-zinc-200",
};

const SIZES: Record<Size, string> = {
  sm: "h-9 px-3 text-[13px]",
  md: "h-10 px-4 text-sm",
  lg: "h-11 px-5 text-sm",
  icon: "size-9",
};

type StyleProps = { variant?: Variant; size?: Size; className?: string };

export const buttonClass = ({ variant = "primary", size = "md", className = "" }: StyleProps = {}) =>
  `${BASE} ${VARIANTS[variant]} ${SIZES[size]} ${className}`;

export function Spinner({ className = "size-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className={`animate-spin ${className}`}>
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="3" opacity="0.25" />
      <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

type ButtonProps = StyleProps & React.ButtonHTMLAttributes<HTMLButtonElement> & { loading?: boolean };

export function Button({ variant, size, className, loading = false, disabled, children, ...rest }: ButtonProps) {
  return (
    <button
      className={buttonClass({ variant, size, className })}
      disabled={disabled || loading}
      data-loading={loading}
      aria-busy={loading || undefined}
      {...rest}
    >
      {loading && <Spinner />}
      {children}
    </button>
  );
}

type ButtonLinkProps = StyleProps & React.ComponentProps<typeof Link>;

export function ButtonLink({ variant, size, className, ...rest }: ButtonLinkProps) {
  return <Link className={buttonClass({ variant, size, className })} {...rest} />;
}
