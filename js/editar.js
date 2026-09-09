document.addEventListener('DOMContentLoaded', async () => {
    const id = parseInt(sessionStorage.getItem('cifraId'));
    if (!id) {
        alert('Nenhuma cifra selecionada para edição.');
        window.location.href = '../index.html';
        return;
    }

    const cifras = await listarTodasCifras();
    const cifra = cifras.find(c => c.id === id);
    if (!cifra) {
        alert('Cifra não encontrada.');
        window.location.href = '../index.html';
        return;
    }

    document.getElementById('nome').value = cifra.nome;
    document.getElementById('interprete').value = cifra.interprete || '';
    document.getElementById('conteudo').value = cifra.conteudo || '';

    const form = document.getElementById('form-editar');
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const nome = document.getElementById('nome').value.trim();
        const interprete = document.getElementById('interprete').value.trim();
        const conteudo = document.getElementById('conteudo').value.trim();

        if (!nome || !conteudo) {
            mostrarToast('Preencha todos os campos obrigatórios.', '#b33');
            return;
        }

        // Atualizar no IndexedDB (excluir e recriar com mesmo ID?)
        // Como o ID é auto-increment, não podemos reutilizar. Vamos deletar e criar nova.
        await deletarCifra(id);
        const novaCifra = {
            nome,
            interprete,
            conteudo,
            pdfBase64: cifra.pdfBase64, // mantém o PDF se existir
            dataCriacao: new Date().toISOString()
        };
        await salvarCifra(novaCifra);
        mostrarToast('Cifra atualizada com sucesso!', '#40E0D0');
        sessionStorage.removeItem('cifraId');
        setTimeout(() => window.location.href = '../index.html', 1500);
    });

    document.getElementById('cancelar').addEventListener('click', () => {
        sessionStorage.removeItem('cifraId');
        window.location.href = '../index.html';
    });
});
