document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("form-pesquisa");
  const campoSelect = document.getElementById("campo-busca");
  const termoInput = document.getElementById("termo-busca");

  if (!form || !campoSelect || !termoInput) {
    console.error(
      "❌ Elementos da pesquisa não encontrados. Verifique os IDs no HTML."
    );
    return;
  }

  async function executarPesquisa(campo, termo) {
    if (!termo) {
      mostrarToast("Digite um termo para pesquisar.", "#b33");
      return;
    }

    mostrarLoading();
    try {
      const todas = await listarTodasCifras();
      const termoNormalizado = normalizarTexto(termo);

      const resultados = todas.filter((c) => {
        let valor = "";
        if (campo === "nome") valor = c.nome || "";
        else if (campo === "interprete") valor = c.interprete || "";
        else if (campo === "conteudo") valor = c.conteudo || "";

        const valorNormalizado = normalizarTexto(valor);
        return valorNormalizado.includes(termoNormalizado);
      });

      resultados.sort((a, b) =>
        String(a.nome || "").localeCompare(String(b.nome || ""))
      );

      exibirResultados(resultados, termo);
    } catch (error) {
      console.error("❌ Erro na pesquisa:", error);
      mostrarToast("Erro ao realizar a pesquisa.", "#b33");
    } finally {
      esconderLoading();
    }
  }


  form.addEventListener("submit", (e) => {
    e.preventDefault();
    executarPesquisa(campoSelect.value, termoInput.value.trim());
  });


  const params = new URLSearchParams(window.location.search);
  const campoParam = params.get("campo") || "";
  const termoParam = params.get("termo") || "";

  if (campoParam && termoParam) {
    campoSelect.value = campoParam;
    termoInput.value = termoParam;

    setTimeout(() => {
      executarPesquisa(campoParam, termoParam);
    }, 200);
  }
});


function normalizarTexto(texto) {
  if (!texto) return "";
  try {
    const semAcentos = texto.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    const minusculas = semAcentos.toLowerCase();
    const limpo = minusculas.replace(/[^a-z0-9\s]/g, " ");
    return limpo.replace(/\s+/g, " ").trim();
  } catch (_) {
    return String(texto).toLowerCase().trim();
  }
}

function escapeHtml(texto) {
  if (texto == null) return "";
  const div = document.createElement("div");
  div.textContent = String(texto);
  return div.innerHTML;
}

function sanitizarNomeArquivo(nome) {
  return String(nome || "cifra").replace(/[\\/:*?"<>|]+/g, "_");
}


function exibirResultados(resultados, termo) {
  const container = document.getElementById("resultados");
  if (!container) return;

  if (resultados.length === 0) {
    container.innerHTML = `<p class="mensagem-vazia">Nenhuma cifra encontrada para "<strong>${escapeHtml(
      termo
    )}</strong>".</p>`;
    return;
  }

  let html = `
    <div class="tabela-wrapper">
      <table class="tabela-resultados">
        <thead>
          <tr>
            <th>Nome</th>
            <th>Intérprete</th>
            <th>Tom</th>
            <th>Trecho</th>
          </tr>
        </thead>
        <tbody>
  `;

  resultados.forEach((c) => {
    const idStr = String(c.id);
    let trecho = c.conteudo || "";
    if (trecho.length > 200) trecho = trecho.substring(0, 200) + "...";
    trecho = escapeHtml(trecho);

    html += `
      <tr class="linha-resultado" data-id="${idStr}">
        <td class="nome-musica" data-id="${idStr}">${escapeHtml(c.nome)}</td>
        <td>${escapeHtml(c.interprete || "-")}</td>
        <td>${escapeHtml(c.tom || "-")}</td>
        <td class="trecho">${trecho}</td>
      </tr>
    `;
  });

  html += `</tbody></table></div>`;
  container.innerHTML = html;

  if (!container.dataset.delegado) {
    container.dataset.delegado = "1";
    container.addEventListener("click", (e) => {
      const alvo = e.target.closest(".linha-resultado, .nome-musica");
      if (!alvo) return;
      const id = alvo.dataset.id;
      if (id && window.abrirModalDetalhes) {
        window.abrirModalDetalhes(id);
      }
    });
  }
}

window.abrirModalDetalhes = async function (id) {
  console.log("🔍 [pesquisa] abrirModalDetalhes ID:", id);

  let cifra;
  try {
    const cifras = await listarTodasCifras();
    cifra = cifras.find((c) => String(c.id) === String(id));
  } catch (err) {
    console.error("❌ Erro ao buscar cifra:", err);
    mostrarToast("Erro ao carregar os dados.", "#b33");
    return;
  }

  if (!cifra) {
    mostrarToast("Cifra não encontrada.", "#b33");
    return;
  }

  const overlay = obterOuCriarModal();

  document.getElementById("modal-titulo-pesquisa").textContent =
    cifra.nome || "";
  document.getElementById("modal-interprete-pesquisa").textContent =
    cifra.interprete || "Não informado";
  document.getElementById("modal-conteudo-pesquisa").textContent =
    cifra.conteudo || "Conteúdo não disponível";

  const pdfDiv = document.getElementById("modal-pdf-pesquisa");
  pdfDiv.innerHTML = "";

  if (cifra.pdfBase64) {
    const nomeArquivo = sanitizarNomeArquivo(cifra.nome) + ".pdf";

    const linkVisualizar = document.createElement("a");
    linkVisualizar.href = `visualizar-pdf.html?id=${encodeURIComponent(cifra.id)}`;
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
      console.error("❌ Erro ao criar blob do PDF:", err);
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
  } else {
    pdfDiv.innerHTML =
      '<p style="color:var(--text-muted);">Nenhum PDF anexado.</p>';
  }

  overlay.classList.add("ativo");
};

function obterOuCriarModal() {
  let overlay = document.querySelector(".modal-overlay");
  if (overlay) return overlay;

  overlay = document.createElement("div");
  overlay.className = "modal-overlay";
  overlay.innerHTML = `
    <div class="modal-conteudo">
      <span class="fechar" aria-label="Fechar">&times;</span>
      <h3 id="modal-titulo-pesquisa"></h3>
      <p><strong>Intérprete:</strong> <span id="modal-interprete-pesquisa"></span></p>
      <div class="conteudo-completo" id="modal-conteudo-pesquisa"></div>
      <div id="modal-pdf-pesquisa"></div>
    </div>
  `;
  document.body.appendChild(overlay);

  const fechar = () => {
    overlay.classList.remove("ativo");
    document.dispatchEvent(new Event("modal:closed"));
  };

  overlay.querySelector(".fechar").addEventListener("click", fechar);
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) fechar();
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && overlay.classList.contains("ativo")) fechar();
  });

  return overlay;
}
