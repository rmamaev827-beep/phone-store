type Tone = "neutral" | "accent" | "success" | "warning" | "danger";

const TONES: Record<Tone, string> = {
  neutral: "bg-zinc-100 text-zinc-700",
  accent: "bg-accent-soft text-accent-fg",
  success: "bg-emerald-50 text-emerald-700",
  warning: "bg-amber-50 text-amber-700",
  danger: "bg-red-50 text-red-700",
};

export function Badge({
  tone = "neutral",
  className = "",
  children,
}: {
  tone?: Tone;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1 whitespace-nowrap rounded-md px-2 py-0.5 text-xs font-medium ${TONES[tone]} ${className}`}
    >
      {children}
    </span>
  );
}

/** Остаток товара в виде бейджа — для страницы товара и админки */
export function StockBadge({ stock }: { stock: number }) {
  if (stock <= 0) return <Badge tone="danger">Нет в наличии</Badge>;
  if (stock <= 3) return <Badge tone="warning">Осталось {stock} шт.</Badge>;
  return <Badge tone="success">В наличии</Badge>;
}
