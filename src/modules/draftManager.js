// Auto-salvamento e rascunhos
class DraftManager {
    constructor(app) {
        this.app = app;
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
            paciente: this.app.state.paciente,
            profissional: this.app.state.profissional,
            exameAtual: this.app.state.exameAtual,
            dadosExame: this.app.state.dadosExame,
            anexos: this.app.state.anexos.slice(0, 10),
            assinatura: this.app.state.assinatura,
            timestamp: new Date().toISOString(),
            numeroExame: document.getElementById('numero-exame')?.value || '',
            dataExame: document.getElementById('data-exame')?.value || '',
            horaExame: document.getElementById('hora-exame')?.value || '',
            tipoDocumento: document.getElementById('documento-tipo')?.value || 'Passaporte',
            unidade: this.app.state.paciente.unidade || ''
        };

        localStorage.setItem('laudoDraft', JSON.stringify(draft));

        // Atualizar status
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
            try {
                const parsedDraft = JSON.parse(draft);
                
                // Aguardar carregamento dos exames
                setTimeout(() => {
                    this.loadDraft(parsedDraft);
                }, 1000);
            } catch (error) {
                console.error('Erro ao carregar rascunho:', error);
            }
        }
    }

    loadDraft(draft) {
        try {
            // Restaurar dados básicos
            if (draft.paciente) {
                this.app.updateState({ paciente: draft.paciente });
                document.getElementById('nome-paciente').value = draft.paciente.nome || '';
                document.getElementById('documento-numero').value = draft.paciente.documento || '';
                document.getElementById('idade').value = draft.paciente.idade || '';
                
                if (draft.unidade) {
                    document.getElementById('unidade').value = draft.unidade;
                }
                if (draft.tipoDocumento) {
                    document.getElementById('documento-tipo').value = draft.tipoDocumento;
                }
            }

            if (draft.profissional) {
                this.app.updateState({ profissional: draft.profissional });
                document.getElementById('nome-profissional').value = draft.profissional.nome || '';
                document.getElementById('registro-numero').value = draft.profissional.registro || '';
            }

            // Restaurar número do exame
            if (draft.numeroExame) {
                document.getElementById('numero-exame').value = draft.numeroExame;
                const match = draft.numeroExame.match(/LAUDO-(\d+)/);
                if (match && match[1]) {
                    const numero = parseInt(match[1]);
                    if (!isNaN(numero) && numero > this.app.state.ultimoNumero) {
                        this.app.state.ultimoNumero = numero;
                        localStorage.setItem('ultimoNumeroExame', numero);
                    }
                }
            }

            // Restaurar data e hora
            if (draft.dataExame) {
                document.getElementById('data-exame').value = draft.dataExame;
            }
            if (draft.horaExame) {
                document.getElementById('hora-exame').value = draft.horaExame;
            }

            // Restaurar anexos
            if (draft.anexos) {
                this.app.updateState({ anexos: draft.anexos });
                this.app.attachments.renderAnexos();
            }

            // Restaurar assinatura
            if (draft.assinatura && draft.assinatura.data) {
                this.app.updateState({ assinatura: draft.assinatura });
                setTimeout(() => {
                    this.app.signature.showSimpleSignature(draft.assinatura.data);
                }, 100);
            }

            // Restaurar exame
            if (draft.exameAtual && draft.exameAtual.id) {
                const exameOriginal = this.app.exames.find(e => e.id === draft.exameAtual.id);
                if (exameOriginal) {
                    setTimeout(() => {
                        this.app.examCatalog.selectExame(exameOriginal);
                        
                        setTimeout(() => {
                            if (exameOriginal.campos && draft.dadosExame) {
                                exameOriginal.campos.forEach((campo, index) => {
                                    const fieldId = `exame-campo-${index}`;
                                    const fieldElement = document.getElementById(fieldId);
                                    
                                    if (fieldElement && draft.dadosExame[campo.id] !== undefined) {
                                        fieldElement.value = draft.dadosExame[campo.id];
                                        this.app.state.dadosExame[campo.id] = draft.dadosExame[campo.id];
                                    }
                                });
                            }
                            this.app.preview.update();
                        }, 500);
                    }, 300);
                }
            }

            this.app.notification.show('Rascunho restaurado com sucesso!');
        } catch (error) {
            console.error('Erro ao restaurar rascunho:', error);
            this.app.notification.show('Erro ao restaurar rascunho', 'error');
        }
    }

    clearDraft() {
        localStorage.removeItem('laudoDraft');
    }
}