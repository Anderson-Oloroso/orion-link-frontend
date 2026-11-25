import { ApiClient } from './api.js';
import { ThemeManager } from './theme.js';
import { UIUtils } from './utils.js';
import { RoleWorkspaceStrategy } from './role-workspaces.js';

/**
 * Controlador Orientado a Objetos del Dashboard Multi-Rol de Orion Link
 * 1. Protección estricta contra Back-Forward Cache (bfcache): si el usuario cierra sesión
 *    y presiona "Atrás" en el navegador, se fuerza la verificación y expulsión inmediata.
 * 2. Polimorfismo de Interfaz por Rol: delega en RoleWorkspaceStrategy (AdminNocWorkspace,
 *    SupportAgentWorkspace, FieldTechWorkspace y CustomerPortalWorkspace).
 */
export class DashboardApp {
    static currentUser = null;
    static workspaceStrategy = null;
    static state = {
        summary: {},
        contracts: [],
        diagnostics: [],
        outages: [],
        tickets: [],
        crews: [],
        dispatches: [],
        naps: [],
        users: []
    };

    static async init() {
        DashboardApp.installBackButtonGuard();
        ThemeManager.init();
        await UIUtils.bindApiConnectionIndicator();

        const isAuthenticated = await DashboardApp.verifySessionStrict();
        if (!isAuthenticated) {
            return;
        }

        DashboardApp.workspaceStrategy = RoleWorkspaceStrategy.createForRole(DashboardApp.currentUser.role);
        DashboardApp.applyRoleHeaderAndTabs();
        DashboardApp.bindTabs();
        DashboardApp.bindActions();
        await DashboardApp.refreshAllData();
    }

    /**
     * Guardia estructural contra el botón "Atrás" del navegador (bfcache / pageshow / visibilitychange)
     */
    static installBackButtonGuard() {
        window.addEventListener('pageshow', async (event) => {
            const navEntries = performance.getEntriesByType?.('navigation') || [];
            const isBackForward = event.persisted || navEntries[0]?.type === 'back_forward';
            if (isBackForward || !ApiClient.hasActiveSessionFlag()) {
                await DashboardApp.verifySessionStrict();
            }
        });

        document.addEventListener('visibilitychange', async () => {
            if (document.visibilityState === 'visible' && !ApiClient.hasActiveSessionFlag()) {
                DashboardApp.forceRedirectToLogin();
            }
        });
    }

    static forceRedirectToLogin() {
        ApiClient.clearSession();
        document.body.innerHTML = '';
        window.location.replace('./auth.html');
    }

    /**
     * Verificación estricta de sesión: NUNCA cae en datos cacheados si la sesión fue cerrada
     * o si el servidor devuelve 401 Unauthorized.
     */
    static async verifySessionStrict() {
        if (!ApiClient.hasActiveSessionFlag()) {
            DashboardApp.forceRedirectToLogin();
            return false;
        }

        try {
            const res = await ApiClient.get('/auth/me');
            if (!res || !res.data) {
                DashboardApp.forceRedirectToLogin();
                return false;
            }
            DashboardApp.currentUser = res.data;
            ApiClient.setSession(ApiClient.getToken(), res.data);

            const userBadge = document.getElementById('current-user-display');
            if (userBadge) {
                userBadge.textContent = `${DashboardApp.currentUser.fullName} · ${UIUtils.formatRoleLabel(DashboardApp.currentUser.role)}`;
            }
            return true;
        } catch {
            DashboardApp.forceRedirectToLogin();
            return false;
        }
    }

