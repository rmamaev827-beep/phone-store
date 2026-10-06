export function EmptyState({
  icon,
  title,
  text,
  action,
  tone = "neutral",
}: {
  icon: React.ReactNode;
  title: string;
  text?: string;
  action?: React.ReactNode;
  tone?: "neutral" | "danger";
}) {
  return (
    <div className="card flex animate-fade flex-col items-center px-6 py-12 text-center sm:py-16">
      <div
        className={`mb-4 flex size-12 items-center justify-center rounded-full ${
          tone === "danger" ? "bg-red-50 text-red-600" : "bg-zinc-100 text-muted"
        }`}
      >
        {icon}
      </div>
      <h2 className="text-lg font-semibold">{title}</h2>
      {text && <p className="mt-1.5 max-w-sm text-sm text-muted">{text}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
