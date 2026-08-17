const state = {
  user: null,
  currentPage: "home",
  profileUsername: null,
  posts: []
};

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];

function escapeHtml(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function initials(name = "User") {
  return name.trim().split(/\s+/).slice(0, 2).map(x => x[0]).join("").toUpperCase() || "U";
}

function avatarMarkup(user, className = "avatar") {
  const safeClass = escapeHtml(className);
  if (user?.avatar) {
    return `<span class="${safeClass}"><img src="${escapeHtml(user.avatar)}" alt="${escapeHtml(user.name || user.username || "avatar")}" onerror="this.parentElement.innerHTML='${escapeHtml(initials(user.name || user.username))}'"></span>`;
  }
  return `<span class="${safeClass}">${escapeHtml(initials(user?.name || user?.username || "User"))}</span>`;
}

function setAvatarButton(el, user) {
  if (!el) return;
  if (user?.avatar) {
    el.innerHTML = `<img src="${escapeHtml(user.avatar)}" alt="avatar" onerror="this.style.display='none';this.parentElement.textContent='${escapeHtml(initials(user.name))}'">`;
  } else {
    el.textContent = initials(user?.name);
  }
}

function showToast(message, type = "normal") {
  const toast = $("#toast");
  toast.textContent = message;
  toast.style.background = type === "error" ? "var(--danger)" : "#171923";
  toast.classList.add("show");
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => toast.classList.remove("show"), 2600);
}

async function api(url, options = {}) {
  const opts = { ...options, headers: { ...(options.headers || {}) } };
  if (options.body && typeof options.body !== "string") {
    opts.headers["Content-Type"] = "application/json";
    opts.body = JSON.stringify(options.body);
  }
  const res = await fetch(url, opts);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Something went wrong.");
  return data;
}