    static applyRoleHeaderAndTabs() {
        const strategy = DashboardApp.workspaceStrategy;
        const role = DashboardApp.currentUser.role;

        const badgeEl = document.getElementById('role-workspace-badge');
        const titleEl = document.getElementById('role-workspace-title');
        const subtitleEl = document.getElementById('role-workspace-subtitle');

        if (badgeEl) badgeEl.textContent = strategy.badgeText;
        if (titleEl) titleEl.textContent = strategy.workspaceTitle;
        if (subtitleEl) subtitleEl.textContent = strategy.workspaceSubtitle;

        // Mostrar u ocultar elementos exclusivos por atributo data-roles
        document.querySelectorAll('[data-roles]').forEach((el) => {
            const allowed = el.getAttribute('data-roles').split(',').map((r) => r.trim());
            if (!allowed.includes(role)) {
                el.classList.add('hidden');
            } else {
                el.classList.remove('hidden');
            }
        });

        // Filtrar las pestañas permitidas para este rol y activar su pestaña principal por defecto
        const allowedTabs = strategy.allowedTabs;
        const tabButtons = document.querySelectorAll('.tab-btn');
        const tabPanels = document.querySelectorAll('.tab-panel');

        tabButtons.forEach((btn) => {
            const tabId = btn.getAttribute('data-tab');
            if (!allowedTabs.includes(tabId)) {
                btn.classList.add('hidden');
                btn.classList.remove('active');
            } else {
                btn.classList.remove('hidden');
                btn.classList.toggle('active', tabId === strategy.defaultTab);
            }
        });

        tabPanels.forEach((panel) => {
            panel.classList.toggle('active', panel.id === strategy.defaultTab);
        });
    }

    static bindTabs() {
        const buttons = document.querySelectorAll('.tab-btn');
        const panels = document.querySelectorAll('.tab-panel');
        buttons.forEach((btn) => {
            btn.addEventListener('click', () => {
                if (btn.classList.contains('hidden')) return;
                const target = btn.getAttribute('data-tab');
                buttons.forEach((b) => b.classList.remove('active'));
                panels.forEach((p) => p.classList.remove('active'));
                btn.classList.add('active');
                document.getElementById(target)?.classList.add('active');
            });
        });
    }

    static bindActions() {
        document.getElementById('btn-logout')?.addEventListener('click', async () => {
            try {
                await ApiClient.post('/auth/logout', {});
            } catch {
                // Continuar con limpieza total en cliente
            }
            DashboardApp.forceRedirectToLogin();
        });

        document.getElementById('btn-refresh-dashboard')?.addEventListener('click', () => {
            DashboardApp.refreshAllData();
        });

        // 1. Diagnóstico Remoto FTTH
        document.getElementById('form-run-diagnostic')?.addEventListener('submit', async (e) => {
            e.preventDefault();
            const contractId = Number(document.getElementById('diag-contract-id').value);
            const rawRx = document.getElementById('diag-simulated-rx')?.value?.trim() || '';
            const simulatedRxDbm = rawRx !== '' ? Number(rawRx) : null;

            try {
                const res = await ApiClient.post('/diagnostics/run', { contractId, simulatedRxDbm });
                UIUtils.showToast(res.message, res.data.opticalHealth === 'critical' ? 'error' : 'success');
                await DashboardApp.refreshAllData();
            } catch (err) {
                UIUtils.showToast(err.message, 'error');
            }
        });

        // 2. Nuevo Ticket de Soporte
        document.getElementById('form-create-ticket')?.addEventListener('submit', async (e) => {
            e.preventDefault();
            const payload = {
                contractId: Number(document.getElementById('tck-contract-id').value),
                category: document.getElementById('tck-category').value,
                priority: document.getElementById('tck-priority').value,
                subject: document.getElementById('tck-subject').value.trim(),
                description: document.getElementById('tck-description').value.trim()
            };

            try {
                const res = await ApiClient.post('/tickets', payload);
                UIUtils.showToast(res.message, 'success');
                e.target.reset();
                await DashboardApp.refreshAllData();
            } catch (err) {
                UIUtils.showToast(err.message, 'error');
            }
        });

        // 3. Declarar Falla Masiva Manual (Admin / NOC)
        document.getElementById('form-declare-outage')?.addEventListener('submit', async (e) => {
            e.preventDefault();
            const napVal = document.getElementById('out-nap-id').value;
            const payload = {
                oltId: 1,
                napBoxId: napVal ? Number(napVal) : null,
                title: document.getElementById('out-title').value.trim(),
                rootCause: document.getElementById('out-cause').value,
                severity: document.getElementById('out-severity').value,
                affectedContractsCount: Number(document.getElementById('out-affected').value || 3)
            };

            try {
                const res = await ApiClient.post('/outages', payload);
                UIUtils.showToast(res.message, 'success');
                e.target.reset();
                await DashboardApp.refreshAllData();
            } catch (err) {
                UIUtils.showToast(err.message, 'error');
            }
        });

        // 4. Nueva Orden de Despacho de Cuadrilla
        document.getElementById('form-create-dispatch')?.addEventListener('submit', async (e) => {
            e.preventDefault();
            const ticketVal = document.getElementById('dsp-ticket-id').value;
            const outageVal = document.getElementById('dsp-outage-id').value;
            const payload = {
                crewId: Number(document.getElementById('dsp-crew-id').value),
                visitType: document.getElementById('dsp-visit-type').value,
                ticketId: ticketVal ? Number(ticketVal) : null,
                massOutageId: outageVal ? Number(outageVal) : null,
                fieldNotes: document.getElementById('dsp-notes').value.trim()
            };

            try {
                const res = await ApiClient.post('/dispatches', payload);
                UIUtils.showToast(res.message, 'success');
                e.target.reset();
                await DashboardApp.refreshAllData();
            } catch (err) {
                UIUtils.showToast(err.message, 'error');
            }
        });
    }

