/**
 * © 2026 Luidhy Conceição dos Santos
 * Custom Restricted License
 * Usage restricted to the author and the original RP medical group.
 * Unauthorized use or modification is prohibited.
 */
// Catálogo de exames
class ExamCatalog {
    constructor(app) {
        this.app = app;
    }

    async loadExames() {
        try {
            const response = await fetch('assets/exames.json');
            const data = await response.json();
            this.app.exames = data.exames || [];
            this.renderExames(this.app.exames);
        } catch (error) {
            console.error('Erro ao carregar exames:', error);
            this.app.exames = window.ExamesData?.exames || [];
            this.renderExames(this.app.exames);
        }
    }

    async loadCategories() {
        try {
            const response = await fetch('assets/exames.json');
            if (response.ok) {
                const data = await response.json();
                this.app.categorias = data.categorias || [];
            } else {
                this.app.categorias = window.ExamesData.categorias;
            }
        } catch (error) {
            this.app.categorias = window.ExamesData?.categorias || [];
        }
        this.renderCategories();
    }

    renderCategories() {
        const container = document.getElementById('categorias-container');
        if (!container) return;

        container.innerHTML = '';

        // Botão "Todos"
        const todosBtn = this.createCategoryButton('todos', 'fa-th-list', 'Todos');
        todosBtn.classList.add('active');
        container.appendChild(todosBtn);

        // Botões das categorias
        this.app.categorias.forEach(categoria => {
            const btn = this.createCategoryButton(
                categoria.id,
                categoria.icone || 'fa-folder',
                categoria.nome || categoria.id
            );
            container.appendChild(btn);
        });

        this.setupCategoryEventListeners();
    }

    createCategoryButton(categoriaId, icon, label) {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'tab-btn';
        button.dataset.categoria = categoriaId;
        button.innerHTML = `<i class="fas ${icon}"></i> ${label}`;
        return button;
    }

    setupCategoryEventListeners() {
        const container = document.getElementById('categorias-container');
        if (!container) return;

        container.addEventListener('click', (e) => {
            const button = e.target.closest('.tab-btn');
            if (!button) return;

            e.preventDefault();
            e.stopPropagation();

            const categoria = button.dataset.categoria;

            // Atualizar estado visual
            document.querySelectorAll('.tab-btn').forEach(btn => {
                btn.classList.remove('active');
            });
            button.classList.add('active');

            // Filtrar exames
            this.filterExamesByCategory(categoria);
        });
    }

    filterExamesByCategory(categoria) {
        if (categoria === 'todos') {
            this.renderExames(this.app.exames);
        } else {
            const filtered = this.app.exames.filter(exame => exame.categoria === categoria);
            this.renderExames(filtered);
        }
    }

