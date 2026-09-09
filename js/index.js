let todasCifras = [];
let filtroLetra = "";

console.log("🔥 index.js carregado");

document.addEventListener("DOMContentLoaded", async () => {
  todasCifras = await carregarCifrasComLoading();
  todasCifras.sort((a, b) => a.nome.localeCompare(b.nome));
  atualizarContador();
  renderizarCards();
  configurarFiltroAlfabetico();
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

function renderizarCards() {
  const container = document.getElementById("lista-cifras");
  if (!container) return;

  let cifrasFiltradas = todasCifras;
  if (filtroLetra) {
    cifrasFiltradas = todasCifras.filter(
      (c) => c.nome.charAt(0).toUpperCase() === filtroLetra,
    );
  }

  if (cifrasFiltradas.length === 0) {
    container.innerHTML = `<p class="mensagem-vazia">${filtroLetra
      ? `Nenhuma cifra com a letra "${filtroLetra}".`
      : "Nenhuma cifra cadastrada ainda."
      }</p>`;
    return;
  }

  container.innerHTML = cifrasFiltradas
    .map((c) => {
      const idStr = String(c.id);
      return `
        <div class="card-cifra" data-id="${idStr}">
            <div class="card-header">
                <h3 style="cursor:pointer;" data-id="${idStr}" title="Música: ${c.nome} | Tom: ${c.tom || "Sem tom"}">${c.nome}</h3>

                <!-- Ícone de documento (edição) -->
            <svg class="icone-outline icone-documento" data-id="${idStr}" viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" stroke-width="1.5" fill="none" style="cursor:pointer;">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <title>editar</title>
            </svg>

            </div>
            <div class="card-footer">
                <!-- Ícone de usuário com tooltip do intérprete -->
            <svg class="icone-outline icone-chama" data-id="${idStr}" viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" stroke-width="1.5" fill="none" style="cursor:pointer;">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
                <title>${c.interprete || "Intérprete não informado"}</title>
            </svg>
                <div class="acoes-wrapper">
                    <button class="btn-acoes-toggle" data-id="${idStr}" title="mais opções">•••</button>
                    <div class="acoes-expandidas" data-id="${idStr}">
                        <button class="btn-acao" data-id="${idStr}" data-acao="visualizar" title="visualizar">👁️</button>
                        <button class="btn-acao" data-id="${idStr}" data-acao="editar" title="editar">✏️</button>
                        <button class="btn-acao" data-id="${idStr}" data-acao="excluir" title="deletar">🗑️</button>
                    </div>
                </div>
            </div>
        </div>
        `;
    })
    .join("");

  container.querySelectorAll(".card-header h3").forEach((title) => {
    title.addEventListener("click", function (e) {
      e.stopPropagation();
      const id = this.dataset.id;
      if (id && id !== "undefined") {
        abrirModalDetalhes(id);
      } else {
        console.warn("⚠️ ID inválido no H3");
      }
    });
  });

  document.querySelectorAll(".icone-chama").forEach((icon) => {
    icon.addEventListener("click", function (e) {
      e.stopPropagation();
      const titleEl = this.querySelector("title");
      const interprete = titleEl ? titleEl.textContent : "";
      if (interprete && interprete !== "Intérprete não informado") {
        const termo = encodeURIComponent(interprete);
        window.location.href = `html/pesquisa.html?campo=interprete&termo=${termo}`;
      } else {
        mostrarToast("Intérprete não informado para esta cifra.", "#b33");
      }
    });
  });

  document.querySelectorAll(".icone-documento").forEach((icon) => {
    icon.addEventListener("click", function (e) {
      e.stopPropagation();
      const id = this.dataset.id;
      if (id) {
        sessionStorage.setItem("cifraId", id);
        sessionStorage.setItem("modoEdicao", "true");
        window.location.href = "html/enviar.html";
      }
    });
  });

  document.querySelectorAll(".btn-acoes-toggle").forEach((btn) => {
    btn.addEventListener("click", function (e) {
      e.stopPropagation();
      const id = this.dataset.id;
      const expandidas = document.querySelector(
        `.acoes-expandidas[data-id="${id}"]`,
      );
      if (expandidas) {
        expandidas.classList.toggle("aberto");
        this.textContent = expandidas.classList.contains("aberto")
          ? "✕"
          : "•••";
      }
    });
  });

  document.querySelectorAll(".btn-acao").forEach((btn) => {
    btn.addEventListener("click", async function (e) {
      e.stopPropagation();
      const id = this.dataset.id;
      const acao = this.dataset.acao;

      const expandidas = document.querySelector(
        `.acoes-expandidas[data-id="${id}"]`,
      );
      if (expandidas) {
        expandidas.classList.remove("aberto");
        const toggle = document.querySelector(
          `.btn-acoes-toggle[data-id="${id}"]`,
        );
        if (toggle) toggle.textContent = "•••";
      }

      switch (acao) {
        case "visualizar":
          abrirModalDetalhes(id);
          break;
        case "editar":
          sessionStorage.setItem("cifraId", id);
          sessionStorage.setItem("modoEdicao", "true");
          window.location.href = "html/enviar.html";
          break;
        case "excluir":
          if (confirm("Tem certeza que deseja excluir esta cifra?")) {
            mostrarLoading();
            try {
              await deletarCifra(id);
              mostrarToast("Cifra excluída com sucesso!", "#40E0D0");
              todasCifras = await listarTodasCifras();
              todasCifras.sort((a, b) => a.nome.localeCompare(b.nome));
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
    });
  });

  document.addEventListener("click", () => {
    document.querySelectorAll(".acoes-expandidas.aberto").forEach((el) => {
      el.classList.remove("aberto");
      const id = el.dataset.id;
      const toggle = document.querySelector(
        `.btn-acoes-toggle[data-id="${id}"]`,
      );
      if (toggle) toggle.textContent = "•••";
    });
  });
}

async function abrirModalDetalhes(id) {
  console.log("🔍 abrirModalDetalhes chamado com ID:", id);

  const cifrasAtualizadas = await listarTodasCifras();
  const cifra = cifrasAtualizadas.find((c) => String(c.id) === String(id));

  if (!cifra) {
    console.error("❌ Cifra não encontrada para ID:", id);
    mostrarToast("Cifra não encontrada.", "#b33");
    return;
  }

  console.log("✅ Cifra encontrada:", cifra.nome);

  const overlay = document.getElementById("modal-overlay");
  document.getElementById("modal-titulo").textContent = cifra.nome;
  document.getElementById("modal-interprete").textContent =
    cifra.interprete || "Não informado";
  document.getElementById("modal-conteudo").textContent =
    cifra.conteudo || "Conteúdo não disponível";

  const pdfDiv = document.getElementById("modal-pdf");
  pdfDiv.innerHTML = "";

  if (cifra.pdfBase64) {
    const linkDownload = document.createElement("a");
    linkDownload.href = `data:application/pdf;base64,${cifra.pdfBase64}`;
    linkDownload.download = `${cifra.nome}.pdf`;
    linkDownload.className = "btn-baixar-pdf";
    linkDownload.textContent = "📄 Baixar PDF";

    const linkVisualizar = document.createElement("a");
    linkVisualizar.className = "btn-baixar-pdf btn-visualizar-pdf";
    linkVisualizar.textContent = "👁️ Visualizar PDF";
    linkVisualizar.style.marginLeft = "10px";

    linkVisualizar.addEventListener("click", (e) => {
      e.preventDefault();
      try {
        const byteCharacters = atob(cifra.pdfBase64);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        const blob = new Blob([byteArray], { type: "application/pdf" });
        const blobUrl = URL.createObjectURL(blob);
        window.open(blobUrl, "_blank");
        setTimeout(() => URL.revokeObjectURL(blobUrl), 10000);
      } catch (error) {
        console.error("Erro ao visualizar PDF:", error);
        mostrarToast("Erro ao abrir o PDF.", "#b33");
      }
    });

    const container = document.createElement("div");
    container.style.display = "flex";
    container.style.gap = "10px";
    container.style.marginTop = "10px";
    container.style.flexWrap = "wrap";
    container.appendChild(linkDownload);
    container.appendChild(linkVisualizar);
    pdfDiv.appendChild(container);
  } else {
    pdfDiv.innerHTML =
      '<p style="color:var(--text-muted);">Nenhum PDF anexado.</p>';
  }

  overlay.classList.add("ativo");
}

document.getElementById("modal-fechar").addEventListener("click", () => {
  document.getElementById("modal-overlay").classList.remove("ativo");
});
document.getElementById("modal-overlay").addEventListener("click", (e) => {
  if (e.target === e.currentTarget) {
    e.currentTarget.classList.remove("ativo");
  }
});
