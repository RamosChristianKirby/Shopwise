# Shopwise — MERN e-commerce with admin panel & sales analytics

**MongoDB + Express + React (Vite) + Node.** A complete online store: customers browse, filter, add to cart and check out; admins manage products, orders and customers and watch sales on an analytics dashboard.

## Run it

You only need **[Node.js 18 or newer](https://nodejs.org)**. Then, in this folder:

```bash
npm start
```

That's it. The first run takes a few minutes; after that it starts in seconds. It will:

1. install the packages,
2. create `server/.env` with a secure secret,
3. use the MongoDB already running on your PC — or start a **built-in MongoDB** if you don't have one (downloaded once; your data is kept in the `.data` folder),
4. load a sample catalogue (categories and products — **no user accounts**) if the shop has no products yet,
5. build the website and open **http://localhost:5000** in your browser.

There are **no built-in logins**. Click **Register** on the website to create an account — every new account is always a **customer**.

### Making an account an admin

Admin rights are never given through the website's sign-up. To promote an account, change its `role` in the database:

1. Register the account on the website.
2. Open the `users` collection: **MongoDB Atlas → Browse Collections → your database (`mern_shop`) → `users`** (or MongoDB Compass / `mongosh` for a local database).
3. Edit that user and change `role` from `"customer"` to `"admin"`, then save.
4. Log out and back in on the website — **/admin** now opens.

`mongosh` one-liner: `db.users.updateOne({ email: "you@example.com" }, { $set: { role: "admin" } })`

Once you have one admin, the **Customers** page in the admin panel can also make other accounts admins (or back to customer).

Press **Ctrl+C** to stop.

| Command | What it does |
|---|---|
| `npm start` | Everything above, one server on port 5000 |
| `npm run dev` | Development mode: live-reloading site on http://localhost:5173 + API that restarts when you edit `server/src` |
| `npm run connect` | Connect to MongoDB Atlas (or any MongoDB): saves `MONGO_URI`, tests it, offers sample data |
| `npm run seed` | Load the sample categories and products (does nothing if the shop already has products) |
| `npm run reset` | **Wipe** all products, categories and orders and reload the sample catalogue (user accounts are kept) — stop the app first |

Add `-- --no-open` (e.g. `npm start -- --no-open`) to stop the browser opening automatically.

## Use your own API

The website talks to **one API address, set in one file**: `client/public/config.js`.

```js
window.__APP_CONFIG__ = {
  API_URL: '',                              // '' = the API that comes with this project
  // API_URL: 'https://api.yourshop.com/api',   <- put your API here
  STORE_NAME: 'Shopwise',
  ...
};
```

Save, refresh the browser — no rebuild. With `API_URL` set to your own API, `npm start` / `npm run dev` start **only the website** (no database, no bundled server). If the API can't be reached, a notice at the top of the page tells you why (server down, wrong address, missing `/api`, CORS). Every endpoint and JSON shape the site expects is listed in **[docs/API.md](docs/API.md)**. Also edit `STORE_NAME`, `ANNOUNCEMENT` and `CURRENCY` there to brand the shop.

## Which MongoDB does it use?

1. **`MONGO_URI` in `server/.env`** if you set one — use this for MongoDB Atlas or a server of your own.
2. Otherwise a **MongoDB already running on this computer** (port 27017).
3. Otherwise the **built-in MongoDB** (data in `.data/mongodb`, safe to back up or delete).

Sample products are only loaded automatically in cases 2 and 3. With your own `MONGO_URI`, run `npm run seed` once if you want them.

**Easiest way to use MongoDB Atlas:** run `npm run connect`. It reads the connection string (from the `atlas-credentials.env` file Atlas gives you if it is in this folder or your Downloads folder, or you paste it), saves it in `server/.env`, tests the connection, and offers to load the sample catalogue. In Atlas, first add your IP under *Security → Network Access*.

## Before you go live

- Only accounts you promote yourself are admins (see *Making an account an admin*). Put your real GCash / bank details in `server/.env`.
- Replace the generated sample product pictures: **Admin → Products → Edit → Upload**.
- Use a hosted MongoDB (Atlas) and set `MONGO_URI`; the built-in one is meant for trying things out and small local use.
- Uploaded images are stored in `server/uploads/` — keep that folder on a persistent disk (or move uploads to S3 / Cloudinary).

## Features

**Storefront** — home page, shop with search / category / price filters / sorting / pagination, product pages with gallery and stock status, cart, checkout, accounts, order tracking, and payment by **Cash on Delivery, GCash or bank transfer**.

**Admin panel (`/admin`)**
- **Dashboard**: revenue and orders for the last 30 days vs the previous 30, average order value, today's sales, revenue and order charts (7D / 30D / 90D / 12M, with a table view), order pipeline, recent orders, low-stock list
- **Products** (create / edit / delete, image upload, sale price, featured, show/hide), **Categories**, **Orders** (filter, update status, confirm payment), **Customers** (orders and spend, disable, make admin)

**Built in** — server-side pricing, no overselling (stock is reserved atomically and returned on cancellation), order history keeps price snapshots, bcrypt passwords, role checks on every admin route, rate-limited login, Helmet headers.

**Design & devices** — fully responsive from phones to wide desktops (slide-in menu, filter sheet, sticky "Add to cart" bar on phones, admin tables that become cards, full-screen dialogs on phones); light / dark mode with a toggle (follows your device by default); loading skeletons, toasts, keyboard and screen-reader support; tested in Chromium (Edge and Chrome), built on standard web features that current Firefox and Safari support. If anything unexpected happens the page shows a friendly message with *Try again* / *Reload* instead of going blank.

## How payments work

There are no card gateways, so no third-party keys are needed. At checkout the customer picks COD, GCash or bank transfer; the instructions come from `server/.env`. For GCash and bank orders the customer sends the money, enters the reference number, and you confirm it in **Admin → Orders → Mark as paid**. COD orders are marked paid when you mark them delivered.

To add Stripe or PayPal later, keep creating the order as `pending` and mark it paid from the provider's webhook (same logic as `PUT /api/admin/orders/:id/pay`).

## Analytics definitions

- **Sales / revenue** = every order that is *not cancelled* (paid or not).
- "Last 30 days" is compared with the 30 days before it.
- Days are grouped in the timezone set by `TIMEZONE` in `server/.env` (default `Asia/Manila`); ranges of 180+ days are shown per month.

## Project layout

```
scripts/   start / dev / seed launchers (plain Node, no dependencies)
server/    Express API + Mongoose models
client/    React + Vite app (storefront + /admin)
  public/config.js   <- API address and shop name (edit this)
docs/API.md          <- endpoints the website expects
.data/     built-in MongoDB files (created on demand)
```

## Troubleshooting

- **A notice at the top says the API can't be reached** — start the app with `npm start`, or check `API_URL` in `client/public/config.js` (see [docs/API.md](docs/API.md)).
- **Blank page in Edge/Chrome after editing code** — the site now shows an error screen instead of a blank page. Effects must not return a value: write `useEffect(() => { window.scrollTo(0, 0); }, [...])`, never `useEffect(() => window.scrollTo(0, 0), [...])` (newer browsers return a Promise from `scrollTo`).

- **"Port 5000 is already in use"** — close the other program or an old copy of this app, or set `PORT` in `server/.env`.
- **The built-in MongoDB can't start** — the first run needs internet to download it. Or install [MongoDB Community Server](https://www.mongodb.com/try/download/community) and start it, or use Atlas via `MONGO_URI`.
- **Start fresh** — `npm run reset` (wipes products, categories and orders; keeps accounts), or stop the app and delete the `.data` folder (removes everything).
- **Old sample logins** (`admin@shop.com`, `maria@example.com`…) from earlier versions — the next `npm start` / `npm run seed` deletes those accounts if they still use the original sample password. Accounts whose password you changed are kept.
- **The dashboard is empty** — there is no sample order data any more; charts fill in as real orders come in.

## API overview

(The full contract with response shapes is in [docs/API.md](docs/API.md).)

Public: `GET /api/products` (`q, category, sort, minPrice, maxPrice, page, limit, featured`), `GET /api/products/:slug`, `GET /api/categories`, `GET /api/config/payment`
Auth: `POST /api/auth/register`, `POST /api/auth/login`, `GET /api/auth/me`, `PUT /api/auth/profile`
Customer: `POST /api/orders`, `GET /api/orders/mine`, `GET /api/orders/:id`, `PUT /api/orders/:id/cancel`, `PUT /api/orders/:id/payment-reference`
Admin (`/api/admin/...`): `analytics/summary`, `analytics/sales?days=`, `products` (CRUD), `categories` (CRUD), `orders` (list, `:id/status`, `:id/pay`), `users` (list, update), `upload`

## Ideas for later

Email notifications, online card payments, product reviews, coupons, product variants (size / colour), password reset, top-products and customer analytics.
