/* global L */
// Formulaire de signalement citoyen : position, catégorie, description, photo compressée.

const MAX_SIDE = 1280;      // px, côté le plus long de la photo envoyée
const JPEG_QUALITY = 0.7;
const MAX_BYTES = 1.2 * 1024 * 1024;

export function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

const kb = (bytes) => `${Math.round(bytes / 1024)} Ko`;

/**
 * Redimensionne et ré-encode la photo en JPEG dans le navigateur.
 * Le ré-encodage via <canvas> supprime toutes les métadonnées EXIF (dont le GPS).
 */
async function compressPhoto(file) {
    const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
    const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    canvas.getContext('2d').drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();
    const toBlob = (q) => new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', q));
    let blob = await toBlob(JPEG_QUALITY);
    if (blob.size > MAX_BYTES) blob = await toBlob(0.5);
    return { blob, width: canvas.width, height: canvas.height };
}

export function initReportForm({ map, ui, categories, onCreated }) {
    const $ = (id) => document.getElementById(id);
    const panel = $('report-panel');
    const form = $('report-form');
    const status = $('location-status');
    const errorBox = $('report-error');
    const submitBtn = $('submit-report');
    const desc = $('description');
    const photoInput = $('photo');

    const select = $('category');
    for (const c of categories) select.add(new Option(c.label, c.id));

    let position = null;  // { lat, lng }
    let photo = null;     // { blob, originalSize }
    let marker = null;

    const pinIcon = L.divIcon({ className: 'report-pin', html: '<span></span>', iconSize: [28, 28], iconAnchor: [14, 28] });

    function setPosition(latlng, source) {
        position = { lat: latlng.lat, lng: latlng.lng };
        if (!marker) {
            marker = L.marker(latlng, { icon: pinIcon, draggable: true, zIndexOffset: 1000 }).addTo(map);
            marker.on('dragend', () => setPosition(marker.getLatLng(), 'déplacé'));
        } else {
            marker.setLatLng(latlng);
        }
        status.textContent = `✔ Point ${source} (${position.lat.toFixed(4)}, ${position.lng.toFixed(4)}). Vous pouvez le déplacer.`;
        status.classList.add('ok');
    }

    function onMapClick(e) {
        if (ui.picking) setPosition(e.latlng, 'placé');
    }

    function open() {
        panel.classList.remove('hidden');
        ui.picking = true;
        map.getContainer().classList.add('picking');
        map.on('click', onMapClick);
        $('open-report').classList.add('hidden');
    }

    function close() {
        panel.classList.add('hidden');
        ui.picking = false;
        map.getContainer().classList.remove('picking');
        map.off('click', onMapClick);
        if (marker) { marker.remove(); marker = null; }
        position = null;
        photo = null;
        form.reset();
        $('desc-count').textContent = '0';
        $('photo-preview').classList.add('hidden');
        status.textContent = 'Touchez la carte pour placer le point, ou utilisez votre position.';
        status.classList.remove('ok');
        errorBox.textContent = '';
        $('open-report').classList.remove('hidden');
    }

    $('open-report').addEventListener('click', open);
    $('close-report').addEventListener('click', close);

    $('use-location').addEventListener('click', () => {
        if (!navigator.geolocation) {
            status.textContent = "La géolocalisation n'est pas disponible : touchez la carte.";
            return;
        }
        status.textContent = 'Recherche de votre position…';
        navigator.geolocation.getCurrentPosition(
            (pos) => {
                const latlng = L.latLng(pos.coords.latitude, pos.coords.longitude);
                setPosition(latlng, 'à votre position');
                map.flyTo(latlng, Math.max(map.getZoom(), 15));
            },
            () => { status.textContent = 'Position indisponible : touchez la carte pour placer le point.'; },
            { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 },
        );
    });

    desc.addEventListener('input', () => { $('desc-count').textContent = desc.value.length; });

    photoInput.addEventListener('change', async () => {
        const file = photoInput.files[0];
        if (!file) return;
        errorBox.textContent = '';
        try {
            const { blob, width, height } = await compressPhoto(file);
            photo = { blob, originalSize: file.size };
            $('photo-img').src = URL.createObjectURL(blob);
            $('photo-info').textContent = `${width}×${height} px · ${kb(blob.size)} envoyés (original : ${kb(file.size)})`;
            $('photo-preview').classList.remove('hidden');
        } catch {
            photo = null;
            photoInput.value = '';
            errorBox.textContent = 'Impossible de lire cette image. Essayez une photo JPEG ou PNG.';
        }
    });

    $('remove-photo').addEventListener('click', () => {
        photo = null;
        photoInput.value = '';
        $('photo-preview').classList.add('hidden');
    });

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        errorBox.textContent = '';
        if (!position) return (errorBox.textContent = 'Placez le signalement sur la carte.');
        if (!select.value) return (errorBox.textContent = 'Choisissez un type de problème.');
        if (desc.value.trim().length < 5) return (errorBox.textContent = 'Décrivez le problème en quelques mots (5 caractères min.).');

        const body = new FormData();
        body.append('category', select.value);
        body.append('description', desc.value.trim());
        body.append('lat', position.lat);
        body.append('lng', position.lng);
        if (photo) body.append('photo', photo.blob, 'photo.jpg');

        submitBtn.disabled = true;
        submitBtn.textContent = 'Envoi…';
        try {
            const res = await fetch('/api/reports', { method: 'POST', body });
            const json = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(json.error || 'Envoi impossible.');
            close();
            await onCreated(json);
            toast('Merci ! Votre signalement est visible sur la carte.');
        } catch (err) {
            errorBox.textContent = err.message === 'Failed to fetch' ? 'Pas de connexion : réessayez plus tard.' : err.message;
        } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = 'Envoyer le signalement';
        }
    });
}

function toast(message) {
    const el = document.getElementById('toast');
    el.textContent = message;
    el.classList.remove('hidden');
    clearTimeout(toast.timer);
    toast.timer = setTimeout(() => el.classList.add('hidden'), 4000);
}