    static async refreshAllData() {
        const isStillAuth = await DashboardApp.verifySessionStrict();
        if (!isStillAuth) return;

        await Promise.all([
            DashboardApp.loadSummary(),
            DashboardApp.loadActiveOutages(),
            DashboardApp.loadContracts(),
            DashboardApp.loadDiagnostics(),
            DashboardApp.loadTickets(),
            DashboardApp.loadCrewsAndDispatches(),
            DashboardApp.loadTopology(),
            DashboardApp.loadUsersIfAdmin()
        ]);

        DashboardApp.renderPolymorphicWorkspace();
    }

    static renderPolymorphicWorkspace() {
        if (!DashboardApp.workspaceStrategy) return;
        const kpiContainer = document.getElementById('role-kpi-grid');
        if (kpiContainer) {
            kpiContainer.innerHTML = DashboardApp.workspaceStrategy.renderKpis(DashboardApp.state);
        }

        const widgetContainer = document.getElementById('role-exclusive-widget');
        if (widgetContainer) {
            widgetContainer.innerHTML = DashboardApp.workspaceStrategy.renderRoleExclusiveWidget(DashboardApp.state);
        }
    }

    static async loadSummary() {
        try {
            const res = await ApiClient.get('/dashboard/summary');
            DashboardApp.state.summary = res.data || {};
        } catch {
            DashboardApp.state.summary = {};
        }
    }

