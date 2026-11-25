import { ApiClient } from './api.js';

/**
 * Utilidades Orientadas a Objetos para Notificaciones, Formateo Óptico dBm y Estado de Red
 */
export class UIUtils {
    /**
     * Sanitiza cadenas dinámicas para prevenir vulnerabilidades DOM XSS (OWASP A03)
     */
    static escapeHtml(value) {
        if (value === null || value === undefined) return '';
        return String(value)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    static showToast(message, type = 'info') {
        let container = document.getElementById('toast-container');
        if (!container) {
            container = document.createElement('div');
            container.id = 'toast-container';
            container.className = 'toast-container';
            document.body.appendChild(container);
        }

        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.textContent = message;
        container.appendChild(toast);

        setTimeout(() => {
            toast.remove();
        }, 4500);
    }

    static formatOpticalBadge(rxPowerDbm, status = '') {
        const rx = Number(rxPowerDbm);
        if (status === 'los' || rx <= -28.0) {
            return `<span class="badge badge-critical">LOS · ${rx.toFixed(2)} dBm</span>`;
        }
        if (status === 'high_attenuation' || rx < -24.5) {
            return `<span class="badge badge-warning">ATENUACIÓN · ${rx.toFixed(2)} dBm</span>`;
        }
        return `<span class="badge badge-optimal">ÓPTIMO · ${rx.toFixed(2)} dBm</span>`;
    }

    static formatRoleLabel(role) {
        const labels = {
            admin: 'Admin / Ingeniero NOC',
            support_agent: 'Agente de Soporte N1/N2',
            field_tech: 'Técnico de Cuadrilla en Campo',
            customer: 'Cliente Suscriptor FTTH'
        };
        return labels[role] || role;
    }

    static async bindApiConnectionIndicator() {
        const indicators = document.querySelectorAll('[data-api-indicator]');
        indicators.forEach((pill) => {
            pill.addEventListener('click', () => {
                const current = ApiClient.getBaseUrl();
                const updated = window.prompt('Configurar URL base de Orion Link Backend (/api/v1):', current);
                if (updated) {
                    ApiClient.setBaseUrl(updated);
                    UIUtils.checkHealth();
                }
            });
        });
        await UIUtils.checkHealth();
    }

    static async checkHealth() {
        const dots = document.querySelectorAll('[data-api-dot]');
        const texts = document.querySelectorAll('[data-api-text]');
        try {
            const res = await ApiClient.get('/health');
            dots.forEach((d) => { d.className = 'status-dot online'; });
            texts.forEach((t) => { t.textContent = `API Conectada (v${res.version || '1.0.0'})`; });
            return true;
        } catch {
            dots.forEach((d) => { d.className = 'status-dot offline'; });
            texts.forEach((t) => { t.textContent = 'API Desconectada (Clic para URL)'; });
            return false;
        }
    }
}
