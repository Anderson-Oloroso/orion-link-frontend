import { UIUtils } from './utils.js';

/**
 * Jerarquía Polimórfica Orientada a Objetos para las 4 Experiencias por Rol en Arquitectura Multipágina
 * Cada rol hereda de RoleWorkspaceStrategy y define sus páginas HTML permitidas (allowedPages),
 * su menú de navegación superior/lateral, sus KPIs y su centro de mando ejecutivo en dashboard.html.
 */
export class RoleWorkspaceStrategy {
    static PAGE_CATALOG = [
        { id: 'dashboard', file: './dashboard.html', label: 'Resumen Ejecutivo' },
        { id: 'topology', file: './topology.html', label: 'Topología OLT & NAPs' },
        { id: 'outages', file: './outages.html', label: 'Fallas Masivas FTTH' },
        { id: 'contracts', file: './contracts.html', label: 'Contratos & Diagnóstico' },
        { id: 'tickets', file: './tickets.html', label: 'Tickets & SLA' },
        { id: 'dispatches', file: './dispatches.html', label: 'Despacho Cuadrillas' },
        { id: 'users', file: './users.html', label: 'Usuarios & RBAC' }
    ];

    get roleKey() {
        return 'base';
    }

    get badgeText() {
        return 'ORION LINK';
    }

    get workspaceTitle() {
        return 'Consola Operativa Orion Link';
    }

    get workspaceSubtitle() {
        return '';
    }

    get allowedPages() {
        return ['dashboard', 'contracts'];
    }

    getNavigationItems() {
        const allowed = new Set(this.allowedPages);
        return RoleWorkspaceStrategy.PAGE_CATALOG.filter((item) => allowed.has(item.id));
    }

    isPageAllowed(pageId) {
        return this.allowedPages.includes(pageId);
    }

    renderKpis(_state) {
        return '';
    }

    renderRoleExclusiveWidget(_state) {
        return '';
    }

    renderModuleDirectoryCards() {
        return '';
    }

    static createForRole(role) {
        switch (role) {
            case 'admin':
                return new AdminNocWorkspace();
            case 'support_agent':
                return new SupportAgentWorkspace();
            case 'field_tech':
                return new FieldTechWorkspace();
            case 'customer':
            default:
                return new CustomerPortalWorkspace();
        }
    }
}

/**
 * 1. ADMIN / NOC: Centro de Operaciones de Red y Gobernanza Total FTTH
 */
export class AdminNocWorkspace extends RoleWorkspaceStrategy {
    get roleKey() {
        return 'admin';
    }

    get badgeText() {
        return 'ROL 1 · ADMIN & INGENIERÍA NOC';
    }

    get workspaceTitle() {
        return 'Centro de Control de Red (NOC) & Gobernanza FTTH';
    }

    get workspaceSubtitle() {
        return 'Supervisión global de Nodos OLT, Cajas NAP, correlación de Fallas Masivas FTTH, auditoría de usuarios y despacho de cuadrillas.';
    }

    get allowedPages() {
        return ['dashboard', 'topology', 'outages', 'contracts', 'tickets', 'dispatches', 'users'];
    }

    renderKpis({ summary }) {
        return `
            <article class="kpi-card">
                <p class="kpi-label">Contratos FTTH Activos</p>
                <p class="kpi-value">${summary.activeContracts ?? 0}</p>
            </article>
            <article class="kpi-card">
                <p class="kpi-label">ONUs en Señal Óptima</p>
                <p class="kpi-value" style="color: var(--optical-optimal);">${summary.onusOnline ?? 0}</p>
            </article>
            <article class="kpi-card">
                <p class="kpi-label">ONUs Atenuadas (Warning)</p>
                <p class="kpi-value" style="color: var(--optical-warning);">${summary.onusHighAttenuation ?? 0}</p>
            </article>
            <article class="kpi-card">
                <p class="kpi-label">ONUs en Corte (LOS -40dBm)</p>
                <p class="kpi-value" style="color: var(--optical-critical);">${summary.onusLosCritical ?? 0}</p>
            </article>
            <article class="kpi-card">
                <p class="kpi-label">Fallas Masivas Activas</p>
                <p class="kpi-value" style="color: var(--optical-critical);">${summary.activeMassOutages ?? 0}</p>
            </article>
            <article class="kpi-card">
                <p class="kpi-label">Cuadrillas Disponibles</p>
                <p class="kpi-value">${summary.availableCrews ?? 0}</p>
            </article>
        `;
    }

