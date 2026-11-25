import { UIUtils } from './utils.js';

/**
 * Jerarquía Polimórfica Orientada a Objetos para las 4 Experiencias de Dashboard por Rol
 * Cada rol hereda de RoleWorkspaceStrategy y define su propio título, misión operativa,
 * pestañas habilitadas, pestaña inicial y tarjetas KPI específicas de su trabajo diario.
 */
export class RoleWorkspaceStrategy {
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

    get defaultTab() {
        return 'panel-contracts';
    }

    get allowedTabs() {
        return ['panel-contracts'];
    }

    renderKpis(_state) {
        return '';
    }

    renderRoleExclusiveWidget(_state) {
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

    get defaultTab() {
        return 'panel-topology';
    }

    get allowedTabs() {
        return ['panel-topology', 'panel-outages', 'panel-contracts', 'panel-tickets', 'panel-dispatches', 'panel-users'];
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
                    Como <strong>Admin / Ingeniero NOC</strong> tienes control total sobre las 6 áreas: topología OLT/NAP, declaración y cierre de fallas masivas, contratos, tickets, órdenes de cuadrilla y gestión de usuarios.
                </p>
                <div style="display:flex;flex-wrap:wrap;gap:0.75rem;">
                    <span class="badge badge-optimal">Cajas NAP Operativas: ${(naps || []).length - criticalNaps.length}</span>
                    <span class="badge badge-critical">Cajas NAP con Alerta/Corte: ${criticalNaps.length}</span>
                </div>
            </div>
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

    get defaultTab() {
        return 'panel-tickets';
    }

    get allowedTabs() {
        return ['panel-tickets', 'panel-contracts', 'panel-outages', 'panel-dispatches'];
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
                    <strong>Flujo de atención:</strong> 1) Verifica si la Caja NAP del cliente ya tiene Falla Masiva activa → 2) Ejecuta Diagnóstico Óptico Remoto (<code>dBm</code>) → 3) Si hay atenuación (<code>-25 a -27.9 dBm</code>) o corte individual (<code>LOS</code>), abre ticket y despacha cuadrilla. Tickets pendientes de triaje: <strong>${pendingTriage}</strong>.
                </p>
            </div>
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

    get defaultTab() {
        return 'panel-dispatches';
    }

    get allowedTabs() {
        return ['panel-dispatches', 'panel-topology'];
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

    get defaultTab() {
        return 'panel-contracts';
    }

    get allowedTabs() {
        return ['panel-contracts', 'panel-tickets'];
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
                    Si experimentas lentitud o luz roja <code>LOS</code>, pulsa <strong>"Diagnosticar Mi ONU"</strong> abajo.
                </p>
            </div>
        `;
    }
}
