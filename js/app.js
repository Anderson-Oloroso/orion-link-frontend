import { ApiClient } from './api.js';
import { ThemeManager } from './theme.js';
import { UIUtils } from './utils.js';

/**
 * Controlador Orientado a Objetos del Dashboard Multi-Rol de Orion Link
 * Adapta vistas y permisos para: admin (NOC), support_agent (Soporte N1/N2),
 * field_tech (Técnico de Cuadrilla) y customer (Cliente Suscriptor).
 */
export class DashboardApp {
    static currentUser = null;
    static contracts = [];
    static crews = [];

    static async init() {
        ThemeManager.init();
        await UIUtils.bindApiConnectionIndicator();
        await DashboardApp.verifySession();
        DashboardApp.configureRoleVisibility();
        DashboardApp.bindTabs();
        DashboardApp.bindActions();
        await DashboardApp.refreshAllData();
    }

    static async verifySession() {
        try {
            const res = await ApiClient.get('/auth/me');
            DashboardApp.currentUser = res.data;
            ApiClient.setSession(ApiClient.getToken(), res.data);
        } catch {
            const cached = ApiClient.getStoredUser();
            if (!cached) {
                window.location.href = './auth.html';
                return;
            }
            DashboardApp.currentUser = cached;
        }

        const userBadge = document.getElementById('current-user-display');
        if (userBadge && DashboardApp.currentUser) {
            userBadge.textContent = `${DashboardApp.currentUser.fullName} · ${UIUtils.formatRoleLabel(DashboardApp.currentUser.role)}`;
        }
    }

    static configureRoleVisibility() {
        const role = DashboardApp.currentUser?.role || 'customer';
        document.querySelectorAll('[data-roles]').forEach((el) => {
            const allowed = el.getAttribute('data-roles').split(',').map((r) => r.trim());
            if (!allowed.includes(role)) {
                el.classList.add('hidden');
            } else {
                el.classList.remove('hidden');
            }
        });
    }

    static bindTabs() {
        const buttons = document.querySelectorAll('.tab-btn');
        const panels = document.querySelectorAll('.tab-panel');
        buttons.forEach((btn) => {
            btn.addEventListener('click', () => {
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
                // Limpiar sesión local igualmente
            }
            ApiClient.clearSession();
            window.location.href = './auth.html';
        });

        document.getElementById('btn-refresh-dashboard')?.addEventListener('click', () => {
            DashboardApp.refreshAllData();
        });

        // Formulario de Diagnóstico Remoto FTTH
        const diagForm = document.getElementById('form-run-diagnostic');
        if (diagForm) {
            diagForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                const contractId = Number(document.getElementById('diag-contract-id').value);
                const rawRx = document.getElementById('diag-simulated-rx').value.trim();
                const simulatedRxDbm = rawRx !== '' ? Number(rawRx) : null;

                try {
                    const res = await ApiClient.post('/diagnostics/run', { contractId, simulatedRxDbm });
                    UIUtils.showToast(res.message, res.data.opticalHealth === 'critical' ? 'error' : 'success');
                    await DashboardApp.refreshAllData();
                } catch (err) {
                    UIUtils.showToast(err.message, 'error');
                }
            });
        }