    renderExames(exames) {
        const container = document.getElementById('exames-container');
        if (!container) return;

        container.innerHTML = '';

        if (exames.length === 0) {
            container.innerHTML = `
                <div class="empty-exames">
                    <i class="fas fa-search"></i>
                    <p>Nenhum exame encontrado</p>
                </div>
            `;
            return;
        }

        exames.forEach(exame => {
            const exameCard = document.createElement('div');
            exameCard.className = 'exame-card';
            exameCard.dataset.id = exame.id;

            exameCard.innerHTML = `
                <i class="fas ${exame.icone || 'fa-stethoscope'}"></i>
                <h3>${exame.nome}</h3>
                <p>${exame.descricao || 'Exame médico'}</p>
            `;

            exameCard.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.selectExame(exame);
            });

            container.appendChild(exameCard);
        });
    }

    selectExame(exame) {
        this.app.updateState({ exameAtual: exame, dadosExame: {} });

        // Ocultar outros exames
        document.querySelectorAll('.exame-card').forEach(card => {
            card.style.display = 'none';
        });

        // Mostrar apenas o selecionado
        const selectedCard = document.querySelector(`.exame-card[data-id="${exame.id}"]`);
        if (selectedCard) {
            selectedCard.style.display = 'flex';
            selectedCard.classList.add('selected');
        }

        // Mostrar botão "Voltar para todos os exames"
        this.showBackToAllExamesButton();

        // Mostrar seção de campos
        document.getElementById('campos-exame').style.display = 'block';
        document.getElementById('titulo-exame-selecionado').textContent = exame.nome;

        // Gerar campos dinâmicos
        this.generateExameFields(exame);

        // Scroll para a seção
        document.getElementById('campos-exame').scrollIntoView({ behavior: 'smooth' });

        this.app.notification.show(`Exame "${exame.nome}" selecionado`);
    }

    showBackToAllExamesButton() {
        let backButton = document.querySelector('.back-to-all-exames');

        if (!backButton) {
            backButton = document.createElement('div');
            backButton.className = 'back-to-all-exames';
            backButton.innerHTML = `
                <button type="button" class="btn-back-to-all">
                    <i class="fas fa-arrow-left"></i> Voltar para todos os exames
                </button>
            `;

            const examesContainer = document.getElementById('exames-container');
            const categoriasContainer = document.getElementById('categorias-container');

            if (categoriasContainer && examesContainer) {
                categoriasContainer.parentNode.insertBefore(backButton, examesContainer);
            }

            backButton.querySelector('.btn-back-to-all').addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.showAll();
            });
        }

        backButton.style.display = 'block';
    }

    generateExameFields(exame) {
        const container = document.getElementById('campos-dinamicos');
        if (!container) return;

        container.innerHTML = '';

        exame.campos.forEach((campo, index) => {
            const fieldId = `exame-campo-${index}`;
            let fieldHTML = '';

            switch (campo.tipo) {
                case 'textarea':
                    fieldHTML = `
                        <div class="form-group full-width">
                            <label for="${fieldId}">${campo.label}</label>
                            <textarea id="${fieldId}" class="form-control" rows="4" 
                                      placeholder="${campo.placeholder || ''}"></textarea>
                        </div>
                    `;
                    break;

                case 'select':
                    const options = campo.opcoes ? campo.opcoes.map(opt =>
                        `<option value="${opt.valor}">${opt.label}</option>`
                    ).join('') : '';

                    fieldHTML = `
                        <div class="form-group">
                            <label for="${fieldId}">${campo.label}</label>
                            <select id="${fieldId}" class="form-control">
                                <option value="">Selecione...</option>
                                ${options}
                            </select>
                        </div>
                    `;
                    break;

                case 'numero':
                    fieldHTML = `
                        <div class="form-group">
                            <label for="${fieldId}">${campo.label}</label>
                            <input type="number" id="${fieldId}" class="form-control" 
                                   placeholder="${campo.placeholder || ''}" step="${campo.step || 'any'}">
                        </div>
                    `;
                    break;

                default:
                    fieldHTML = `
                        <div class="form-group">
                            <label for="${fieldId}">${campo.label}</label>
                            <input type="text" id="${fieldId}" class="form-control" 
                                   placeholder="${campo.placeholder || ''}">
                        </div>
                    `;
            }

            container.innerHTML += fieldHTML;
        });

        // Adicionar event listeners
        setTimeout(() => {
            exame.campos.forEach((campo, index) => {
                const fieldId = `exame-campo-${index}`;
                const fieldElement = document.getElementById(fieldId);

                if (fieldElement) {
                    fieldElement.addEventListener('input', (e) => {
                        this.app.state.dadosExame[campo.id] = e.target.value;
                        this.app.preview.update();
                    });

                    fieldElement.addEventListener('change', (e) => {
                        this.app.state.dadosExame[campo.id] = e.target.value;
                        this.app.preview.update();
                    });
                }
            });
        }, 100);
    }

    filterExames(searchTerm) {
        const allExames = document.querySelectorAll('.exame-card');

        if (!searchTerm) {
            allExames.forEach(card => {
                if (this.app.state.exameAtual && card.dataset.id === this.app.state.exameAtual.id) {
                    card.style.display = 'flex';
                } else {
                    card.style.display = 'flex';
                }
            });
            return;
        }

        const term = searchTerm.toLowerCase();
        allExames.forEach(card => {
            const nome = card.querySelector('h3')?.textContent.toLowerCase() || '';
            const descricao = card.querySelector('p')?.textContent.toLowerCase() || '';

            if (nome.includes(term) || descricao.includes(term)) {
                card.style.display = 'flex';
            } else {
                card.style.display = 'none';
            }
        });
    }

    showAll() {
        document.querySelectorAll('.exame-card').forEach(card => {
            card.style.display = 'flex';
            card.classList.remove('selected');
        });

        const backButton = document.querySelector('.back-to-all-exames');
        if (backButton) {
            backButton.style.display = 'none';
        }

        this.app.updateState({ exameAtual: null, dadosExame: {} });

        document.getElementById('campos-exame').style.display = 'none';
        document.getElementById('campos-dinamicos').innerHTML = '';

        const searchInput = document.getElementById('busca-exame');
        if (searchInput) {
            searchInput.value = '';
        }

        this.app.notification.show('Todos os exames estão visíveis novamente');
    }

    closeExame() {
        this.showAll();
        this.app.notification.show('Exame fechado');
    }

    clearSelection() {
        document.getElementById('campos-exame').style.display = 'none';
        document.getElementById('campos-dinamicos').innerHTML = '';

        const backButton = document.querySelector('.back-to-all-exames');
        if (backButton) {
            backButton.style.display = 'none';
        }
    }

}
