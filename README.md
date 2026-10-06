# PhoneShop — интернет-магазин телефонов

Next.js (клиент) + Express (API) + PostgreSQL.

## Запуск

```bash
npm run install:all   # один раз: зависимости server и client
npm run dev           # API на :4000, сайт на http://localhost:3000
```

При первом запуске сервер сам создаёт таблицы и добавляет 17 телефонов.

## База данных

Настройка в `server/.env` (образец — `server/.env.example`):

- `DATABASE_URL` пустой — используется встроенный PostgreSQL (PGlite). База работает в памяти и после каждого изменения сохраняется снимком в `server/data/shop.pgdump.tar`, поэтому внезапная остановка сервера её не портит. Ничего ставить не нужно.
- `DATABASE_URL=postgres://postgres:ПАРОЛЬ@localhost:5432/phone_shop` — обычный PostgreSQL. Базу нужно создать заранее (`CREATE DATABASE phone_shop;`), таблицы создадутся сами.

Схема — `server/schema.sql`: `products`, `orders`, `order_items`.

## Админка

`http://localhost:3000/admin`, логин и пароль — `ADMIN_LOGIN` / `ADMIN_PASSWORD` в `server/.env`. Второй администратор — `ADMIN2_LOGIN` / `ADMIN2_PASSWORD` там же.

## API

| Метод | Путь | Доступ |
| --- | --- | --- |
| GET | `/api/products` — фильтры `brand`, `storage`, `ram`, `minPrice`, `maxPrice`, `q`, `sort` | все |
| GET | `/api/products/:id` | все |
| POST / PATCH / DELETE | `/api/products`, `/api/products/:id` | админ |
| POST | `/api/orders` | все |
| GET | `/api/orders`, `/api/orders/:id` | админ |
| PATCH | `/api/orders/:id` — смена статуса | админ |
| POST | `/api/auth/login` | все |

Фильтры комбинируются, несколько значений — через запятую:

```
/api/products?brand=Samsung,Apple&storage=256&ram=8&minPrice=50000&maxPrice=80000&sort=price_asc
```

`brand=other` — все бренды, кроме Apple, Samsung, Xiaomi, Google, Huawei.
`sort`: `new` (по умолчанию), `popular`, `price_asc`, `price_desc`. `storage` в GB (1 TB = 1024).

## Доставка и оплата

Способы доставки и цены — в `server/config.js` (курьер по Бишкеку, доставка по Кыргызстану, самовывоз). Адрес магазина для самовывоза — `STORE_ADDRESS` в `server/.env`.

Оплата: «Картой онлайн» или «При получении».

- **Демо-режим** (по умолчанию): вместо страницы банка открывается её имитация `/pay/demo/...`. Деньги не списываются, данные карты не запрашиваются.
- **Настоящая оплата** (Элкарт, Visa, Mastercard) включается через Freedom Pay: заключите договор, получите ID магазина и секретный ключ и заполните в `server/.env` значения `FREEDOMPAY_MERCHANT_ID`, `FREEDOMPAY_SECRET` и `PUBLIC_URL` (адрес сайта в интернете, https). Данные карты покупатель вводит на странице провайдера — магазин их не видит и не хранит.

Сайт должен быть доступен из интернета: провайдер сам сообщает результат оплаты на `PUBLIC_URL/api/payments/freedompay/result`.

Дополнительные маршруты:

| Метод | Путь | Назначение |
| --- | --- | --- |
| GET | `/api/checkout/options` | способы доставки и режим оплаты |
| GET | `/api/orders/:id/public?key=…` | заказ для покупателя (по секретному ключу из ссылки) |
| POST | `/api/orders/:id/pay?key=…` | повторить оплату картой |
| POST | `/api/payments/freedompay/result` | уведомление провайдера об оплате |

`POST /api/orders` теперь принимает `delivery_method` и `payment_method` и возвращает `{ order, payment_url }`.

## Размещение на Vercel

Из одного репозитория создаются два проекта Vercel: API (`server`) и сайт (`client`).

1. **API.** Vercel → Add New → Project → этот репозиторий, Root Directory: `server`.
   - Storage → Create Database → **Neon (Postgres)** и подключить к проекту — появится `DATABASE_URL`.
   - Storage → Create → **Blob** и подключить к проекту — появится `BLOB_READ_WRITE_TOKEN` (фото из админки).
   - Settings → Environment Variables: `ADMIN_LOGIN`, `ADMIN_PASSWORD`, при необходимости `ADMIN2_LOGIN`, `ADMIN2_PASSWORD` (второй администратор), `JWT_SECRET` (длинная случайная строка).
   - Redeploy. Проверка: адрес проекта должен отвечать `{"name":"PhoneShop API","ok":true}`.
2. **Сайт.** Ещё раз Add New → Project → тот же репозиторий, Root Directory: `client`.
   - Environment Variables: `API_URL` = адрес проекта API (например `https://phone-shop-api.vercel.app`, без `/` в конце).
3. Для онлайн-оплаты в проекте API задайте `PUBLIC_URL` = адрес сайта и ключи Freedom Pay.

Таблицы и стартовые телефоны создаются сами при первом запросе. Локальный запуск (`npm run dev`) работает как раньше: без `DATABASE_URL` — встроенная база, без Blob — папка `server/uploads`.

## Контакты

В админке на вкладке «Контакты» добавляются способы связи: телефон, WhatsApp, Telegram, Instagram и любые другие. У каждого два поля: **текст для клиента** и **ссылка**. Клиент видит только текст; ссылка скрыта внутри кнопки. В поле ссылки можно вставить адрес (`https://…`), номер телефона или e-mail — другие виды ссылок сервер не принимает.

Где показываются: блок «Контакты» внизу каждой страницы и кнопка «Связаться» на карточке телефона (один контакт открывается сразу, из нескольких клиент выбирает). Пока контактов нет, на карточке остаётся «Подробнее».

API: `GET /api/settings/contacts` (для всех), `PUT /api/settings/contacts` с телом `{ contacts: [{ label, url }] }` (админ).

Локальный сервер запускается без автоперезапуска (`npm run dev`); после правок кода сервера перезапустите его вручную.

## Аксессуары

Отдельный раздел сайта — `/accessories`: категории, цена «от/до», «только в наличии», сортировка и поиск (строка поиска в шапке на этой странице ищет аксессуары). Аксессуары хранятся в той же таблице `products`, что и телефоны (`kind = accessory`, `category`), поэтому корзина, заказы и остатки у них общие: телефон и аксессуар оформляются одним заказом.

Список категорий задаётся в двух местах: `server/config.js` и `client/lib/accessories.ts`.

API: `GET /api/products` по умолчанию отдаёт только телефоны; `?kind=accessory` — аксессуары (фильтры `category`, `inStock=1`, `minPrice`, `maxPrice`, `q`, `sort`), `?kind=all` — всё. При создании аксессуара передаётся `kind=accessory` и `category`.

## Аналитика в админке

Вкладка «Аналитика»: быстрые срезы (в наличии, нет в наличии, продавались, не продавались), фильтры по категории, наличию, продажам и количеству продаж, таблица «Товар | Категория | Цена | Остаток | Продано | Заказов | Сумма продаж | Статус» и сводка по категориям. Категория телефона — его бренд, категория аксессуара — раздел аксессуаров. Отменённые заказы в продажи не входят.

Данные обновляются сами: после действий в админке сразу, новые заказы покупателей — каждые 20 секунд и при возврате на вкладку. API: `GET /api/analytics` (админ).
