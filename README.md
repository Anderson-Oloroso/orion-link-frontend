# Orion Link — Frontend (`orion-link-frontend`)

Interfaz web desacoplada para **Orion Link**, Sistema CRM de Soporte Técnico y Operaciones ISP (FTTH), construida con **HTML5 semántico**, **CSS3 Bitema (Modo Claro / Modo Noche NOC)** y **JavaScript Vanilla modular (ES Modules 100% Orientado a Objetos)**, conectada en tiempo real con `orion-link-backend`.

## Objetivo

Brindar una experiencia rápida, accesible, *Mobile-First* y sin dependencias pesadas para los **4 roles autenticados** del ecosistema ISP (`admin`, `support_agent`, `field_tech`, `customer`), con proyección directa a despliegue en **Netlify** o **GitHub Pages**.

## Estructura del Proyecto

```text
orion-link-frontend/
├── css/
│   └── styles.css                  # Sistema de diseño bitema, tokens CSS y semáforo óptico dBm
├── docs/
│   └── diagrams/                   # Diagramas editoriales HTML/SVG (Arquitectura y Flujo de 4 Roles)
├── js/
│   ├── api.js                      # Clase ApiClient (fetch wrapper con Cookie HttpOnly + Bearer)
│   ├── app.js                      # Clase DashboardApp (orquestador multi-rol RBAC)
│   ├── auth.js                     # Clase AuthPageController (login, registro y selector rápido de 4 roles)
│   ├── landing.js                  # Clase LandingController (monitor público de Cajas NAP y planes FTTH)
│   ├── theme.js                    # Clase ThemeManager (Modo Claro / Modo Noche NOC)
│   └── utils.js                    # Clase UIUtils (Escape anti-XSS, Toasts, badges dBm y healthcheck)
├── pages/
│   ├── auth.html                   # Portal de inicio de sesión y registro con DPI
│   └── dashboard.html              # Consola operativa adaptativa según rol
├── .gitignore
├── index.html                      # Landing page y monitor público de red FTTH
├── netlify.toml                    # Configuración lista para despliegue en Netlify
└── README.md
```

## Cómo Ejecutarlo

1. Asegúrese de que `orion-link-backend` esté corriendo en `http://localhost:5000/api/v1`.
2. Sirva la carpeta `orion-link-frontend` con cualquier servidor estático local:
   ```bash
   npx serve -l 5500 .
   ```
3. Abra `http://localhost:5500` en su navegador. Puede cambiar la URL de la API en cualquier momento haciendo clic en el indicador superior **`API Conectada`**.

## Autoría

- **Autor:** Henrik Anderson Oloroso García ([Anderson-Oloroso](https://github.com/Anderson-Oloroso)).