    renderRoleExclusiveWidget({ naps }) {
        const criticalNaps = (naps || []).filter((n) => n.status !== 'operational' || n.onusLosCritical > 0);
        return `
            <div class="card" style="border-left: 4px solid var(--brand-accent);">
                <div class="card-header">
                    <h2 class="card-title">Radar NOC de Planta Externa (Salud de Cajas NAP &amp; Splitters)</h2>
                    <span class="badge badge-info">EXCLUSIVO ADMIN / NOC</span>
                </div>
                <p style="font-size: 0.88rem; color: var(--text-secondary); margin-bottom: 0.75rem;">
                    Como <strong>Admin / Ingeniero NOC</strong> dispones de acceso directo a las 6 vistas operativas desacopladas: Topología OLT/NAP, Fallas Masivas, Contratos &amp; Diagnóstico, Tickets, Despacho de Cuadrillas y Auditoría RBAC de Usuarios.
                </p>
                <div style="display:flex;flex-wrap:wrap;gap:0.75rem;">
                    <span class="badge badge-optimal">Cajas NAP Operativas: ${(naps || []).length - criticalNaps.length}</span>
                    <span class="badge badge-critical">Cajas NAP con Alerta/Corte: ${criticalNaps.length}</span>
                </div>
            </div>
        `;
    }

    renderModuleDirectoryCards() {
        return `
            <article class="card">
                <div class="card-header"><h3 class="card-title">1. Topología OLT &amp; Cajas NAP</h3><span class="badge badge-info">Planta Externa</span></div>
                <p style="font-size:0.86rem;color:var(--text-secondary);margin-bottom:0.9rem;">Inventario físico de cabeceras OLT, ocupación de splitters 1:8 / 1:16 y distribución de salud óptica por Caja NAP.</p>
                <a href="./topology.html" class="btn btn-primary btn-sm">Abrir Vista de Topología</a>
            </article>
            <article class="card">
                <div class="card-header"><h3 class="card-title">2. Fallas Masivas FTTH</h3><span class="badge badge-critical">Correlación NOC</span></div>
                <p style="font-size:0.86rem;color:var(--text-secondary);margin-bottom:0.9rem;">Declaración manual y resolución de incidentes masivos por corte de fibra troncal o caída de Caja NAP.</p>
                <a href="./outages.html" class="btn btn-primary btn-sm">Gestionar Fallas Masivas</a>
            </article>
            <article class="card">
                <div class="card-header"><h3 class="card-title">3. Contratos &amp; Diagnóstico</h3><span class="badge badge-optimal">Telemetría GPON</span></div>
                <p style="font-size:0.86rem;color:var(--text-secondary);margin-bottom:0.9rem;">Ejecución de <code>sp_run_remote_diagnostic</code>, inyección de lecturas dBm de prueba y bitácora histórica.</p>
                <a href="./contracts.html" class="btn btn-primary btn-sm">Abrir Diagnóstico Óptico</a>
            </article>
            <article class="card">
                <div class="card-header"><h3 class="card-title">4. Tickets de Soporte &amp; SLA</h3><span class="badge badge-warning">Helpdesk N1/N2</span></div>
                <p style="font-size:0.86rem;color:var(--text-secondary);margin-bottom:0.9rem;">Bandeja de tickets técnicos, asociación con fallas masivas y resolución remota de primer nivel.</p>
                <a href="./tickets.html" class="btn btn-primary btn-sm">Abrir Bandeja de Tickets</a>
            </article>
            <article class="card">
                <div class="card-header"><h3 class="card-title">5. Despacho de Cuadrillas</h3><span class="badge badge-info">Operaciones Campo</span></div>
                <p style="font-size:0.86rem;color:var(--text-secondary);margin-bottom:0.9rem;">Asignación de unidades móviles y cierre certificado con potencia óptica restaurada (-14 a -25 dBm).</p>
                <a href="./dispatches.html" class="btn btn-primary btn-sm">Abrir Órdenes de Campo</a>
            </article>
            <article class="card">
                <div class="card-header"><h3 class="card-title">6. Auditoría RBAC de Usuarios</h3><span class="badge badge-info">Gobernanza</span></div>
                <p style="font-size:0.86rem;color:var(--text-secondary);margin-bottom:0.9rem;">Directorio completo de cuentas del ISP, DPI, correos y validación de permisos por rol.</p>
                <a href="./users.html" class="btn btn-primary btn-sm">Abrir Directorio RBAC</a>
            </article>
        `;
    }
}

