// Paginação do laudo
class Pagination {
    constructor(app) {
        this.app = app;
        this.setupEventListeners();
    }

    setupEventListeners() {
        document.addEventListener('click', (e) => {
            if (e.target.closest('#prev-page')) {
                e.preventDefault();
                e.stopPropagation();
                this.changePage(-1);
            }
            if (e.target.closest('#next-page')) {
                e.preventDefault();
                e.stopPropagation();
                this.changePage(1);
            }
            if (e.target.closest('#first-page')) {
                e.preventDefault();
                e.stopPropagation();
                this.goToPage(0);
            }
        });
    }

    changePage(direction) {
        const totalPages = 1 + this.app.state.anexos.length;
        let newPage = this.app.state.paginaAtual + direction;

        if (newPage < 0) newPage = 0;
        if (newPage >= totalPages) newPage = totalPages - 1;

        this.app.state.paginaAtual = newPage;
        this.renderCurrentPage();
    }

    goToPage(pageNumber) {
        const totalPages = 1 + this.app.state.anexos.length;
        if (pageNumber >= 0 && pageNumber < totalPages) {
            this.app.state.paginaAtual = pageNumber;
            this.renderCurrentPage();
        }
    }

    renderCurrentPage() {
        const totalPages = 1 + this.app.state.anexos.length;

        // Ocultar todas as páginas
        document.querySelectorAll('.laudo-pagina').forEach(pagina => {
            pagina.style.display = 'none';
        });

        // Mostrar página atual
        const paginaAtual = document.getElementById(`laudo-pagina-${this.app.state.paginaAtual}`);
        if (paginaAtual) {
            paginaAtual.style.display = 'block';
        }

        // Atualizar controles
        this.updateControls(totalPages);
    }

    updateControls(totalPages) {
        const controls = document.querySelector('.paginacao-controls');
        if (!controls) return;

        const paginaAtual = this.app.state.paginaAtual + 1;

        controls.innerHTML = `
            <div class="paginacao-info">
                Página ${paginaAtual} de ${totalPages}
                ${this.app.state.paginaAtual === 0 ? '(Laudo Principal)' : `(Anexo ${this.app.state.paginaAtual})`}
            </div>
            <div class="paginacao-botoes">
                <button class="btn-paginacao" id="first-page" ${this.app.state.paginaAtual === 0 ? 'disabled' : ''}>
                    <i class="fas fa-step-backward"></i> Início
                </button>
                <button class="btn-paginacao" id="prev-page" ${this.app.state.paginaAtual === 0 ? 'disabled' : ''}>
                    <i class="fas fa-chevron-left"></i> Anterior
                </button>
                <div class="paginacao-numeros">
                    ${Array.from({ length: totalPages }, (_, i) => `
                        <button class="pagina-numero ${i === this.app.state.paginaAtual ? 'ativa' : ''}" 
                                data-pagina="${i}">
                            ${i + 1}
                        </button>
                    `).join('')}
                </div>
                <button class="btn-paginacao" id="next-page" ${this.app.state.paginaAtual === totalPages - 1 ? 'disabled' : ''}>
                    Próxima <i class="fas fa-chevron-right"></i>
                </button>
            </div>
        `;

        // Adicionar event listeners para os números de página
        document.querySelectorAll('.pagina-numero').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                const numeroPagina = parseInt(e.target.dataset.pagina);
                this.goToPage(numeroPagina);
            });
        });
    }
}