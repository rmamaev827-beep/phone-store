import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { Suspense } from "react";
import { FooterContacts } from "@/components/FooterContacts";
import Header from "@/components/Header";
import { Toaster } from "@/components/ui/Toast";
import { THEME_SCRIPT } from "@/lib/theme-script";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin", "cyrillic"],
});

export const metadata: Metadata = {
  title: "PhoneShop — интернет-магазин телефонов",
  description: "Каталог смартфонов с фильтрами, корзиной и оформлением заказа",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ru" data-scroll-behavior="smooth" suppressHydrationWarning className={`${inter.variable} h-full antialiased`}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body className="flex min-h-full flex-col font-sans">
        <a
          href="#content"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-surface focus:px-4 focus:py-2 focus:text-sm focus:shadow-pop"
        >
          Перейти к содержимому
        </a>
        <Suspense>
          <Header />
        </Suspense>
        <main id="content" className="container-page flex-1 py-5 sm:py-8">
          {children}
        </main>
        <footer className="border-t border-line bg-surface/70">
          <FooterContacts />
          <div className="container-page flex flex-col gap-1 py-6 text-xs text-muted sm:flex-row sm:justify-between">
            <span>© PhoneShop — магазин смартфонов</span>
            <span>Оплата при получении · Гарантия 12 месяцев</span>
          </div>
        </footer>
        <Toaster />
      </body>
    </html>
  );
}
