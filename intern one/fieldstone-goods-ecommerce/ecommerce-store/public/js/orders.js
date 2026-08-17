function orderCardHTML(order) {
  const date = new Date(order.createdAt).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

  const lines = order.items
    .map(
      (item) =>
        `<div class="order-line"><span>${item.qty} × ${escapeHTML(item.name)}</span><span>${formatPrice(item.subtotal)}</span></div>`
    )
    .join("");

  return `
    <div class="order-card">
      <div class="order-card-head">
        <div>
          <div class="order-id">Order ${order.id}</div>
          <div style="font-size:13px; color: var(--slate); margin-top:2px;">${date} · Ships to ${escapeHTML(order.shippingAddress)}</div>
        </div>
        <span class="order-status">${order.status}</span>
      </div>
      ${lines}
      <div class="order-total"><span>Total</span><span>${formatPrice(order.total)}</span></div>
    </div>
  `;
}

async function loadOrders() {
  const root = document.querySelector("[data-orders-root]");
  const { user } = await api("/auth/me");

  if (!user) {
    root.innerHTML = `<div class="empty-state">
      <h3>Sign in to see your orders</h3>
      <p>Your order history is tied to your account.</p>
      <a href="/login.html?next=/orders.html" class="btn" style="margin-top:16px;">Sign in</a>
    </div>`;
    return;
  }

  const { orders } = await api("/orders");

  if (orders.length === 0) {
    root.innerHTML = `<div class="empty-state">
      <h3>No orders yet</h3>
      <p>Once you check out, your orders will show up here.</p>
      <a href="/" class="btn" style="margin-top:16px;">Browse the shop</a>
    </div>`;
    return;
  }

  root.innerHTML = orders.map(orderCardHTML).join("");
}

loadOrders();
