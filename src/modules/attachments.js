// Anexos e imagens
class Attachments {
    constructor(app) {
        this.app = app;
        this.init();
    }

    init() {
        // Upload de anexos
        document.getElementById('btn-select-images').addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            document.getElementById('file-input').click();
        });

        document.getElementById('file-input').addEventListener('change', (e) => {
            this.handleAnexoUpload(e.target.files);
        });

        // Drag and drop
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
    }

    handleAnexoUpload(files) {
        if (!files || files.length === 0) return;

        Array.from(files).forEach(file => {
            if (!file.type.match('image.*')) {
                this.app.notification.show('Apenas imagens são permitidas', 'error');
                return;
            }

            if (file.size > 10 * 1024 * 1024) {
                this.app.notification.show('Imagem muito grande (máx: 10MB)', 'error');
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
                    numero: this.app.state.anexos.length + 1
                };

                this.app.updateState({ 
                    anexos: [...this.app.state.anexos, anexo] 
                });

                this.renderAnexos();
                this.app.notification.show(`Anexo "${file.name}" adicionado`);
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

        if (this.app.state.anexos.length === 0) {
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

        this.app.state.anexos.forEach((anexo, index) => {
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

        // Adicionar event listeners
        document.querySelectorAll('.anexo-remove').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                e.preventDefault();
                const index = parseInt(e.target.closest('.anexo-remove').dataset.index);
                this.removeAnexo(index);
            });
        });

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
        const newAnexos = [...this.app.state.anexos];
        const removed = newAnexos.splice(index, 1)[0];

        // Renumerar
        newAnexos.forEach((anexo, i) => {
            anexo.numero = i + 1;
        });

        this.app.updateState({ anexos: newAnexos });
        this.renderAnexos();
        this.app.notification.show(`Anexo "${removed.name}" removido`);
    }

    previewAnexo(index) {
        const anexo = this.app.state.anexos[index];
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

    clearAnexos() {
        this.app.updateState({ anexos: [] });
        this.renderAnexos();
    }
}