/**
 * 2. SUPPORT AGENT: Mesa de Ayuda, Diagnóstico Remoto N1/N2 y Triaje de Tickets
 */
export class SupportAgentWorkspace extends RoleWorkspaceStrategy {
    get roleKey() {
        return 'support_agent';
    }

    get badgeText() {
        return 'ROL 2 · AGENTE DE SOPORTE N1/N2';
    }

    get workspaceTitle() {
        return 'Consola de Atención al Suscriptor, Diagnóstico Remoto y Triaje SLA';
    }

    get workspaceSubtitle() {
        return 'Búsqueda rápida de contratos por DPI/ONU, ejecución de pruebas ópticas en 1 clic, apertura de tickets y escalamiento a cuadrillas.';
    }

    get allowedPages() {
        return ['dashboard', 'tickets', 'contracts', 'outages', 'dispatches'];
    }

    renderKpis({ summary, tickets, diagnostics }) {
        const criticalTickets = (tickets || []).filter((t) => t.priority === 'critical' && t.status !== 'resolved').length;
        return `
            <article class="kpi-card">
                <p class="kpi-label">Tickets Abiertos en Cola</p>
                <p class="kpi-value">${summary.openTickets ?? (tickets || []).length}</p>
            </article>
            <article class="kpi-card">
                <p class="kpi-label">Tickets Críticos (SLA)</p>
                <p class="kpi-value" style="color: var(--optical-critical);">${criticalTickets}</p>
            </article>
            <article class="kpi-card">
                <p class="kpi-label">Diagnósticos Ejecutados</p>
                <p class="kpi-value" style="color: var(--brand-accent);">${(diagnostics || []).length}</p>
            </article>
            <article class="kpi-card">
                <p class="kpi-label">Fallas Masivas en Curso</p>
                <p class="kpi-value" style="color: var(--optical-warning);">${summary.activeMassOutages ?? 0}</p>
            </article>
        `;
    }

    renderRoleExclusiveWidget({ tickets }) {
        const pendingTriage = (tickets || []).filter((t) => t.status === 'open' || t.status === 'diagnosed').length;
        return `
            <div class="card" style="border-left: 4px solid var(--optical-warning);">
                <div class="card-header">
                    <h2 class="card-title">Protocolo Rápido de Triaje N1/N2 (Mesa de Ayuda ISP)</h2>
                    <span class="badge badge-warning">EXCLUSIVO AGENTE DE SOPORTE</span>
                </div>
                <p style="font-size: 0.88rem; color: var(--text-secondary);">
                    <strong>Flujo de atención:</strong> 1) Verifica en <code>Fallas Masivas</code> si la Caja NAP ya está reportada → 2) Ejecuta prueba en <code>Contratos &amp; Diagnóstico</code> → 3) Gestiona el caso en <code>Tickets &amp; SLA</code> o escala en <code>Despacho Cuadrillas</code>. Pendientes de triaje: <strong>${pendingTriage}</strong>.
                </p>
            </div>
        `;
    }

