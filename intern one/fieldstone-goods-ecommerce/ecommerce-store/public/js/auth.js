function getNextUrl() {
  const params = new URLSearchParams(window.location.search);
  return params.get("next") || "/";
}

const loginForm = document.querySelector("[data-login-form]");
if (loginForm) {
  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const errorBox = document.querySelector("[data-form-error]");
    const btn = document.querySelector("[data-submit-btn]");
    errorBox.classList.remove("show");
    btn.disabled = true;
    btn.textContent = "Signing in…";

    try {
      await api("/auth/login", {
        method: "POST",
        body: JSON.stringify({
          email: document.getElementById("email").value.trim(),
          password: document.getElementById("password").value,
        }),
      });
      window.location.href = getNextUrl();
    } catch (err) {
      errorBox.textContent = err.message;
      errorBox.classList.add("show");
      btn.disabled = false;
      btn.textContent = "Sign in";
    }
  });
}

const registerForm = document.querySelector("[data-register-form]");
if (registerForm) {
  registerForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const errorBox = document.querySelector("[data-form-error]");
    const btn = document.querySelector("[data-submit-btn]");
    errorBox.classList.remove("show");
    btn.disabled = true;
    btn.textContent = "Creating account…";

    try {
      await api("/auth/register", {
        method: "POST",
        body: JSON.stringify({
          name: document.getElementById("name").value.trim(),
          email: document.getElementById("email").value.trim(),
          password: document.getElementById("password").value,
        }),
      });
      window.location.href = getNextUrl();
    } catch (err) {
      errorBox.textContent = err.message;
      errorBox.classList.add("show");
      btn.disabled = false;
      btn.textContent = "Create account";
    }
  });
}
