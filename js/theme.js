/**
 * Gestor Orientado a Objetos para el Tema Visual Bitema (Modo Claro / Modo Noche NOC)
 */
export class ThemeManager {
    static STORAGE_KEY = 'orion_link_theme';

    static init() {
        const saved = localStorage.getItem(ThemeManager.STORAGE_KEY);
        const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
        const initialTheme = saved || (prefersDark ? 'dark' : 'light');
        ThemeManager.apply(initialTheme);

        document.querySelectorAll('[data-action="toggle-theme"]').forEach((btn) => {
            btn.addEventListener('click', () => ThemeManager.toggle());
        });
    }

    static apply(theme) {
        const normalized = theme === 'dark' ? 'dark' : 'light';
        document.documentElement.setAttribute('data-theme', normalized);
        localStorage.setItem(ThemeManager.STORAGE_KEY, normalized);

        document.querySelectorAll('[data-action="toggle-theme"]').forEach((btn) => {
            btn.textContent = normalized === 'dark' ? 'Modo Día' : 'Modo Noche NOC';
        });
    }

    static toggle() {
        const current = document.documentElement.getAttribute('data-theme') || 'light';
        ThemeManager.apply(current === 'dark' ? 'light' : 'dark');
    }
}