    renderModuleDirectoryCards() {
        return `
            <article class="card">
                <div class="card-header"><h3 class="card-title">1. Bandeja de Tickets &amp; SLA</h3><span class="badge badge-warning">Prioridad N1/N2</span></div>
                <p style="font-size:0.86rem;color:var(--text-secondary);margin-bottom:0.9rem;">Atiende reportes de clientes, clasifica incidentes y aplica resolución remota N1 en un clic.</p>
                <a href="./tickets.html" class="btn btn-primary btn-sm">Ir a Cola de Tickets</a>
            </article>
            <article class="card">
                <div class="card-header"><h3 class="card-title">2. Contratos &amp; Diagnóstico Óptico</h3><span class="badge badge-optimal">Telemetría dBm</span></div>
                <p style="font-size:0.86rem;color:var(--text-secondary);margin-bottom:0.9rem;">Ejecuta pruebas remotas sobre el router ONU del suscriptor para distinguir falla Wi-Fi de corte de fibra.</p>
                <a href="./contracts.html" class="btn btn-primary btn-sm">Diagnosticar Contratos</a>
            </article>
            <article class="card">
                <div class="card-header"><h3 class="card-title">3. Monitor de Fallas Masivas</h3><span class="badge badge-critical">Alertas NAP</span></div>
                <p style="font-size:0.86rem;color:var(--text-secondary);margin-bottom:0.9rem;">Verifica si el sector del suscriptor ya presenta una afectación masiva antes de crear órdenes individuales.</p>
                <a href="./outages.html" class="btn btn-primary btn-sm">Consultar Fallas Masivas</a>
            </article>
            <article class="card">
                <div class="card-header"><h3 class="card-title">4. Escalamiento a Cuadrillas</h3><span class="badge badge-info">Despacho N2</span></div>
                <p style="font-size:0.86rem;color:var(--text-secondary);margin-bottom:0.9rem;">Asigna una cuadrilla móvil cuando el diagnóstico confirma atenuación severa o pérdida de señal LOS.</p>
                <a href="./dispatches.html" class="btn btn-primary btn-sm">Despachar Cuadrilla</a>
            </article>
        `;
    }
}

/**
 * 3. FIELD TECH: Terminal Móvil de Cuadrilla Técnica en Campo (Planta Externa / Última Milla)
 */
export class FieldTechWorkspace extends RoleWorkspaceStrategy {
    get roleKey() {
        return 'field_tech';
    }

    get badgeText() {
        return 'ROL 3 · TÉCNICO DE CUADRILLA EN CAMPO';
    }

    get workspaceTitle() {
        return 'Terminal Operativa de Campo — Despacho, Empalme y Certificación Óptica';
    }

    get workspaceSubtitle() {
        return 'Hoja de ruta de órdenes asignadas a tu cuadrilla, ubicación de Cajas NAP/postes y cierre técnico con certificación obligatoria en dBm.';
    }

    get allowedPages() {
        return ['dashboard', 'dispatches', 'topology'];
    }

    renderKpis({ dispatches, naps }) {
        const list = dispatches || [];
        const activeOrders = list.filter((d) => d.status !== 'resolved' && d.status !== 'cancelled');
        const onSiteOrders = list.filter((d) => d.status === 'on_site');
        const resolvedOrders = list.filter((d) => d.status === 'resolved');
        const totalMeters = list.reduce((acc, d) => acc + Number(d.fiberDropMeters || 0), 0);
        const outageNaps = (naps || []).filter((n) => n.status === 'outage').length;

        return `
            <article class="kpi-card">
                <p class="kpi-label">Órdenes Pendientes en Campo</p>
                <p class="kpi-value" style="color: var(--optical-warning);">${activeOrders.length}</p>
            </article>
            <article class="kpi-card">
                <p class="kpi-label">Intervenciones En Sitio</p>
                <p class="kpi-value" style="color: var(--brand-accent);">${onSiteOrders.length}</p>
            </article>
            <article class="kpi-card">
                <p class="kpi-label">Órdenes Certificadas (Cerradas)</p>
                <p class="kpi-value" style="color: var(--optical-optimal);">${resolvedOrders.length}</p>
            </article>
            <article class="kpi-card">
                <p class="kpi-label">Cajas NAP con Corte / Fibra Usada</p>
                <p class="kpi-value">${outageNaps} NAP · ${totalMeters}m</p>
            </article>
        `;
    }

