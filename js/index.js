let todasCifras = [];
let filtroLetra = "";

console.log("🔥 index.js carregado");


function salvarSession(chave, valor) {
  try {
    sessionStorage.setItem(chave, valor);
    return true;
  } catch (err) {
    console.warn("⚠️ sessionStorage indisponível:", err);
    return false;
  }
}

function escapeHtml(str) {
  if (str == null) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}


document.addEventListener("DOMContentLoaded", async () => {
  configurarModal();         
  configurarFechamentoAcoes(); 
  try {
    todasCifras = await carregarCifrasComLoading();
    todasCifras.sort((a, b) =>
      String(a.nome || "").localeCompare(String(b.nome || ""))
    );
    atualizarContador();
    renderizarCards();
    configurarFiltroAlfabetico();
  } catch (err) {
    console.error("❌ Erro na inicialização:", err);
  }
});


function atualizarContador() {
  const contadorSpan = document.getElementById("contador-numero");
  if (contadorSpan) contadorSpan.textContent = todasCifras.length;
}

function configurarFiltroAlfabetico() {
  const letras = document.querySelectorAll(".indice-alfabetico span");
  letras.forEach((el) => {
    el.addEventListener("click", () => {
      const letra = el.dataset.letra;
      if (filtroLetra === letra) {
        filtroLetra = "";
        letras.forEach((l) => l.classList.remove("ativo"));
      } else {
        filtroLetra = letra;
        letras.forEach((l) => l.classList.remove("ativo"));
        el.classList.add("ativo");
      }
      renderizarCards();
    });
  });
}


function configurarFechamentoAcoes() {
  document.addEventListener("click", (e) => {
    if (e.target.closest(".acoes-wrapper")) return;

    document.querySelectorAll(".acoes-expandidas.aberto").forEach((el) => {
      el.classList.remove("aberto");
      const id = el.dataset.id;
      const toggle = document.querySelector(
        `.btn-acoes-toggle[data-id="${id}"]`
      );
      if (toggle) toggle.textContent = "•••";
    });
  });
}


function renderizarCards() {
  const container = document.getElementById("lista-cifras");
  if (!container) return;

  let cifrasFiltradas = todasCifras;

  if (filtroLetra) {
    cifrasFiltradas = todasCifras.filter(
      (c) =>
        String(c.nome || "").charAt(0).toUpperCase() === filtroLetra
    );
  }

  if (cifrasFiltradas.length === 0) {
    container.innerHTML = `<p class="mensagem-vazia">${
      filtroLetra
        ? `Nenhuma cifra com a letra "${escapeHtml(filtroLetra)}".`
        : "Nenhuma cifra cadastrada ainda."
    }</p>`;
    return;
  }

  container.innerHTML = cifrasFiltradas
    .map((c) => {
      const idStr = String(c.id);
      const nome = escapeHtml(c.nome || "");
      const tom = escapeHtml(c.tom || "Sem tom");
      const interprete = escapeHtml(c.interprete || "Intérprete não informado");

      return `
        <div class="card-cifra" data-id="${idStr}">
          <div class="card-header">
            <h3 style="cursor:pointer;" data-id="${idStr}" title="Música: ${nome} | Tom: ${tom}">${nome}</h3>

            <svg class="icone-outline icone-documento" data-id="${idStr}"
                 viewBox="0 0 24 24" width="20" height="20"
                 stroke="currentColor" stroke-width="1.5" fill="none"
                 style="cursor:pointer;" aria-label="editar">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <title>editar</title>
            </svg>
          </div>

          <div class="card-footer">
            <svg class="icone-outline icone-chama" data-id="${idStr}"
                 viewBox="0 0 24 24" width="20" height="20"
                 stroke="currentColor" stroke-width="1.5" fill="none"
                 style="cursor:pointer;" aria-label="intérprete">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
              <title>${interprete}</title>
            </svg>

            <div class="acoes-wrapper">
              <button type="button" class="btn-acoes-toggle" data-id="${idStr}" title="mais opções">•••</button>
              <div class="acoes-expandidas" data-id="${idStr}">
                <button type="button" class="btn-acao" data-id="${idStr}" data-acao="visualizar" title="visualizar">👁️</button>
                <button type="button" class="btn-acao" data-id="${idStr}" data-acao="editar" title="editar">✏️</button>
                <button type="button" class="btn-acao" data-id="${idStr}" data-acao="excluir" title="deletar">🗑️</button>
              </div>
            </div>
          </div>
        </div>
      `;
    })
    .join("");

  if (!container.dataset.delegado) {
    container.dataset.delegado = "1";
    container.addEventListener("click", onClickDelegado);
  }
}


