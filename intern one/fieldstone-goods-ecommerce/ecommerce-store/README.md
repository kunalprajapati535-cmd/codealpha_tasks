# Fieldstone Goods — E-commerce Store

A complete, working e-commerce site: browse products, view product details,
add items to a cart, register/log in, and place orders.

- **Frontend:** plain HTML, CSS, and JavaScript (no build step, no framework)
- **Backend:** Express.js (Node.js)
- **Database:** a JSON file (`backend/data/db.json`) with a tiny read/write
  wrapper — no native modules to compile, no external database to install.
  Swap it for Postgres/MongoDB/etc. later without touching the frontend,
  since all data access goes through `backend/db.js`.

## Features

- Product listings with category filters and search
- Product detail pages with quantity selection and live stock counts
- A shopping cart (persists per-browser session on the server)
- User registration and login (passwords hashed with bcrypt, sessions via
  `express-session`)
- Checkout that validates stock, decrements it, and creates an order
- Order history page, scoped to the signed-in user

## Project structure

```
ecommerce-store/
├── backend/
│   ├── server.js          # Express app entry point
│   ├── db.js               # JSON-file database helper
│   ├── data/db.json         # Products, users, orders (seeded with 8 products)
│   ├── middleware/auth.js   # requireAuth guard for order routes
│   └── routes/
│       ├── auth.js          # register / login / logout / me
│       ├── products.js      # list / detail
│       ├── cart.js          # add / update / remove / clear
│       └── orders.js        # checkout / list / detail (requires login)
└── public/
    ├── index.html, product.html, cart.html,
    │   login.html, register.html, orders.html
    ├── css/style.css
    └── js/                 # common.js (shared helpers) + one file per page
```

## Running it

Requires [Node.js](https://nodejs.org) 18 or newer.

```bash
cd backend
npm install
npm start
```

Then open **http://localhost:3000** in your browser. The server serves both
the API (`/api/...`) and the frontend from the same port, so there's nothing
else to configure.

The server listens on port 3000 by default — set `PORT=xxxx` in the
environment to change it.

## How the pieces fit together

- Every page loads `public/js/common.js` first, which provides a small
  `api()` fetch wrapper, a toast notification helper, inline SVG product
  icons, and logic to keep the header's cart count / sign-in state in sync.
- The cart lives in the server-side session (`req.session.cart`), so it
  survives page reloads without any client-side storage.
- Checkout (`POST /api/orders`) requires a signed-in session. If a guest
  tries to check out, the cart page redirects them to `/login.html`.
- `backend/data/db.json` starts with 8 seeded products and no users/orders.
  Delete the file and restart the server to reset the seed data (a fresh
  copy will need to be restored from version control, or just re-add
  products by hand) — or simplest, just edit the `users`/`orders` arrays
  back to `[]` if you want a clean slate without touching products.

## Extending it

- **Real database:** replace the contents of `backend/db.js` with calls to
  Postgres/MySQL/MongoDB/etc. Every route only ever calls `readDB()` /
  `writeDB()`, so that's the one file to change.
- **Product images:** swap the inline SVG icons (`PRODUCT_ICONS` in
  `public/js/common.js`) for real photos by adding an `<img>` tag wherever
  `productIconSVG()` is called.
- **Payments:** the checkout flow stops at "place order" — wire in Stripe
  or another processor inside `backend/routes/orders.js` before the order
  is committed.
