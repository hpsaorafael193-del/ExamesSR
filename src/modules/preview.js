// Renderização do preview do laudo
class Preview {
    constructor(app) {
        this.app = app;
    }

    update() {
        this.renderAllPages();
        this.app.pagination.updateControls();
        this.app.pagination.renderCurrentPage();
        this.app.draftManager.saveDraft();
    }

    renderAllPages() {
        const container = document.querySelector('.laudo-preview-container');
        const previewContainer = container?.querySelector('.laudo-preview');
        if (!previewContainer) return;

        previewContainer.innerHTML = '';
        this.renderMainPage(previewContainer);
        this.renderAttachmentPages(previewContainer);
    }

    renderMainPage(container) {
        const pagina = document.createElement('div');
        pagina.className = 'laudo-pagina';
        pagina.id = 'laudo-pagina-0';

        // Obter valores para preenchimento
        const documentoTipo = document.getElementById('documento-tipo')?.value || 'Passaporte';
        const documentoCompleto = this.app.state.paciente.documento ?
            `${documentoTipo}: ${this.app.state.paciente.documento}` : '-';

        const idadeCompleta = this.app.state.paciente.idade ? `${this.app.state.paciente.idade} anos` : '-';

        const unidadeSelect = document.getElementById('unidade');
        const unidadeText = unidadeSelect && unidadeSelect.options[unidadeSelect.selectedIndex]?.text || '-';

        const numeroExameInput = document.getElementById('numero-exame');
        const numeroExame = numeroExameInput ? numeroExameInput.value : '-';

        const dataExameInput = document.getElementById('data-exame');
        const horaExameInput = document.getElementById('hora-exame');
        const dataHora = dataExameInput ?
            `${dataExameInput.value} ${horaExameInput && horaExameInput.value ? `às ${horaExameInput.value}` : ''}` :
            '-';

        const registroProfissional = this.app.state.profissional.registro ?
            `CRM: ${this.app.state.profissional.registro}` :
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
                        <span class="field-value">${this.app.state.paciente.nome || '-'}</span>
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
                        <h3>${this.app.state.exameAtual ? this.app.state.exameAtual.nome : 'Selecione um exame no catálogo'}</h3>
                    </div>
                    <div class="exame-descricao">
                        <p>${this.app.state.exameAtual ? this.app.state.exameAtual.descricao || '' : 'Nenhum exame selecionado.'}</p>
                    </div>
                </div>

                <!-- Resultados Dinâmicos -->
                <div class="resultados-container">
                    ${this.generateExameResultsHTML()}
                </div>

                <!-- Observações -->
                <div class="observacoes-container">
                    ${this.generateExameObservacoesHTML()}
                </div>

                <!-- Indicador de Anexos -->
                ${this.app.state.anexos.length > 0 ? `
                    <div class="anexos-indicator">
                        <i class="fas fa-paperclip"></i>
                        <strong>${this.app.state.anexos.length} anexo(s)</strong> - 
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
                    ${this.app.state.exameAtual && this.app.state.dadosExame.conclusao ? `
                        <p><strong>Conclusão do Exame:</strong> ${this.app.state.dadosExame.conclusao}</p>
                    ` : ''}
                </div>
            </section>

            <!-- Rodapé com Assinatura -->
            <footer class="laudo-footer">
                <div class="laudo-divider"></div>
                <div class="assinatura-container">
                    <div class="assinatura-preview-footer">
                        ${this.app.state.assinatura && this.app.state.assinatura.data ?
                            `<img src="${this.app.state.assinatura.data}" alt="Assinatura" style="max-width: 100%; max-height: 80px;">` :
                            `<div class="assinatura-placeholder">
                                <i class="fas fa-signature"></i>
                                <p>Assinatura não disponível</p>
                            </div>`
                        }
                    </div>
                    <div class="profissional-info">
                        <div class="profissional-nome">
                            ${this.app.state.profissional.nome || '_______________________________________'}
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
        if (!this.app.state.exameAtual || !this.app.state.exameAtual.campos) return '';

        let html = '';
        this.app.state.exameAtual.campos.forEach(campo => {
            const valor = this.app.state.dadosExame[campo.id];
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
        if (!this.app.state.exameAtual || !this.app.state.exameAtual.campos) return '';

        let hasObservacoes = false;
        let observacoesHTML = '';

        this.app.state.exameAtual.campos.forEach(campo => {
            const valor = this.app.state.dadosExame[campo.id];
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

        return hasObservacoes ? `<div class="observacoes-container">${observacoesHTML}</div>` : '';
    }

    renderAttachmentPages(container) {
        this.app.state.anexos.forEach((anexo, index) => {
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
}