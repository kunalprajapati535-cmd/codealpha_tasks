function requireAuth(req, res, next) {
  if (!req.session || !req.session.userId) {
    return res.status(401).json({ error: "You need to be signed in to do that." });
  }
  next();
}

module.exports = { requireAuth };
