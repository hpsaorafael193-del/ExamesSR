// Auto-salvamento e rascunhos
class DraftManager {
  constructor(app) {
    this.app = app;
  }

  // Helpers: aplica valor no DOM + dispara eventos (para a app reagir como se o usuário tivesse digitado)
  setField(id, value) {
    const el = document.getElementById(id);
    if (!el) return;
    el.value = value ?? '';
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
  }

  setSelect(id, value) {
    const el = document.getElementById(id);
    if (!el) return;
    el.value = value ?? '';
    el.dispatchEvent(new Event('change', { bubbles: true }));
  }

  setupAutoSave() {
    setInterval(() => this.saveDraft(), 30000);

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

      // Campos do formulário
      numeroExame: document.getElementById('numero-exame')?.value || '',
      dataExame: document.getElementById('data-exame')?.value || '',
      horaExame: document.getElementById('hora-exame')?.value || '',
      tipoDocumento: document.getElementById('documento-tipo')?.value || 'Passaporte',

      // Prefere o valor do select (DOM), senão cai pro state
      unidade: document.getElementById('unidade')?.value || this.app.state.paciente?.unidade || ''
    };

    localStorage.setItem('laudoDraft', JSON.stringify(draft));

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
  if (!draft) return false;

  try {
    const parsedDraft = JSON.parse(draft);

    // restaura imediatamente (sem setTimeout)
    this.loadDraft(parsedDraft);
    return true;
  } catch (error) {
    console.error('Erro ao carregar rascunho:', error);
    return false;
  }
}

  loadDraft(draft) {
    try {
      // Restaurar dados básicos
      if (draft.paciente) {
        this.app.updateState({ paciente: draft.paciente });

        this.setField('nome-paciente', draft.paciente.nome || '');
        this.setField('documento-numero', draft.paciente.documento || '');
        this.setField('idade', draft.paciente.idade || '');

        if (draft.unidade !== undefined) this.setSelect('unidade', draft.unidade);
        if (draft.tipoDocumento !== undefined) this.setSelect('documento-tipo', draft.tipoDocumento);
      }

      if (draft.profissional) {
        this.app.updateState({ profissional: draft.profissional });

        this.setField('nome-profissional', draft.profissional.nome || '');
        this.setField('registro-numero', draft.profissional.registro || '');
      }

      // Restaurar número do exame
      if (draft.numeroExame) {
        this.setField('numero-exame', draft.numeroExame);

        const match = String(draft.numeroExame).match(/LAUDO-(\d+)/);
        if (match && match[1]) {
          const numero = parseInt(match[1], 10);
          if (!isNaN(numero) && numero > this.app.state.ultimoNumero) {
            this.app.state.ultimoNumero = numero;
            localStorage.setItem('ultimoNumeroExame', numero);
          }
        }
      }

      // Restaurar data e hora
      if (draft.dataExame) this.setField('data-exame', draft.dataExame);
      if (draft.horaExame) this.setField('hora-exame', draft.horaExame);

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

      // Restaurar exame + campos dinâmicos
      if (draft.exameAtual && draft.exameAtual.id) {
        const exameOriginal = this.app.exames.find(e => e.id === draft.exameAtual.id);
        if (exameOriginal) {
          setTimeout(() => {
            this.app.examCatalog.selectExame(exameOriginal);

            setTimeout(() => {
              if (exameOriginal.campos && draft.dadosExame) {
                // aplica valores nos inputs dinâmicos + dispara eventos + atualiza state via updateState
                exameOriginal.campos.forEach((campo, index) => {
                  const fieldId = `exame-campo-${index}`;
                  const fieldElement = document.getElementById(fieldId);

                  if (!fieldElement) return;
                  if (draft.dadosExame[campo.id] === undefined) return;

                  const v = draft.dadosExame[campo.id];

                  fieldElement.value = v ?? '';
                  fieldElement.dispatchEvent(new Event('input', { bubbles: true }));
                  fieldElement.dispatchEvent(new Event('change', { bubbles: true }));

                  this.app.updateState({
                    dadosExame: { ...this.app.state.dadosExame, [campo.id]: v }
                  });
                });
              }

              this.app.preview.update();
            }, 500);
          }, 300);
        }
      }

      // Garante atualização geral mesmo se não houver exame selecionado
      requestAnimationFrame(() => {
        this.app.preview.update();
        this.app.pagination?.renderCurrentPage?.();
      });

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