    static async loadActiveOutages() {
        const banner = document.getElementById('active-outage-banner');
        const tbody = document.getElementById('outages-tbody');
        try {
            const res = await ApiClient.get('/outages');
            const allOutages = res.data || [];
            DashboardApp.state.outages = allOutages;
            const active = allOutages.filter((o) => o.status !== 'resolved');

            if (banner) {
                if (active.length > 0) {
                    const first = active[0];
                    banner.classList.remove('hidden');
                    banner.innerHTML = `
                        <div>
                            <strong>ALERTA TEMPRANA FTTH (${UIUtils.escapeHtml(first.outageCode)}):</strong> ${UIUtils.escapeHtml(first.title)}
                            · Caja NAP: <code>${UIUtils.escapeHtml(first.napCode || 'Troncal')}</code> · Contratos afectados: <strong>${Number(first.affectedContractsCount)}</strong>
                        </div>
                        <span class="badge badge-critical">${UIUtils.escapeHtml(first.status.toUpperCase())}</span>
                    `;
                } else {
                    banner.classList.add('hidden');
                }
            }

            if (tbody) {
                tbody.innerHTML = allOutages
                    .map(
                        (o) => `
                    <tr>
                        <td><strong>${UIUtils.escapeHtml(o.outageCode)}</strong></td>
                        <td>${UIUtils.escapeHtml(o.napCode || o.oltCode)}</td>
                        <td>${UIUtils.escapeHtml(o.title)}</td>
                        <td>${Number(o.affectedContractsCount)}</td>
                        <td><span class="badge ${o.status === 'resolved' ? 'badge-optimal' : 'badge-critical'}">${UIUtils.escapeHtml(o.status)}</span></td>
                        <td>
                            ${
                                o.status !== 'resolved' && ['admin', 'support_agent'].includes(DashboardApp.currentUser?.role)
                                    ? `<button class="btn btn-success btn-sm" data-resolve-outage="${Number(o.id)}">Resolver NOC</button>`
                                    : UIUtils.escapeHtml(o.resolutionNotes || '—')
                            }
                        </td>
                    </tr>`
                    )
                    .join('');

                tbody.querySelectorAll('[data-resolve-outage]').forEach((btn) => {
                    btn.addEventListener('click', async () => {
                        const id = Number(btn.getAttribute('data-resolve-outage'));
                        const notes = window.prompt('Notas de resolución de la Falla Masiva FTTH:', 'Empalme de fibra certificado y niveles ópticos en -19.20 dBm.');
                        if (!notes) return;
                        try {
                            const r = await ApiClient.put(`/outages/${id}/resolve`, { resolutionNotes: notes });
                            UIUtils.showToast(r.message, 'success');
                            await DashboardApp.refreshAllData();
                        } catch (err) {
                            UIUtils.showToast(err.message, 'error');
                        }
                    });
                });
            }
        } catch {
            DashboardApp.state.outages = [];
        }
    }

    static async loadContracts() {
        const role = DashboardApp.currentUser?.role || 'customer';
        if (role === 'field_tech') return;

        const endpoint = role === 'customer' ? '/contracts/me' : '/contracts';
        try {
            const res = await ApiClient.get(endpoint);
            DashboardApp.state.contracts = res.data || [];

            ['diag-contract-id', 'tck-contract-id'].forEach((selectId) => {
                const sel = document.getElementById(selectId);
                if (sel) {
                    sel.innerHTML = DashboardApp.state.contracts
                        .map(
                            (c) => `<option value="${Number(c.id)}">${UIUtils.escapeHtml(c.contractNumber)} — ${UIUtils.escapeHtml(c.customerName || 'Mi Contrato')} (${UIUtils.escapeHtml(c.napCode)} P#${Number(c.napPortNumber)} · ${Number(c.rxPowerDbm)} dBm)</option>`
                        )
                        .join('');
                }
            });

            const tbody = document.getElementById('contracts-tbody');
            if (tbody) {
                tbody.innerHTML = DashboardApp.state.contracts
                    .map(
                        (c) => `
                    <tr>
                        <td><strong>${UIUtils.escapeHtml(c.contractNumber)}</strong></td>
                        <td>${UIUtils.escapeHtml(c.customerName || DashboardApp.currentUser?.fullName)}</td>
                        <td>${UIUtils.escapeHtml(c.planName)} (${Number(c.downloadMbps)}M)</td>
                        <td><code>${UIUtils.escapeHtml(c.napCode)}</code> · Puerto ${Number(c.napPortNumber)}</td>
                        <td><code>${UIUtils.escapeHtml(c.onuSerial)}</code> (${UIUtils.escapeHtml(c.onuModel)})</td>
                        <td>${UIUtils.formatOpticalBadge(c.rxPowerDbm, c.opticalStatus)}</td>
                        <td>
                            <button class="btn btn-primary btn-sm" data-quick-diag="${Number(c.id)}">Diagnosticar ONU</button>
                        </td>
                    </tr>`
                    )
                    .join('');

                tbody.querySelectorAll('[data-quick-diag]').forEach((btn) => {
                    btn.addEventListener('click', async () => {
                        const contractId = Number(btn.getAttribute('data-quick-diag'));
                        try {
                            const r = await ApiClient.post('/diagnostics/run', { contractId });
                            UIUtils.showToast(r.message, r.data.opticalHealth === 'critical' ? 'error' : 'success');
                            await DashboardApp.refreshAllData();
                        } catch (err) {
                            UIUtils.showToast(err.message, 'error');
                        }
                    });
                });
            }
        } catch {
            DashboardApp.state.contracts = [];
        }
    }

