// Exportação PNG
class Export {
    constructor(app) {
        this.app = app;
        this.setupEventListeners();
    }

    setupEventListeners() {
        document.getElementById('export-png').addEventListener('click', async (e) => {
            e.preventDefault();
            e.stopPropagation();

            // Validações
            if (!this.app.state.paciente.nome) {
                this.app.notification.show('Preencha o nome do paciente', 'error');
                return;
            }

            if (!this.app.state.profissional.nome) {
                this.app.notification.show('Preencha o nome do profissional', 'error');
                return;
            }

            if (!this.app.state.exameAtual) {
                this.app.notification.show('Selecione um exame', 'error');
                return;
            }

            try {
                await this.exportLaudo();
            } catch (error) {
                console.error('Erro ao exportar:', error);
                this.app.notification.show('Falha ao exportar. Tente novamente.', 'error');
            }
        });
    }

    async exportLaudo() {
        if (typeof html2canvas === 'undefined') {
            this.app.notification.show('Erro: Biblioteca html2canvas não carregada', 'error');
            return;
        }

        this.app.notification.show('Gerando imagem do laudo...', 'info');

        // Ir para página principal
        this.app.state.paginaAtual = 0;
        this.app.pagination.renderCurrentPage();

        await new Promise(resolve => setTimeout(resolve, 500));

        const original = document.querySelector('.laudo-preview');
        if (!original) {
            this.app.notification.show('Laudo não encontrado', 'error');
            return;
        }

        // Verificar dimensões
        if (original.offsetWidth === 0 || original.offsetHeight === 0) {
            original.style.transform = 'scale(1)';
            original.style.transformOrigin = 'top left';
            original.style.width = '794px';
            original.style.height = 'auto';
            original.style.minHeight = '1123px';
            original.style.display = 'block';
            original.style.visibility = 'visible';
            original.style.opacity = '1';
            original.style.position = 'relative';
            original.style.overflow = 'visible';

            original.offsetHeight;
            await new Promise(resolve => setTimeout(resolve, 300));
        }

        // Tratar imagens problemáticas
        const images = original.querySelectorAll('img');
        images.forEach(img => {
            if (!img.complete || img.naturalWidth === 0) {
                img.style.display = 'none';
                const fallback = document.createElement('div');
                fallback.className = 'image-fallback';
                fallback.innerHTML = '<i class="fas fa-image"></i>';
                fallback.style.cssText = `
                    width: 100px;
                    height: 100px;
                    background: #f0f0f0;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    color: #666;
                    font-size: 24px;
                    border: 1px dashed #ccc;
                `;
                img.parentNode.insertBefore(fallback, img.nextSibling);
            }
        });

        // Gerar canvas
        const canvas = await html2canvas(original, {
            scale: 1.5,
            backgroundColor: '#ffffff',
            useCORS: true,
            allowTaint: false,
            logging: false,
            width: original.offsetWidth,
            height: original.scrollHeight,
            windowWidth: original.offsetWidth,
            windowHeight: original.scrollHeight,
            imageTimeout: 10000,
            ignoreElements: (element) => {
                return element.offsetWidth === 0 ||
                    element.offsetHeight === 0 ||
                    element.style.display === 'none';
            }
        });

        if (canvas.width === 0 || canvas.height === 0) {
            throw new Error('Canvas foi gerado com dimensões zero');
        }

        // Criar download
        const pacienteNome = this.app.state.paciente.nome || 'Paciente';
        const exameNome = this.app.state.exameAtual?.nome || 'Exame';
        const filename = `Laudo_${pacienteNome.replace(/\s+/g, '_')}_${exameNome.replace(/\s+/g, '_')}_${new Date().getTime()}.png`;

        const link = document.createElement('a');
        link.download = filename;
        link.href = canvas.toDataURL('image/png');
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        this.app.notification.show('✅ Laudo exportado com sucesso!');
    }
}