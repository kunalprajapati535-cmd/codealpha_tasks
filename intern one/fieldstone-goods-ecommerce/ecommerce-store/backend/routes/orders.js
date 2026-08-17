const express = require("express");
const { readDB, writeDB } = require("../db");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();

router.use(requireAuth);

router.post("/", (req, res) => {
  const { shippingAddress } = req.body;
  const cart = req.session.cart || {};
  const productIds = Object.keys(cart);

  if (productIds.length === 0) {
    return res.status(400).json({ error: "Your cart is empty." });
  }
  if (!shippingAddress || !shippingAddress.trim()) {
    return res.status(400).json({ error: "A shipping address is required." });
  }

  const db = readDB();
  const items = [];

  // Validate stock for every line before committing anything.
  for (const productId of productIds) {
    const product = db.products.find((p) => p.id === productId);
    const qty = cart[productId];
    if (!product) {
      return res.status(400).json({ error: "One of the items in your cart no longer exists." });
    }
    if (product.stock < qty) {
      return res.status(400).json({
        error: `Only ${product.stock} of "${product.name}" left in stock.`,
      });
    }
    items.push({
      productId: product.id,
      name: product.name,
      price: product.price,
      qty,
      subtotal: Math.round(product.price * qty * 100) / 100,
    });
  }

  // Commit: decrement stock.
  for (const item of items) {
    const product = db.products.find((p) => p.id === item.productId);
    product.stock -= item.qty;
  }

  const total = Math.round(items.reduce((sum, i) => sum + i.subtotal, 0) * 100) / 100;

  const order = {
    id: "ord" + Date.now(),
    userId: req.session.userId,
    items,
    total,
    shippingAddress,
    status: "placed",
    createdAt: new Date().toISOString(),
  };

  db.orders.push(order);
  writeDB(db);

  req.session.cart = {};

  res.status(201).json({ order });
});

router.get("/", (req, res) => {
  const db = readDB();
  const orders = db.orders
    .filter((o) => o.userId === req.session.userId)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  res.json({ orders });
});

router.get("/:id", (req, res) => {
  const db = readDB();
  const order = db.orders.find(
    (o) => o.id === req.params.id && o.userId === req.session.userId
  );
  if (!order) return res.status(404).json({ error: "Order not found." });
  res.json({ order });
});

module.exports = router;