    static async loadDiagnostics() {
        const tbody = document.getElementById('diagnostics-tbody');
        if (!tbody) return;
        try {
            const res = await ApiClient.get('/diagnostics');
            const list = res.data || [];
            DashboardApp.state.diagnostics = list;
            tbody.innerHTML = list
                .map(
                    (d) => `
                <tr>
                    <td>#${Number(d.id)}</td>
                    <td><strong>${UIUtils.escapeHtml(d.contractNumber || d.contractId)}</strong></td>
                    <td><code>${UIUtils.escapeHtml(d.napCode || '—')}</code> (${UIUtils.escapeHtml(d.onuSerial || 'ONU')})</td>
                    <td>${UIUtils.formatOpticalBadge(d.rxPowerDbm, d.onuStatusSnapshot)}</td>
                    <td>${Number(d.latencyMs)} ms / ${Number(d.packetLossPct)}% loss</td>
                    <td>${UIUtils.escapeHtml(d.diagnosisSummary)}</td>
                    <td>${UIUtils.escapeHtml(d.recommendedAction)}</td>
                </tr>`
                )
                .join('');
        } catch {
            DashboardApp.state.diagnostics = [];
            tbody.innerHTML = '';
        }
    }

    static async loadTickets() {
        const role = DashboardApp.currentUser?.role || 'customer';
        const tbody = document.getElementById('tickets-tbody');
        if (!tbody) return;
        try {
            const res = await ApiClient.get('/tickets');
            const list = res.data || [];
            DashboardApp.state.tickets = list;

            tbody.innerHTML = list
                .map(
                    (t) => `
                <tr>
                    <td><strong>${UIUtils.escapeHtml(t.ticketNumber)}</strong></td>
                    <td>${UIUtils.escapeHtml(t.customerName)} (<code>${UIUtils.escapeHtml(t.contractNumber)}</code>)</td>
                    <td>${UIUtils.escapeHtml(t.category)}</td>
                    <td><span class="badge ${t.priority === 'critical' ? 'badge-critical' : 'badge-info'}">${UIUtils.escapeHtml(t.priority)}</span></td>
                    <td><span class="badge ${t.status === 'resolved' ? 'badge-optimal' : 'badge-warning'}">${UIUtils.escapeHtml(t.status)}</span></td>
                    <td>${t.outageCode ? `<span class="badge badge-critical">${UIUtils.escapeHtml(t.outageCode)}</span>` : 'Individual'}</td>
                    <td>${UIUtils.escapeHtml(t.subject)}</td>
                    <td>
                        ${
                            ['admin', 'support_agent'].includes(role) && t.status !== 'resolved'
                                ? `<button class="btn btn-outline btn-sm" data-resolve-tck="${Number(t.id)}">Resolver N1</button>`
                                : '—'
                        }
                    </td>
                </tr>`
                )
                .join('');

            tbody.querySelectorAll('[data-resolve-tck]').forEach((btn) => {
                btn.addEventListener('click', async () => {
                    const id = Number(btn.getAttribute('data-resolve-tck'));
                    const summary = window.prompt('Resumen de resolución remota N1/N2:', 'Ajuste remoto de parámetros ópticos/Wi-Fi verificado con el suscriptor.');
                    if (!summary) return;
                    try {
                        const r = await ApiClient.put(`/tickets/${id}/status`, {
                            status: 'resolved',
                            resolutionSummary: summary
                        });
                        UIUtils.showToast(r.message, 'success');
                        await DashboardApp.refreshAllData();
                    } catch (err) {
                        UIUtils.showToast(err.message, 'error');
                    }
                });
            });
        } catch {
            DashboardApp.state.tickets = [];
            tbody.innerHTML = '';
        }
    }

