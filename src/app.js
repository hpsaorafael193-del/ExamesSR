// Sistema de Laudos Digitais - Hospital São Rafael
// Classe principal que orquestra todos os módulos

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
            paginaAtual: 0
        };

        this.exames = [];
        this.categorias = [];

        this.init();
    }

    async init() {
        console.log('Sistema de Laudos Digitais iniciado');

        // Inicializar módulos
        this.formHandler = new FormHandler(this);
        this.examCatalog = new ExamCatalog(this);
        this.signature = new Signature(this);
        this.attachments = new Attachments(this);
        this.draftManager = new DraftManager(this);
        this.preview = new Preview(this);
        this.pagination = new Pagination(this);
        this.export = new Export(this);
        this.notification = new Notification();

        // Carregar dados iniciais
        await this.examCatalog.loadExames();
        await this.examCatalog.loadCategories();

        // Configurações iniciais
        this.setCurrentDate();
        this.generateExameNumber();
        this.checkForDraft();

        // Configurar auto-salvamento
        this.draftManager.setupAutoSave();

        // Verificar view mobile
        this.checkMobileView();

        console.log('Sistema inicializado com sucesso');
    }

    checkMobileView() {
        const isMobile = window.innerWidth <= 768;
        if (isMobile) {
            document.querySelectorAll('.form-control').forEach(input => {
                input.addEventListener('focus', () => {
                    setTimeout(() => {
                        input.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    }, 300);
                });
            });
        }
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
        this.preview.update();
    }

    updateState(updates) {
        Object.assign(this.state, updates);
        this.preview.update();
        this.draftManager.saveDraft();
    }

    showAllExames() {
        this.examCatalog.showAll();
    }

    clearAll() {
        const profissionalAtual = { ...this.state.profissional };
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
            profissional: profissionalAtual,
            anexos: [],
            assinatura: assinaturaAtual,
            dadosExame: {},
            ultimoNumero: this.state.ultimoNumero,
            paginaAtual: 0
        };

        // Resetar formulários
        this.formHandler.clearForms();
        this.examCatalog.clearSelection();
        this.attachments.clearAnexos();
        this.signature.updateSignatureDisplay();

        // Resetar data e hora
        this.setCurrentDate();
        this.generateExameNumber();

        // Limpar rascunho
        this.draftManager.clearDraft();

        this.notification.show('Todos os dados foram limpos (exceto profissional e assinatura)', 'success');
    }

    checkForDraft() {
        this.draftManager.checkForDraft();
    }
}

// Inicializar aplicação quando o DOM estiver carregado
document.addEventListener('DOMContentLoaded', () => {
    window.laudosApp = new LaudosApp();
});