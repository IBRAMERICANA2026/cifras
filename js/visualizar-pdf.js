(function () {
  "use strict";

  let pdfDoc = null;
  let pdfBytes = null;
  let currentPage = 1;
  let scale = 1;
  let nomeArquivo = "cifra.pdf";
  let renderizando = false;
  let renderPendente = null;
  let modoAjuste = "width"; // "width" | "manual"

  const canvas = document.getElementById("pdf-canvas");
  const ctx = canvas.getContext("2d");
  const viewer = document.getElementById("pdf-viewer");
  const estado = document.getElementById("pdf-estado");
  const statusEl = document.getElementById("pdf-status");

  const nomeEl = document.getElementById("nome-cifra");
  const interpreteEl = document.getElementById("interprete-cifra");

  const nav = document.getElementById("pdf-nav");
  const btnPrev = document.getElementById("btn-prev");
  const btnNext = document.getElementById("btn-next");
  const btnZoomIn = document.getElementById("btn-zoom-in");
  const btnZoomOut = document.getElementById("btn-zoom-out");
  const btnFit = document.getElementById("btn-fit");
  const btnDownload = document.getElementById("btn-download");
  const btnPrint = document.getElementById("btn-print");
  const btnClose = document.getElementById("btn-close");

  const pageNumEl = document.getElementById("page-num");
  const pageCountEl = document.getElementById("page-count");
  const zoomLabel = document.getElementById("zoom-label");

  window.addEventListener("DOMContentLoaded", async () => {
    const params = new URLSearchParams(window.location.search);
    const id = params.get("id");

    if (!id) {
      mostrarErro("Nenhuma cifra especificada.");
      return;
    }

    const okFirebase = await aguardarGlobal("firebase");
    if (!okFirebase) {
      mostrarErro("Firebase não carregou. Verifique a conexão.");
      return;
    }

    const okPdfJs = await aguardarGlobal("pdfjsLib");
    if (!okPdfJs) {
      mostrarErro("Biblioteca PDF não carregou. Verifique a conexão.");
      return;
    }

    pdfjsLib.GlobalWorkerOptions.workerSrc =
      "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js";

    try {
      await carregarCifra(id);
    } catch (err) {
      console.error("❌ Erro ao carregar cifra:", err);
      mostrarErro("Erro ao carregar a cifra. Tente novamente.");
    }
  });

  function aguardarGlobal(nome, timeoutMs = 8000) {
    return new Promise((resolve) => {
      if (typeof window[nome] !== "undefined") return resolve(true);
      const inicio = Date.now();
      const timer = setInterval(() => {
        if (typeof window[nome] !== "undefined") {
          clearInterval(timer);
          resolve(true);
        } else if (Date.now() - inicio > timeoutMs) {
          clearInterval(timer);
          resolve(false);
        }
      }, 100);
    });
  }

  async function carregarCifra(id) {
    mostrarStatus("Buscando cifra...");

    const cifras = await listarTodasCifras();
    const cifra = cifras.find((c) => String(c.id) === String(id));

    if (!cifra) {
      mostrarErro("Cifra não encontrada.");
      return;
    }

    document.title = `${cifra.nome || "Cifra"} - IBR Cifras`;
    nomeEl.textContent = cifra.nome || "Sem nome";
    interpreteEl.textContent = cifra.interprete || "Intérprete não informado";

    if (!cifra.pdfBase64) {
      mostrarErro("Esta cifra não tem PDF anexado.");
      return;
    }

    nomeArquivo =
      String(cifra.nome || "cifra").replace(/[\\/:*?"<>|]+/g, "_") + ".pdf";

    mostrarStatus("Preparando PDF...");
    try {
      const byteChars = atob(cifra.pdfBase64);
      const byteNums = new Uint8Array(byteChars.length);
      for (let i = 0; i < byteChars.length; i++) {
        byteNums[i] = byteChars.charCodeAt(i);
      }
      pdfBytes = byteNums;
    } catch (err) {
      console.error("Erro ao decodificar base64:", err);
      mostrarErro("PDF corrompido ou em formato inválido.");
      return;
    }

    mostrarStatus("Renderizando primeira página...");
    try {
      const tarefa = pdfjsLib.getDocument({ data: pdfBytes });
      pdfDoc = await tarefa.promise;
    } catch (err) {
      console.error("Erro ao abrir PDF:", err);
      mostrarErro("Não foi possível abrir este PDF.");
      return;
    }

    estado.style.display = "none";
    canvas.style.display = "block";
    nav.style.display = "flex";

    pageCountEl.textContent = pdfDoc.numPages;
    pageNumEl.textContent = 1;

    await ajustarParaLargura();
    await renderizarPagina(1);

    configurarEventos();
    atualizarBotoes();
  }


  async function renderizarPagina(num) {
    if (!pdfDoc) return;

    if (renderizando) {
      renderPendente = num;
      return;
    }

    if (num < 1 || num > pdfDoc.numPages) return;

    renderizando = true;
    try {
      const page = await pdfDoc.getPage(num);
      const viewport = page.getViewport({ scale });

      const outputScale = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.floor(viewport.width * outputScale);
      canvas.height = Math.floor(viewport.height * outputScale);
      canvas.style.width = Math.floor(viewport.width) + "px";
      canvas.style.height = Math.floor(viewport.height) + "px";

      const transform =
        outputScale !== 1 ? [outputScale, 0, 0, outputScale, 0, 0] : null;

      await page.render({
        canvasContext: ctx,
        viewport,
        transform,
      }).promise;

      currentPage = num;
      pageNumEl.textContent = num;
      atualizarBotoes();
    } catch (err) {
      console.error("Erro ao renderizar página:", err);
      mostrarStatus("Erro ao renderizar esta página.");
    } finally {
      renderizando = false;
      if (renderPendente !== null) {
        const prox = renderPendente;
        renderPendente = null;
        renderizarPagina(prox);
      }
    }
  }

  async function ajustarParaLargura() {
    if (!pdfDoc) return;
    const page = await pdfDoc.getPage(currentPage);
    const viewport = page.getViewport({ scale: 1 });
    const larguraDisponivel = viewer.clientWidth - 40; // padding
    scale = larguraDisponivel / viewport.width;
    modoAjuste = "width";
    atualizarZoomLabel();
  }

  function atualizarZoomLabel() {
    zoomLabel.textContent = Math.round(scale * 100) + "%";
  }

  function atualizarBotoes() {
    if (!pdfDoc) return;
    btnPrev.disabled = currentPage <= 1;
    btnNext.disabled = currentPage >= pdfDoc.numPages;
  }


  function configurarEventos() {
    btnPrev.addEventListener("click", () => {
      if (currentPage > 1) renderizarPagina(currentPage - 1);
    });

    btnNext.addEventListener("click", () => {
      if (pdfDoc && currentPage < pdfDoc.numPages) {
        renderizarPagina(currentPage + 1);
      }
    });

    btnZoomIn.addEventListener("click", () => {
      scale = Math.min(scale + 0.25, 4);
      modoAjuste = "manual";
      atualizarZoomLabel();
      renderizarPagina(currentPage);
    });

    btnZoomOut.addEventListener("click", () => {
      scale = Math.max(scale - 0.25, 0.25);
      modoAjuste = "manual";
      atualizarZoomLabel();
      renderizarPagina(currentPage);
    });

    btnFit.addEventListener("click", async () => {
      await ajustarParaLargura();
      renderizarPagina(currentPage);
    });

    btnDownload.addEventListener("click", () => {
      if (!pdfBytes) return;
      try {
        const blob = new Blob([pdfBytes], { type: "application/pdf" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = nomeArquivo;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(url), 5000);
      } catch (err) {
        console.error("Erro ao baixar:", err);
      }
    });

    btnPrint.addEventListener("click", () => {
      window.print();
    });

    btnClose.addEventListener("click", () => {
      window.close();
      setTimeout(() => {
        if (!window.closed) {
          mostrarStatus("Use o botão de fechar da aba do navegador.");
        }
      }, 300);
    });

    document.addEventListener("keydown", (e) => {
      if (!pdfDoc) return;
      if (e.key === "ArrowLeft" && currentPage > 1) {
        renderizarPagina(currentPage - 1);
      } else if (e.key === "ArrowRight" && currentPage < pdfDoc.numPages) {
        renderizarPagina(currentPage + 1);
      } else if (e.key === "+" || e.key === "=") {
        btnZoomIn.click();
      } else if (e.key === "-") {
        btnZoomOut.click();
      } else if (e.key === "Escape") {
        btnClose.click();
      }
    });

    let resizeTimer = null;
    window.addEventListener("resize", () => {
      if (modoAjuste !== "width") return;
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(async () => {
        await ajustarParaLargura();
        renderizarPagina(currentPage);
      }, 200);
    });
  }

  
  function mostrarStatus(msg) {
    estado.style.display = "flex";
    estado.style.margin = "auto";
    estado.innerHTML = `<div class="spinner"></div><p>${escapar(msg)}</p>`;
  }

  function mostrarErro(msg) {
    estado.style.display = "flex";
    estado.style.margin = "auto";
    estado.innerHTML = `<p style="font-size:2rem;margin:0 0 10px;">⚠️</p><p>${escapar(
      msg
    )}</p>`;
    canvas.style.display = "none";
    nav.style.display = "none";
  }

  function escapar(str) {
    if (str == null) return "";
    const div = document.createElement("div");
    div.textContent = String(str);
    return div.innerHTML;
  }
})();
