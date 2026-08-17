// Shared helpers used across every page.

const API = "/api";

async function api(path, options = {}) {
  const res = await fetch(API + path, {
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || "Something went wrong.");
  }
  return data;
}

function formatPrice(value) {
  return "$" + Number(value).toFixed(2);
}

function showToast(message) {
  let toast = document.querySelector(".toast");
  if (!toast) {
    toast = document.createElement("div");
    toast.className = "toast";
    document.body.appendChild(toast);
  }
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(toast._timer);
  toast._timer = setTimeout(() => toast.classList.remove("show"), 2200);
}

// A small library of hand-drawn line icons, one per product "image" key,
// so every item has a distinct mark without needing external image assets.
const PRODUCT_ICONS = {
  skillet: `<svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="42" cy="50" r="26" stroke="currentColor" stroke-width="3"/><circle cx="42" cy="50" r="17" stroke="currentColor" stroke-width="2" opacity="0.5"/><path d="M66 44L92 30" stroke="currentColor" stroke-width="5" stroke-linecap="round"/></svg>`,
  apron: `<svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M32 18h36l-6 22H38l-6-22z" stroke="currentColor" stroke-width="3" stroke-linejoin="round"/><path d="M28 40h44l6 46H22l6-46z" stroke="currentColor" stroke-width="3" stroke-linejoin="round"/><rect x="38" y="55" width="24" height="16" stroke="currentColor" stroke-width="2.5"/></svg>`,
  board: `<svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="16" y="30" width="68" height="42" rx="6" stroke="currentColor" stroke-width="3"/><circle cx="80" cy="51" r="4" stroke="currentColor" stroke-width="2"/><path d="M26 40q10 8 0 16M40 38q10 10 0 20M54 40q10 8 0 16" stroke="currentColor" stroke-width="1.5" opacity="0.5"/></svg>`,
  measuring: `<svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M30 40h20l-4 30H34l-4-30z" stroke="currentColor" stroke-width="3" stroke-linejoin="round"/><path d="M54 34h26l-5 24H59l-5-24z" stroke="currentColor" stroke-width="3" stroke-linejoin="round" opacity="0.6"/><path d="M40 40V26h30" stroke="currentColor" stroke-width="2" opacity="0.4"/></svg>`,
  blanket: `<svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="16" y="24" width="68" height="52" rx="3" stroke="currentColor" stroke-width="3"/><path d="M16 40h68M16 56h68M34 24v52M50 24v52M66 24v52" stroke="currentColor" stroke-width="1.5" opacity="0.45"/></svg>`,
  trowel: `<svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M40 20l40 40-10 10-40-40 10-10z" stroke="currentColor" stroke-width="3" stroke-linejoin="round"/><path d="M62 62l16 16-6 6-16-16" stroke="currentColor" stroke-width="3" stroke-linejoin="round"/></svg>`,
  towels: `<svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="20" y="24" width="60" height="14" rx="2" stroke="currentColor" stroke-width="2.5"/><rect x="20" y="44" width="60" height="14" rx="2" stroke="currentColor" stroke-width="2.5" opacity="0.7"/><rect x="20" y="64" width="60" height="14" rx="2" stroke="currentColor" stroke-width="2.5" opacity="0.45"/></svg>`,
  jar: `<svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="38" y="16" width="24" height="10" rx="2" stroke="currentColor" stroke-width="2.5"/><path d="M32 26h36l6 12v34a6 6 0 01-6 6H32a6 6 0 01-6-6V38l6-12z" stroke="currentColor" stroke-width="3" stroke-linejoin="round"/></svg>`,
};

function productIconSVG(key) {
  return PRODUCT_ICONS[key] || PRODUCT_ICONS.jar;
}

// ---- Header (auth state + cart count) ----

async function renderHeaderState() {
  const accountSlot = document.querySelector("[data-account-slot]");
  const cartCountEl = document.querySelector("[data-cart-count]");

  try {
    const { user } = await api("/auth/me");
    if (accountSlot) {
      accountSlot.innerHTML = user
        ? `<a href="/orders.html" class="nav-account">Hi, ${escapeHTML(user.name.split(" ")[0])}</a> <a href="#" data-logout class="nav-account">Sign out</a>`
        : `<a href="/login.html" class="nav-account">Sign in</a>`;

      const logoutLink = accountSlot.querySelector("[data-logout]");
      if (logoutLink) {
        logoutLink.addEventListener("click", async (e) => {
          e.preventDefault();
          await api("/auth/logout", { method: "POST" });
          showToast("Signed out.");
          setTimeout(() => (window.location.href = "/"), 400);
        });
      }
    }
  } catch (e) {
    // Not signed in / network issue — leave default sign-in link.
  }

  try {
    const cart = await api("/cart");
    if (cartCountEl) cartCountEl.textContent = cart.itemCount;
  } catch (e) {
    /* ignore */
  }
}

function escapeHTML(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

document.addEventListener("DOMContentLoaded", renderHeaderState);
