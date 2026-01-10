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

        // Obter dimensões do elemento (já em mm no CSS)
        // Converter mm para pixels (1mm = 3.78 pixels a 96 DPI)
        const mmToPx = 3.78;
        const targetWidth = 210 * mmToPx; // 210mm em pixels
        const targetHeight = 297 * mmToPx; // 297mm em pixels

        try {
            // Forçar dimensões exatas no elemento antes da captura
            original.style.width = targetWidth + 'px';
            original.style.height = 'auto';
            original.style.minHeight = targetHeight + 'px';
            original.style.padding = (8 * mmToPx) + 'px'; // 8mm em pixels
            original.style.boxSizing = 'border-box';
            original.style.display = 'block';
            original.style.visibility = 'visible';
            original.style.position = 'relative';
            original.style.overflow = 'visible';
            original.style.transform = 'scale(1)';
            original.style.transformOrigin = 'top left';
            original.style.margin = '0 auto';

            // Aguardar reflow
            await new Promise(resolve => setTimeout(resolve, 100));

            // Capturar com html2canvas
            const canvas = await html2canvas(original, {
                scale: 2, // Alta qualidade
                backgroundColor: '#ffffff',
                useCORS: true,
                allowTaint: true, // Permite imagens externas
                logging: false,
                width: targetWidth,
                height: original.scrollHeight || targetHeight,
                windowWidth: targetWidth,
                windowHeight: targetHeight,
                imageTimeout: 10000,
                removeContainer: true,
                foreignObjectRendering: false, // Mais compatível
                onclone: (clonedDoc, element) => {
                    // Garantir estilos no clone também
                    element.style.width = targetWidth + 'px';
                    element.style.height = 'auto';
                    element.style.minHeight = targetHeight + 'px';
                    element.style.padding = (8 * mmToPx) + 'px';
                    element.style.boxSizing = 'border-box';
                    element.style.display = 'block';
                    element.style.visibility = 'visible';
                    element.style.position = 'relative';
                    element.style.overflow = 'visible';
                    element.style.margin = '0 auto';
                    
                    // Aplicar estilos críticos aos filhos
                    const sections = element.querySelectorAll('.laudo-section');
                    sections.forEach(section => {
                        section.style.display = 'block';
                        section.style.marginBottom = (15 * mmToPx) + 'px';
                        section.style.width = '100%';
                    });
                    
                    const grids = element.querySelectorAll('.laudo-grid');
                    grids.forEach(grid => {
                        grid.style.display = 'grid';
                        grid.style.width = '100%';
                    });
                    
                    const containers = element.querySelectorAll('.laudo-header, .laudo-footer, .exame-info');
                    containers.forEach(container => {
                        container.style.display = 'block';
                        container.style.width = '100%';
                    });
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
            link.href = canvas.toDataURL('image/png', 1.0);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

            // Restaurar estilos originais
            original.style.width = '';
            original.style.height = '';
            original.style.minHeight = '';
            original.style.padding = '';
            original.style.transform = '';
            
            this.app.notification.show('✅ Laudo exportado com sucesso!');
            
        } catch (error) {
            console.error('Erro ao exportar:', error);
            this.app.notification.show('Falha ao exportar: ' + error.message, 'error');
        }
    }
}