function formatDate(dateString) {
  const date = new Date(dateString.replace(" ", "T") + (dateString.includes("Z") ? "" : "Z"));
  if (Number.isNaN(date.getTime())) return dateString;
  const diff = Math.floor((Date.now() - date.getTime()) / 1000);
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d`;
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

function switchAuth(tab) {
  $$(".auth-tab").forEach(btn => btn.classList.toggle("active", btn.dataset.authTab === tab));
  $("#loginForm").classList.toggle("hidden", tab !== "login");
  $("#registerForm").classList.toggle("hidden", tab !== "register");
}

async function init() {
  try {
    const data = await api("/api/me");
    if (data.user) {
      state.user = data.user;
      showApp();
    } else {
      showAuth();
    }
  } catch {
    showAuth();
  }
}

function showAuth() {
  $("#authScreen").classList.remove("hidden");
  $("#app").classList.add("hidden");
}

function showApp() {
  $("#authScreen").classList.add("hidden");
  $("#app").classList.remove("hidden");
  refreshUserUI();
  navigate("home");
}

function refreshUserUI() {
  const u = state.user;
  $("#sidebarName").textContent = u.name;
  $("#sidebarUsername").textContent = `@${u.username}`;
  setAvatarButton($("#topAvatar"), u);
  setAvatarButton($("#sidebarAvatar"), u);
  setAvatarButton($("#composerAvatar"), u);
}

async function handleLogin(e) {
  e.preventDefault();
  const formElement = e.currentTarget;
  const form = new FormData(formElement);
  try {
    const data = await api("/api/login", { method: "POST", body: Object.fromEntries(form) });
    state.user = data.user;
    formElement.reset();
    showApp();
    showToast("Welcome back!");
  } catch (err) {
    showToast(err.message, "error");
  }
}

async function handleRegister(e) {
  e.preventDefault();
  const formElement = e.currentTarget;
  const form = new FormData(formElement);
  try {
    const data = await api("/api/register", { method: "POST", body: Object.fromEntries(form) });
    state.user = data.user;
    formElement.reset();
    showApp();
    showToast("Account created successfully!");
  } catch (err) {
    showToast(err.message, "error");
  }
}

async function logout() {
  await api("/api/logout", { method: "POST" });
  state.user = null;
  state.profileUsername = null;
  showAuth();
  switchAuth("login");
  showToast("Logged out.");
}

function navigate(page, username = null) {
  state.currentPage = page;
  state.profileUsername = username || state.user?.username || null;

  $$(".nav-btn").forEach(btn => btn.classList.toggle("active", btn.dataset.page === page));
  $$(".page").forEach(p => p.classList.add("hidden"));

  if (page === "home") {
    $("#homePage").classList.remove("hidden");
    loadFeed();
  } else if (page === "explore") {
    $("#explorePage").classList.remove("hidden");
    loadUsers();
  } else {
    $("#profilePage").classList.remove("hidden");
    loadProfile(state.profileUsername);
  }
}

async function loadFeed(search = "") {
  try {
    const data = await api(`/api/feed?search=${encodeURIComponent(search)}`);
    state.posts = data.posts;
    renderPosts($("#feed"), data.posts);
  } catch (err) {
    showToast(err.message, "error");
  }
}

function renderPosts(container, posts) {
  if (!posts.length) {
    container.innerHTML = `<div class="empty">No posts found. Be the first to share something! ✨</div>`;
    return;
  }
  container.innerHTML = posts.map(postTemplate).join("");
}

function postTemplate(post) {
  const ownPost = post.author.id === state.user.id;
  const comments = post.comments.map(c => `
    <div class="comment">
      ${avatarMarkup(c.author, "avatar mini")}
      <div class="comment-body">
        <b>@${escapeHtml(c.author.username)}</b>
        <p>${escapeHtml(c.content)}</p>
      </div>
      ${c.author.id === state.user.id ? `<button class="icon-btn" onclick="deleteComment(${c.id})" title="Delete">×</button>` : ""}
    </div>
  `).join("");

  return `
    <article class="post-card card" data-post-id="${post.id}">
      <div class="post-header">
        <button class="avatar" onclick="openUser('${escapeHtml(post.author.username)}')">${post.author.avatar ? `<img src="${escapeHtml(post.author.avatar)}" alt="avatar">` : escapeHtml(initials(post.author.name))}</button>
        <div>
          <div class="post-author">${escapeHtml(post.author.name)} <span>@${escapeHtml(post.author.username)}</span></div>
          <small class="post-time">${formatDate(post.created_at)}</small>
        </div>
        ${ownPost ? `<button class="post-menu" onclick="deletePost(${post.id})" title="Delete post">⋯</button>` : ""}
      </div>
      <div class="post-content">${escapeHtml(post.content)}</div>
      ${post.image_url ? `<img class="post-image" src="${escapeHtml(post.image_url)}" alt="Post image" onerror="this.style.display='none'">` : ""}
      <div class="post-actions">
        <button class="action-btn ${post.liked ? "liked" : ""}" onclick="toggleLike(${post.id})">♥ ${post.likes}</button>
        <button class="action-btn" onclick="toggleComments(${post.id})">💬 ${post.comments.length}</button>
      </div>
      <div class="comments ${post.comments.length ? "" : "hidden"}" id="comments-${post.id}">
        ${comments || `<div class="muted" style="font-size:11px;padding:5px 0">No comments yet.</div>`}
        <form class="comment-form" onsubmit="addComment(event, ${post.id})">
          <input name="content" maxlength="1000" placeholder="Write a comment..." required>
          <button>Send</button>
        </form>
      </div>
    </article>
  `;
}

async function createPost(e) {
  e.preventDefault();
  const form = new FormData(e.currentTarget);
  const payload = Object.fromEntries(form);
  try {
    await api("/api/posts", { method: "POST", body: payload });
    e.currentTarget.reset();
    showToast("Post published!");
    await loadFeed();
  } catch (err) {
    showToast(err.message, "error");
  }
}

async function toggleLike(id) {
  try {
    await api(`/api/posts/${id}/like`, { method: "POST" });
    await loadFeed($("#searchInput").value.trim());
  } catch (err) {
    showToast(err.message, "error");
  }
}

function toggleComments(id) {
  const box = $(`#comments-${id}`);
  if (box) box.classList.toggle("hidden");
}

async function addComment(e, postId) {
  e.preventDefault();
  const input = e.currentTarget.querySelector("input");
  try {
    await api(`/api/posts/${postId}/comments`, {
      method: "POST",
      body: { content: input.value.trim() }
    });
    input.value = "";
    await loadFeed($("#searchInput").value.trim());
    setTimeout(() => {
      const box = $(`#comments-${postId}`);
      if (box) box.classList.remove("hidden");
    }, 0);
  } catch (err) {
    showToast(err.message, "error");
  }
}

async function deletePost(id) {
  if (!confirm("Delete this post?")) return;
  try {
    await api(`/api/posts/${id}`, { method: "DELETE" });
    showToast("Post deleted.");
    await loadFeed();
  } catch (err) {
    showToast(err.message, "error");
  }
}

async function deleteComment(id) {
  if (!confirm("Delete this comment?")) return;
  try {
    await api(`/api/comments/${id}`, { method: "DELETE" });
    await loadFeed();
  } catch (err) {
    showToast(err.message, "error");
  }
}

async function loadUsers(search = "") {
  try {
    const data = await api(`/api/users?search=${encodeURIComponent(search)}`);
    const grid = $("#usersGrid");
    if (!data.users.length) {
      grid.innerHTML = `<div class="empty" style="grid-column:1/-1">No users found.</div>`;
      return;
    }
    grid.innerHTML = data.users.map(user => `
      <article class="user-card card">
        <button class="avatar large" onclick="openUser('${escapeHtml(user.username)}')">
          ${user.avatar ? `<img src="${escapeHtml(user.avatar)}" alt="avatar">` : escapeHtml(initials(user.name))}
        </button>
        <div>
          <h3>${escapeHtml(user.name)}</h3>
          <p>@${escapeHtml(user.username)} · ${user.followers} followers</p>
          <p class="bio">${escapeHtml(user.bio || "No bio yet.")}</p>
        </div>
        <button class="follow-btn ${user.followed ? "following" : ""}" onclick="toggleFollow(${user.id}, this)">
          ${user.followed ? "Following" : "Follow"}
        </button>
      </article>
    `).join("");
  } catch (err) {
    showToast(err.message, "error");
  }
}