    renderRoleExclusiveWidget({ dispatches }) {
        const active = (dispatches || []).find((d) => d.status !== 'resolved');
        return `
            <div class="card" style="border-left: 4px solid var(--optical-optimal);">
                <div class="card-header">
                    <h2 class="card-title">Hoja de Ruta Activa de Cuadrilla</h2>
                    <span class="badge badge-optimal">EXCLUSIVO TÉCNICO DE CAMPO</span>
                </div>
                ${
                    active
                        ? `<p style="font-size: 0.9rem;">
                            <strong>Orden Prioritaria Actual:</strong> <code>${UIUtils.escapeHtml(active.dispatchCode)}</code> (${UIUtils.escapeHtml(active.visitType)})
                            · <strong>Caja NAP:</strong> <code>${UIUtils.escapeHtml(active.napCode || 'Troncal')}</code>
                            · <strong>Dirección:</strong> ${UIUtils.escapeHtml(active.installationAddress || 'Poste de distribución')}
                            · <strong>Regla de cierre:</strong> Debes medir con OPM entre <code>-14.00 y -25.00 dBm</code> para que el sistema restaure la ONU y cierre el ticket.
                           </p>`
                        : `<p style="font-size: 0.9rem; color: var(--text-secondary);">No tienes órdenes pendientes en este momento. Tu cuadrilla figura como <strong>Disponible</strong> para el NOC.</p>`
                }
            </div>
        `;
    }

    renderModuleDirectoryCards() {
        return `
            <article class="card">
                <div class="card-header"><h3 class="card-title">1. Mis Órdenes de Cuadrilla en Campo</h3><span class="badge badge-optimal">Certificación OPM</span></div>
                <p style="font-size:0.86rem;color:var(--text-secondary);margin-bottom:0.9rem;">Marca tu llegada al sitio (<code>on_site</code>) y registra la potencia óptica restaurada en dBm y metros de fibra drop.</p>
                <a href="./dispatches.html" class="btn btn-primary btn-sm">Abrir Mis Órdenes de Campo</a>
            </article>
            <article class="card">
                <div class="card-header"><h3 class="card-title">2. Mapa de Cajas NAP &amp; Splitters</h3><span class="badge badge-info">Planta Externa</span></div>
                <p style="font-size:0.86rem;color:var(--text-secondary);margin-bottom:0.9rem;">Consulta la referencia de poste, sector geográfico y puertos ocupados de cada Caja NAP antes de subir a escalera.</p>
                <a href="./topology.html" class="btn btn-primary btn-sm">Ver Mapa de Cajas NAP</a>
            </article>
        `;
    }
}

/**
 * 4. CUSTOMER: Portal de Autogestión del Cliente Suscriptor FTTH
 */
export class CustomerPortalWorkspace extends RoleWorkspaceStrategy {
    get roleKey() {
        return 'customer';
    }

    get badgeText() {
        return 'ROL 4 · PORTAL DEL SUSCRIPTOR FTTH';
    }

    get workspaceTitle() {
        return 'Mi Portal Orion Fibra — Estado de Mi Conexión y Autogestión';
    }

    get workspaceSubtitle() {
        return 'Consulta tu plan de internet simétrico, verifica el estado óptico de tu router ONU en vivo y reporta o sigue tus solicitudes de soporte.';
    }

    get allowedPages() {
        return ['dashboard', 'contracts', 'tickets'];
    }

