let cifraAntiga = null;


function ssGet(chave) {
  try {
    return sessionStorage.getItem(chave);
  } catch (err) {
    console.warn("⚠️ sessionStorage.getItem falhou:", err);
    return null;
  }
}

function ssSet(chave, valor) {
  try {
    sessionStorage.setItem(chave, valor);
    return true;
  } catch (err) {
    console.warn("⚠️ sessionStorage.setItem falhou:", err);
    return false;
  }
}

function ssRemove(chave) {
  try {
    sessionStorage.removeItem(chave);
  } catch (err) {
    console.warn("⚠️ sessionStorage.removeItem falhou:", err);
  }
}


document.addEventListener("DOMContentLoaded", async () => {
  const form = document.getElementById("form-enviar");
  const arquivoInput = document.getElementById("arquivo-pdf");
  const statusDiv = document.getElementById("status-extracao");
  const conteudoHidden = document.getElementById("conteudo");
  const btnEnviar = document.getElementById("btn-enviar");
  const btnEditar = document.getElementById("btn-editar-conteudo");
  const areaEdicao = document.getElementById("area-edicao");
  const conteudoManual = document.getElementById("conteudo-manual");
  const btnSalvarEdicao = document.getElementById("btn-salvar-edicao");
  const btnCancelarEdicao = document.getElementById("btn-cancelar-edicao");

  if (!form || !arquivoInput || !conteudoHidden || !btnEnviar) {
    console.error("❌ Elementos essenciais do formulário não encontrados");
    return;
  }


  await esperarPdfJs();
  if (typeof pdfjsLib !== "undefined") {
    pdfjsLib.GlobalWorkerOptions.workerSrc =
      "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js";
    console.log("📚 pdf.js worker configurado");
  } else {
    console.warn("⚠️ pdf.js não disponível — extração de PDF desabilitada");
  }


  const modoEdicao = ssGet("modoEdicao") === "true";
  const cifraId = ssGet("cifraId");

  if (!modoEdicao) {
    ssRemove("modoEdicao");
    ssRemove("cifraId");
    console.log("🧹 SessionStorage limpo (modo novo envio).");
  }

  if (modoEdicao && cifraId) {
    mostrarLoading();
    try {
      const cifras = await listarTodasCifras();
      cifraAntiga = cifras.find((c) => String(c.id) === String(cifraId));

      if (cifraAntiga) {
        document.getElementById("nome").value = cifraAntiga.nome || "";
        document.getElementById("interprete").value =
          cifraAntiga.interprete || "";
        document.getElementById("tom").value = cifraAntiga.tom || "";
        conteudoHidden.value = cifraAntiga.conteudo || "";
        conteudoManual.value = cifraAntiga.conteudo || "";
        document.getElementById("cifra-id").value = cifraId;
        document.getElementById("modo-edicao").value = "true";

        document.getElementById("titulo-pagina").textContent =
          "✏️ Editar Cifra";
        areaEdicao.style.display = "block";
        btnEditar.style.display = "none";

        statusDiv.innerHTML = `<span style="color: var(--primary-color);">📝 Modo edição – conteúdo carregado (${
          cifraAntiga.conteudo?.length || 0
        } caracteres)</span>`;

        btnEnviar.disabled = false;
        arquivoInput.required = false;
      } else {
        mostrarToast("Cifra não encontrada.", "#b33");
        ssRemove("modoEdicao");
        ssRemove("cifraId");
        setTimeout(() => (window.location.href = "../index.html"), 1500);
      }
    } catch (error) {
      console.error("❌ Erro ao carregar dados para edição:", error);
      mostrarToast("Erro ao carregar os dados.", "#b33");
    } finally {
      esconderLoading();
    }
  } else {
    document.getElementById("nome").value = "";
    document.getElementById("interprete").value = "";
    document.getElementById("tom").value = "";
    conteudoHidden.value = "";
    conteudoManual.value = "";
    document.getElementById("cifra-id").value = "";
    document.getElementById("modo-edicao").value = "false";
    document.getElementById("titulo-pagina").textContent =
      "📤 Enviar Nova Cifra";
    areaEdicao.style.display = "none";
    btnEditar.style.display = "none";
    statusDiv.innerHTML = "";
    btnEnviar.disabled = false;
    arquivoInput.required = true;
  }

  arquivoInput.addEventListener("change", async (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;

    if (file.type !== "application/pdf") {
      statusDiv.innerHTML = "⚠️ O arquivo deve ser um PDF.";
      arquivoInput.value = "";
      conteudoHidden.value = "";
      btnEditar.style.display = "none";
      areaEdicao.style.display = "none";
      return;
    }

    const LIMITE_MB = 15;
    if (file.size > LIMITE_MB * 1024 * 1024) {
      statusDiv.innerHTML = `⚠️ PDF muito grande (máx. ${LIMITE_MB} MB).`;
      arquivoInput.value = "";
      return;
    }

    if (typeof pdfjsLib === "undefined") {
      statusDiv.innerHTML = "⚠️ Módulo de PDF não carregado. Tente recarregar a página.";
      return;
    }

    statusDiv.innerHTML = "⏳ Extraindo texto do PDF...";
    btnEnviar.disabled = true;
    btnEditar.style.display = "none";
    areaEdicao.style.display = "none";

    try {
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      let textoCompleto = "";

      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const content = await page.getTextContent();
        const strings = content.items.map((item) => item.str);
        textoCompleto += strings.join(" ") + "\n\n";
      }

      const textoFinal = textoCompleto.trim();

      conteudoHidden.value = textoFinal;
      conteudoManual.value = textoFinal;

      const preview =
        textoFinal.substring(0, 200) +
        (textoFinal.length > 200 ? "..." : "");
      statusDiv.innerHTML = `✅ Texto extraído com sucesso! (${textoFinal.length} caracteres)`;
      statusDiv.innerHTML += `<br><small>Prévia: ${preview}</small>`;

      btnEditar.style.display = "inline-block";
      btnEnviar.disabled = false;
    } catch (error) {
      console.error("Erro ao extrair texto:", error);
      statusDiv.innerHTML =
        "❌ Falha ao extrair texto. Verifique se o PDF é válido.";
      conteudoHidden.value = "";
      btnEditar.style.display = "none";
      areaEdicao.style.display = "none";
      btnEnviar.disabled = false;
    }
  });


  btnEditar.addEventListener("click", () => {
    if (!conteudoManual.value) {
      conteudoManual.value = conteudoHidden.value;
    }
    areaEdicao.style.display = "block";
    btnEditar.style.display = "none";
    conteudoManual.focus();
  });

  btnSalvarEdicao.addEventListener("click", () => {
    const textoEditado = conteudoManual.value.trim();
    if (!textoEditado) {
      mostrarToast("O conteúdo não pode ficar vazio.", "#b33");
      return;
    }
    conteudoHidden.value = textoEditado;
    statusDiv.innerHTML = `✅ Conteúdo atualizado manualmente (${textoEditado.length} caracteres)`;
    areaEdicao.style.display = "none";
    btnEditar.style.display = "inline-block";
    btnEnviar.disabled = false;
    mostrarToast("Conteúdo salvo com sucesso!", "#40E0D0");
  });

  btnCancelarEdicao.addEventListener("click", () => {
    conteudoManual.value = conteudoHidden.value;
    areaEdicao.style.display = "none";
    btnEditar.style.display = "inline-block";
  });

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    console.log("🔹 Iniciando envio...");

    const nome = document.getElementById("nome").value.trim();
    const interprete = document.getElementById("interprete").value.trim();
    const tom = document.getElementById("tom").value.trim();
    const conteudo = conteudoHidden.value.trim();
    const modoEdicaoForm =
      document.getElementById("modo-edicao").value === "true";
    const cifraIdForm = document.getElementById("cifra-id").value;

    if (!nome) {
      mostrarToast("Preencha o Nome da música.", "#b33");
      return;
    }
    if (!conteudo) {
      mostrarToast(
        "Nenhum conteúdo. Selecione um PDF ou edite manualmente.",
        "#b33"
      );
      return;
    }

    const file = arquivoInput.files[0];
    let pdfBase64 = null;

    if (file) {
      try {
        pdfBase64 = await lerArquivoComoBase64(file);
        console.log("📄 Novo PDF carregado (base64 length):", pdfBase64.length);
      } catch (error) {
        console.error("❌ Erro ao ler PDF:", error);
        mostrarToast("Erro ao ler o arquivo PDF.", "#b33");
        return;
      }
    } else if (modoEdicaoForm && cifraAntiga && cifraAntiga.pdfBase64) {
      pdfBase64 = cifraAntiga.pdfBase64;
      console.log("📄 PDF mantido do registro anterior.");
    }

    try {
      mostrarLoading();

      if (modoEdicaoForm && cifraIdForm) {
        const dadosAtualizacao = {
          nome,
          interprete: interprete || "",
          tom: tom || "",
          conteudo,
          dataAtualizacao: new Date().toISOString(),
        };

        if (pdfBase64) {
          dadosAtualizacao.pdfBase64 = pdfBase64;
        }

        await atualizarCifra(cifraIdForm, dadosAtualizacao);
        console.log("✅ Cifra atualizada (ID:", cifraIdForm, ")");
      } else {
        // ✅ Insert normal
        const dados = {
          nome,
          interprete: interprete || "",
          tom: tom || "",
          conteudo,
          pdfBase64: pdfBase64 || null,
          dataCriacao: new Date().toISOString(),
        };
        console.log("💾 Salvando dados:", dados);
        await salvarCifra(dados);
        console.log("✅ Cifra salva com sucesso!");
      }

      mostrarToast(
        modoEdicaoForm
          ? "Cifra atualizada com sucesso!"
          : "Cifra salva com sucesso!",
        "#40E0D0"
      );

      form.reset();
      statusDiv.innerHTML = "";
      conteudoHidden.value = "";
      conteudoManual.value = "";
      btnEditar.style.display = "none";
      areaEdicao.style.display = "none";
      btnEnviar.disabled = false;

      ssRemove("modoEdicao");
      ssRemove("cifraId");

      setTimeout(() => {
        window.location.href = "../index.html";
      }, 1500);
    } catch (error) {
      console.error("❌ Erro ao salvar:", error);
      mostrarToast("Erro ao salvar: " + error.message, "#b33");
    } finally {
      esconderLoading();
    }
  });


  document.getElementById("cancelar").addEventListener("click", () => {
    form.reset();
    statusDiv.innerHTML = "";
    conteudoHidden.value = "";
    conteudoManual.value = "";
    btnEditar.style.display = "none";
    areaEdicao.style.display = "none";
    btnEnviar.disabled = false;
    ssRemove("modoEdicao");
    ssRemove("cifraId");
    window.location.href = "../index.html";
  });

  function lerArquivoComoBase64(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const base64 = reader.result.split(",")[1];
          resolve(base64);
        } catch (err) {
          reject(err);
        }
      };
      reader.onerror = () => reject(reader.error || new Error("Erro de leitura"));
      reader.onabort = () => reject(new Error("Leitura cancelada"));
      try {
        reader.readAsDataURL(file);
      } catch (err) {
        reject(err);
      }
    });
  }

  function esperarPdfJs() {
    return new Promise((resolve) => {
      if (typeof pdfjsLib !== "undefined") return resolve();
      let tentativas = 0;
      const MAX = 50; 
      const timer = setInterval(() => {
        tentativas++;
        if (typeof pdfjsLib !== "undefined" || tentativas >= MAX) {
          clearInterval(timer);
          resolve();
        }
      }, 100);
    });
  }
});