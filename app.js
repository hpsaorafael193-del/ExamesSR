// Sistema de Laudos Digitais - Hospital São Rafael
// Aplicação principal

class LaudosApp {
    constructor() {
        this.state = {
            exameAtual: null,
            paciente: {
                nome: '',
                documento: '',
                idade: '',
                unidade: ''
            },
            profissional: {
                nome: '',
                registro: '',
                tipoRegistro: 'CRM'
            },
            anexos: [],
            assinatura: null,
            dadosExame: {},
            ultimoNumero: localStorage.getItem('ultimoNumeroExame') || 1000,
            rascunho: null,
            isLoadingExames: false,
            draftToRestore: null,
            paginaAtual: 0
        };

        this.exames = [];
        this.categorias = [];
        this.exportSettings = {
            fontScale: 1,
            assinaturaScale: 1
        };

        this.init();
    }

    async init() {
        console.log('Sistema de Laudos Digitais iniciado');

        // Inicializar componentes básicos
        await new Promise(resolve => setTimeout(resolve, 100));
        this.initEventListeners();
        this.checkMobileView();

        // Inicializar assinatura SIMPLIFICADA
        this.initSimpleSignature();

        // Verificar rascunho ANTES de carregar exames
        this.checkForDraft();

        // Configurações iniciais
        this.setupAutoSave();
        this.setCurrentDate();
        this.generateExameNumber();

        // Carregar exames e categorias
        await this.loadExames();
        await this.loadAndRenderCategories();

        // Se tivermos um rascunho para restaurar, fazer isso agora
        if (this.state.draftToRestore) {
            setTimeout(() => {
                this.loadDraft(this.state.draftToRestore);
            }, 500);
        }

        const removeBtn = document.getElementById('remover-assinatura-btn');
        if (removeBtn) {
            removeBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log('🗑️ Botão remover clicado');
                this.removeSignature();
            });
        }
    }
    checkMobileView() {
        const isMobile = window.innerWidth <= 768;
        if (isMobile) {
            // Ajustar comportamentos para mobile
            document.querySelectorAll('.form-control').forEach(input => {
                input.addEventListener('focus', () => {
                    setTimeout(() => {
                        input.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    }, 300);
                });
            });
        }
    }

    async loadAndRenderCategories() {
        try {
            // 1. Tentar carregar categorias do JSON
            const response = await fetch('assets/exames.json');
            if (response.ok) {
                const data = await response.json();
                if (Array.isArray(data.categorias) && data.categorias.length > 0) {
                    this.categorias = data.categorias;
                } else {
                    console.warn('JSON sem categorias, usando categorias padrão');
                    this.categorias = window.ExamesData.categorias;
                }
                console.log('Categorias carregadas do JSON:', this.categorias);
            } else {
                throw new Error('Falha ao carregar JSON');
            }
        } catch (error) {
            console.warn('Usando categorias padrão:', error);
            // 2. Se falhar, usar categorias padrão do models.js
            this.categorias = window.ExamesData?.categorias || [
                { id: 'laboratorio', nome: 'Laboratório', icone: 'fa-flask' },
                { id: 'ginecologia', nome: 'Ginecologia', icone: 'fa-female' },
                { id: 'pediatria', nome: 'Pediatria', icone: 'fa-baby' },
                { id: 'cardiologia', nome: 'Cardiologia', icone: 'fa-heartbeat' },
                { id: 'radiologia', nome: 'Radiologia', icone: 'fa-x-ray' },
                { id: 'generico', nome: 'Genérico', icone: 'fa-file-medical' }
            ];
        }

        // 3. Renderizar as categorias
        this.renderCategories();
    }

    renderCategories() {
        const container = document.getElementById('categorias-container');
        if (!container) {
            console.error('Container de categorias não encontrado!');
            return;
        }

        // Limpar container
        container.innerHTML = '';

        console.log('Renderizando categorias:', this.categorias);

        // Botão "Todos"
        const todosBtn = this.createCategoryButton('todos', 'fa-th-list', 'Todos');
        todosBtn.classList.add('active');
        container.appendChild(todosBtn);

        // Botões das categorias
        if (this.categorias && this.categorias.length > 0) {
            this.categorias.forEach(categoria => {
                const btn = this.createCategoryButton(
                    categoria.id,
                    categoria.icone || 'fa-folder',
                    categoria.nome || categoria.id
                );
                container.appendChild(btn);
            });
        } else {
            console.warn('Nenhuma categoria disponível');
            const noCats = document.createElement('div');
            noCats.className = 'no-categories';
            noCats.textContent = 'Nenhuma categoria disponível';
            container.appendChild(noCats);
        }

        // Adicionar event listeners
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
            console.log('Filtrando por categoria:', categoria);

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
            this.renderExames(this.exames);
        } else {
            const filtered = this.exames.filter(exame => exame.categoria === categoria);
            this.renderExames(filtered);
        }
    }

    closeExportModal() {
        const modal = document.getElementById('export-modal');
        if (modal) {
            modal.classList.remove('show');
        }
    }
    exportLaudoDiretamente() {
        // Validações básicas
        if (!this.state.paciente.nome) {
            this.showNotification('Preencha o nome do paciente', 'error');
            return;
        }

        if (!this.state.profissional.nome) {
            this.showNotification('Preencha o nome do profissional', 'error');
            return;
        }

        if (!this.state.exameAtual) {
            this.showNotification('Selecione um exame', 'error');
            return;
        }

        // Verificar se html2canvas está disponível
        if (typeof html2canvas === 'undefined') {
            this.showNotification('Erro: Biblioteca html2canvas não carregada', 'error');
            console.error('html2canvas não está definido');
            return;
        }

        this.showNotification('Gerando imagem do laudo...', 'info');

        // Usar o método existente confirmExportPNG() mas sem modal
        this.confirmExportPNG();
    }

    initEventListeners() {
        // Dados do Paciente
        document.getElementById('nome-paciente').addEventListener('input', (e) => {
            this.state.paciente.nome = e.target.value;
            this.updatePreview();
        });

        document.getElementById('documento-numero').addEventListener('input', (e) => {
            this.state.paciente.documento = e.target.value;
            this.updatePreview();
        });

        document.getElementById('idade').addEventListener('input', (e) => {
            this.state.paciente.idade = e.target.value;
            this.updatePreview();
        });

        document.getElementById('unidade').addEventListener('change', (e) => {
            this.state.paciente.unidade = e.target.value;
            this.updatePreview();
        });

        document.getElementById('data-exame').addEventListener('change', () => {
            this.updatePreview();
        });

        document.getElementById('hora-exame').addEventListener('change', () => {
            this.updatePreview();
        });

        // Dados do Profissional
        document.getElementById('nome-profissional').addEventListener('input', (e) => {
            this.state.profissional.nome = e.target.value;
            this.updatePreview();
        });

        document.getElementById('registro-numero').addEventListener('input', (e) => {
            this.state.profissional.registro = e.target.value;
            this.updatePreview();
        });

        // Gerar número do exame
        document.getElementById('gerar-numero').addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.generateExameNumber();
        });

        // Busca de exames
        document.getElementById('busca-exame').addEventListener('input', (e) => {
            this.filterExames(e.target.value);
        });

        // Upload de anexos
        document.getElementById('btn-select-images').addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            document.getElementById('file-input').click();
        });

        document.getElementById('file-input').addEventListener('change', (e) => {
            this.handleAnexoUpload(e.target.files);
        });

        // Drag and drop para anexos
        const dropZone = document.getElementById('drop-zone');
        dropZone.addEventListener('dragover', (e) => {
            e.preventDefault();
            dropZone.style.borderColor = '#400f00';
            dropZone.style.background = 'rgba(64, 15, 0, 0.05)';
        });

        dropZone.addEventListener('dragleave', () => {
            dropZone.style.borderColor = '#dee2e6';
            dropZone.style.background = 'rgba(248, 249, 250, 0.5)';
        });

        dropZone.addEventListener('drop', (e) => {
            e.preventDefault();
            dropZone.style.borderColor = '#dee2e6';
            dropZone.style.background = 'rgba(248, 249, 250, 0.5)';

            if (e.dataTransfer.files.length) {
                this.handleAnexoUpload(e.dataTransfer.files);
            }
        });

        // Fechar exame
        document.getElementById('fechar-exame').addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.closeExame();
        });

        // Atualizar preview
        document.getElementById('atualizar-preview').addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.updatePreview();
            this.showNotification('Pré-visualização atualizada');
        });

        // Limpar tudo
        document.getElementById('limpar-tudo').addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            if (confirm('Tem certeza que deseja limpar todos os dados? Isso não pode ser desfeito.')) {
                this.clearAll();
            }
        });

        // Exportar PNG
        document.getElementById('export-png').addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.exportLaudoDiretamente();
        });

        // Ajuda
        const helpBtn = document.querySelector('.btn-help');
        if (helpBtn) {
            helpBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.showHelp();
            });
        }

        const helpCloseBtn = document.querySelector('#help-modal .modal-close');
        if (helpCloseBtn) {
            helpCloseBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.hideHelp();
            });
        }

        // Fechar modal ao clicar fora
        window.addEventListener('click', (e) => {
            const modal = document.getElementById('help-modal');
            if (e.target === modal) {
                this.hideHelp();
            }
        });

        // Controles de paginação
        document.addEventListener('click', (e) => {
            if (e.target.closest('#prev-page')) {
                e.preventDefault();
                e.stopPropagation();
                this.mudarPagina(-1);
            }
            if (e.target.closest('#next-page')) {
                e.preventDefault();
                e.stopPropagation();
                this.mudarPagina(1);
            }
            if (e.target.closest('#first-page')) {
                e.preventDefault();
                e.stopPropagation();
                this.irParaPagina(0);
            }
        });
    }

    async loadExames() {
        try {
            this.state.isLoadingExames = true;

            // Tentar carregar do arquivo JSON
            const response = await fetch('assets/exames.json');
            const data = await response.json();

            this.exames = data.exames || [];
            console.log('Exames carregados do JSON:', this.exames.length);

            // Se não houver exames, usar os padrão
            if (this.exames.length === 0) {
                this.exames = window.ExamesData?.exames || this.loadDefaultExamesData();
            }

            this.renderExames(this.exames);
            this.state.isLoadingExames = false;

        } catch (error) {
            console.error('Erro ao carregar exames:', error);

            // Usar exames padrão do models.js
            this.exames = window.ExamesData?.exames || this.loadDefaultExamesData();

            this.renderExames(this.exames);
            this.state.isLoadingExames = false;
        }
    }

    loadDefaultExamesData() {
        return [
            {
                "id": "modelo_generico",
                "nome": "Laudo Genérico",
                "descricao": "Modelo de laudo genérico",
                "categoria": "generico",
                "icone": "fa-file-medical",
                "campos": [
                    { "id": "descricao", "tipo": "textarea", "label": "Descrição", "placeholder": "Descrição do caso..." },
                    { "id": "achados", "tipo": "textarea", "label": "Achados", "placeholder": "Achados principais..." },
                    { "id": "discussao", "tipo": "textarea", "label": "Discussão", "placeholder": "Discussão do caso..." },
                    { "id": "conclusao", "tipo": "textarea", "label": "Conclusão", "placeholder": "Conclusão final..." }
                ]
            }
        ];
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
        this.state.exameAtual = exame;

        // Ocultar todos os cards de exame
        document.querySelectorAll('.exame-card').forEach(card => {
            card.style.display = 'none'; // Ocultar visualmente
        });

        // Mostrar apenas o card selecionado
        const selectedCard = document.querySelector(`.exame-card[data-id="${exame.id}"]`);
        if (selectedCard) {
            selectedCard.style.display = 'flex';
            selectedCard.classList.add('selected');
        }

        // Mostrar botão "Voltar para todos os exames"
        this.showBackToAllExamesButton();

        // Mostrar seção de campos do exame
        document.getElementById('campos-exame').style.display = 'block';
        document.getElementById('titulo-exame-selecionado').textContent = exame.nome;

        // Gerar campos dinâmicos
        this.generateExameFields(exame);

        // Atualizar preview
        this.updatePreview();

        // Scroll para a seção
        document.getElementById('campos-exame').scrollIntoView({ behavior: 'smooth' });

        this.showNotification(`Exame "${exame.nome}" selecionado`);
    }

    showBackToAllExamesButton() {
        // Verificar se o botão já existe
        let backButton = document.querySelector('.back-to-all-exames');

        if (!backButton) {
            // Criar botão de voltar
            backButton = document.createElement('div');
            backButton.className = 'back-to-all-exames';
            backButton.innerHTML = `
            <button type="button" class="btn-back-to-all">
                <i class="fas fa-arrow-left"></i> Voltar para todos os exames
            </button>
        `;

            // Inserir antes do grid de exames
            const examesContainer = document.getElementById('exames-container');
            const categoriasContainer = document.getElementById('categorias-container');

            if (categoriasContainer && examesContainer) {
                categoriasContainer.parentNode.insertBefore(backButton, examesContainer);
            }

            // Adicionar event listener
            backButton.querySelector('.btn-back-to-all').addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.showAllExames();
            });
        }

        backButton.style.display = 'block';
    }

    showAllExames() {
        console.log('Mostrando todos os exames novamente...');

        // Mostrar TODOS os cards de exame
        document.querySelectorAll('.exame-card').forEach(card => {
            card.style.display = 'flex';
            card.classList.remove('selected');
        });

        // Ocultar botão "Voltar para todos os exames"
        const backButton = document.querySelector('.back-to-all-exames');
        if (backButton) {
            backButton.style.display = 'none';
        }

        // Resetar exame atual
        this.state.exameAtual = null;
        this.state.dadosExame = {};

        // Ocultar seção de campos do exame
        const camposExameSection = document.getElementById('campos-exame');
        if (camposExameSection) {
            camposExameSection.style.display = 'none';
        }

        // Limpar campos dinâmicos
        const camposDinamicos = document.getElementById('campos-dinamicos');
        if (camposDinamicos) {
            camposDinamicos.innerHTML = '';
        }

        // Limpar busca se houver
        const searchInput = document.getElementById('busca-exame');
        if (searchInput) {
            searchInput.value = '';
        }

        // Atualizar preview
        this.updatePreview();

        this.showNotification('Todos os exames estão visíveis novamente');
    }

    // Adicione também este método para o removeSimpleSignature se não existir
    removeSimpleSignature() {
        // Limpar estado
        this.state.assinatura = null;

        // Atualizar UI
        const imgElement = document.getElementById('simple-assinatura-img');
        const noSignature = document.getElementById('no-signature');

        if (imgElement) {
            imgElement.src = '';
            imgElement.style.display = 'none';
        }

        if (noSignature) {
            noSignature.style.display = 'block';
        }

        this.showNotification('Assinatura removida');
    }

    generateExameFields(exame) {
        const container = document.getElementById('campos-dinamicos');
        if (!container) return;

        container.innerHTML = '';

        // Inicializar dados do exame
        this.state.dadosExame = {};

        exame.campos.forEach((campo, index) => {
            const fieldId = `exame-campo-${index}`;
            this.state.dadosExame[campo.id] = '';

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

                default: // texto
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

        // Adicionar event listeners aos campos gerados
        setTimeout(() => {
            exame.campos.forEach((campo, index) => {
                const fieldId = `exame-campo-${index}`;
                const fieldElement = document.getElementById(fieldId);

                if (fieldElement) {
                    fieldElement.addEventListener('input', (e) => {
                        this.state.dadosExame[campo.id] = e.target.value;
                        this.updatePreview();
                    });

                    fieldElement.addEventListener('change', (e) => {
                        this.state.dadosExame[campo.id] = e.target.value;
                        this.updatePreview();
                    });
                }
            });
        }, 100);
    }

    filterExames(searchTerm) {
        const allExames = document.querySelectorAll('.exame-card');

        if (!searchTerm) {
            // Se não há termo de busca, mostrar todos os exames
            allExames.forEach(card => {
                if (this.state.exameAtual && card.dataset.id === this.state.exameAtual.id) {
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

    handleAnexoUpload(files) {
        if (!files || files.length === 0) return;

        Array.from(files).forEach(file => {
            if (!file.type.match('image.*')) {
                this.showNotification('Apenas imagens são permitidas', 'error');
                return;
            }

            if (file.size > 10 * 1024 * 1024) {
                this.showNotification('Imagem muito grande (máx: 10MB)', 'error');
                return;
            }

            const reader = new FileReader();
            reader.onload = (e) => {
                const anexo = {
                    id: Date.now() + Math.random(),
                    name: file.name,
                    data: e.target.result,
                    type: file.type,
                    tamanho: this.formatFileSize(file.size),
                    numero: this.state.anexos.length + 1
                };

                this.state.anexos.push(anexo);
                this.renderAnexos();
                this.updatePreview();

                this.showNotification(`Anexo "${file.name}" adicionado`);
            };

            reader.readAsDataURL(file);
        });
    }

    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    renderAnexos() {
        const container = document.getElementById('anexos-container');
        if (!container) return;

        if (this.state.anexos.length === 0) {
            container.innerHTML = `
                <div class="empty-anexos">
                    <i class="fas fa-paperclip"></i>
                    <p>Nenhum anexo adicionado</p>
                    <small>Os anexos aparecerão em página separada no laudo</small>
                </div>
            `;
            return;
        }

        container.innerHTML = '';

        this.state.anexos.forEach((anexo, index) => {
            const anexoItem = document.createElement('div');
            anexoItem.className = 'anexo-item';
            anexoItem.dataset.index = index;

            anexoItem.innerHTML = `
                <div class="anexo-numero">${index + 1}</div>
                <img src="${anexo.data}" alt="${anexo.name}" class="anexo-thumbnail">
                <div class="anexo-info">
                    <div class="anexo-nome" title="${anexo.name}">${anexo.name}</div>
                    <div class="anexo-tipo">Imagem • ${anexo.tamanho}</div>
                </div>
                <button class="anexo-remove" data-index="${index}">
                    <i class="fas fa-times"></i>
                </button>
            `;

            container.appendChild(anexoItem);
        });

        // Adicionar event listeners para remover
        document.querySelectorAll('.anexo-remove').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                e.preventDefault();
                const index = parseInt(e.target.closest('.anexo-remove').dataset.index);
                this.removeAnexo(index);
            });
        });

        // Adicionar preview ao clicar no anexo
        document.querySelectorAll('.anexo-item').forEach(item => {
            item.addEventListener('click', (e) => {
                if (!e.target.closest('.anexo-remove')) {
                    e.preventDefault();
                    e.stopPropagation();
                    const index = parseInt(item.dataset.index);
                    this.previewAnexo(index);
                }
            });
        });
    }

    removeAnexo(index) {
        const removed = this.state.anexos.splice(index, 1)[0];

        // Renumerar os anexos restantes
        this.state.anexos.forEach((anexo, i) => {
            anexo.numero = i + 1;
        });

        this.renderAnexos();
        this.updatePreview();
        this.showNotification(`Anexo "${removed.name}" removido`);
    }

    previewAnexo(index) {
        const anexo = this.state.anexos[index];
        if (!anexo) return;

        const modal = document.createElement('div');
        modal.className = 'modal anexo-preview-modal';
        modal.innerHTML = `
            <div class="modal-content" style="max-width: 90vw;">
                <div class="modal-header">
                    <h2>Anexo ${anexo.numero}: ${anexo.name}</h2>
                    <button class="modal-close">&times;</button>
                </div>
                <div class="modal-body" style="text-align: center; padding: 2rem;">
                    <img src="${anexo.data}" alt="${anexo.name}" style="max-width: 100%; max-height: 70vh;">
                    <p style="margin-top: 1rem; color: var(--gray-color);">Tamanho: ${anexo.tamanho}</p>
                </div>
            </div>
        `;

        document.body.appendChild(modal);
        modal.classList.add('show');

        modal.querySelector('.modal-close').addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            modal.classList.remove('show');
            setTimeout(() => modal.remove(), 300);
        });

        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.classList.remove('show');
                setTimeout(() => modal.remove(), 300);
            }
        });
    }

    initSignatureUpload() {
        console.log('🔧 Inicializando upload de assinatura com IDs reais...');

        // Usando IDs EXISTENTES do seu HTML
        const fileInput = document.getElementById('upload-assinatura-file');
        const uploadArea = document.querySelector('.upload-assinatura-area');
        const assinaturaImg = document.getElementById('assinatura-img');
        const noAssinatura = document.querySelector('.no-assinatura');

        console.log('Elementos encontrados:', {
            fileInput: !!fileInput,
            uploadArea: !!uploadArea,
            assinaturaImg: !!assinaturaImg,
            noAssinatura: !!noAssinatura
        });

        if (!fileInput || !uploadArea) {
            console.error('❌ Elementos essenciais não encontrados!');
            return;
        }

        // 1. Clique na área de upload
        uploadArea.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            console.log('📎 Clicou na área de upload');
            fileInput.click();
        });

        // 2. Seleção de arquivo
        fileInput.addEventListener('change', (e) => {
            console.log('📁 Arquivo selecionado:', e.target.files[0]);
            if (e.target.files.length > 0) {
                this.handleSignatureUpload(e.target.files[0]);
            }
        });

        // 3. Drag and drop
        uploadArea.addEventListener('dragover', (e) => {
            e.preventDefault();
            uploadArea.style.borderColor = '#400f00';
            uploadArea.style.background = 'rgba(64, 15, 0, 0.1)';
        });

        uploadArea.addEventListener('dragleave', () => {
            uploadArea.style.borderColor = '';
            uploadArea.style.background = '';
        });

        uploadArea.addEventListener('drop', (e) => {
            e.preventDefault();
            uploadArea.style.borderColor = '';
            uploadArea.style.background = '';

            if (e.dataTransfer.files.length > 0) {
                console.log('📎 Arquivo solto:', e.dataTransfer.files[0]);
                this.handleSignatureUpload(e.dataTransfer.files[0]);
            }
        });

        console.log('✅ Eventos da assinatura configurados');
    }

    handleSignatureUpload(file) {
        console.log('🚀 Processando upload de assinatura...');

        if (!file) {
            console.error('❌ Nenhum arquivo');
            this.showNotification('Nenhum arquivo selecionado', 'error');
            return;
        }

        // Validar se é imagem
        if (!file.type.startsWith('image/')) {
            console.error('❌ Não é imagem:', file.type);
            this.showNotification('Selecione uma imagem (JPG ou PNG)', 'error');
            return;
        }

        // Validar tamanho
        if (file.size > 5 * 1024 * 1024) {
            console.error('❌ Arquivo muito grande:', file.size);
            this.showNotification('Imagem muito grande (máx: 5MB)', 'error');
            return;
        }

        const reader = new FileReader();

        reader.onload = (e) => {
            console.log('✅ Arquivo lido');

            const img = new Image();

            img.onload = () => {
                console.log('✅ Imagem carregada');

                // Redimensionar para tamanho adequado
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');

                // Tamanho máximo
                const maxWidth = 400;
                const maxHeight = 200;
                let width = img.width;
                let height = img.height;

                if (width > maxWidth || height > maxHeight) {
                    const ratio = Math.min(maxWidth / width, maxHeight / height);
                    width = Math.floor(width * ratio);
                    height = Math.floor(height * ratio);
                }

                canvas.width = width;
                canvas.height = height;
                ctx.drawImage(img, 0, 0, width, height);

                const dataUrl = canvas.toDataURL('image/png');

                // Atualizar estado
                this.state.assinatura = {
                    data: dataUrl,
                    type: 'uploaded',
                    timestamp: new Date().toISOString(),
                    originalName: file.name
                };

                // Atualizar UI usando IDs REAIS
                const assinaturaImg = document.getElementById('assinatura-img');
                const noAssinatura = document.querySelector('.no-assinatura');
                const uploadArea = document.querySelector('.upload-assinatura-area');

                if (assinaturaImg) {
                    assinaturaImg.src = dataUrl;
                    assinaturaImg.style.display = 'block';
                    console.log('🖼️ Imagem da assinatura atualizada');
                }

                if (noAssinatura) {
                    noAssinatura.style.display = 'none';
                    console.log('🙈 Texto "Nenhuma assinatura" ocultado');
                }

                if (uploadArea) {
                    uploadArea.innerHTML = `
                        <i class="fas fa-check-circle" style="color: #28a745;"></i>
                        <p style="color: #28a745;">Assinatura carregada!</p>
                        <p style="font-size: 0.8em; color: #666;">Clique para trocar</p>
                    `;
                }

                // Atualizar preview do laudo
                this.updatePreview();

                this.showNotification('Assinatura carregada com sucesso!');
            };

            img.onerror = () => {
                console.error('❌ Erro ao carregar imagem');
                this.showNotification('Erro ao processar imagem', 'error');
            };

            img.src = e.target.result;
        };

        reader.onerror = () => {
            console.error('❌ Erro ao ler arquivo');
            this.showNotification('Erro ao ler arquivo', 'error');
        };

        reader.readAsDataURL(file);
    }

    removeSignature() {
        console.log('🗑️ Removendo assinatura...');

        // Limpar estado
        this.state.assinatura = null;

        // Atualizar UI
        const assinaturaImg = document.getElementById('assinatura-img');
        const noAssinatura = document.querySelector('.no-assinatura');
        const uploadArea = document.querySelector('.upload-assinatura-area');

        if (assinaturaImg) {
            assinaturaImg.src = '';
            assinaturaImg.style.display = 'none';
        }

        if (noAssinatura) {
            noAssinatura.style.display = 'block';
        }

        if (uploadArea) {
            uploadArea.innerHTML = `
                <i class="fas fa-file-upload"></i>
                <p>Clique para carregar imagem da assinatura</p>
            `;
        }

        // Atualizar preview
        this.updatePreview();

        this.showNotification('Assinatura removida');
    }

    // ============================================
    // ASSINATURA SIMPLIFICADA
    // ============================================

    initSimpleSignature() {
        console.log('🔄 Inicializando assinatura simplificada...');

        const input = document.getElementById('simple-assinatura-input');
        const uploadArea = document.querySelector('.simple-upload-area');

        if (!input) {
            console.error('❌ Input não encontrado!');
            return;
        }

        // Clique na área de upload
        if (uploadArea) {
            uploadArea.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                input.click();
            });
        }

        // Quando selecionar arquivo
        input.addEventListener('change', (e) => {
            if (e.target.files && e.target.files[0]) {
                this.uploadSimpleSignature(e.target.files[0]);
            }
        });

        // Verificar se já tem assinatura salva
        if (this.state.assinatura && this.state.assinatura.data) {
            this.showSimpleSignature(this.state.assinatura.data);
        }

        console.log('✅ Assinatura simplificada inicializada');
    }

    uploadSimpleSignature(file) {
        console.log('📤 Upload de assinatura:', file);

        if (!file.type.startsWith('image/')) {
            alert('Por favor, selecione uma imagem (JPG ou PNG)');
            return;
        }

        if (file.size > 5 * 1024 * 1024) {
            alert('A imagem é muito grande (máximo 5MB)');
            return;
        }

        const reader = new FileReader();

        reader.onload = (e) => {
            const img = new Image();

            img.onload = () => {
                // Redimensionar se necessário
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');

                const maxWidth = 400;
                const maxHeight = 200;
                let width = img.width;
                let height = img.height;

                if (width > maxWidth || height > maxHeight) {
                    const ratio = Math.min(maxWidth / width, maxHeight / height);
                    width = Math.floor(width * ratio);
                    height = Math.floor(height * ratio);
                }

                canvas.width = width;
                canvas.height = height;
                ctx.drawImage(img, 0, 0, width, height);

                const dataUrl = canvas.toDataURL('image/png');

                // Salvar no estado
                this.state.assinatura = {
                    data: dataUrl,
                    type: 'uploaded',
                    timestamp: new Date().toISOString(),
                    originalName: file.name
                };

                // Mostrar na UI
                this.showSimpleSignature(dataUrl);

                // Atualizar preview
                this.updatePreview();

                // Salvar rascunho
                this.saveDraft();

                this.showNotification('Assinatura carregada com sucesso!');
            };

            img.src = e.target.result;
        };

        reader.readAsDataURL(file);
    }

    showSimpleSignature(imageData) {
        const imgElement = document.getElementById('simple-assinatura-img');
        const noSignature = document.getElementById('no-signature');
        const actions = document.getElementById('simple-assinatura-actions');

        if (imgElement) {
            imgElement.src = imageData;
            imgElement.style.display = 'block';
        }

        if (noSignature) {
            noSignature.style.display = 'none';
        }

        if (actions) {
            actions.style.display = 'flex';
        }
    }



    closeExame() {
        this.state.exameAtual = null;
        this.state.dadosExame = {};

        // Mostrar todos os exames novamente
        this.showAllExames();

        // Limpar campos dinâmicos
        const camposDinamicos = document.getElementById('campos-dinamicos');
        if (camposDinamicos) {
            camposDinamicos.innerHTML = '';
        }

        // Atualizar preview
        this.updatePreview();
        this.showNotification('Exame fechado');
    }

    setCurrentDate() {
        const now = new Date();
        const dateStr = now.toISOString().split('T')[0];
        const timeStr = now.toTimeString().split(' ')[0].substring(0, 5);

        const dataExameInput = document.getElementById('data-exame');
        const horaExameInput = document.getElementById('hora-exame');

        if (dataExameInput) dataExameInput.value = dateStr;
        if (horaExameInput) horaExameInput.value = timeStr;
    }

    generateExameNumber() {
        this.state.ultimoNumero++;
        const numeroExame = `LAUDO-${this.state.ultimoNumero.toString().padStart(6, '0')}`;

        const numeroExameInput = document.getElementById('numero-exame');
        if (numeroExameInput) {
            numeroExameInput.value = numeroExame;
        }

        localStorage.setItem('ultimoNumeroExame', this.state.ultimoNumero);

        this.updatePreview();
    }

    mudarPagina(direcao) {
        const totalPaginas = 1 + this.state.anexos.length;
        let novaPagina = this.state.paginaAtual + direcao;

        if (novaPagina < 0) novaPagina = 0;
        if (novaPagina >= totalPaginas) novaPagina = totalPaginas - 1;

        this.state.paginaAtual = novaPagina;
        this.renderPaginaAtual();
    }

    irParaPagina(numeroPagina) {
        const totalPaginas = 1 + this.state.anexos.length;
        if (numeroPagina >= 0 && numeroPagina < totalPaginas) {
            this.state.paginaAtual = numeroPagina;
            this.renderPaginaAtual();
        }
    }

    renderPaginaAtual() {
        const totalPaginas = 1 + this.state.anexos.length;

        // Ocultar todas as páginas
        document.querySelectorAll('.laudo-pagina').forEach(pagina => {
            pagina.style.display = 'none';
        });

        // Mostrar página atual
        const paginaAtual = document.getElementById(`laudo-pagina-${this.state.paginaAtual}`);
        if (paginaAtual) {
            paginaAtual.style.display = 'block';
        }

        // Atualizar controles de paginação
        this.atualizarControlesPaginacao(totalPaginas);
    }

    atualizarControlesPaginacao(totalPaginas) {
        const controls = document.querySelector('.paginacao-controls');
        if (!controls) return;

        const paginaAtual = this.state.paginaAtual + 1;

        controls.innerHTML = `
            <div class="paginacao-info">
                Página ${paginaAtual} de ${totalPaginas}
                ${this.state.paginaAtual === 0 ? '(Laudo Principal)' : `(Anexo ${this.state.paginaAtual})`}
            </div>
            <div class="paginacao-botoes">
                <button class="btn-paginacao" id="first-page" ${this.state.paginaAtual === 0 ? 'disabled' : ''}>
                    <i class="fas fa-step-backward"></i> Início
                </button>
                <button class="btn-paginacao" id="prev-page" ${this.state.paginaAtual === 0 ? 'disabled' : ''}>
                    <i class="fas fa-chevron-left"></i> Anterior
                </button>
                <div class="paginacao-numeros">
                    ${Array.from({ length: totalPaginas }, (_, i) => `
                        <button class="pagina-numero ${i === this.state.paginaAtual ? 'ativa' : ''}" 
                                data-pagina="${i}">
                            ${i + 1}
                        </button>
                    `).join('')}
                </div>
                <button class="btn-paginacao" id="next-page" ${this.state.paginaAtual === totalPaginas - 1 ? 'disabled' : ''}>
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
                this.irParaPagina(numeroPagina);
            });
        });
    }

    updatePreview() {
        // Renderizar todas as páginas
        this.renderTodasPaginas();

        // Renderizar controles de paginação
        const totalPaginas = 1 + this.state.anexos.length;
        this.atualizarControlesPaginacao(totalPaginas);

        // Mostrar página atual
        this.renderPaginaAtual();

        // Salvar rascunho
        this.saveDraft();
    }

    renderExameResults() {
        const container = document.getElementById('resultados-container');
        const observacoesContainer = document.getElementById('observacoes-container');

        if (!container || !observacoesContainer) return;

        container.innerHTML = '';
        observacoesContainer.innerHTML = '';

        if (!this.state.exameAtual) return;

        let hasObservacoes = false;

        this.state.exameAtual.campos.forEach(campo => {
            const valor = this.state.dadosExame[campo.id];
            if (!valor) return;

            if (campo.tipo === 'textarea') {
                hasObservacoes = true;
                observacoesContainer.innerHTML = `
                    <div class="observacao-title">
                        <i class="fas fa-notes-medical"></i> Observações
                    </div>
                    <div class="observacao-text">${valor}</div>
                `;
            } else {
                const resultadoDiv = document.createElement('div');
                resultadoDiv.className = 'resultado-item';
                resultadoDiv.innerHTML = `
                    <span class="resultado-label">${campo.label}:</span>
                    <div class="resultado-valor">${valor}</div>
                `;
                container.appendChild(resultadoDiv);
            }
        });

        if (!hasObservacoes) {
            observacoesContainer.innerHTML = '';
        }
    }

    renderPreviewSignature() {
        const container = document.getElementById('assinatura-preview-footer');
        if (!container) return;

        if (this.state.assinatura && this.state.assinatura.data) {
            container.innerHTML = `
                <img src="${this.state.assinatura.data}" alt="Assinatura" style="max-width: 100%; max-height: 80px;">
            `;
        } else {
            container.innerHTML = `
                <div class="assinatura-placeholder">
                    <i class="fas fa-signature"></i>
                    <p>Assinatura não disponível</p>
                </div>
            `;
        }
    }

    renderTodasPaginas() {
        const container = document.querySelector('.laudo-preview-container');
        if (!container) return;

        // Limpar container
        const previewContainer = container.querySelector('.laudo-preview');
        if (!previewContainer) return;

        previewContainer.innerHTML = '';

        // Renderizar página principal
        this.renderPaginaPrincipal(previewContainer);

        // Renderizar páginas de anexos
        this.renderPaginasAnexos(previewContainer);
    }

    renderPaginaPrincipal(container) {
        const pagina = document.createElement('div');
        pagina.className = 'laudo-pagina';
        pagina.id = 'laudo-pagina-0';

        // Obter valores para preenchimento
        const documentoTipo = document.getElementById('documento-tipo')?.value || 'Passaporte';
        const documentoCompleto = this.state.paciente.documento ?
            `${documentoTipo}: ${this.state.paciente.documento}` : '-';

        const idadeCompleta = this.state.paciente.idade ? `${this.state.paciente.idade} anos` : '-';

        const unidadeSelect = document.getElementById('unidade');
        const unidadeText = unidadeSelect && unidadeSelect.options[unidadeSelect.selectedIndex]?.text || '-';

        const numeroExameInput = document.getElementById('numero-exame');
        const numeroExame = numeroExameInput ? numeroExameInput.value : '-';

        const dataExameInput = document.getElementById('data-exame');
        const horaExameInput = document.getElementById('hora-exame');
        const dataHora = dataExameInput ?
            `${dataExameInput.value} ${horaExameInput && horaExameInput.value ? `às ${horaExameInput.value}` : ''}` :
            '-';

        const registroProfissional = this.state.profissional.registro ?
            `CRM: ${this.state.profissional.registro}` :
            'Registro Profissional';

        pagina.innerHTML = `
            <!-- Cabeçalho do Laudo -->
            <header class="laudo-header">
                <div class="laudo-logo">
                    <div class="hospital-logo-img">
                        <img src="assets/logo.png" alt="Hospital São Rafael"
                            onerror="this.style.display='none'; this.parentElement.innerHTML='<i class=\'fas fa-hospital-alt\'></i>';">
                    </div>
                    <div class="laudo-titulo">
                        <h1>HOSPITAL SÃO RAFAEL</h1>
                        <p class="laudo-subtitulo">Sistema de Laudos Digitais</p>
                    </div>
                </div>
            </header>

            <!-- Linha divisória -->
            <div class="laudo-divider"></div>

            <!-- Dados do Paciente -->
            <section class="laudo-section">
                <h2 class="laudo-section-title">
                    <i class="fas fa-user-injured"></i> DADOS DO PACIENTE
                </h2>
                <div class="laudo-grid">
                    <div class="laudo-field">
                        <span class="field-label">Nome:</span>
                        <span class="field-value">${this.state.paciente.nome || '-'}</span>
                    </div>
                    <div class="laudo-field">
                        <span class="field-label">Documento:</span>
                        <span class="field-value">${documentoCompleto}</span>
                    </div>
                    <div class="laudo-field">
                        <span class="field-label">Idade:</span>
                        <span class="field-value">${idadeCompleta}</span>
                    </div>
                    <div class="laudo-field">
                        <span class="field-label">Unidade:</span>
                        <span class="field-value">${unidadeText}</span>
                    </div>
                </div>
            </section>

            <!-- Informações do Exame -->
            <section class="laudo-section">
                <h2 class="laudo-section-title">
                    <i class="fas fa-stethoscope"></i> INFORMAÇÕES DO EXAME
                </h2>
                <div class="exame-info">
                    <div class="exame-titulo">
                        <h3>${this.state.exameAtual ? this.state.exameAtual.nome : 'Selecione um exame no catálogo'}</h3>
                    </div>
                    <div class="exame-descricao">
                        <p>${this.state.exameAtual ? this.state.exameAtual.descricao || '' : 'Nenhum exame selecionado.'}</p>
                    </div>
                </div>

                <!-- Resultados Dinâmicos -->
                <div class="resultados-container" id="resultados-container">
                    ${this.state.exameAtual ? this.generateExameResultsHTML() : ''}
                </div>

                <!-- Observações -->
                <div class="observacoes-container" id="observacoes-container">
                    ${this.state.exameAtual ? this.generateExameObservacoesHTML() : ''}
                </div>

                <!-- Indicador de Anexos -->
                ${this.state.anexos.length > 0 ? `
                    <div class="anexos-indicator">
                        <i class="fas fa-paperclip"></i>
                        <strong>${this.state.anexos.length} anexo(s)</strong> - 
                        Ver próximas páginas para visualizar
                    </div>
                ` : ''}
            </section>

            <!-- Conclusão -->
            <section class="laudo-section">
                <h2 class="laudo-section-title">
                    <i class="fas fa-file-medical-alt"></i> CONCLUSÃO
                </h2>
                <div class="conclusao-content">
                    <p>Laudo emitido pelo Sistema de Laudos Digitais do Hospital São Rafael.</p>
                    ${this.state.exameAtual && this.state.dadosExame.conclusao ? `
                        <p><strong>Conclusão do Exame:</strong> ${this.state.dadosExame.conclusao}</p>
                    ` : ''}
                </div>
            </section>

            <!-- Rodapé com Assinatura -->
            <footer class="laudo-footer">
                <div class="laudo-divider"></div>
                <div class="assinatura-container">
                    <div class="assinatura-preview-footer" id="assinatura-preview-footer">
                        ${this.state.assinatura && this.state.assinatura.data ?
                `<img src="${this.state.assinatura.data}" alt="Assinatura" style="max-width: 100%; max-height: 80px;">` :
                `<div class="assinatura-placeholder">
                                <i class="fas fa-signature"></i>
                                <p>Assinatura não disponível</p>
                            </div>`
            }
                    </div>
                    <div class="profissional-info">
                        <div class="profissional-nome">
                            ${this.state.profissional.nome || '_______________________________________'}
                        </div>
                        <div class="profissional-registro">
                            ${registroProfissional}
                        </div>
                        <div class="profissional-registro">
                            ${dataHora}
                        </div>
                    </div>
                </div>
                <div class="laudo-rodape">
                    <p class="laudo-aviso">Este laudo tem validade institucional do Hospital São Rafael</p>
                    <p class="laudo-aviso">Número do Laudo: ${numeroExame}</p>
                </div>
            </footer>
        `;

        container.appendChild(pagina);
    }

    generateExameResultsHTML() {
        if (!this.state.exameAtual || !this.state.exameAtual.campos) return '';

        let html = '';
        this.state.exameAtual.campos.forEach(campo => {
            const valor = this.state.dadosExame[campo.id];
            if (!valor || campo.tipo === 'textarea') return;

            html += `
                <div class="resultado-item">
                    <span class="resultado-label">${campo.label}:</span>
                    <div class="resultado-valor">${valor}</div>
                </div>
            `;
        });

        return html;
    }

    generateExameObservacoesHTML() {
        if (!this.state.exameAtual || !this.state.exameAtual.campos) return '';

        let hasObservacoes = false;
        let observacoesHTML = '';

        this.state.exameAtual.campos.forEach(campo => {
            const valor = this.state.dadosExame[campo.id];
            if (valor && campo.tipo === 'textarea') {
                hasObservacoes = true;
                observacoesHTML += `
                    <div class="observacao-title">
                        <i class="fas fa-notes-medical"></i> ${campo.label}
                    </div>
                    <div class="observacao-text">${valor}</div>
                `;
            }
        });

        if (hasObservacoes) {
            return `
                <div class="observacoes-container">
                    ${observacoesHTML}
                </div>
            `;
        }

        return '';
    }

    renderPaginasAnexos(container) {
        this.state.anexos.forEach((anexo, index) => {
            const pagina = document.createElement('div');
            pagina.className = 'laudo-pagina';
            pagina.id = `laudo-pagina-${index + 1}`;
            pagina.style.display = 'none';

            pagina.innerHTML = `
                <header class="laudo-header">
                    <div class="laudo-logo">
                        <div class="hospital-logo-img">
                            <img src="assets/logo.png" alt="Hospital São Rafael"
                                onerror="this.style.display='none'; this.parentElement.innerHTML='<i class=\'fas fa-hospital-alt\'></i>';">
                        </div>
                        <div class="laudo-titulo">
                            <h1>HOSPITAL SÃO RAFAEL</h1>
                            <p class="laudo-subtitulo">Anexo do Laudo - Página ${index + 2}</p>
                        </div>
                    </div>
                </header>
                
                <div class="laudo-divider"></div>
                
                <div class="anexos-content">
                    <div class="anexo-pagina-item">
                        <div class="anexo-pagina-titulo">
                            <i class="fas fa-paperclip"></i>
                            Anexo ${index + 1}: ${anexo.name}
                        </div>
                        <div class="anexo-pagina-imagem">
                            <img src="${anexo.data}" alt="${anexo.name}">
                        </div>
                        <div class="anexo-pagina-descricao">
                            Arquivo: ${anexo.name} | Tamanho: ${anexo.tamanho} | Página ${index + 2} do laudo
                        </div>
                    </div>
                </div>
                
                <footer class="laudo-footer" style="margin-top: 3rem;">
                    <div class="laudo-divider"></div>
                    <div class="laudo-rodape">
                        <p class="laudo-aviso">Anexo ${index + 1} do Laudo ${document.getElementById('numero-exame')?.value || ''}</p>
                        <p class="laudo-aviso">Hospital São Rafael - Sistema de Laudos Digitais</p>
                    </div>
                </footer>
            `;

            container.appendChild(pagina);
        });
    }

    // Exportar todas as páginas PNG em sequência
    async exportarTodasPaginasPNG() {
        if (!this.state.paciente.nome) {
            this.showNotification('Preencha o nome do paciente', 'error');
            return;
        }

        if (!this.state.profissional.nome) {
            this.showNotification('Preencha o nome do profissional', 'error');
            return;
        }

        if (!this.state.exameAtual) {
            this.showNotification('Selecione um exame', 'error');
            return;
        }

        // Verificar se html2canvas está disponível
        if (typeof html2canvas === 'undefined') {
            this.showNotification('Erro: Biblioteca html2canvas não carregada', 'error');
            console.error('html2canvas não está definido');
            return;
        }

        this.showNotification('Gerando imagem do laudo...', 'info');

        // Usar o método existente confirmExportPNG() mas sem modal
        this.confirmExportPNG();

        // Voltar para a página principal
        this.state.paginaAtual = 0;
        this.renderPaginaAtual();

        this.showNotification(`${totalPaginas} páginas exportadas com sucesso!`);
    }

    async confirmExportPNG() {
        try {
            const original = document.querySelector('.laudo-preview');
            if (!original) {
                this.showNotification('Laudo não encontrado', 'error');
                return;
            }

            this.showNotification('Gerando imagem do laudo...', 'info');

            // CLONE fora da tela
            const clone = original.cloneNode(true);
            clone.id = 'laudo-export-preview';

            // Wrapper invisível
            const wrapper = document.createElement('div');
            wrapper.style.position = 'fixed';
            wrapper.style.top = '-100000px';
            wrapper.style.left = '0';
            wrapper.style.width = '794px'; // A4
            wrapper.style.background = '#ffffff';
            wrapper.style.zIndex = '-1';

            // FORÇAR layout correto
            clone.style.height = 'auto';
            clone.style.minHeight = 'auto';
            clone.style.overflow = 'visible';
            clone.style.boxShadow = 'none';

            wrapper.appendChild(clone);
            document.body.appendChild(wrapper);

            // Aguarda renderização completa (imagens / fontes)
            await new Promise(resolve => setTimeout(resolve, 300));

            const canvas = await html2canvas(clone, {
                scale: 3,
                backgroundColor: '#ffffff',
                useCORS: true,
                allowTaint: true,
                windowWidth: clone.scrollWidth,
                windowHeight: clone.scrollHeight
            });

            // Limpeza
            document.body.removeChild(wrapper);

            // Criar nome do arquivo
            const pacienteNome = this.state.paciente.nome.replace(/\s+/g, '_').substring(0, 30);
            const exameNome = this.state.exameAtual.nome.replace(/\s+/g, '_').substring(0, 20);
            const timestamp = new Date().toISOString().slice(0, 10).replace(/-/g, '');

            // Download
            const link = document.createElement('a');
            link.download = `Laudo_${pacienteNome}_${exameNome}_${timestamp}.png`;
            link.href = canvas.toDataURL('image/png');
            link.click();

            this.showNotification('Laudo exportado com sucesso');

        } catch (error) {
            console.error('Erro ao exportar laudo:', error);
            this.showNotification('Erro ao exportar laudo', 'error');
        }
    }

    setupAutoSave() {
        // Salvar a cada 30 segundos
        setInterval(() => {
            this.saveDraft();
        }, 30000);

        // Salvar ao sair da página
        window.addEventListener('beforeunload', () => {
            this.saveDraft();
        });
    }

    saveDraft() {
        const draft = {
            paciente: this.state.paciente,
            profissional: this.state.profissional,
            exameAtual: this.state.exameAtual,
            dadosExame: this.state.dadosExame,
            anexos: this.state.anexos.slice(0, 10),
            assinatura: this.state.assinatura,
            timestamp: new Date().toISOString(),

            // Salvar dados adicionais
            numeroExame: document.getElementById('numero-exame')?.value || '',
            dataExame: document.getElementById('data-exame')?.value || '',
            horaExame: document.getElementById('hora-exame')?.value || '',
            tipoDocumento: document.getElementById('documento-tipo')?.value || 'Passaporte',
            unidade: this.state.paciente.unidade || ''
        };

        console.log('Salvando rascunho:', draft);
        localStorage.setItem('laudoDraft', JSON.stringify(draft));

        // Atualizar status do auto-salvo
        const status = document.querySelector('.auto-save-status span');
        if (status) {
            status.textContent = 'Salvando...';
            setTimeout(() => {
                status.textContent = 'Auto-salvo';
            }, 1000);
        }
    }

    checkForDraft() {
        const draft = localStorage.getItem('laudoDraft');

        if (draft) {
            const parsedDraft = JSON.parse(draft);
            console.log('Rascunho encontrado:', parsedDraft);

            // Armazenar o rascunho para restaurar depois que os exames forem carregados
            this.state.draftToRestore = parsedDraft;

            // Não mostrar prompt imediatamente - vamos restaurar automaticamente
            console.log('Rascunho será restaurado após carregar exames');
        }
    }

    loadDraft(draft) {
        console.log('=== INICIANDO RESTAURAÇÃO DO RASCUNHO ===');
        console.log('Draft completo:', draft);

        try {
            // 1. Restaurar dados básicos do paciente
            if (draft.paciente) {
                this.state.paciente = { ...this.state.paciente, ...draft.paciente };

                // Preencher campos do formulário
                const nomePacienteInput = document.getElementById('nome-paciente');
                const documentoNumeroInput = document.getElementById('documento-numero');
                const idadeInput = document.getElementById('idade');
                const unidadeSelect = document.getElementById('unidade');
                const documentoTipoSelect = document.getElementById('documento-tipo');

                if (nomePacienteInput) nomePacienteInput.value = this.state.paciente.nome || '';
                if (documentoNumeroInput) documentoNumeroInput.value = this.state.paciente.documento || '';
                if (idadeInput) idadeInput.value = this.state.paciente.idade || '';
                if (unidadeSelect && this.state.paciente.unidade) {
                    unidadeSelect.value = this.state.paciente.unidade;
                }
                if (documentoTipoSelect && draft.tipoDocumento) {
                    documentoTipoSelect.value = draft.tipoDocumento;
                }
            }

            // 2. Restaurar dados do profissional
            if (draft.profissional) {
                this.state.profissional = { ...this.state.profissional, ...draft.profissional };

                const nomeProfissionalInput = document.getElementById('nome-profissional');
                const registroNumeroInput = document.getElementById('registro-numero');

                if (nomeProfissionalInput) nomeProfissionalInput.value = this.state.profissional.nome || '';
                if (registroNumeroInput) registroNumeroInput.value = this.state.profissional.registro || '';
            }

            // 3. Restaurar número do exame
            if (draft.numeroExame) {
                const numeroExameInput = document.getElementById('numero-exame');
                if (numeroExameInput) {
                    numeroExameInput.value = draft.numeroExame;

                    // Extrair e atualizar o último número
                    const match = draft.numeroExame.match(/LAUDO-(\d+)/);
                    if (match && match[1]) {
                        const numero = parseInt(match[1]);
                        if (!isNaN(numero) && numero > this.state.ultimoNumero) {
                            this.state.ultimoNumero = numero;
                            localStorage.setItem('ultimoNumeroExame', numero);
                        }
                    }
                }
            }

            // 4. Restaurar data e hora
            if (draft.dataExame) {
                const dataExameInput = document.getElementById('data-exame');
                if (dataExameInput) dataExameInput.value = draft.dataExame;
            }

            if (draft.horaExame) {
                const horaExameInput = document.getElementById('hora-exame');
                if (horaExameInput) horaExameInput.value = draft.horaExame;
            }

            // 5. Restaurar anexos
            if (draft.anexos && Array.isArray(draft.anexos)) {
                this.state.anexos = draft.anexos;
                this.renderAnexos();
            } else if (draft.imagens && Array.isArray(draft.imagens)) {
                // Compatibilidade com versões antigas que usavam 'imagens'
                this.state.anexos = draft.imagens.map(img => ({
                    ...img,
                    tamanho: img.tamanho || 'Desconhecido',
                    numero: img.numero || 1
                }));
                this.renderAnexos();
            }

            /// 6. Restaurar assinatura
            if (draft.assinatura && draft.assinatura.data) {
                console.log('Restaurando assinatura do rascunho');
                this.state.assinatura = draft.assinatura;

                // Usar o método simplificado
                setTimeout(() => {
                    this.showSimpleSignature(draft.assinatura.data);
                }, 100);
            }

            // 7. Restaurar exame
            // 7. Restaurar exame
            if (draft.exameAtual && draft.exameAtual.id) {
                console.log('Tentando restaurar exame:', draft.exameAtual.id);

                // Buscar o exame no catálogo (MOVENDO ESTA LINHA PARA CIMA)
                const exameOriginal = this.exames.find(e => e.id === draft.exameAtual.id);

                if (exameOriginal) {
                    console.log('Exame encontrado no catálogo:', exameOriginal);

                    // Restaurar dados do exame primeiro
                    this.state.exameAtual = exameOriginal;
                    this.state.dadosExame = draft.dadosExame || {};

                    // Ocultar outros exames e mostrar apenas este
                    setTimeout(() => {
                        this.selectExame(exameOriginal);

                        // Restaurar valores após delay
                        setTimeout(() => {
                            if (exameOriginal.campos && draft.dadosExame) {
                                exameOriginal.campos.forEach((campo, index) => {
                                    const fieldId = `exame-campo-${index}`;
                                    const fieldElement = document.getElementById(fieldId);

                                    if (fieldElement && draft.dadosExame[campo.id] !== undefined) {
                                        fieldElement.value = draft.dadosExame[campo.id];
                                        fieldElement.dispatchEvent(new Event('input', { bubbles: true }));
                                    }
                                });
                            }

                            this.updatePreview();
                        }, 500);
                    }, 300);
                } else {
                    console.warn('Exame não encontrado no catálogo:', draft.exameAtual.id);
                    this.showNotification('Exame não encontrado no catálogo', 'warning');
                }
            }

            // Atualizar preview
            this.updatePreview();

            this.showNotification('Rascunho restaurado com sucesso!');
            console.log('=== RESTAURAÇÃO CONCLUÍDA ===');

        } catch (error) {
            console.error('Erro ao restaurar rascunho:', error);
            this.showNotification('Erro ao restaurar rascunho', 'error');
        }
    }

    clearAll() {
        // Preservar dados do profissional se existirem
        const profissionalAtual = {
            nome: this.state.profissional.nome || '',
            registro: this.state.profissional.registro || '',
            tipoRegistro: this.state.profissional.tipoRegistro || 'CRM'
        };

        // Preservar assinatura se existir
        const assinaturaAtual = this.state.assinatura ? { ...this.state.assinatura } : null;

        // Resetar estado
        this.state = {
            exameAtual: null,
            paciente: {
                nome: '',
                documento: '',
                idade: '',
                unidade: ''
            },
            profissional: profissionalAtual, // Preserva dados do profissional
            anexos: [],
            assinatura: assinaturaAtual, // Preserva assinatura
            dadosExame: {},
            ultimoNumero: this.state.ultimoNumero,
            rascunho: null,
            isLoadingExames: false,
            draftToRestore: null,
            paginaAtual: 0
        };

        // Resetar formulários - apenas campos do paciente
        const nomePacienteInput = document.getElementById('nome-paciente');
        const documentoNumeroInput = document.getElementById('documento-numero');
        const idadeInput = document.getElementById('idade');
        const unidadeSelect = document.getElementById('unidade');
        const documentoTipoSelect = document.getElementById('documento-tipo');
        const numeroExameInput = document.getElementById('numero-exame');

        if (nomePacienteInput) nomePacienteInput.value = '';
        if (documentoNumeroInput) documentoNumeroInput.value = '';
        if (idadeInput) idadeInput.value = '';
        if (unidadeSelect) unidadeSelect.selectedIndex = 0;
        if (documentoTipoSelect) documentoTipoSelect.value = 'Passaporte';

        // MANTER dados do profissional nos inputs
        const nomeProfissionalInput = document.getElementById('nome-profissional');
        const registroNumeroInput = document.getElementById('registro-numero');

        if (nomeProfissionalInput) nomeProfissionalInput.value = this.state.profissional.nome;
        if (registroNumeroInput) registroNumeroInput.value = this.state.profissional.registro;

        // Limpar exame
        const camposExameSection = document.getElementById('campos-exame');
        if (camposExameSection) camposExameSection.style.display = 'none';

        // Mostrar todos os exames
        document.querySelectorAll('.exame-card').forEach(card => {
            card.style.display = 'flex';
            card.classList.remove('selected');
        });

        // Limpar botão "Voltar para todos os exames"
        const backButton = document.querySelector('.back-to-all-exames');
        if (backButton) {
            backButton.style.display = 'none';
        }

        // Limpar campos dinâmicos do exame
        const camposDinamicos = document.getElementById('campos-dinamicos');
        if (camposDinamicos) camposDinamicos.innerHTML = '';

        // Limpar anexos
        this.state.anexos = [];
        this.renderAnexos();

        // Atualizar assinatura simplificada
        const simpleAssinaturaImg = document.getElementById('simple-assinatura-img');
        const noSignature = document.getElementById('no-signature');
        const simpleActions = document.getElementById('simple-assinatura-actions');

        if (assinaturaAtual && assinaturaAtual.data) {
            if (simpleAssinaturaImg) {
                simpleAssinaturaImg.src = assinaturaAtual.data;
                simpleAssinaturaImg.style.display = 'block';
            }
            if (noSignature) {
                noSignature.style.display = 'none';
            }
            if (simpleActions) {
                simpleActions.style.display = 'flex';
            }
        } else {
            // Se não há assinatura, mostrar estado vazio
            if (simpleAssinaturaImg) {
                simpleAssinaturaImg.src = '';
                simpleAssinaturaImg.style.display = 'none';
            }
            if (noSignature) {
                noSignature.style.display = 'block';
            }
            if (simpleActions) {
                simpleActions.style.display = 'none';
            }
        }

        // Resetar data e hora para atual
        this.setCurrentDate();

        // Gerar novo número mantendo a sequência
        this.generateExameNumber();

        // Limpar preview
        this.updatePreview();

        // Limpar rascunho do localStorage
        this.clearDraft();

        this.showNotification('Todos os dados foram limpos (exceto profissional e assinatura)');
    }

    clearDraft() {
        localStorage.removeItem('laudoDraft');
        this.state.draftToRestore = null;
    }

    showHelp() {
        const helpModal = document.getElementById('help-modal');
        if (helpModal) {
            helpModal.classList.add('show');
        }
    }

    hideHelp() {
        const helpModal = document.getElementById('help-modal');
        if (helpModal) {
            helpModal.classList.remove('show');
        }
    }

    showNotification(message, type = 'success') {
        const notification = document.getElementById('notification');
        const messageElement = document.getElementById('notification-message');

        if (!notification || !messageElement) return;

        // Definir cor baseada no tipo
        if (type === 'error') {
            notification.style.background = 'var(--danger-color)';
        } else if (type === 'info') {
            notification.style.background = 'var(--primary-color)';
        } else {
            notification.style.background = 'var(--secondary-color)';
        }

        messageElement.textContent = message;
        notification.classList.add('show');

        // Auto-esconder após 3 segundos
        setTimeout(() => {
            notification.classList.remove('show');
        }, 3000);
    }

    updateLogoInPreview() {
        const previewLogo = document.querySelector('.laudo-preview .hospital-logo-img img');
        const exportPreviewLogo = document.querySelector('#laudo-export-preview .hospital-logo-img img');

        if (previewLogo) {
            previewLogo.src = 'assets/logo.png';
            previewLogo.alt = 'Hospital São Rafael';
        }

        if (exportPreviewLogo) {
            exportPreviewLogo.src = 'assets/logo.png';
            exportPreviewLogo.alt = 'Hospital São Rafael';
        }
    }
}

var A4_HEIGHT = 3508; // px

// Inicializar aplicação quando o DOM estiver carregado
document.addEventListener('DOMContentLoaded', () => {
    window.laudosApp = new LaudosApp();

});
