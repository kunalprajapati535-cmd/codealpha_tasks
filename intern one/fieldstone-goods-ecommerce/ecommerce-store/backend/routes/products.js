const express = require("express");
const { readDB } = require("../db");

const router = express.Router();

router.get("/", (req, res) => {
  const db = readDB();
  const { category, q } = req.query;
  let products = db.products;

  if (category && category !== "All") {
    products = products.filter((p) => p.category === category);
  }
  if (q) {
    const needle = q.toLowerCase();
    products = products.filter(
      (p) =>
        p.name.toLowerCase().includes(needle) ||
        p.description.toLowerCase().includes(needle)
    );
  }

  const categories = [...new Set(db.products.map((p) => p.category))];
  res.json({ products, categories });
});

router.get("/:id", (req, res) => {
  const db = readDB();
  const product = db.products.find((p) => p.id === req.params.id);
  if (!product) return res.status(404).json({ error: "Product not found." });
  res.json({ product });
});

module.exports = router;
