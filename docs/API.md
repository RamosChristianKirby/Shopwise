# API guide — connecting the website to your API

The website (`client/`) talks to one API address. **You set that address in one place:**

```
client/public/config.js   →   API_URL: 'https://api.yourshop.com/api'
```

Save the file and refresh the browser — no rebuild. (After `npm run build` the same file sits in `client/dist/config.js`; edit it there on your web host.)

| `API_URL` value | Meaning |
|---|---|
| `''` (empty, the default) | Use the API bundled in `server/` — same address as the website, path `/api` |
| `'http://localhost:4000/api'` | Your own API running on this computer |
| `'https://api.yourshop.com/api'` | Your API online |
| `'localhost:4000/api'` | Also fine — `http://` is added for you |

Write the address **exactly as it appears before the endpoint name**. The website appends paths like `/products` to it, so `API_URL + '/products'` must be a working URL.

The site checks `API_URL + '/health'` on start-up. If your API cannot be reached, a yellow notice at the top of the page says why (server down, wrong address, address without `/api`, or blocked by CORS) and rechecks by itself.

## What happens when you set `API_URL`

- `npm start` / `npm run dev` see that you use your own API and start **only the website** — no MongoDB and no bundled server. (Use `API_URL: ''`, or the bundled server's own address, to go back.)
- The API must allow the website's address in its **CORS** settings when the two are on different addresses (for example `http://localhost:5173` in development, or your shop's domain when live). With the bundled server, set `CLIENT_URL` in `server/.env`.
- Image paths that start with `/` (for example `/uploads/x.png`) are loaded from your API's address.
- Login uses a **Bearer token**: the website stores the `token` returned by `/auth/login` and sends `Authorization: Bearer <token>` on every request. A `401` on a request that sent a token logs the user out.

## Other settings in `config.js`

| Setting | Effect |
|---|---|
| `STORE_NAME` | Name shown in the header, footer, tab title and admin panel |
| `TAGLINE` | Short line in the footer and home page |
| `ANNOUNCEMENT` | Top bar text (`''` hides it) |
| `CURRENCY` / `LOCALE` | How prices are formatted, e.g. `'USD'` / `'en-US'` |

## Endpoints the website uses

All paths are relative to `API_URL`. Errors should be JSON `{ "message": "text shown to the user" }` with a suitable HTTP status. Lists are shown defensively: a missing or wrong-typed list is treated as empty instead of breaking the page.

### Health (recommended)

`GET /health` → `{ "ok": true }`. Any HTTP answer other than a 5xx or an HTML page counts as "reachable", so this is optional but gives the best diagnostics.

### Public

| Method & path | Query | Returns |
|---|---|---|
| `GET /products` | `q`, `category` (slug), `sort` (`newest` `popular` `price-asc` `price-desc` `name`), `minPrice`, `maxPrice`, `page`, `limit`, `featured=true` | `{ items: Product[], page, pages, total }` |
| `GET /products/:slug` | | `{ product: Product, related: Product[] }` (404 if missing) |
| `GET /categories` | | `Category[]` |
| `GET /config/payment` | | `{ methods: [{ id, label, instructions }], shipping: { fee, freeOver } }` — `id` is `cod`, `gcash` or `bank` |

```jsonc
// Product
{ "_id": "…", "name": "…", "slug": "…", "description": "…", "price": 549, "compareAtPrice": 0,
  "images": ["/uploads/a.png", "https://…"], "category": { "_id": "…", "name": "…", "slug": "…" },
  "brand": "", "stock": 12, "sold": 3, "isFeatured": false, "isActive": true }

// Category
{ "_id": "…", "name": "Sports", "slug": "sports", "description": "", "productCount": 3 }
```

### Accounts

| Method & path | Body | Returns |
|---|---|---|
| `POST /auth/register` | `{ name, email, password }` | `{ token, user }` (201) |
| `POST /auth/login` | `{ email, password }` | `{ token, user }` |
| `GET /auth/me` | | `{ user }` |
| `PUT /auth/profile` | `{ name?, address?, currentPassword?, newPassword? }` | `{ token, user }` |

`user` = `{ _id, name, email, role: "customer" | "admin", address: { fullName, phone, line1, city, province, postalCode } | null }`

### Customer orders (Bearer token)

| Method & path | Body | Returns |
|---|---|---|
| `POST /orders` | `{ items: [{ product: id, qty }], shippingAddress, paymentMethod, paymentReference?, notes? }` | `Order` (201) — price and stock must be read on the server, never trusted from the browser |
| `GET /orders/mine` | | `Order[]`, newest first |
| `GET /orders/:id` | | `Order` |
| `PUT /orders/:id/cancel` | | `Order` (only while `pending` and unpaid) |
| `PUT /orders/:id/payment-reference` | `{ paymentReference }` | `Order` |

```jsonc
// Order
{ "_id": "…", "orderNumber": "ORD-20260919-AB12C", "status": "pending",   // pending | processing | shipped | delivered | cancelled
  "items": [{ "product": "…", "name": "…", "image": "…", "price": 549, "qty": 2 }],
  "shippingAddress": { "fullName": "…", "phone": "…", "line1": "…", "city": "…", "province": "", "postalCode": "" },
  "paymentMethod": "gcash", "paymentReference": "", "isPaid": false, "paidAt": null,
  "itemsPrice": 1098, "shippingPrice": 100, "totalPrice": 1198,
  "createdAt": "2026-09-19T03:10:00.000Z", "deliveredAt": null, "notes": "" }
```

### Admin (Bearer token of a user with `role: "admin"`)

| Method & path | Returns |
|---|---|
| `GET /admin/analytics/summary` | `{ last30Days: { revenue, orders, avgOrderValue, revenueChange, ordersChange }, today: { revenue, orders }, allTime: { revenue, orders }, statusCounts: { pending, processing, shipped, delivered, cancelled }, customers, products, lowStock: Product[], recentOrders: Order[] }` |
| `GET /admin/analytics/sales?days=30` | `{ days, interval: "day" \| "month", series: [{ date: "2026-09-19" \| "2026-09", revenue, orders }], totalRevenue, totalOrders, avgOrderValue }` |
| `GET /admin/products` (`q`, `lowStock=true`, `page`, `limit`, `sort`) | `{ items, page, pages, total }` (includes hidden products) |
| `POST /admin/products` · `PUT /admin/products/:id` · `DELETE /admin/products/:id` | `Product` / `{ message }` |
| `POST /admin/categories` · `PUT /admin/categories/:id` · `DELETE /admin/categories/:id` | `Category` / `{ message }` |
| `GET /admin/orders` (`status`, `q`, `page`, `limit`) | `{ items: Order[] (user: { name, email }), page, pages, total }` |
| `PUT /admin/orders/:id/status` body `{ status }` | `Order` |
| `PUT /admin/orders/:id/pay` | `Order` marked paid |
| `GET /admin/users` (`q`, `page`, `limit`) | `{ items: [{ …user, orders, spent, isActive, createdAt }], page, pages, total }` |
| `PUT /admin/users/:id` body `{ role?, isActive? }` | `User` |
| `POST /admin/upload` (multipart field `images`) | `{ urls: string[] }` |

Sales figures count every order that is not `cancelled`.

## Only using part of it

If your API covers just the shop (products, categories, orders), the storefront works with those endpoints and you can ignore the `/admin/*` group; the admin panel simply won't load data. If your endpoint names or JSON differ, the places to adapt are the `api.get(...)` / `api.post(...)` calls in `client/src/pages/` (storefront), `client/src/admin/` (admin) and `client/src/context/AuthContext.jsx` (login) — they all use the single client in `client/src/api.js`.
