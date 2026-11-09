import { initReportForm, escapeHtml } from '/report.js';

/* global L, Chart, APP_DATA, protomapsL */

/* ---------------------------------------------------------------------------
 * Carte — Leaflet (~40 Ko).
 * Fond de carte : fichier local public/tiles/maurice.pmtiles (île Maurice +
 * Rodrigues, téléchargé une fois avec `npm run tiles`). Aucun serveur de tuiles
 * externe n'est appelé. Si le fichier est absent, repli sur les tuiles
 * OpenStreetMap en ligne.
 * ------------------------------------------------------------------------- */
const TILES_URL = '/tiles/maurice.pmtiles';
const ATTRIB = '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>';

const map = L.map('map', {
    zoomControl: false,
    minZoom: 8,
    maxZoom: 18,
    // On reste autour de Maurice et Rodrigues : seule zone couverte par le fond local.
    maxBounds: [[-21.2, 56.7], [-19.2, 64.1]],
    maxBoundsViscosity: 0.8,
}).setView([-20.25, 57.55], 10);
L.control.zoom({ position: 'topright' }).addTo(map);

async function createBasemaps() {
    const hasLocalTiles = await fetch(TILES_URL, { method: 'HEAD' }).then((r) => r.ok).catch(() => false);
    if (hasLocalTiles && window.protomapsL) {
        const vector = (flavor, seaColor) => {
            const layer = protomapsL.leafletLayer({
                url: TILES_URL, flavor, lang: 'fr', maxDataZoom: 15,
                attribution: `${ATTRIB} · <a href="https://protomaps.com">Protomaps</a>`,
            });
            layer.backgroundColor = seaColor; // hors de la zone extraite : couleur de la mer
            return layer;
        };
        return { 'Plan clair': vector('light', '#80deea'), 'Plan sombre': vector('dark', '#31353f') };
    }
    console.info('Fond de carte local absent (npm run tiles) : utilisation des tuiles OpenStreetMap en ligne.');
    const OSM_URL = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
    return {
        'Plan clair': L.tileLayer(OSM_URL, { maxZoom: 19, attribution: ATTRIB }),
        'Plan sombre': L.tileLayer(OSM_URL, { maxZoom: 19, attribution: ATTRIB, className: 'tiles-dark' }),
    };
}

const basemaps = await createBasemaps();
// Fond retenu par le visiteur (simple confort, facultatif)
let savedBase = null;
try { savedBase = localStorage.getItem('gm-basemap'); } catch { /* stockage indisponible */ }
(basemaps[savedBase] || basemaps['Plan clair']).addTo(map);
L.control.layers(basemaps, null, { position: 'topright' }).addTo(map);
map.on('baselayerchange', (e) => { try { localStorage.setItem('gm-basemap', e.name); } catch { /* ignoré */ } });

// Pendant qu'on place un signalement, un clic sur une couche place le point au lieu d'ouvrir une bulle.
const ui = { picking: false };

function popupHtml(props) {
    let html = `<b>${escapeHtml(props.name)}</b>`;
    for (const key of ['desc', 'type', 'loc', 'risk']) {
        if (props[key]) html += `<br>${escapeHtml(props[key])}`;
    }
    if (props.stats) html += `<br><em>${escapeHtml(props.stats)}</em>`;
    if (props.date) html += `<br><em>${escapeHtml(props.date)}</em>`;
    return html;
}

function openPopupUnlessPicking(layer, html, maxWidth = 260) {
    layer.on('click', (e) => {
        if (ui.picking) return;
        L.popup({ maxWidth }).setLatLng(e.latlng).setContent(html).openOn(map);
    });
}

/* ---------------------------------------------------------------------------
 * Couches du prototype 2025 (data.js : coordonnées [lat, lng])
 * ------------------------------------------------------------------------- */
const layers = {};

function polygonLayer(items, color, fillOpacity = 0.5) {
    return L.layerGroup(items.map((item) => {
        const poly = L.polygon(item.coords, { color: '#ffffff', weight: 1, fillColor: color, fillOpacity });
        openPopupUnlessPicking(poly, popupHtml(item));
        return poly;
    }));
}

function pointLayer(items, color) {
    return L.layerGroup(items.map((item) => {
        const m = L.circleMarker(item.coords, { radius: 6, color: '#ffffff', weight: 1, fillColor: color, fillOpacity: 0.9 });
        openPopupUnlessPicking(m, popupHtml(item));
        return m;
    }));
}

const db = APP_DATA;
layers['layer-poverty'] = polygonLayer(db.povertyZones, '#f97316');
layers['layer-flood'] = polygonLayer(db.floodZones, '#3b82f6');
layers['layer-coastal'] = polygonLayer(db.coastalRisks, '#ef4444');
layers['layer-districts'] = polygonLayer(db.districtPolygons, '#94a3b8', 0.1);
const poiColors = { green: '#10b981', history: '#8b5cf6', health: '#ec4899', pharmacy: '#be185d', social: '#db2777', emergency: '#ef4444', danger: '#b91c1c', tourist: '#facc15' };
for (const [cat, color] of Object.entries(poiColors)) {
    layers['layer-' + cat] = pointLayer(db.pointsOfInterest.filter((p) => p.cat === cat), color);
}

/* ---------------------------------------------------------------------------
 * Signalements citoyens (connecteur : GET /api/reports en GeoJSON)
 * ------------------------------------------------------------------------- */
let categories = [];
const categoryById = (id) => categories.find((c) => c.id === id) || { label: id, color: '#e2e8f0' };
layers['layer-reports'] = L.layerGroup();
const reportMarkers = new Map(); // id -> marker

