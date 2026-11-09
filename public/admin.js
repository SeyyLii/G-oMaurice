import { escapeHtml } from '/report.js';

const $ = (id) => document.getElementById(id);
const store = {
    get() { try { return sessionStorage.getItem('gm-admin'); } catch { return null; } },
    set(v) { try { v ? sessionStorage.setItem('gm-admin', v) : sessionStorage.removeItem('gm-admin'); } catch { /* stockage indisponible */ } },
};
let token = store.get();
let categories = [];

async function api(path, options = {}) {
    const res = await fetch(path, { ...options, headers: { ...(options.headers || {}), Authorization: `Bearer ${token}` } });
    if (res.status === 401) { logout(false); throw new Error('Session expirée, reconnectez-vous.'); }
    return res;
}

function showDashboard(visible) {
    $('login-form').classList.toggle('hidden', visible);
    $('dashboard').classList.toggle('hidden', !visible);
    $('logout').classList.toggle('hidden', !visible);
}

async function load() {
    const [statsRes, reportsRes] = await Promise.all([api('/api/admin/stats'), fetch('/api/reports')]);
    const stats = await statsRes.json();
    const { features } = await reportsRes.json();

    const mo = (stats.photo_bytes / (1024 * 1024)).toFixed(2).replace('.', ',');
    const avg = stats.photos ? Math.round(stats.photo_bytes / stats.photos / 1024) : 0;
    $('stats').innerHTML = [
        [stats.reports, 'signalements affichés'],
        [stats.photos, 'avec photo'],
        [`${mo} Mo`, 'de photos stockées'],
        [`${avg} Ko`, 'par photo en moyenne'],
    ].map(([v, l]) => `<div class="stat-card"><div class="stat-value">${v}</div><div class="stat-desc">${l}</div></div>`).join('');

    $('empty').classList.toggle('hidden', features.length > 0);
    $('rows').innerHTML = features.map(({ properties: p, geometry: g }) => {
        const cat = categories.find((c) => c.id === p.category) || { label: p.category, color: '#e2e8f0' };
        const date = new Date(p.created_at).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' });
        const photo = p.photo_url
            ? `<a href="${escapeHtml(p.photo_url)}" target="_blank" rel="noopener"><img class="thumb" src="${escapeHtml(p.photo_url)}" alt="" loading="lazy"></a>`
            : '—';
        const [lng, lat] = g.coordinates;
        return `<tr data-id="${escapeHtml(p.id)}">
            <td>${escapeHtml(date)}</td>
            <td><span class="dot" style="background:${cat.color}"></span>${escapeHtml(cat.label)}</td>
            <td class="desc">${escapeHtml(p.description)}</td>
            <td>${photo}</td>
            <td><a href="/?report=${encodeURIComponent(p.id)}">${lat.toFixed(4)}, ${lng.toFixed(4)}</a></td>
            <td><button class="danger-btn" type="button" data-action="delete">Retirer</button></td>
        </tr>`;
    }).join('');
}

// Retrait en deux clics : « Retirer » puis « Confirmer ».
$('rows').addEventListener('click', async (e) => {
    const btn = e.target.closest('button[data-action]');
    if (!btn) return;
    const row = btn.closest('tr');
    if (btn.dataset.action === 'delete') {
        btn.dataset.action = 'confirm';
        btn.textContent = 'Confirmer ?';
        setTimeout(() => { if (btn.isConnected && btn.dataset.action === 'confirm') { btn.dataset.action = 'delete'; btn.textContent = 'Retirer'; } }, 4000);
        return;
    }
    btn.disabled = true;
    try {
        const res = await api(`/api/reports/${encodeURIComponent(row.dataset.id)}`, { method: 'DELETE' });
        if (!res.ok && res.status !== 404) throw new Error('Suppression impossible.');
        await load();
    } catch (err) {
        btn.disabled = false;
        btn.textContent = err.message;
    }
});

$('login-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    $('login-error').textContent = '';
    const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: $('password').value }),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) { $('login-error').textContent = json.error || 'Connexion impossible.'; return; }
    token = json.token;
    store.set(token);
    $('password').value = '';
    showDashboard(true);
    await load();
});

async function logout(callServer = true) {
    if (callServer && token) await fetch('/api/admin/logout', { method: 'POST', headers: { Authorization: `Bearer ${token}` } }).catch(() => {});
    token = null;
    store.set(null);
    showDashboard(false);
}
$('logout').addEventListener('click', () => logout());

categories = await (await fetch('/api/categories')).json();
if (token) {
    showDashboard(true);
    load().catch((err) => { $('login-error').textContent = err.message; });
}
