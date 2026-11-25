import { ApiClient } from './api.js';
import { ThemeManager } from './theme.js';
import { UIUtils } from './utils.js';

export class LandingController {
    static async init() {
        ThemeManager.init();
        await UIUtils.bindApiConnectionIndicator();
        await Promise.all([
            LandingController.loadNetworkSummary(),
            LandingController.loadNapBoxes(),
            LandingController.loadServicePlans()
        ]);
    }

    static async loadNetworkSummary() {
        try {
            const res = await ApiClient.get('/dashboard/summary');
            const s = res.data;
            const setVal = (id, val) => {
                const el = document.getElementById(id);
                if (el) el.textContent = val;
            };
            setVal('kpi-active-contracts', s.activeContracts);
            setVal('kpi-onus-online', s.onusOnline);
            setVal('kpi-mass-outages', s.activeMassOutages);
            setVal('kpi-available-crews', s.availableCrews);
        } catch {
            // Si el backend aún no está encendido, se mantiene el estado informativo
        }
    }

    static async loadNapBoxes() {
        const tbody = document.getElementById('landing-naps-tbody');
        if (!tbody) return;
        try {
            const res = await ApiClient.get('/topology/naps');
            const naps = res.data || [];
            tbody.innerHTML = naps
                .map(
                    (n) => `
                <tr>
                    <td><strong>${n.code}</strong></td>
                    <td>${n.zoneSector}</td>
                    <td>${n.splitterRatio} (${n.occupiedPorts}/${n.totalPorts} puertos)</td>
                    <td>${n.avgRxPowerDbm !== null ? `${n.avgRxPowerDbm} dBm` : 'N/A'}</td>
                    <td>
                        <span class="badge ${n.status === 'operational' ? 'badge-optimal' : 'badge-critical'}">
                            ${n.status.toUpperCase()}
                        </span>
                    </td>
                </tr>`
                )
                .join('');
        } catch (err) {
            tbody.innerHTML = `<tr><td colspan="5">Conéctese a orion-link-backend en http://localhost:5000/api/v1 (${err.message})</td></tr>`;
        }
    }

    static async loadServicePlans() {
        const container = document.getElementById('landing-plans-grid');
        if (!container) return;
        try {
            const res = await ApiClient.get('/plans');
            const plans = res.data || [];
            container.innerHTML = plans
                .map(
                    (p) => `
                <article class="kpi-card">
                    <span class="badge badge-info">${p.code}</span>
                    <h3 style="margin: 0.6rem 0 0.25rem;">${p.name}</h3>
                    <p class="kpi-value">Q${p.monthlyPrice.toFixed(2)}<span style="font-size:0.85rem;font-weight:400;">/mes</span></p>
                    <p style="font-size:0.84rem;color:var(--text-secondary);margin-top:0.4rem;">
                        Simétrico ${p.downloadMbps} Mbps ↓ / ${p.uploadMbps} Mbps ↑ · SLA ${p.slaHours}h
                    </p>
                </article>`
                )
                .join('');
        } catch {
            container.innerHTML = '';
        }
    }
}

document.addEventListener('DOMContentLoaded', () => LandingController.init());