function reportPopupHtml(p) {
    const cat = categoryById(p.category);
    const date = new Date(p.created_at).toLocaleString('fr-FR', { dateStyle: 'medium', timeStyle: 'short' });
    let html = `<b>${escapeHtml(cat.label)}</b><br><em>Signalé le ${escapeHtml(date)}</em><p>${escapeHtml(p.description)}</p>`;
    // La photo n'est téléchargée qu'à l'ouverture de la bulle.
    if (p.photo_url) html += `<img class="popup-photo" src="${escapeHtml(p.photo_url)}" alt="Photo du signalement" loading="lazy">`;
    return html;
}

async function refreshReports() {
    const res = await fetch('/api/reports');
    if (!res.ok) return;
    const { features } = await res.json();
    layers['layer-reports'].clearLayers();
    reportMarkers.clear();
    for (const f of features) {
        const [lng, lat] = f.geometry.coordinates;
        const m = L.circleMarker([lat, lng], {
            radius: 8, color: '#0f172a', weight: 2, fillColor: categoryById(f.properties.category).color, fillOpacity: 1,
        });
        openPopupUnlessPicking(m, reportPopupHtml(f.properties), 280);
        m.addTo(layers['layer-reports']);
        reportMarkers.set(f.properties.id, m);
    }
    document.getElementById('reports-count').textContent = features.length;
}

// Lien direct depuis l'espace admin : /?report=<id>
function focusReportFromUrl() {
    const id = new URLSearchParams(location.search).get('report');
    const m = id && reportMarkers.get(id);
    if (!m) return;
    map.setView(m.getLatLng(), 16);
    m.fire('click', { latlng: m.getLatLng() });
}

async function init() {
    categories = await (await fetch('/api/categories')).json();
    document.getElementById('reports-legend').innerHTML = categories
        .map((c) => `<li><span class="dot" style="background:${c.color}"></span>${escapeHtml(c.label)}</li>`)
        .join('');

    // Interrupteurs de couches
    document.querySelectorAll('.controls input[type=checkbox]').forEach((cb) => {
        const apply = () => (cb.checked ? layers[cb.id]?.addTo(map) : layers[cb.id]?.remove());
        apply();
        cb.addEventListener('change', apply);
    });

    initReportForm({
        map, ui, categories,
        onCreated: async () => {
            const cb = document.getElementById('layer-reports');
            if (!cb.checked) { cb.checked = true; layers['layer-reports'].addTo(map); }
            await refreshReports();
        },
    });

    await refreshReports();
    focusReportFromUrl();
}
init();

/* ---------------------------------------------------------------------------
 * Graphiques (repris du prototype 2025)
 * ------------------------------------------------------------------------- */
Chart.defaults.color = '#94a3b8';
Chart.defaults.borderColor = 'rgba(255, 255, 255, 0.1)';

const analysisPanel = document.getElementById('analysis-panel');
document.getElementById('close-analysis').addEventListener('click', () => analysisPanel.classList.add('hidden'));
function showAnalysis(title, text) {
    document.getElementById('analysis-title').innerText = title;
    document.getElementById('analysis-text').innerHTML = text;
    analysisPanel.classList.remove('hidden');
}

new Chart(document.getElementById('povertyChart'), {
    type: 'doughnut',
    data: {
        labels: ['Rodrigues', 'Port Louis', 'Black River', 'Plaines Wilhems', 'Grand Port', 'Flacq', 'Savanne', 'Pamplemousses', 'Rivière du Rempart', 'Moka'],
        datasets: [{
            label: 'Distribution pauvreté relative',
            data: [35, 20, 10, 10, 5, 5, 5, 4, 3, 3],
            backgroundColor: ['#7c2d12', '#c2410c', '#ea580c', '#f97316', '#fb923c', '#fdba74', '#fed7aa', '#ffedd5', '#fff7ed', '#f8fafc'],
            borderWidth: 0,
        }],
    },
    options: {
        responsive: true,
        plugins: {
            legend: { position: 'right', labels: { boxWidth: 10, font: { size: 10 } } },
            title: { display: true, text: 'Vulnérabilité par District (%)' },
        },
    },
});

new Chart(document.getElementById('floodChart'), {
    type: 'bar',
    data: {
        labels: ['2018', '2019', '2020', '2021', '2022', '2023'],
        datasets: [{ label: 'Événements inondation majeurs', data: [2, 3, 1, 4, 3, 5], backgroundColor: '#3b82f6', borderRadius: 4 }],
    },
    options: {
        responsive: true,
        plugins: { legend: { display: false }, title: { display: true, text: 'Fréquence inondations (tendance)' } },
        scales: { y: { beginAtZero: true } },
    },
});

document.getElementById('povertyChart').parentElement.addEventListener('click', () => showAnalysis(
    'Disparités par District',
    "Une analyse par district révèle des vulnérabilités spécifiques.<br><br><b>Rodrigues (35%)</b> et <b>Port Louis (20%)</b> concentrent la majorité des poches de pauvreté. Le district de <b>Black River (10%)</b> présente également une vulnérabilité notable malgré le développement touristique. Les districts ruraux comme Savanne et Grand Port montrent des poches localisées mais significatives.",
));
document.getElementById('floodChart').parentElement.addEventListener('click', () => showAnalysis(
    'Intensification hydrologique',
    "On note une tendance haussière des événements d'inondation majeurs (passant de 2 à 5 par an en 5 ans).<br><br>Cette augmentation est corrélée à deux facteurs : l'imperméabilisation des sols due à l'artificialisation (<i>Urban Sprawl</i>) et l'intensification des précipitations extrêmes liée au changement climatique. Le système de drainage actuel, conçu pour des périodes de retour décennales, est désormais obsolète face à des épisodes de pluies torrentielles (>100mm/24h) de plus en plus fréquents.",
));
