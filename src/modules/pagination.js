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

            if (e.target.closest('.pagina-numero')) {
                e.preventDefault();
                e.stopPropagation();
                const numeroPagina = parseInt(e.target.closest('.pagina-numero').dataset.pagina, 10);
                this.goToPage(numeroPagina);
            }
        });
    }

    /* ===============================
       CÁLCULO CENTRAL DE PÁGINAS
       =============================== */
    getTotalPages() {
        let total = 1; // Página clínica sempre existe

        // Página técnica existe se houver exame selecionado
        if (this.app.state.exameAtual) {
            total += 1;
        }

        // Anexos
        total += this.app.state.anexos.length;

        return total;
    }

    /* ===============================
       NAVEGAÇÃO
       =============================== */
    changePage(direction) {
        const totalPages = this.getTotalPages();
        let newPage = this.app.state.paginaAtual + direction;

        if (newPage < 0) newPage = 0;
        if (newPage >= totalPages) newPage = totalPages - 1;

        this.app.state.paginaAtual = newPage;
        this.renderCurrentPage();
    }

    goToPage(pageNumber) {
        const totalPages = this.getTotalPages();
        if (pageNumber >= 0 && pageNumber < totalPages) {
            this.app.state.paginaAtual = pageNumber;
            this.renderCurrentPage();
        }
    }

    /* ===============================
       RENDERIZAÇÃO DO PREVIEW
       =============================== */
    renderCurrentPage() {
        const paginas = document.querySelectorAll('.laudo-pagina');
        const atual = this.app.state.paginaAtual;
        if (!paginas.length) return;

        paginas.forEach((pagina) => {
            const index = Number(pagina.dataset.pageIndex);
            pagina.classList.toggle('ativa', index === atual);
        });

        this.updateControls(this.getTotalPages());
    }

    /* ===============================
       CONTROLES DE PAGINAÇÃO
       =============================== */
    updateControls(totalPages) {
        const controls = document.querySelector('.paginacao-controls');
        if (!controls) return;

        const paginaAtualIndex = this.app.state.paginaAtual;
        const paginaAtual = paginaAtualIndex + 1;

        let tipoPagina = '(Laudo Clínico)';
        if (paginaAtualIndex === 1 && this.app.state.exameAtual) {
            tipoPagina = '(Resultados Técnicos)';
        }
        if (paginaAtualIndex >= 2) {
            tipoPagina = `(Anexo ${paginaAtualIndex - 1})`;
        }

        controls.innerHTML = `
            <div class="paginacao-info">
                Página ${paginaAtual} de ${totalPages} ${tipoPagina}
            </div>

            <div class="paginacao-botoes">
                <button class="btn-paginacao" id="first-page" ${paginaAtualIndex === 0 ? 'disabled' : ''}>
                    <i class="fas fa-step-backward"></i> Início
                </button>

                <button class="btn-paginacao" id="prev-page" ${paginaAtualIndex === 0 ? 'disabled' : ''}>
                    <i class="fas fa-chevron-left"></i> Anterior
                </button>

                <div class="paginacao-numeros">
                    ${Array.from({ length: totalPages }, (_, i) => `
                        <button
                            class="pagina-numero ${i === paginaAtualIndex ? 'ativa' : ''}"
                            data-pagina="${i}">
                            ${i + 1}
                        </button>
                    `).join('')}
                </div>

                <button class="btn-paginacao" id="next-page" ${paginaAtualIndex === totalPages - 1 ? 'disabled' : ''}>
                    Próxima <i class="fas fa-chevron-right"></i>
                </button>
            </div>
        `;
    }
}
