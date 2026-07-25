// Navegación con sombra al hacer scroll
window.addEventListener("scroll", function () {
  const nav = document.querySelector("nav");
  if (!nav) return;
  if (window.scrollY > 50) {
    nav.classList.add("shadow-md", "bg-surface/95");
  } else {
    nav.classList.remove("shadow-md", "bg-surface/95");
  }
});

// Menú móvil
(function () {
  const toggle = document.getElementById("mobile-menu-toggle");
  const menu = document.getElementById("mobile-menu");
  if (!toggle || !menu) return;

  toggle.addEventListener("click", () => {
    const isOpen = menu.classList.toggle("hidden") === false;
    toggle.setAttribute("aria-expanded", String(isOpen));
  });

  menu.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", () => {
      menu.classList.add("hidden");
      toggle.setAttribute("aria-expanded", "false");
    });
  });
})();

// Año dinámico en el footer
document.querySelectorAll("[data-current-year]").forEach((el) => {
  el.textContent = new Date().getFullYear();
});

// Lightbox accesible para la galería
(function () {
  const items = document.querySelectorAll("[data-lightbox-src]");
  if (!items.length) return;

  const lightbox = document.getElementById("lightbox");
  const lightboxImg = document.getElementById("lightbox-img");
  const closeBtn = document.getElementById("lightbox-close");
  const prevBtn = document.getElementById("lightbox-prev");
  const nextBtn = document.getElementById("lightbox-next");
  if (!lightbox || !lightboxImg) return;

  let currentIndex = 0;
  const images = Array.from(items);
  let lastFocused = null;

  function openAt(index) {
    currentIndex = (index + images.length) % images.length;
    const el = images[currentIndex];
    lightboxImg.src = el.getAttribute("data-lightbox-src");
    lightboxImg.alt = el.getAttribute("data-lightbox-alt") || "";
    lastFocused = document.activeElement;
    lightbox.classList.remove("hidden");
    document.body.style.overflow = "hidden";
    closeBtn.focus();
  }

  function close() {
    lightbox.classList.add("hidden");
    document.body.style.overflow = "";
    if (lastFocused) lastFocused.focus();
  }

  images.forEach((el, index) => {
    el.addEventListener("click", () => openAt(index));
    el.setAttribute("tabindex", "0");
    el.setAttribute("role", "button");
    el.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        openAt(index);
      }
    });
  });

  closeBtn.addEventListener("click", close);
  prevBtn.addEventListener("click", () => openAt(currentIndex - 1));
  nextBtn.addEventListener("click", () => openAt(currentIndex + 1));

  lightbox.addEventListener("click", (e) => {
    if (e.target === lightbox) close();
  });

  document.addEventListener("keydown", (e) => {
    if (lightbox.classList.contains("hidden")) return;
    if (e.key === "Escape") close();
    if (e.key === "ArrowRight") openAt(currentIndex + 1);
    if (e.key === "ArrowLeft") openAt(currentIndex - 1);
  });
})();