async function toggleFollow(id, button) {
  try {
    const data = await api(`/api/users/${id}/follow`, { method: "POST" });
    button.textContent = data.followed ? "Following" : "Follow";
    button.classList.toggle("following", data.followed);
  } catch (err) {
    showToast(err.message, "error");
  }
}

async function loadProfile(username) {
  try {
    const data = await api(`/api/users/${encodeURIComponent(username)}`);
    const u = data.user;
    $("#profileHeader").innerHTML = `
      ${avatarMarkup(u, "avatar")}
      <div class="profile-info">
        <h2>${escapeHtml(u.name)}</h2>
        <div class="handle">@${escapeHtml(u.username)}</div>
        <div class="bio">${escapeHtml(u.bio || "No bio yet.")}</div>
        <div class="stats">
          <div class="stat"><strong>${data.stats.posts}</strong><span>Posts</span></div>
          <div class="stat"><strong>${data.stats.followers}</strong><span>Followers</span></div>
          <div class="stat"><strong>${data.stats.following}</strong><span>Following</span></div>
        </div>
      </div>
      ${data.isMe
        ? `<button class="follow-btn profile-edit" onclick="openEditModal()">Edit profile</button>`
        : `<button class="follow-btn profile-edit ${data.followed ? "following" : ""}" onclick="toggleProfileFollow(${u.id}, this)">${data.followed ? "Following" : "Follow"}</button>`
      }
    `;

    const postsData = await api(`/api/profile/${encodeURIComponent(username)}/posts`);
    renderPosts($("#profilePosts"), postsData.posts);
  } catch (err) {
    showToast(err.message, "error");
  }
}

async function toggleProfileFollow(id, button) {
  try {
    const data = await api(`/api/users/${id}/follow`, { method: "POST" });
    button.textContent = data.followed ? "Following" : "Follow";
    button.classList.toggle("following", data.followed);
    await loadProfile(state.profileUsername);
  } catch (err) {
    showToast(err.message, "error");
  }
}

function openUser(username) {
  navigate("profile", username);
}

function openEditModal() {
  const form = $("#editProfileForm");
  form.elements.name.value = state.user.name;
  form.elements.bio.value = state.user.bio || "";
  form.elements.avatar.value = state.user.avatar || "";
  $("#editModal").classList.remove("hidden");
}

function closeEditModal() {
  $("#editModal").classList.add("hidden");
}

async function saveProfile(e) {
  e.preventDefault();
  const form = new FormData(e.currentTarget);
  try {
    const data = await api("/api/profile", {
      method: "PUT",
      body: Object.fromEntries(form)
    });
    state.user = data.user;
    refreshUserUI();
    closeEditModal();
    showToast("Profile updated!");
    navigate("profile", state.user.username);
  } catch (err) {
    showToast(err.message, "error");
  }
}

let searchTimer;
$("#searchInput").addEventListener("input", (e) => {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(() => {
    if (state.currentPage !== "home") navigate("home");
    loadFeed(e.target.value.trim());
  }, 300);
});

let peopleTimer;
$("#peopleSearch").addEventListener("input", (e) => {
  clearTimeout(peopleTimer);
  peopleTimer = setTimeout(() => loadUsers(e.target.value.trim()), 250);
});

$("#loginForm").addEventListener("submit", handleLogin);
$("#registerForm").addEventListener("submit", handleRegister);
$("#postForm").addEventListener("submit", createPost);
$("#editProfileForm").addEventListener("submit", saveProfile);
$("#logoutBtn").addEventListener("click", logout);
$("#homeBtn").addEventListener("click", () => navigate("home"));
$("#sidebarProfileBtn").addEventListener("click", () => navigate("profile"));
$("#sidebarAvatar").addEventListener("click", () => navigate("profile"));
$("#topAvatar").addEventListener("click", () => navigate("profile"));

$$("[data-auth-tab]").forEach(btn => {
  btn.addEventListener("click", () => switchAuth(btn.dataset.authTab));
});

$$("[data-page]").forEach(btn => {
  btn.addEventListener("click", () => navigate(btn.dataset.page));
});

$$("[data-close-modal]").forEach(el => el.addEventListener("click", closeEditModal));

window.toggleLike = toggleLike;
window.toggleComments = toggleComments;
window.addComment = addComment;
window.deletePost = deletePost;
window.deleteComment = deleteComment;
window.toggleFollow = toggleFollow;
window.toggleProfileFollow = toggleProfileFollow;
window.openUser = openUser;
window.openEditModal = openEditModal;

init();
