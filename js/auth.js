import { ApiClient } from './api.js';
import { ThemeManager } from './theme.js';
import { UIUtils } from './utils.js';

export class AuthPageController {
    static async init() {
        ThemeManager.init();
        await UIUtils.bindApiConnectionIndicator();

        if (ApiClient.hasActiveSessionFlag()) {
            try {
                await ApiClient.get('/auth/me');
                window.location.replace('./dashboard.html');
                return;
            } catch {
                ApiClient.clearSession();
            }
        }

        await AuthPageController.loadRolesDirectoryFromDatabase();
        AuthPageController.bindForms();
    }

    /**
     * Carga dinámicamente desde MySQL InnoDB (GET /api/v1/auth/roles-directory)
     * las cuentas activas representativas de cada rol RBAC, sin datos quemados en HTML.
     */
    static async loadRolesDirectoryFromDatabase() {
        const container = document.getElementById('db-roles-directory');
        if (!container) return;

        try {
            const res = await ApiClient.get('/auth/roles-directory');
            const accounts = res.data || [];

            if (accounts.length === 0) {
                container.innerHTML = '<span class="badge badge-warning">Sin cuentas registradas en MySQL.</span>';
                return;
            }

            container.innerHTML = accounts
                .map(
                    (acc, idx) => `
                    <button type="button" class="btn btn-outline btn-sm" data-db-email="${UIUtils.escapeHtml(acc.email)}" data-db-role="${UIUtils.escapeHtml(UIUtils.formatRoleLabel(acc.role))}">
                        ${idx + 1}. ${UIUtils.escapeHtml(UIUtils.formatRoleLabel(acc.role))} — ${UIUtils.escapeHtml(acc.fullName)} (${UIUtils.escapeHtml(acc.email)})
                    </button>`
                )
                .join('');

            container.querySelectorAll('[data-db-email]').forEach((btn) => {
                btn.addEventListener('click', () => {
                    const emailInput = document.getElementById('login-email');
                    const passInput = document.getElementById('login-password');
                    if (emailInput && passInput) {
                        emailInput.value = btn.getAttribute('data-db-email');
                        passInput.value = 'password';
                        UIUtils.showToast(`Cuenta cargada desde MySQL (${btn.getAttribute('data-db-role')})`, 'info');
                    }
                });
            });
        } catch (err) {
            container.innerHTML = `<span class="badge badge-critical">Error al consultar MySQL: ${UIUtils.escapeHtml(err.message)}</span>`;
        }
    }

    static bindForms() {
        const loginForm = document.getElementById('login-form');
        if (loginForm) {
            loginForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                const email = document.getElementById('login-email').value.trim();
                const password = document.getElementById('login-password').value;

                try {
                    const res = await ApiClient.post('/auth/login', { email, password });
                    ApiClient.setSession(res.accessToken, res.data);
                    UIUtils.showToast(`Bienvenido, ${res.data.fullName}`, 'success');
                    window.location.replace('./dashboard.html');
                } catch (err) {
                    UIUtils.showToast(err.message, 'error');
                }
            });
        }

        const registerForm = document.getElementById('register-form');
        if (registerForm) {
            registerForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                const payload = {
                    dpi: document.getElementById('reg-dpi').value.trim(),
                    firstName: document.getElementById('reg-first-name').value.trim(),
                    lastName: document.getElementById('reg-last-name').value.trim(),
                    phone: document.getElementById('reg-phone').value.trim(),
                    email: document.getElementById('reg-email').value.trim(),
                    password: document.getElementById('reg-password').value
                };

                try {
                    const res = await ApiClient.post('/auth/register', payload);
                    ApiClient.setSession(res.accessToken, res.data);
                    UIUtils.showToast('Cuenta de suscriptor creada en MySQL.', 'success');
                    window.location.replace('./dashboard.html');
                } catch (err) {
                    UIUtils.showToast(err.message, 'error');
                }
            });
        }
    }
}

document.addEventListener('DOMContentLoaded', () => AuthPageController.init());
