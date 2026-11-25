/**
 * Cliente HTTP Orientado a Objetos para Orion Link Frontend
 * Soporta autenticación dual: Cookie HttpOnly (`credentials: 'include'`) + Authorization Bearer
 */
export class ApiClient {
    static STORAGE_URL_KEY = 'orion_link_api_base_url';
    static STORAGE_TOKEN_KEY = 'orion_link_access_token';
    static STORAGE_USER_KEY = 'orion_link_current_user';
    static DEFAULT_BASE_URL = 'http://localhost:5000/api/v1';

    static getBaseUrl() {
        return localStorage.getItem(ApiClient.STORAGE_URL_KEY) || ApiClient.DEFAULT_BASE_URL;
    }

    static setBaseUrl(newUrl) {
        const cleaned = String(newUrl || '').trim().replace(/\/+$/, '');
        if (cleaned) {
            localStorage.setItem(ApiClient.STORAGE_URL_KEY, cleaned);
        }
        return ApiClient.getBaseUrl();
    }

    static getToken() {
        return localStorage.getItem(ApiClient.STORAGE_TOKEN_KEY) || '';
    }

    static setSession(accessToken, user) {
        if (accessToken) {
            localStorage.setItem(ApiClient.STORAGE_TOKEN_KEY, accessToken);
        }
        if (user) {
            localStorage.setItem(ApiClient.STORAGE_USER_KEY, JSON.stringify(user));
        }
    }

    static clearSession() {
        localStorage.removeItem(ApiClient.STORAGE_TOKEN_KEY);
        localStorage.removeItem(ApiClient.STORAGE_USER_KEY);
    }

    static getStoredUser() {
        try {
            const raw = localStorage.getItem(ApiClient.STORAGE_USER_KEY);
            return raw ? JSON.parse(raw) : null;
        } catch {
            return null;
        }
    }

    static async request(endpoint, { method = 'GET', body = null, headers = {} } = {}) {
        const url = `${ApiClient.getBaseUrl()}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
        const token = ApiClient.getToken();

        const requestHeaders = {
            Accept: 'application/json',
            ...headers
        };

        if (body !== null) {
            requestHeaders['Content-Type'] = 'application/json';
        }

        if (token) {
            requestHeaders.Authorization = `Bearer ${token}`;
        }

        const response = await fetch(url, {
            method,
            headers: requestHeaders,
            credentials: 'include',
            body: body !== null ? JSON.stringify(body) : undefined
        });

        const payload = await response.json().catch(() => ({}));

        if (!response.ok) {
            const errorMessage = payload.message || `Error HTTP ${response.status}`;
            const error = new Error(errorMessage);
            error.status = response.status;
            error.payload = payload;
            throw error;
        }

        return payload;
    }

    static get(endpoint) {
        return ApiClient.request(endpoint, { method: 'GET' });
    }

    static post(endpoint, body) {
        return ApiClient.request(endpoint, { method: 'POST', body });
    }

    static put(endpoint, body) {
        return ApiClient.request(endpoint, { method: 'PUT', body });
    }

    static delete(endpoint) {
        return ApiClient.request(endpoint, { method: 'DELETE' });
    }
}
