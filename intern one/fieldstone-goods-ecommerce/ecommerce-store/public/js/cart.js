function cartItemHTML(item) {
  const { product, qty, subtotal } = item;
  return `
    <div class="cart-item" data-item="${product.id}">
      <div class="cart-thumb" style="background:${product.color}22">
        <div style="color:${product.color}">${productIconSVG(product.image)}</div>
      </div>
      <div>
        <p class="cart-item-name">${escapeHTML(product.name)}</p>
        <span class="cart-item-price">${formatPrice(product.price)} each</span>
        <a href="#" class="cart-item-remove" data-remove="${product.id}">Remove</a>
      </div>
      <div class="qty-stepper">
        <button type="button" data-minus="${product.id}" aria-label="Decrease quantity">−</button>
        <input type="text" value="${qty}" data-qty="${product.id}" inputmode="numeric" aria-label="Quantity">
        <button type="button" data-plus="${product.id}" aria-label="Increase quantity">+</button>
      </div>
      <div class="price-tag">${formatPrice(subtotal)}</div>
    </div>
  `;
}

async function loadCart() {
  const container = document.querySelector("[data-cart-items]");
  const cart = await api("/cart");

  document.querySelector("[data-summary-count]").textContent = cart.itemCount;
  document.querySelector("[data-summary-total]").textContent = formatPrice(cart.total);
  document.querySelector("[data-checkout-btn]").disabled = cart.items.length === 0;

  if (cart.items.length === 0) {
    container.innerHTML = `<div class="empty-state">
      <h3>Your cart is empty</h3>
      <p>Find something worth keeping.</p>
      <a href="/" class="btn" style="margin-top:16px;">Browse the shop</a>
    </div>`;
    return;
  }

  container.innerHTML = cart.items.map(cartItemHTML).join("");

  container.querySelectorAll("[data-remove]").forEach((el) => {
    el.addEventListener("click", async (e) => {
      e.preventDefault();
      await api("/cart/remove", {
        method: "POST",
        body: JSON.stringify({ productId: el.dataset.remove }),
      });
      loadCart();
      renderHeaderState();
    });
  });

  async function updateQty(productId, qty) {
    await api("/cart/update", {
      method: "POST",
      body: JSON.stringify({ productId, qty }),
    });
    loadCart();
    renderHeaderState();
  }

  container.querySelectorAll("[data-minus]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const input = container.querySelector(`[data-qty="${btn.dataset.minus}"]`);
      const next = Math.max(1, parseInt(input.value || "1", 10) - 1);
      updateQty(btn.dataset.minus, next);
    });
  });
  container.querySelectorAll("[data-plus]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const input = container.querySelector(`[data-qty="${btn.dataset.plus}"]`);
      const next = parseInt(input.value || "1", 10) + 1;
      updateQty(btn.dataset.plus, next);
    });
  });
  container.querySelectorAll("[data-qty]").forEach((input) => {
    input.addEventListener("change", () => {
      const next = parseInt(input.value || "1", 10);
      updateQty(input.dataset.qty, next);
    });
  });
}

document.querySelector("[data-checkout-form]").addEventListener("submit", async (e) => {
  e.preventDefault();
  const errorBox = document.querySelector("[data-checkout-error]");
  errorBox.classList.remove("show");

  const { user } = await api("/auth/me");
  if (!user) {
    window.location.href = "/login.html?next=/cart.html";
    return;
  }

  const shippingAddress = document.getElementById("shipping").value.trim();
  const btn = document.querySelector("[data-checkout-btn]");
  btn.disabled = true;
  btn.textContent = "Placing order…";

  try {
    const { order } = await api("/orders", {
      method: "POST",
      body: JSON.stringify({ shippingAddress }),
    });
    showToast("Order placed!");
    window.location.href = "/orders.html?placed=" + order.id;
  } catch (err) {
    errorBox.textContent = err.message;
    errorBox.classList.add("show");
    btn.disabled = false;
    btn.textContent = "Place order";
  }
});

loadCart();
