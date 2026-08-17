const express = require("express");
const session = require("express-session");
const bcrypt = require("bcryptjs");
const Database = require("better-sqlite3");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;
const db = new Database("social.db");

db.pragma("foreign_keys = ON");
db.pragma("journal_mode = WAL");

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    password_hash TEXT NOT NULL,
    bio TEXT DEFAULT '',
    avatar TEXT DEFAULT '',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS posts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    content TEXT NOT NULL,
    image_url TEXT DEFAULT '',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS comments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    post_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    content TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS likes (
    user_id INTEGER NOT NULL,
    post_id INTEGER NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, post_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS follows (
    follower_id INTEGER NOT NULL,
    following_id INTEGER NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (follower_id, following_id),
    CHECK (follower_id <> following_id),
    FOREIGN KEY (follower_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (following_id) REFERENCES users(id) ON DELETE CASCADE
  );
`);

const count = db.prepare("SELECT COUNT(*) AS count FROM users").get().count;
if (count === 0) {
  const insertUser = db.prepare(
    "INSERT INTO users (username, name, password_hash, bio) VALUES (?, ?, ?, ?)"
  );
  insertUser.run(
    "demo",
    "Demo User",
    bcrypt.hashSync("demo123", 10),
    "Welcome to MiniSocial! 👋"
  );
  insertUser.run(
    "alex",
    "Alex Johnson",
    bcrypt.hashSync("alex123", 10),
    "Building things, learning every day 🚀"
  );

  const demoId = db.prepare("SELECT id FROM users WHERE username = ?").get("demo").id;
  const alexId = db.prepare("SELECT id FROM users WHERE username = ?").get("alex").id;

  const insertPost = db.prepare(
    "INSERT INTO posts (user_id, content) VALUES (?, ?)"
  );
  const p1 = insertPost.run(demoId, "Just launched my first MiniSocial post! What are you building today?").lastInsertRowid;
  const p2 = insertPost.run(alexId, "Coffee + code = a productive afternoon ☕💻").lastInsertRowid;

  db.prepare("INSERT INTO likes (user_id, post_id) VALUES (?, ?)").run(alexId, p1);
  db.prepare("INSERT INTO comments (post_id, user_id, content) VALUES (?, ?, ?)").run(
    p1, alexId, "Looks great! 🎉"
  );
  db.prepare("INSERT INTO follows (follower_id, following_id) VALUES (?, ?)").run(demoId, alexId);
}

app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(
  session({
    secret: process.env.SESSION_SECRET || "change-this-secret-in-production",
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: "lax",
      maxAge: 1000 * 60 * 60 * 24 * 7
    }
  })
);
app.use(express.static(path.join(__dirname, "public")));

function publicUser(user) {
  if (!user) return null;
  return {
    id: user.id,
    username: user.username,
    name: user.name,
    bio: user.bio || "",
    avatar: user.avatar || "",
    created_at: user.created_at
  };
}

function auth(req, res, next) {
  if (!req.session.userId) {
    return res.status(401).json({ error: "Authentication required." });
  }
  next();
}

function getUserById(id) {
  return db.prepare("SELECT * FROM users WHERE id = ?").get(id);
}

function serializePost(post, currentUserId) {
  const comments = db.prepare(`
    SELECT c.id, c.content, c.created_at,
           u.id AS user_id, u.username, u.name, u.avatar
    FROM comments c
    JOIN users u ON u.id = c.user_id
    WHERE c.post_id = ?
    ORDER BY c.created_at ASC, c.id ASC
  `).all(post.id);

  return {
    id: post.id,
    content: post.content,
    image_url: post.image_url || "",
    created_at: post.created_at,
    author: {
      id: post.user_id,
      username: post.username,
      name: post.name,
      avatar: post.avatar || ""
    },
    likes: post.likes,
    liked: !!post.liked,
    comments: comments.map(c => ({
      id: c.id,
      content: c.content,
      created_at: c.created_at,
      author: {
        id: c.user_id,
        username: c.username,
        name: c.name,
        avatar: c.avatar || ""
      }
    }))
  };
}

function getPosts(currentUserId, search = "") {
  const query = `
    SELECT p.*,
           u.username, u.name, u.avatar,
           (SELECT COUNT(*) FROM likes l WHERE l.post_id = p.id) AS likes,
           EXISTS(
             SELECT 1 FROM likes l2
             WHERE l2.post_id = p.id AND l2.user_id = ?
           ) AS liked
    FROM posts p
    JOIN users u ON u.id = p.user_id
    WHERE (? = '' OR p.content LIKE ? OR u.username LIKE ? OR u.name LIKE ?)
    ORDER BY p.created_at DESC, p.id DESC
    LIMIT 100
  `;
  return db.prepare(query).all(
    currentUserId,
    search,
    `%${search}%`,
    `%${search}%`,
    `%${search}%`
  ).map(post => serializePost(post, currentUserId));
}

app.get("/api/me", (req, res) => {
  if (!req.session.userId) return res.json({ user: null });
  const user = getUserById(req.session.userId);
  res.json({ user: publicUser(user) });
});

app.post("/api/register", (req, res) => {
  const { username, name, password } = req.body;
  const cleanUsername = String(username || "").trim().toLowerCase();
  const cleanName = String(name || "").trim();
  const cleanPassword = String(password || "");

  if (!/^[a-z0-9_]{3,20}$/.test(cleanUsername)) {
    return res.status(400).json({
      error: "Username must be 3-20 characters and contain only letters, numbers or underscores."
    });
  }
  if (cleanName.length < 2 || cleanName.length > 60) {
    return res.status(400).json({ error: "Name must be between 2 and 60 characters." });
  }
  if (cleanPassword.length < 6) {
    return res.status(400).json({ error: "Password must contain at least 6 characters." });
  }

  try {
    const passwordHash = bcrypt.hashSync(cleanPassword, 10);
    const result = db.prepare(
      "INSERT INTO users (username, name, password_hash) VALUES (?, ?, ?)"
    ).run(cleanUsername, cleanName, passwordHash);

    req.session.userId = Number(result.lastInsertRowid);
    res.json({ user: publicUser(getUserById(req.session.userId)) });
  } catch (err) {
    if (String(err.message).includes("UNIQUE")) {
      return res.status(409).json({ error: "That username is already taken." });
    }
    res.status(500).json({ error: "Could not create account." });
  }
});

app.post("/api/login", (req, res) => {
  const username = String(req.body.username || "").trim().toLowerCase();
  const password = String(req.body.password || "");
  const user = db.prepare("SELECT * FROM users WHERE username = ?").get(username);

  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    return res.status(401).json({ error: "Invalid username or password." });
  }

  req.session.userId = user.id;
  res.json({ user: publicUser(user) });
});

app.post("/api/logout", (req, res) => {
  req.session.destroy(() => res.json({ ok: true }));
});

app.get("/api/feed", auth, (req, res) => {
  res.json({ posts: getPosts(req.session.userId, String(req.query.search || "").trim()) });
});

app.post("/api/posts", auth, (req, res) => {
  const content = String(req.body.content || "").trim();
  const imageUrl = String(req.body.image_url || "").trim();

  if (!content || content.length > 5000) {
    return res.status(400).json({ error: "Post must contain 1-5000 characters." });
  }

  const result = db.prepare(
    "INSERT INTO posts (user_id, content, image_url) VALUES (?, ?, ?)"
  ).run(req.session.userId, content, imageUrl);

  res.json({ postId: Number(result.lastInsertRowid) });
});

app.delete("/api/posts/:id", auth, (req, res) => {
  const post = db.prepare("SELECT * FROM posts WHERE id = ?").get(req.params.id);
  if (!post) return res.status(404).json({ error: "Post not found." });
  if (post.user_id !== req.session.userId) {
    return res.status(403).json({ error: "You can only delete your own posts." });
  }

  db.prepare("DELETE FROM posts WHERE id = ?").run(post.id);
  res.json({ ok: true });
});

app.post("/api/posts/:id/like", auth, (req, res) => {
  const post = db.prepare("SELECT id FROM posts WHERE id = ?").get(req.params.id);
  if (!post) return res.status(404).json({ error: "Post not found." });

  const existing = db.prepare(
    "SELECT 1 FROM likes WHERE user_id = ? AND post_id = ?"
  ).get(req.session.userId, post.id);

  if (existing) {
    db.prepare("DELETE FROM likes WHERE user_id = ? AND post_id = ?")
      .run(req.session.userId, post.id);
  } else {
    db.prepare("INSERT INTO likes (user_id, post_id) VALUES (?, ?)")
      .run(req.session.userId, post.id);
  }

  const likes = db.prepare("SELECT COUNT(*) AS count FROM likes WHERE post_id = ?")
    .get(post.id).count;

  res.json({ liked: !existing, likes });
});

app.post("/api/posts/:id/comments", auth, (req, res) => {
  const content = String(req.body.content || "").trim();
  if (!content || content.length > 1000) {
    return res.status(400).json({ error: "Comment must contain 1-1000 characters." });
  }

  const post = db.prepare("SELECT id FROM posts WHERE id = ?").get(req.params.id);
  if (!post) return res.status(404).json({ error: "Post not found." });

  db.prepare(
    "INSERT INTO comments (post_id, user_id, content) VALUES (?, ?, ?)"
  ).run(post.id, req.session.userId, content);

  res.json({ ok: true });
});

app.delete("/api/comments/:id", auth, (req, res) => {
  const comment = db.prepare("SELECT * FROM comments WHERE id = ?").get(req.params.id);
  if (!comment) return res.status(404).json({ error: "Comment not found." });
  if (comment.user_id !== req.session.userId) {
    return res.status(403).json({ error: "You can only delete your own comments." });
  }
  db.prepare("DELETE FROM comments WHERE id = ?").run(comment.id);
  res.json({ ok: true });
});

app.get("/api/users", auth, (req, res) => {
  const search = String(req.query.search || "").trim();
  const users = db.prepare(`
    SELECT u.id, u.username, u.name, u.bio, u.avatar,
           (SELECT COUNT(*) FROM follows f WHERE f.following_id = u.id) AS followers,
           (SELECT COUNT(*) FROM follows f2 WHERE f2.follower_id = u.id) AS following,
           EXISTS(
             SELECT 1 FROM follows f3
             WHERE f3.follower_id = ? AND f3.following_id = u.id
           ) AS followed
    FROM users u
    WHERE u.id <> ?
      AND (? = '' OR u.username LIKE ? OR u.name LIKE ?)
    ORDER BY followers DESC, u.username ASC
    LIMIT 50
  `).all(
    req.session.userId,
    req.session.userId,
    search,
    `%${search}%`,
    `%${search}%`
  );

  res.json({ users });
});

app.get("/api/users/:username", auth, (req, res) => {
  const user = db.prepare("SELECT * FROM users WHERE username = ?")
    .get(String(req.params.username).toLowerCase());

  if (!user) return res.status(404).json({ error: "User not found." });

  const followers = db.prepare(
    "SELECT COUNT(*) AS count FROM follows WHERE following_id = ?"
  ).get(user.id).count;
  const following = db.prepare(
    "SELECT COUNT(*) AS count FROM follows WHERE follower_id = ?"
  ).get(user.id).count;
  const posts = db.prepare(
    "SELECT COUNT(*) AS count FROM posts WHERE user_id = ?"
  ).get(user.id).count;
  const followed = !!db.prepare(
    "SELECT 1 FROM follows WHERE follower_id = ? AND following_id = ?"
  ).get(req.session.userId, user.id);

  res.json({
    user: publicUser(user),
    stats: { followers, following, posts },
    followed,
    isMe: user.id === req.session.userId
  });
});

app.post("/api/users/:id/follow", auth, (req, res) => {
  const targetId = Number(req.params.id);
  if (!Number.isInteger(targetId)) return res.status(400).json({ error: "Invalid user." });
  if (targetId === req.session.userId) {
    return res.status(400).json({ error: "You cannot follow yourself." });
  }

  const target = getUserById(targetId);
  if (!target) return res.status(404).json({ error: "User not found." });

  const existing = db.prepare(
    "SELECT 1 FROM follows WHERE follower_id = ? AND following_id = ?"
  ).get(req.session.userId, targetId);

  if (existing) {
    db.prepare(
      "DELETE FROM follows WHERE follower_id = ? AND following_id = ?"
    ).run(req.session.userId, targetId);
  } else {
    db.prepare(
      "INSERT INTO follows (follower_id, following_id) VALUES (?, ?)"
    ).run(req.session.userId, targetId);
  }

  const followers = db.prepare(
    "SELECT COUNT(*) AS count FROM follows WHERE following_id = ?"
  ).get(targetId).count;

  res.json({ followed: !existing, followers });
});

app.put("/api/profile", auth, (req, res) => {
  const name = String(req.body.name || "").trim();
  const bio = String(req.body.bio || "").trim();
  const avatar = String(req.body.avatar || "").trim();

  if (name.length < 2 || name.length > 60) {
    return res.status(400).json({ error: "Name must be between 2 and 60 characters." });
  }
  if (bio.length > 200) {
    return res.status(400).json({ error: "Bio must be 200 characters or less." });
  }

  db.prepare(
    "UPDATE users SET name = ?, bio = ?, avatar = ? WHERE id = ?"
  ).run(name, bio, avatar, req.session.userId);

  res.json({ user: publicUser(getUserById(req.session.userId)) });
});

app.get("/api/profile/:username/posts", auth, (req, res) => {
  const user = db.prepare("SELECT id FROM users WHERE username = ?")
    .get(String(req.params.username).toLowerCase());
  if (!user) return res.status(404).json({ error: "User not found." });

  const posts = getPosts(req.session.userId).filter(p => p.author.id === user.id);
  res.json({ posts });
});

app.get("/{*splat}", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.listen(PORT, () => {
  console.log(`MiniSocial running at http://localhost:${PORT}`);
});