    static async loadCrewsAndDispatches() {
        const role = DashboardApp.currentUser?.role || 'customer';
        if (role === 'customer') return;

        try {
            const [crewsRes, dspRes] = await Promise.all([
                ApiClient.get('/crews'),
                ApiClient.get('/dispatches')
            ]);

            DashboardApp.state.crews = crewsRes.data || [];
            DashboardApp.state.dispatches = dspRes.data || [];

            const crewSel = document.getElementById('dsp-crew-id');
            if (crewSel) {
                crewSel.innerHTML = DashboardApp.state.crews
                    .map((c) => `<option value="${Number(c.id)}">${UIUtils.escapeHtml(c.crewCode)} — ${UIUtils.escapeHtml(c.name)} (${UIUtils.escapeHtml(c.status)})</option>`)
                    .join('');
            }

            const tbody = document.getElementById('dispatches-tbody');
            if (tbody) {
                const orders = DashboardApp.state.dispatches;
                tbody.innerHTML = orders
                    .map(
                        (d) => `
                    <tr>
                        <td><strong>${UIUtils.escapeHtml(d.dispatchCode)}</strong></td>
                        <td>${UIUtils.escapeHtml(d.crewName)} (<code>${UIUtils.escapeHtml(d.vehiclePlate)}</code>)</td>
                        <td>${UIUtils.escapeHtml(d.ticketNumber || d.outageCode || 'Planta Externa')}</td>
                        <td><code>${UIUtils.escapeHtml(d.napCode || '—')}</code> · ${UIUtils.escapeHtml(d.installationAddress || '')}</td>
                        <td><span class="badge ${d.status === 'resolved' ? 'badge-optimal' : 'badge-warning'}">${UIUtils.escapeHtml(d.status)}</span></td>
                        <td>${d.restoredRxDbm !== null ? `${Number(d.restoredRxDbm)} dBm (${Number(d.fiberDropMeters)}m)` : 'Pendiente'}</td>
                        <td style="display:flex;gap:0.4rem;flex-wrap:wrap;">
                            ${
                                d.status !== 'resolved' && ['admin', 'field_tech'].includes(role)
                                    ? `
                                    ${d.status !== 'on_site' ? `<button class="btn btn-outline btn-sm" data-arrive-dsp="${Number(d.id)}">Marcar En Sitio</button>` : ''}
                                    <button class="btn btn-success btn-sm" data-complete-dsp="${Number(d.id)}">Certificar dBm &amp; Cerrar</button>
                                    `
                                    : 'Cerrada'
                            }
                        </td>
                    </tr>`
                    )
                    .join('');

                tbody.querySelectorAll('[data-arrive-dsp]').forEach((btn) => {
                    btn.addEventListener('click', async () => {
                        const id = Number(btn.getAttribute('data-arrive-dsp'));
                        try {
                            const r = await ApiClient.put(`/dispatches/${id}/state`, {
                                status: 'on_site',
                                fieldNotes: 'Cuadrilla en sitio iniciando medición con OPM en Caja NAP.'
                            });
                            UIUtils.showToast(r.message, 'info');
                            await DashboardApp.refreshAllData();
                        } catch (err) {
                            UIUtils.showToast(err.message, 'error');
                        }
                    });
                });

                tbody.querySelectorAll('[data-complete-dsp]').forEach((btn) => {
                    btn.addEventListener('click', async () => {
                        const id = Number(btn.getAttribute('data-complete-dsp'));
                        const rx = window.prompt('Potencia óptica restaurada en campo (entre -14.00 y -25.00 dBm):', '-18.85');
                        if (!rx) return;
                        const meters = window.prompt('Metros de fibra drop utilizados:', '30') || '0';
                        const notes = window.prompt('Bitácora técnica de reparación en campo:', 'Fusión de hilo óptico y limpieza de conector SC/APC en Caja NAP.');
                        if (!notes) return;

                        try {
                            const r = await ApiClient.put(`/dispatches/${id}/complete`, {
                                restoredRxDbm: Number(rx),
                                fiberDropMeters: Number(meters),
                                fieldNotes: notes
                            });
                            UIUtils.showToast(r.message, 'success');
                            await DashboardApp.refreshAllData();
                        } catch (err) {
                            UIUtils.showToast(err.message, 'error');
                        }
                    });
                });
            }
        } catch {
            DashboardApp.state.crews = [];
            DashboardApp.state.dispatches = [];
        }
    }