async function onClickDelegado(e) {
  const container = e.currentTarget;

  const h3 = e.target.closest(".card-header h3");
  if (h3) {
    e.stopPropagation();
    const id = h3.dataset.id;
    if (id && id !== "undefined") abrirModalDetalhes(id);
    return;
  }

  const iconeChama = e.target.closest(".icone-chama");
  if (iconeChama) {
    e.stopPropagation();
    const titleEl = iconeChama.querySelector("title");
    const interprete = titleEl ? titleEl.textContent.trim() : "";
    if (interprete && interprete !== "Intérprete não informado") {
      const termo = encodeURIComponent(interprete);
      window.location.href = `html/pesquisa.html?campo=interprete&termo=${termo}`;
    } else {
      mostrarToast("Intérprete não informado para esta cifra.", "#b33");
    }
    return;
  }

  const iconeDoc = e.target.closest(".icone-documento");
  if (iconeDoc) {
    e.stopPropagation();
    const id = iconeDoc.dataset.id;
    if (id) {
      salvarSession("cifraId", id);
      salvarSession("modoEdicao", "true");
      window.location.href = "html/enviar.html";
    }
    return;
  }

  const btnToggle = e.target.closest(".btn-acoes-toggle");
  if (btnToggle) {
    e.stopPropagation();
    const id = btnToggle.dataset.id;
    const expandidas = container.querySelector(
      `.acoes-expandidas[data-id="${id}"]`
    );
    if (expandidas) {
      const abrindo = !expandidas.classList.contains("aberto");

      container
        .querySelectorAll(".acoes-expandidas.aberto")
        .forEach((el) => el.classList.remove("aberto"));
      container
        .querySelectorAll(".btn-acoes-toggle")
        .forEach((b) => (b.textContent = "•••"));

      if (abrindo) {
        expandidas.classList.add("aberto");
        btnToggle.textContent = "✕";
      }
    }
    return;
  }

  const btnAcao = e.target.closest(".btn-acao");
  if (btnAcao) {
    e.stopPropagation();
    const id = btnAcao.dataset.id;
    const acao = btnAcao.dataset.acao;

    const expandidas = container.querySelector(
      `.acoes-expandidas[data-id="${id}"]`
    );
    if (expandidas) {
      expandidas.classList.remove("aberto");
      const toggle = container.querySelector(
        `.btn-acoes-toggle[data-id="${id}"]`
      );
      if (toggle) toggle.textContent = "•••";
    }

    switch (acao) {
      case "visualizar":
        abrirModalDetalhes(id);
        break;

      case "editar":
        salvarSession("cifraId", id);
        salvarSession("modoEdicao", "true");
        window.location.href = "html/enviar.html";
        break;

      case "excluir":
        if (confirm("Tem certeza que deseja excluir esta cifra?")) {
          mostrarLoading();
          try {
            await deletarCifra(id);
            mostrarToast("Cifra excluída com sucesso!", "#40E0D0");
            todasCifras = await listarTodasCifras();
            todasCifras.sort((a, b) =>
              String(a.nome || "").localeCompare(String(b.nome || ""))
            );
            atualizarContador();
            renderizarCards();
          } catch (error) {
            console.error("❌ Erro ao excluir:", error);
            mostrarToast("Erro ao excluir a cifra.", "#b33");
          } finally {
            esconderLoading();
          }
        }
        break;
    }
  }
}


function configurarModal() {
  const overlay = document.getElementById("modal-overlay");
  const btnFechar = document.getElementById("modal-fechar");

  if (!overlay) return;

  const fechar = () => {
    overlay.classList.remove("ativo");
    document.dispatchEvent(new Event("modal:closed"));
  };

  if (btnFechar) {
    btnFechar.addEventListener("click", fechar);
  }

  overlay.addEventListener("click", (e) => {
    if (e.target === e.currentTarget) fechar();
  });
}


