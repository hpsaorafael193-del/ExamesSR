// Manipulação de formulários
class FormHandler {
    constructor(app) {
        this.app = app;
        this.setupEventListeners();
    }

    setupEventListeners() {
        // Dados do Paciente
        document.getElementById('nome-paciente').addEventListener('input', (e) => {
            this.app.updateState({ paciente: { ...this.app.state.paciente, nome: e.target.value } });
        });

        document.getElementById('documento-numero').addEventListener('input', (e) => {
            this.app.updateState({ paciente: { ...this.app.state.paciente, documento: e.target.value } });
        });

        document.getElementById('idade').addEventListener('input', (e) => {
            this.app.updateState({ paciente: { ...this.app.state.paciente, idade: e.target.value } });
        });

        document.getElementById('documento-tipo').addEventListener('change', (e) => {
            this.app.updateState({ paciente: { ...this.app.state.paciente, documentoTipo: e.target.value } });
        });

        document.getElementById('tipoSanguineo').addEventListener('change', (e) => {
            this.app.updateState({ paciente: { ...this.app.state.paciente, tipoSanguineo: e.target.value } });
        });

        // Dados do Profissional
        document.getElementById('nome-profissional').addEventListener('input', (e) => {
            this.app.updateState({ profissional: { ...this.app.state.profissional, nome: e.target.value } });
        });

        document.getElementById('registro-numero').addEventListener('input', (e) => {
            this.app.updateState({ profissional: { ...this.app.state.profissional, registro: e.target.value } });
        });

        // Gerar número do exame
        document.getElementById('gerar-numero').addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.app.generateExameNumber();
        });

        // Busca de exames
        document.getElementById('busca-exame').addEventListener('input', (e) => {
            this.app.examCatalog.filterExames(e.target.value);
        });

        // Atualizar preview
        document.getElementById('atualizar-preview').addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.app.preview.update();
            this.app.notification.show('Pré-visualização atualizada');
        });

        // Limpar tudo
        document.getElementById('limpar-tudo').addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            if (confirm('Tem certeza que deseja limpar todos os dados? Isso não pode ser desfeito.')) {
                this.app.clearAll();
            }
        });

        // Fechar exame
        document.getElementById('fechar-exame').addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.app.examCatalog.closeExame();
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

        window.addEventListener('click', (e) => {
            const modal = document.getElementById('help-modal');
            if (e.target === modal) {
                this.hideHelp();
            }
        });
    }

    clearForms() {
        // Resetar campos do paciente
        document.getElementById('nome-paciente').value = '';
        document.getElementById('documento-numero').value = '';
        document.getElementById('idade').value = '';
        document.getElementById('tipoSanguineo').selectedIndex = 0;
        document.getElementById('documento-tipo').value = 'Passaporte';

        // Manter dados do profissional
        document.getElementById('nome-profissional').value = this.app.state.profissional.nome || '';
        document.getElementById('registro-numero').value = this.app.state.profissional.registro || '';
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
}