        // Formulario de Nuevo Ticket de Soporte
        const ticketForm = document.getElementById('form-create-ticket');
        if (ticketForm) {
            ticketForm.addEventListener('submit', async (e) => {
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
                    ticketForm.reset();
                    await DashboardApp.refreshAllData();
                } catch (err) {
                    UIUtils.showToast(err.message, 'error');
                }
            });
        }

        // Formulario de Nueva Orden de Despacho de Cuadrilla
        const dispatchForm = document.getElementById('form-create-dispatch');
        if (dispatchForm) {
            dispatchForm.addEventListener('submit', async (e) => {
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
                    dispatchForm.reset();
                    await DashboardApp.refreshAllData();
                } catch (err) {
                    UIUtils.showToast(err.message, 'error');
                }
            });
        }
    }

    static async refreshAllData() {
        await Promise.all([
            DashboardApp.loadSummary(),
            DashboardApp.loadActiveOutages(),
            DashboardApp.loadContracts(),
            DashboardApp.loadDiagnostics(),
            DashboardApp.loadTickets(),
            DashboardApp.loadCrewsAndDispatches(),
            DashboardApp.loadTopology()
        ]);
    }

    static async loadSummary() {
        try {
            const res = await ApiClient.get('/dashboard/summary');
            const s = res.data;
            const map = {
                'dash-kpi-contracts': s.activeContracts,
                'dash-kpi-online': s.onusOnline,
                'dash-kpi-attenuation': s.onusHighAttenuation,
                'dash-kpi-los': s.onusLosCritical,
                'dash-kpi-outages': s.activeMassOutages,
                'dash-kpi-tickets': s.openTickets,
                'dash-kpi-dispatches': s.activeDispatches
            };
            Object.entries(map).forEach(([id, val]) => {
                const el = document.getElementById(id);
                if (el) el.textContent = val;
            });
        } catch {
            // Silencioso si no hay conexión
        }
    }

    static async loadActiveOutages() {
        const banner = document.getElementById('active-outage-banner');
        const tbody = document.getElementById('outages-tbody');
        try {
            const res = await ApiClient.get('/outages');
            const allOutages = res.data || [];
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
            // Ignorar error de carga inicial
        }
    }

    static async loadContracts() {
        const role = DashboardApp.currentUser?.role || 'customer';
        const endpoint = role === 'customer' ? '/contracts/me' : '/contracts';
        try {
            const res = await ApiClient.get(endpoint);
            DashboardApp.contracts = res.data || [];

            // Poblar selectores de contrato
            ['diag-contract-id', 'tck-contract-id'].forEach((selectId) => {
                const sel = document.getElementById(selectId);
                if (sel) {
                    sel.innerHTML = DashboardApp.contracts
                        .map(
                            (c) => `<option value="${c.id}">${c.contractNumber} — ${c.customerName || 'Mi Contrato'} (${c.napCode} P#${c.napPortNumber} · ${c.rxPowerDbm} dBm)</option>`
                        )
                        .join('');
                }
            });

            const tbody = document.getElementById('contracts-tbody');
            if (tbody) {
                tbody.innerHTML = DashboardApp.contracts
                    .map(
                        (c) => `
                    <tr>
                        <td><strong>${c.contractNumber}</strong></td>
                        <td>${c.customerName || DashboardApp.currentUser?.fullName}</td>
                        <td>${c.planName} (${c.downloadMbps}M)</td>
                        <td><code>${c.napCode}</code> · Puerto ${c.napPortNumber}</td>
                        <td><code>${c.onuSerial}</code> (${c.onuModel})</td>
                        <td>${UIUtils.formatOpticalBadge(c.rxPowerDbm, c.opticalStatus)}</td>
                        <td>
                            <button class="btn btn-primary btn-sm" data-quick-diag="${c.id}">Diagnosticar ONU</button>
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
            // Ignorar si el rol no tiene acceso
        }
    }

    static async loadDiagnostics() {
        const tbody = document.getElementById('diagnostics-tbody');
        if (!tbody) return;
        try {
            const res = await ApiClient.get('/diagnostics');
            const list = res.data || [];
            tbody.innerHTML = list
                .map(
                    (d) => `
                <tr>
                    <td>#${d.id}</td>
                    <td><strong>${d.contractNumber || d.contractId}</strong></td>
                    <td><code>${d.napCode || '—'}</code> (${d.onuSerial || 'ONU'})</td>
                    <td>${UIUtils.formatOpticalBadge(d.rxPowerDbm, d.onuStatusSnapshot)}</td>
                    <td>${d.latencyMs} ms / ${d.packetLossPct}% loss</td>
                    <td>${d.diagnosisSummary}</td>
                    <td>${d.recommendedAction}</td>
                </tr>`
                )
                .join('');
        } catch {
            tbody.innerHTML = '';
        }
    }

    static async loadTickets() {
        const tbody = document.getElementById('tickets-tbody');
        if (!tbody) return;
        try {
            const res = await ApiClient.get('/tickets');
            if (tbody) {
                const list = res.data || [];
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
                </tr>`
                    )
                    .join('');
            }
        } catch {
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

            DashboardApp.crews = crewsRes.data || [];
            const crewSel = document.getElementById('dsp-crew-id');
            if (crewSel) {
                crewSel.innerHTML = DashboardApp.crews
                    .map((c) => `<option value="${c.id}">${c.crewCode} — ${c.name} (${c.status})</option>`)
                    .join('');
            }

            const tbody = document.getElementById('dispatches-tbody');
            if (tbody) {
                const orders = dspRes.data || [];
                tbody.innerHTML = orders
                    .map(
                        (d) => `
                    <tr>
                        <td><strong>${d.dispatchCode}</strong></td>
                        <td>${d.crewName} (<code>${d.vehiclePlate}</code>)</td>
                        <td>${d.ticketNumber || d.outageCode || 'Planta Externa'}</td>
                        <td><code>${d.napCode || '—'}</code> · ${d.installationAddress || ''}</td>
                        <td><span class="badge ${d.status === 'resolved' ? 'badge-optimal' : 'badge-warning'}">${d.status}</span></td>
                        <td>${d.restoredRxDbm !== null ? `${d.restoredRxDbm} dBm (${d.fiberDropMeters}m)` : 'Pendiente'}</td>
                        <td>
                            ${
                                d.status !== 'resolved' && ['admin', 'field_tech'].includes(role)
                                    ? `<button class="btn btn-success btn-sm" data-complete-dsp="${d.id}">Certificar dBm & Cerrar</button>`
                                    : 'Cerrada'
                            }
                        </td>
                    </tr>`
                    )
                    .join('');

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
            // Ignorar si no aplica al rol
        }
    }

    static async loadTopology() {
        const tbody = document.getElementById('topology-naps-tbody');
        if (!tbody) return;
        try {
            const res = await ApiClient.get('/topology/naps');
            const naps = res.data || [];
            tbody.innerHTML = naps
                .map(
                    (n) => `
                <tr>
                    <td><strong>${n.code}</strong></td>
                    <td>${n.oltCode} (${n.oltName})</td>
                    <td>${n.zoneSector} — ${n.addressReference}</td>
                    <td>${n.splitterRatio} (${n.occupiedPorts}/${n.totalPorts})</td>
                    <td>Online: ${n.onusOnline} · Atenuadas: ${n.onusHighAttenuation} · LOS: ${n.onusLosCritical}</td>
                    <td><span class="badge ${n.status === 'operational' ? 'badge-optimal' : 'badge-critical'}">${n.status}</span></td>
                </tr>`
                )
                .join('');
        } catch {
            tbody.innerHTML = '';
        }
    }
}

document.addEventListener('DOMContentLoaded', () => DashboardApp.init());