    static async loadTopology() {
        const tbody = document.getElementById('topology-naps-tbody');
        try {
            const res = await ApiClient.get('/topology/naps');
            const naps = res.data || [];
            DashboardApp.state.naps = naps;

            const outNapSel = document.getElementById('out-nap-id');
            if (outNapSel) {
                outNapSel.innerHTML = naps
                    .map((n) => `<option value="${Number(n.id)}">${UIUtils.escapeHtml(n.code)} — ${UIUtils.escapeHtml(n.zoneSector)}</option>`)
                    .join('');
            }

            if (tbody) {
                tbody.innerHTML = naps
                    .map(
                        (n) => `
                    <tr>
                        <td><strong>${UIUtils.escapeHtml(n.code)}</strong></td>
                        <td>${UIUtils.escapeHtml(n.oltCode)} (${UIUtils.escapeHtml(n.oltName)})</td>
                        <td>${UIUtils.escapeHtml(n.zoneSector)} — ${UIUtils.escapeHtml(n.addressReference)}</td>
                        <td>${UIUtils.escapeHtml(n.splitterRatio)} (${Number(n.occupiedPorts)}/${Number(n.totalPorts)})</td>
                        <td>Online: ${Number(n.onusOnline)} · Atenuadas: ${Number(n.onusHighAttenuation)} · LOS: ${Number(n.onusLosCritical)}</td>
                        <td><span class="badge ${n.status === 'operational' ? 'badge-optimal' : 'badge-critical'}">${UIUtils.escapeHtml(n.status)}</span></td>
                    </tr>`
                    )
                    .join('');
            }
        } catch {
            DashboardApp.state.naps = [];
        }
    }

    static async loadUsersIfAdmin() {
        if (DashboardApp.currentUser?.role !== 'admin') return;
        const tbody = document.getElementById('users-tbody');
        if (!tbody) return;
        try {
            const res = await ApiClient.get('/users');
            const users = res.data || [];
            DashboardApp.state.users = users;
            tbody.innerHTML = users
                .map(
                    (u) => `
                <tr>
                    <td>#${Number(u.id)}</td>
                    <td><strong>${UIUtils.escapeHtml(u.fullName)}</strong></td>
                    <td><code>${UIUtils.escapeHtml(u.dpi)}</code></td>
                    <td>${UIUtils.escapeHtml(u.email)}</td>
                    <td><span class="badge badge-info">${UIUtils.escapeHtml(u.role)}</span></td>
                    <td><span class="badge ${u.isActive ? 'badge-optimal' : 'badge-critical'}">${u.isActive ? 'ACTIVO' : 'INACTIVO'}</span></td>
                </tr>`
                )
                .join('');
        } catch {
            DashboardApp.state.users = [];
        }
    }
}

document.addEventListener('DOMContentLoaded', () => DashboardApp.init());
