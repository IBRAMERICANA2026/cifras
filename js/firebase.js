const firebaseConfig = {
  apiKey: "AIzaSyBXssz_sR3XqrpFFPOZJhOVzxfV8YO1CPM",
  authDomain: "ibr---cirfras.firebaseapp.com",
  projectId: "ibr---cirfras",
  storageBucket: "ibr---cirfras.firebasestorage.app",
  messagingSenderId: "513023714971",
  appId: "1:513023714971:web:768cd8cd05c7e8bba0083e",
};


(function initFirebase() {
  if (typeof firebase === "undefined" || !firebase.initializeApp) {
    console.warn("⏳ Firebase SDK ainda não carregado — tentando novamente...");
    return setTimeout(initFirebase, 100);
  }
  if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
  }
  window.db = firebase.firestore();
  console.log("🔥 Firebase conectado!");
})();


function mostrarLoading() {
  let overlay = document.getElementById("loading-overlay");

  if (!overlay) {
    overlay = document.createElement("div");
    overlay.id = "loading-overlay";
    overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.7);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 9999;
      flex-direction: column;
      -webkit-backdrop-filter: blur(4px);
      backdrop-filter: blur(4px);
    `;
    overlay.innerHTML = `
      <div style="
        background: var(--card-bg, #2b2b2b);
        padding: 30px 40px;
        border-radius: 12px;
        text-align: center;
        box-shadow: 0 10px 40px rgba(0,0,0,0.5);
      ">
        <div style="
          width: 50px;
          height: 50px;
          border: 4px solid var(--text-muted, #a0a0a0);
          border-top: 4px solid var(--primary-color, #40E0D0);
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
          -webkit-animation: spin 0.8s linear infinite;
          margin: 0 auto 15px;
        "></div>
        <p style="color: var(--text-color, #fff); font-size: 1.1rem; margin: 0;">
          Carregando cifras...
        </p>
      </div>
    `;

    if (!document.getElementById("loading-keyframes")) {
      const style = document.createElement("style");
      style.id = "loading-keyframes";
      style.textContent = `
        @keyframes spin {
          0%   { -webkit-transform: rotate(0deg);   transform: rotate(0deg); }
          100% { -webkit-transform: rotate(360deg); transform: rotate(360deg); }
        }
      `;
      document.head.appendChild(style);
    }

    document.body.appendChild(overlay);
  }

  overlay.style.display = "flex";
}

function esconderLoading() {
  const overlay = document.getElementById("loading-overlay");
  if (overlay) overlay.style.display = "none";
}

async function carregarCifrasComLoading() {
  mostrarLoading();
  try {
    return await listarTodasCifras();
  } catch (error) {
    console.error("❌ Erro ao carregar cifras:", error);
    mostrarToast("Erro ao carregar os dados. Tente novamente.", "#b33");
    return [];
  } finally {
    esconderLoading();
  }
}

window.salvarCifra = async function (dados) {
  try {
    const docRef = await db.collection("cifras").add(dados);
    console.log("✅ Cifra salva no Firestore (ID:", docRef.id, ")");
    return docRef.id;
  } catch (error) {
    console.error("❌ Erro ao salvar no Firestore:", error);
    throw error;
  }
};

window.listarTodasCifras = async function () {
  try {

    const snapshot = await db.collection("cifras").get();
    const cifras = [];
    snapshot.forEach((doc) => {
      cifras.push({ id: doc.id, ...doc.data() });
    });
    console.log("📋 Cifras carregadas do Firestore:", cifras.length);
    return cifras;
  } catch (error) {
    console.error("❌ Erro ao listar do Firestore:", error);
    throw error;
  }
};

window.deletarCifra = async function (id) {
  try {
    await db.collection("cifras").doc(id).delete();
    console.log("🗑️ Cifra deletada do Firestore (ID:", id, ")");
  } catch (error) {
    console.error("❌ Erro ao deletar do Firestore:", error);
    throw error;
  }
};

window.atualizarCifra = async function (id, dados) {
  try {
    await db.collection("cifras").doc(id).update(dados);
    console.log("✏️ Cifra atualizada no Firestore (ID:", id, ")");
  } catch (error) {
    console.error("❌ Erro ao atualizar no Firestore:", error);
    throw error;
  }
};

const _toastTimers = new WeakMap();

window.mostrarToast = function (mensagem, cor = "#40E0D0") {
  let toast = document.querySelector(".toast");
  if (!toast) {
    toast = document.createElement("div");
    toast.className = "toast";
    document.body.appendChild(toast);
  }

  toast.textContent = mensagem;
  toast.style.borderLeftColor = cor;
  toast.style.background = "#2b2b2b";
  toast.style.color = "#fff";
  toast.classList.add("visivel");

  const anterior = _toastTimers.get(toast);
  if (anterior) clearTimeout(anterior);

  const t = setTimeout(() => {
    toast.classList.remove("visivel");
    _toastTimers.delete(toast);
  }, 3000);

  _toastTimers.set(toast, t);
};
