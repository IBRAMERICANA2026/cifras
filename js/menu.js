document.addEventListener('DOMContentLoaded', function() {
    const menuToggle = document.getElementById('menuToggle');
    const menuDropdown = document.getElementById('menuDropdown');

    if (menuToggle && menuDropdown) {
        // Alternar menu ao clicar no ícone
        menuToggle.addEventListener('click', function(e) {
            e.stopPropagation();
            menuDropdown.classList.toggle('aberto');
        });

        // Fechar menu ao clicar em um link
        menuDropdown.querySelectorAll('a').forEach(link => {
            link.addEventListener('click', function() {
                menuDropdown.classList.remove('aberto');
            });
        });

        // Fechar menu ao clicar fora do cabeçalho
        document.addEventListener('click', function(e) {
            const header = document.querySelector('header');
            if (header && !header.contains(e.target)) {
                menuDropdown.classList.remove('aberto');
            }
        });

        // ===== OCULTAR O LINK DA PÁGINA ATUAL =====
        // Identifica o nome do arquivo atual (ex: index.html, pesquisa.html, enviar.html)
        let currentFile = window.location.pathname.split('/').pop();
        if (!currentFile || currentFile === '') {
            currentFile = 'index.html'; // Página inicial
        }

        // Percorre todos os links do menu e oculta aquele que aponta para a página atual
        menuDropdown.querySelectorAll('a').forEach(link => {
            const linkFile = link.href.split('/').pop();
            if (linkFile === currentFile) {
                link.style.display = 'none';
            }
        });
    }
});