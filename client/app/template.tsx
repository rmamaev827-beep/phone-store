// template пересоздаётся при каждом переходе — отсюда короткая анимация появления страницы
export default function Template({ children }: { children: React.ReactNode }) {
  return <div className="animate-page">{children}</div>;
}
