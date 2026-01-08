// Sistema de notificações
class Notification {
    constructor() {
        this.notification = document.getElementById('notification');
        this.messageElement = document.getElementById('notification-message');
    }

    show(message, type = 'success') {
        if (!this.notification || !this.messageElement) return;

        // Definir cor baseada no tipo
        const colors = {
            error: 'var(--danger-color)',
            info: 'var(--primary-color)',
            success: 'var(--secondary-color)'
        };

        this.notification.style.background = colors[type] || colors.success;
        this.messageElement.textContent = message;
        this.notification.classList.add('show');

        // Auto-esconder após 3 segundos
        setTimeout(() => {
            this.notification.classList.remove('show');
        }, 3000);
    }

    hide() {
        if (this.notification) {
            this.notification.classList.remove('show');
        }
    }
}