async function abrirModalDetalhes(id) {
  console.log("🔍 abrirModalDetalhes chamado com ID:", id);

  const overlay = document.getElementById("modal-overlay");
  const elTitulo = document.getElementById("modal-titulo");
  const elInterprete = document.getElementById("modal-interprete");
  const elConteudo = document.getElementById("modal-conteudo");
  const pdfDiv = document.getElementById("modal-pdf");

  if (!overlay || !elTitulo || !elInterprete || !elConteudo || !pdfDiv) {
    console.error("❌ Elementos do modal não encontrados");
    return;
  }

  const cifraLocal = todasCifras.find(
    (c) => String(c.id) === String(id)
  );

  overlay.classList.add("ativo");

  if (cifraLocal) {
    preencherModal(cifraLocal, { elTitulo, elInterprete, elConteudo, pdfDiv });
  } else {
    elTitulo.textContent = "Carregando...";
    elInterprete.textContent = "";
    elConteudo.textContent = "";
    pdfDiv.innerHTML = "";
  }

  try {
    const cifrasAtualizadas = await listarTodasCifras();
    const cifra = cifrasAtualizadas.find((c) => String(c.id) === String(id));

    if (cifra) {
      preencherModal(cifra, { elTitulo, elInterprete, elConteudo, pdfDiv });
    } else if (!cifraLocal) {
      mostrarToast("Cifra não encontrada.", "#b33");
      overlay.classList.remove("ativo");
    }
  } catch (err) {
    console.warn(
      "⚠️ Não foi possível atualizar do Firestore, usando cache local:",
      err
    );
    if (!cifraLocal) {
      mostrarToast("Erro ao carregar a cifra.", "#b33");
      overlay.classList.remove("ativo");
    }
  }
}

function preencherModal(cifra, els) {
  const { elTitulo, elInterprete, elConteudo, pdfDiv } = els;

  elTitulo.textContent = cifra.nome || "";
  elInterprete.textContent = cifra.interprete || "Não informado";
  elConteudo.textContent = cifra.conteudo || "Conteúdo não disponível";

  pdfDiv.innerHTML = "";

  if (!cifra.pdfBase64) {
    pdfDiv.innerHTML =
      '<p style="color:var(--text-muted);">Nenhum PDF anexado.</p>';
    return;
  }

  const nomeArquivo =
    String(cifra.nome || "cifra").replace(/[\\/:*?"<>|]+/g, "_") + ".pdf";

  const linkVisualizar = document.createElement("a");
  linkVisualizar.href = `html/visualizar-pdf.html?id=${encodeURIComponent(cifra.id)}`;
  linkVisualizar.target = "_blank";
  linkVisualizar.rel = "noopener";
  linkVisualizar.className = "btn-baixar-pdf btn-visualizar-pdf";
  linkVisualizar.textContent = "👁️ Visualizar PDF";

  let blobUrl = null;
  try {
    const byteChars = atob(cifra.pdfBase64);
    const byteNums = new Uint8Array(byteChars.length);
    for (let i = 0; i < byteChars.length; i++) {
      byteNums[i] = byteChars.charCodeAt(i);
    }
    const blob = new Blob([byteNums], { type: "application/pdf" });
    blobUrl = URL.createObjectURL(blob);

    const liberarBlob = () => {
      URL.revokeObjectURL(blobUrl);
      document.removeEventListener("modal:closed", liberarBlob);
    };
    document.addEventListener("modal:closed", liberarBlob);
  } catch (err) {
    console.error("Erro ao criar blob do PDF:", err);
  }

  const linkDownload = document.createElement("a");
  linkDownload.href =
    blobUrl || `data:application/pdf;base64,${cifra.pdfBase64}`;
  linkDownload.download = nomeArquivo;
  linkDownload.className = "btn-baixar-pdf";
  linkDownload.textContent = "📄 Baixar PDF";

  const wrap = document.createElement("div");
  wrap.style.display = "flex";
  wrap.style.gap = "10px";
  wrap.style.marginTop = "10px";
  wrap.style.flexWrap = "wrap";
  wrap.appendChild(linkDownload);
  wrap.appendChild(linkVisualizar);
  pdfDiv.appendChild(wrap);
}
