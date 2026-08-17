const express = require("express");
const bcrypt = require("bcryptjs");
const { readDB, writeDB } = require("../db");

const router = express.Router();

function publicUser(user) {
  return { id: user.id, name: user.name, email: user.email };
}

router.post("/register", (req, res) => {
  const { name, email, password } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ error: "Name, email, and password are all required." });
  }
  if (password.length < 6) {
    return res.status(400).json({ error: "Password must be at least 6 characters." });
  }

  const db = readDB();
  const existing = db.users.find(
    (u) => u.email.toLowerCase() === email.toLowerCase()
  );
  if (existing) {
    return res.status(409).json({ error: "An account with that email already exists." });
  }

  const user = {
    id: "u" + Date.now(),
    name,
    email,
    passwordHash: bcrypt.hashSync(password, 10),
    createdAt: new Date().toISOString(),
  };

  db.users.push(user);
  writeDB(db);

  req.session.userId = user.id;
  res.status(201).json({ user: publicUser(user) });
});

router.post("/login", (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required." });
  }

  const db = readDB();
  const user = db.users.find(
    (u) => u.email.toLowerCase() === (email || "").toLowerCase()
  );
  if (!user || !bcrypt.compareSync(password, user.passwordHash)) {
    return res.status(401).json({ error: "Incorrect email or password." });
  }

  req.session.userId = user.id;
  res.json({ user: publicUser(user) });
});

router.post("/logout", (req, res) => {
  req.session.destroy(() => {
    res.clearCookie("connect.sid");
    res.json({ ok: true });
  });
});

router.get("/me", (req, res) => {
  if (!req.session.userId) {
    return res.json({ user: null });
  }
  const db = readDB();
  const user = db.users.find((u) => u.id === req.session.userId);
  if (!user) return res.json({ user: null });
  res.json({ user: publicUser(user) });
});

module.exports = router;
