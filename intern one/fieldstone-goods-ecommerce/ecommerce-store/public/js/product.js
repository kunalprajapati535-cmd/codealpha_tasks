const params = new URLSearchParams(window.location.search);
const productId = params.get("id");
let currentProduct = null;

function stockNote(stock) {
  if (stock <= 0) return { cls: "out", text: "Out of stock" };
  if (stock <= 5) return { cls: "low", text: `Only ${stock} left in stock` };
  return { cls: "", text: `${stock} in stock` };
}

async function loadProduct() {
  const root = document.querySelector("[data-product-root]");

  if (!productId) {
    root.innerHTML = `<div class="empty-state"><h3>No product selected</h3><p>Head back to the shop to pick something.</p></div>`;
    return;
  }

  try {
    const { product } = await api("/products/" + productId);
    currentProduct = product;

    document.title = product.name + " — Fieldstone Goods";
    document.querySelector("[data-breadcrumb-name]").textContent = product.name;

    const note = stockNote(product.stock);

    root.innerHTML = `
      <div class="detail-image" style="background:${product.color}22">
        <div style="color:${product.color}">${productIconSVG(product.image)}</div>
      </div>
      <div class="detail-info">
        <span class="product-category">${escapeHTML(product.category)}</span>
        <h1>${escapeHTML(product.name)}</h1>
        <div class="detail-price">${formatPrice(product.price)}</div>
        <p class="detail-desc">${escapeHTML(product.description)}</p>
        <p class="stock-note ${note.cls}">${note.text}</p>
        <div class="qty-row">
          <div class="qty-stepper">
            <button type="button" data-qty-minus aria-label="Decrease quantity">−</button>
            <input type="text" inputmode="numeric" value="1" data-qty-input aria-label="Quantity">
            <button type="button" data-qty-plus aria-label="Increase quantity">+</button>
          </div>
        </div>
        <div class="detail-actions">
          <button class="btn" data-add-to-cart ${product.stock <= 0 ? "disabled" : ""}>Add to cart</button>
          <a class="btn secondary" href="/">Keep browsing</a>
        </div>
      </div>
    `;

    const qtyInput = root.querySelector("[data-qty-input]");
    root.querySelector("[data-qty-minus]").addEventListener("click", () => {
      qtyInput.value = Math.max(1, parseInt(qtyInput.value || "1", 10) - 1);
    });
    root.querySelector("[data-qty-plus]").addEventListener("click", () => {
      qtyInput.value = Math.min(product.stock, parseInt(qtyInput.value || "1", 10) + 1);
    });

    root.querySelector("[data-add-to-cart]").addEventListener("click", async () => {
      const qty = Math.max(1, parseInt(qtyInput.value || "1", 10));
      await api("/cart/add", {
        method: "POST",
        body: JSON.stringify({ productId: product.id, qty }),
      });
      showToast("Added to cart.");
      renderHeaderState();
    });
  } catch (err) {
    root.innerHTML = `<div class="empty-state"><h3>We couldn't find that product</h3><p>${escapeHTML(err.message)}</p></div>`;
  }
}

loadProduct();
