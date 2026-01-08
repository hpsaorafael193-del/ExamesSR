// Assinatura digital
class Signature {
    constructor(app) {
        this.app = app;
        this.init();
    }

    init() {
        this.input = document.getElementById('simple-assinatura-input');
        this.uploadArea = document.querySelector('.simple-upload-area');

        if (!this.input) return;

        if (this.uploadArea) {
            this.uploadArea.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.input.click();
            });
        }

        this.input.addEventListener('change', (e) => {
            if (e.target.files && e.target.files[0]) {
                this.uploadSimpleSignature(e.target.files[0]);
            }
        });

        if (this.app.state.assinatura && this.app.state.assinatura.data) {
            this.showSimpleSignature(this.app.state.assinatura.data);
        }
    }

    uploadSimpleSignature(file) {
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
                this.app.updateState({
                    assinatura: {
                        data: dataUrl,
                        type: 'uploaded',
                        timestamp: new Date().toISOString(),
                        originalName: file.name
                    }
                });

                // Mostrar na UI
                this.showSimpleSignature(dataUrl);

                this.app.notification.show('Assinatura carregada com sucesso!');
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

    removeSignature() {
        this.app.updateState({ assinatura: null });

        const imgElement = document.getElementById('simple-assinatura-img');
        const noSignature = document.getElementById('no-signature');

        if (imgElement) {
            imgElement.src = '';
            imgElement.style.display = 'none';
        }

        if (noSignature) {
            noSignature.style.display = 'block';
        }

        this.app.notification.show('Assinatura removida');
    }

    updateSignatureDisplay() {
        if (this.app.state.assinatura && this.app.state.assinatura.data) {
            this.showSimpleSignature(this.app.state.assinatura.data);
        } else {
            const imgElement = document.getElementById('simple-assinatura-img');
            const noSignature = document.getElementById('no-signature');
            const actions = document.getElementById('simple-assinatura-actions');

            if (imgElement) {
                imgElement.src = '';
                imgElement.style.display = 'none';
            }

            if (noSignature) {
                noSignature.style.display = 'block';
            }

            if (actions) {
                actions.style.display = 'none';
            }
        }
    }
}