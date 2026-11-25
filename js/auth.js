import { ApiClient } from './api.js';
import { ThemeManager } from './theme.js';
import { UIUtils } from './utils.js';

export class AuthPageController {
    static async init() {
        ThemeManager.init();
        await UIUtils.bindApiConnectionIndicator();

        // Si el usuario llega a auth.html tras cerrar sesión o desde otra vista,
        // verificamos si tiene una sesión real válida en el servidor.
        if (ApiClient.hasActiveSessionFlag()) {
            try {
                await ApiClient.get('/auth/me');
                window.location.replace('./dashboard.html');
                return;
            } catch {
                ApiClient.clearSession();
            }
        }

        AuthPageController.bindQuickRoleButtons();
        AuthPageController.bindForms();
    }

    static bindQuickRoleButtons() {
        document.querySelectorAll('[data-demo-email]').forEach((btn) => {
            btn.addEventListener('click', () => {
                const emailInput = document.getElementById('login-email');
                const passInput = document.getElementById('login-password');
                if (emailInput && passInput) {
                    emailInput.value = btn.getAttribute('data-demo-email');
                    passInput.value = 'password';
                    UIUtils.showToast(`Credenciales cargadas para rol: ${btn.getAttribute('data-demo-role')}`, 'info');
                }
            });
        });
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
                    UIUtils.showToast('Cuenta de suscriptor creada correctamente.', 'success');
                    window.location.replace('./dashboard.html');
                } catch (err) {
                    UIUtils.showToast(err.message, 'error');
                }
            });
        }
    }
}

document.addEventListener('DOMContentLoaded', () => AuthPageController.init());
