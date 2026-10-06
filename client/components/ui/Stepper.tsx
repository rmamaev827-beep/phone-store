import { MinusIcon, PlusIcon } from "./Icons";

const BTN =
  "flex size-8 cursor-pointer items-center justify-center text-muted transition-colors hover:bg-zinc-100 hover:text-ink active:bg-zinc-200 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent";

/** Счётчик «− N +» — количество в корзине и остаток в админке */
export function Stepper({
  value,
  onChange,
  min = 0,
  max = Infinity,
  disabled = false,
  labels,
  maxTitle,
}: {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  disabled?: boolean;
  labels: { decrease: string; increase: string };
  maxTitle?: string;
}) {
  return (
    <div className="inline-flex items-center overflow-hidden rounded-lg border border-line bg-surface">
      <button
        type="button"
        onClick={() => onChange(value - 1)}
        disabled={disabled || value <= min}
        aria-label={labels.decrease}
        className={BTN}
      >
        <MinusIcon className="size-4" />
      </button>
      {/* key перезапускает короткую анимацию при каждом изменении числа */}
      <span key={value} aria-live="polite" className="min-w-8 animate-pop px-1 text-center text-sm font-medium tabular-nums">
        {value}
      </span>
      <button
        type="button"
        onClick={() => onChange(value + 1)}
        disabled={disabled || value >= max}
        aria-label={labels.increase}
        title={value >= max ? maxTitle : undefined}
        className={BTN}
      >
        <PlusIcon className="size-4" />
      </button>
    </div>
  );
}
