document.addEventListener("DOMContentLoaded", function () {
  const menuToggle = document.getElementById("menuToggle");
  const menuDropdown = document.getElementById("menuDropdown");
  if (!menuToggle || !menuDropdown) return;

  if (menuToggle.dataset.menuInit === "1") return;
  menuToggle.dataset.menuInit = "1";

  const header = document.querySelector("header");


  function normalizarPath(path) {
    if (!path) return "/index.html";
    try {
      path = decodeURIComponent(path);
    } catch (_) {
    }
    path = path.split("?")[0].split("#")[0];
    if (path.endsWith("/")) path += "index.html";
    return path.toLowerCase();
  }

  function pathDoLink(a) {
    try {
      return normalizarPath(new URL(a.href, location.href).pathname);
    } catch (_) {
      return normalizarPath(a.getAttribute("href") || "");
    }
  }

  function fecharMenu() {
    if (menuDropdown.classList.contains("aberto")) {
      menuDropdown.classList.remove("aberto");
      menuToggle.setAttribute("aria-expanded", "false");
    }
  }

  menuToggle.addEventListener("click", function (e) {
    e.stopPropagation();
    const abrindo = !menuDropdown.classList.contains("aberto");
    menuDropdown.classList.toggle("aberto", abrindo);
    menuToggle.setAttribute("aria-expanded", abrindo ? "true" : "false");
  });

  menuDropdown.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", fecharMenu);
  });

  document.addEventListener("click", function (e) {
    if (!menuDropdown.classList.contains("aberto")) return;
    if (header && !header.contains(e.target)) fecharMenu();
  });

  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") fecharMenu();
  });

  function aplicarEstadoAtual() {
    const pathAtual = normalizarPath(location.pathname);
    const pathAtualSemIndex = pathAtual.replace(/\/index\.html$/, "/");

    menuDropdown.querySelectorAll("a").forEach((link) => {
      const destino = pathDoLink(link);
      const destinoSemIndex = destino.replace(/\/index\.html$/, "/");

      const ehAtual =
        destino === pathAtual ||
        destinoSemIndex === pathAtualSemIndex;

      if (ehAtual) {
        link.style.display = "none";
        link.setAttribute("aria-current", "page");
      } else {
        link.style.display = "";
        link.removeAttribute("aria-current");
      }
    });
  }

  aplicarEstadoAtual();

  
  window.addEventListener("pageshow", function (e) {
    fecharMenu();
    aplicarEstadoAtual();
  });
});