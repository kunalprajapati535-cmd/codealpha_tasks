const express = require("express");
const { readDB } = require("../db");

const router = express.Router();

function getCart(req) {
  if (!req.session.cart) req.session.cart = {}; // { productId: qty }
  return req.session.cart;
}

function buildCartResponse(req) {
  const db = readDB();
  const cart = getCart(req);
  const items = Object.entries(cart)
    .map(([productId, qty]) => {
      const product = db.products.find((p) => p.id === productId);
      if (!product) return null;
      return {
        product,
        qty,
        subtotal: Math.round(product.price * qty * 100) / 100,
      };
    })
    .filter(Boolean);

  const total = Math.round(items.reduce((sum, i) => sum + i.subtotal, 0) * 100) / 100;
  const itemCount = items.reduce((sum, i) => sum + i.qty, 0);

  return { items, total, itemCount };
}

router.get("/", (req, res) => {
  res.json(buildCartResponse(req));
});

router.post("/add", (req, res) => {
  const { productId, qty } = req.body;
  const db = readDB();
  const product = db.products.find((p) => p.id === productId);
  if (!product) return res.status(404).json({ error: "Product not found." });

  const addQty = Math.max(1, parseInt(qty, 10) || 1);
  const cart = getCart(req);
  const currentQty = cart[productId] || 0;
  const nextQty = Math.min(product.stock, currentQty + addQty);
  cart[productId] = nextQty;

  res.json(buildCartResponse(req));
});

router.post("/update", (req, res) => {
  const { productId, qty } = req.body;
  const db = readDB();
  const product = db.products.find((p) => p.id === productId);
  if (!product) return res.status(404).json({ error: "Product not found." });

  const cart = getCart(req);
  const nextQty = parseInt(qty, 10);

  if (!nextQty || nextQty <= 0) {
    delete cart[productId];
  } else {
    cart[productId] = Math.min(product.stock, nextQty);
  }

  res.json(buildCartResponse(req));
});

router.post("/remove", (req, res) => {
  const { productId } = req.body;
  const cart = getCart(req);
  delete cart[productId];
  res.json(buildCartResponse(req));
});

router.post("/clear", (req, res) => {
  req.session.cart = {};
  res.json(buildCartResponse(req));
});

module.exports = router;