    renderKpis({ contracts, tickets }) {
        const myContract = (contracts || [])[0];
        const openMyTickets = (tickets || []).filter((t) => t.status !== 'resolved' && t.status !== 'closed').length;
        const speedLabel = myContract ? `${myContract.downloadMbps} Mbps` : '—';
        const priceLabel = myContract ? `Q${Number(myContract.monthlyPrice).toFixed(2)}` : '—';
        const signalLabel = myContract ? `${Number(myContract.rxPowerDbm).toFixed(2)} dBm` : '—';

        return `
            <article class="kpi-card">
                <p class="kpi-label">Mi Velocidad Simétrica</p>
                <p class="kpi-value" style="color: var(--brand-accent);">${UIUtils.escapeHtml(speedLabel)}</p>
            </article>
            <article class="kpi-card">
                <p class="kpi-label">Estado de Mi Router ONU</p>
                <p class="kpi-value" style="color: ${myContract?.opticalStatus === 'online' ? 'var(--optical-optimal)' : 'var(--optical-critical)'};">
                    ${UIUtils.escapeHtml((myContract?.opticalStatus || 'SIN DATOS').toUpperCase())}
                </p>
            </article>
            <article class="kpi-card">
                <p class="kpi-label">Nivel de Señal Óptica</p>
                <p class="kpi-value">${UIUtils.escapeHtml(signalLabel)}</p>
            </article>
            <article class="kpi-card">
                <p class="kpi-label">Cuota Mensual / Mis Tickets</p>
                <p class="kpi-value">${UIUtils.escapeHtml(priceLabel)} · ${openMyTickets} Tck</p>
            </article>
        `;
    }

    renderRoleExclusiveWidget({ contracts }) {
        const c = (contracts || [])[0];
        if (!c) {
            return '';
        }
        return `
            <div class="card" style="border-left: 4px solid var(--brand-accent);">
                <div class="card-header">
                    <h2 class="card-title">Mi Servicio Instalado: ${UIUtils.escapeHtml(c.planName)} (Contrato ${UIUtils.escapeHtml(c.contractNumber)})</h2>
                    <span class="badge badge-info">PORTAL PERSONAL DEL CLIENTE</span>
                </div>
                <p style="font-size: 0.88rem; color: var(--text-secondary);">
                    <strong>Dirección de instalación:</strong> ${UIUtils.escapeHtml(c.installationAddress)} ·
                    <strong>Equipo Terminal ONU:</strong> <code>${UIUtils.escapeHtml(c.onuSerial)}</code> (${UIUtils.escapeHtml(c.onuModel)}) ·
                    <strong>Caja NAP asignada:</strong> <code>${UIUtils.escapeHtml(c.napCode)}</code>.
                </p>
            </div>
        `;
    }

    renderModuleDirectoryCards() {
        return `
            <article class="card">
                <div class="card-header"><h3 class="card-title">1. Mi Fibra &amp; Autodiagnóstico ONU</h3><span class="badge badge-optimal">Telemetría en Vivo</span></div>
                <p style="font-size:0.86rem;color:var(--text-secondary);margin-bottom:0.9rem;">Revisa el estado de tu router óptico y ejecuta un autodiagnóstico remoto en un clic si notas lentitud o luz roja LOS.</p>
                <a href="./contracts.html" class="btn btn-primary btn-sm">Ir a Mi Fibra &amp; Router ONU</a>
            </article>
            <article class="card">
                <div class="card-header"><h3 class="card-title">2. Mis Solicitudes de Soporte</h3><span class="badge badge-info">Atención al Cliente</span></div>
                <p style="font-size:0.86rem;color:var(--text-secondary);margin-bottom:0.9rem;">Abre un nuevo ticket de soporte técnico o consulta el estado de seguimiento de tus reportes anteriores.</p>
                <a href="./tickets.html" class="btn btn-primary btn-sm">Ir a Mis Solicitudes de Soporte</a>
            </article>
        `;
    }
}
