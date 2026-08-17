let allCategories = [];
let currentCategory = "All";
let currentQuery = "";
let searchTimer = null;

function productCardHTML(p) {
  return `
    <a class="product-card" href="/product.html?id=${p.id}">
      <div class="product-thumb" style="background:${p.color}22">
        <div style="color:${p.color}">${productIconSVG(p.image)}</div>
      </div>
      <div class="product-body">
        <span class="product-category">${escapeHTML(p.category)}</span>
        <h3 class="product-name">${escapeHTML(p.name)}</h3>
        <div class="product-row">
          <span class="price-tag">${formatPrice(p.price)}</span>
          <button class="icon-btn" type="button" data-add="${p.id}" title="Add to cart" aria-label="Add ${escapeHTML(p.name)} to cart">+</button>
        </div>
      </div>
    </a>
  `;
}

function renderCategoryPills() {
  const wrap = document.querySelector("[data-category-pills]");
  wrap.innerHTML = ["All", ...allCategories]
    .map(
      (cat) =>
        `<button class="pill ${cat === currentCategory ? "active" : ""}" data-category="${cat}">${cat}</button>`
    )
    .join("");

  wrap.querySelectorAll(".pill").forEach((btn) => {
    btn.addEventListener("click", () => {
      currentCategory = btn.dataset.category;
      loadProducts();
    });
  });
}

async function loadProducts() {
  const grid = document.querySelector("[data-product-grid]");
  const params = new URLSearchParams();
  if (currentCategory !== "All") params.set("category", currentCategory);
  if (currentQuery) params.set("q", currentQuery);

  const { products, categories } = await api("/products?" + params.toString());

  if (allCategories.length === 0) {
    allCategories = categories;
  }
  renderCategoryPills();

  if (products.length === 0) {
    grid.innerHTML = `<div class="empty-state" style="grid-column: 1 / -1;">
      <h3>Nothing matches that search</h3>
      <p>Try a different category or a shorter search term.</p>
    </div>`;
    return;
  }

  grid.innerHTML = products.map(productCardHTML).join("");

  grid.querySelectorAll("[data-add]").forEach((btn) => {
    btn.addEventListener("click", async (e) => {
      e.preventDefault();
      e.stopPropagation();
      await api("/cart/add", {
        method: "POST",
        body: JSON.stringify({ productId: btn.dataset.add, qty: 1 }),
      });
      showToast("Added to cart.");
      renderHeaderState();
    });
  });
}

document.querySelector("[data-search]").addEventListener("input", (e) => {
  currentQuery = e.target.value.trim();
  clearTimeout(searchTimer);
  searchTimer = setTimeout(loadProducts, 250);
});

loadProducts();
