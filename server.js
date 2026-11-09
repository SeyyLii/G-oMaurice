'use strict';

/*
 * GéoMaurice Citizen — serveur
 * - sert la carte (dossier public/)
 * - API des signalements citoyens (connecteur GéoMaurice) : /api/reports
 * - retrait manuel des signalements par un compte admin
 *
 * Choix de cette version : pas de file de modération, tout signalement
 * envoyé est publié immédiatement et reste affiché jusqu'à ce qu'un admin le retire.
 */

const path = require('node:path');
const fs = require('node:fs');
const crypto = require('node:crypto');
const express = require('express');
const multer = require('multer');
const { DatabaseSync } = require('node:sqlite');

// ---------------------------------------------------------------------------
// Configuration (variables d'environnement, voir .env.example)
// ---------------------------------------------------------------------------
const PORT = Number(process.env.PORT) || 3000;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || '';
const DATA_DIR = path.resolve(process.env.DATA_DIR || path.join(__dirname, 'data'));
const UPLOAD_DIR = path.join(DATA_DIR, 'uploads');
const TRUST_PROXY = process.env.TRUST_PROXY === '1';

const MAX_PHOTO_BYTES = 1.5 * 1024 * 1024; // la photo est déjà compressée côté navigateur
const MAX_DESCRIPTION = 500;
const REPORTS_PER_HOUR = 10;               // par adresse IP, gardé en mémoire uniquement
const SESSION_HOURS = 8;

// Catégories : source unique, exposée au front via /api/categories
const CATEGORIES = [
  { id: 'inondation', label: 'Inondation / eau stagnante', color: '#3b82f6' },
  { id: 'erosion', label: 'Érosion côtière', color: '#ef4444' },
  { id: 'glissement', label: 'Glissement de terrain', color: '#a16207' },
  { id: 'cyclone', label: 'Dégâts de cyclone / tempête', color: '#a855f7' },
  { id: 'secheresse', label: "Sécheresse / manque d'eau", color: '#f59e0b' },
  { id: 'pollution', label: 'Pollution / déchets', color: '#84cc16' },
  { id: 'autre', label: 'Autre', color: '#e2e8f0' },
];
const CATEGORY_IDS = new Set(CATEGORIES.map((c) => c.id));

// Territoire accepté : île Maurice et Rodrigues (boîtes englobantes larges)
const TERRITORY = [
  { name: 'Maurice', minLat: -20.6, maxLat: -19.9, minLng: 57.25, maxLng: 57.85 },
  { name: 'Rodrigues', minLat: -19.8, maxLat: -19.6, minLng: 63.3, maxLng: 63.55 },
];

// ---------------------------------------------------------------------------
// Base de données (SQLite intégré à Node, aucun service à installer)
// ---------------------------------------------------------------------------
fs.mkdirSync(UPLOAD_DIR, { recursive: true });
const db = new DatabaseSync(path.join(DATA_DIR, 'geomaurice.db'));
db.exec(`
  CREATE TABLE IF NOT EXISTS reports (
    id          TEXT PRIMARY KEY,
    category    TEXT NOT NULL,
    description TEXT NOT NULL,
    lat         REAL NOT NULL,
    lng         REAL NOT NULL,
    photo       TEXT,
    photo_bytes INTEGER NOT NULL DEFAULT 0,
    created_at  TEXT NOT NULL
  );
`);
// Volontairement : aucune donnée personnelle (ni nom, ni e-mail, ni IP) n'est stockée.

const stmt = {
  insert: db.prepare(`INSERT INTO reports (id, category, description, lat, lng, photo, photo_bytes, created_at)
                      VALUES (?, ?, ?, ?, ?, ?, ?, ?)`),
  all: db.prepare('SELECT * FROM reports ORDER BY created_at DESC'),
  get: db.prepare('SELECT * FROM reports WHERE id = ?'),
  del: db.prepare('DELETE FROM reports WHERE id = ?'),
  stats: db.prepare(`SELECT COUNT(*) AS reports,
                            SUM(CASE WHEN photo IS NOT NULL THEN 1 ELSE 0 END) AS photos,
                            COALESCE(SUM(photo_bytes), 0) AS photo_bytes
                     FROM reports`),
};

// ---------------------------------------------------------------------------
// Utilitaires
// ---------------------------------------------------------------------------

/**
 * Retire les métadonnées d'un JPEG (EXIF/GPS, XMP, commentaires…).
 * Le navigateur ré-encode déjà la photo (ce qui supprime l'EXIF) ; ce filtre
 * garantit l'anonymat même si un envoi contourne l'interface.
 */
function stripJpegMetadata(buf) {
  if (buf.length < 4 || buf[0] !== 0xff || buf[1] !== 0xd8) throw new Error('not-jpeg');
  const out = [buf.subarray(0, 2)];
  let i = 2;
  while (i + 4 <= buf.length) {
    if (buf[i] !== 0xff) throw new Error('bad-jpeg');
    const marker = buf[i + 1];
    if (marker === 0xda) { out.push(buf.subarray(i)); return Buffer.concat(out); } // début des données image
    const len = buf.readUInt16BE(i + 2);
    const isMeta = (marker >= 0xe1 && marker <= 0xef) || marker === 0xfe; // APP1..APP15 + COM
    if (!isMeta) out.push(buf.subarray(i, i + 2 + len));
    i += 2 + len;
  }
  throw new Error('bad-jpeg');
}

function inTerritory(lat, lng) {
  return TERRITORY.some((t) => lat >= t.minLat && lat <= t.maxLat && lng >= t.minLng && lng <= t.maxLng);
}

function toFeature(r) {
  return {
    type: 'Feature',
    geometry: { type: 'Point', coordinates: [r.lng, r.lat] },
    properties: {
      id: r.id,
      category: r.category,
      description: r.description,
      created_at: r.created_at,
      photo_url: r.photo ? `/uploads/${r.photo}` : null,
      photo_bytes: r.photo_bytes,
    },
  };
}

// Limiteur très simple, en mémoire (les IP ne sont jamais écrites sur disque)
function rateLimiter(max, windowMs) {
  const hits = new Map();
  setInterval(() => {
    const now = Date.now();
    for (const [k, ts] of hits) {
      const kept = ts.filter((t) => now - t < windowMs);
      if (kept.length) hits.set(k, kept); else hits.delete(k);
    }
  }, windowMs).unref();
  return (req, res, next) => {
    const now = Date.now();
    const ts = (hits.get(req.ip) || []).filter((t) => now - t < windowMs);
    if (ts.length >= max) return res.status(429).json({ error: 'Trop de requêtes, réessayez plus tard.' });
    ts.push(now);
    hits.set(req.ip, ts);
    next();
  };
}

// Sessions admin en mémoire (un redémarrage déconnecte l'admin)
const sessions = new Map(); // token -> expiration (ms)
function requireAdmin(req, res, next) {
  const m = /^Bearer (.+)$/.exec(req.get('authorization') || '');
  const exp = m && sessions.get(m[1]);
  if (!exp || exp < Date.now()) {
    if (m) sessions.delete(m[1]);
    return res.status(401).json({ error: 'Session admin invalide ou expirée.' });
  }
  next();
}
function passwordMatches(candidate) {
  if (!ADMIN_PASSWORD) return false;
  const a = crypto.createHash('sha256').update(String(candidate)).digest();
  const b = crypto.createHash('sha256').update(ADMIN_PASSWORD).digest();
  return crypto.timingSafeEqual(a, b);
}

// ---------------------------------------------------------------------------
// Application
// ---------------------------------------------------------------------------
const app = express();
app.disable('x-powered-by');
if (TRUST_PROXY) app.set('trust proxy', 1);

app.use((req, res, next) => {
  res.set({
    'X-Content-Type-Options': 'nosniff',
    // Seule l'origine du site est transmise aux serveurs de tuiles (OSM l'exige).
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'X-Frame-Options': 'DENY',
    'Content-Security-Policy': [
      "default-src 'self'",
      "script-src 'self'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob: https://tile.openstreetmap.org",
      "connect-src 'self'",
      "frame-ancestors 'none'",
    ].join('; '),
  });
  next();
});

// --- API publique : le connecteur GéoMaurice -------------------------------
app.get('/api/categories', (req, res) => res.json(CATEGORIES));

app.get('/api/reports', (req, res) => {
  // ETag (automatique dans Express) + no-cache : le navigateur revalide et reçoit
  // un 304 sans corps si rien n'a changé.
  res.set('Cache-Control', 'no-cache');
  res.json({ type: 'FeatureCollection', features: stmt.all.all().map(toFeature) });
});

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_PHOTO_BYTES, files: 1, fields: 6, fieldSize: 4 * 1024 },
});

app.post('/api/reports', rateLimiter(REPORTS_PER_HOUR, 60 * 60 * 1000), upload.single('photo'), (req, res) => {
  const category = String(req.body.category || '');
  const description = String(req.body.description || '').trim();
  const lat = Number(req.body.lat);
  const lng = Number(req.body.lng);

  if (!CATEGORY_IDS.has(category)) return res.status(400).json({ error: 'Catégorie inconnue.' });
  if (description.length < 5 || description.length > MAX_DESCRIPTION) {
    return res.status(400).json({ error: `La description doit faire entre 5 et ${MAX_DESCRIPTION} caractères.` });
  }
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || !inTerritory(lat, lng)) {
    return res.status(400).json({ error: 'Position invalide : le point doit se trouver à Maurice ou à Rodrigues.' });
  }

  const id = crypto.randomUUID();
  let photo = null;
  let photoBytes = 0;
  if (req.file) {
    let clean;
    try {
      clean = stripJpegMetadata(req.file.buffer);
    } catch {
      return res.status(400).json({ error: 'La photo doit être une image JPEG.' });
    }
    photo = `${id}.jpg`;
    photoBytes = clean.length;
    fs.writeFileSync(path.join(UPLOAD_DIR, photo), clean);
  }

  const round = (x) => Math.round(x * 1e5) / 1e5; // ~1 m : inutile de stocker plus de précision
  stmt.insert.run(id, category, description, round(lat), round(lng), photo, photoBytes, new Date().toISOString());
  res.status(201).json(toFeature(stmt.get.get(id)));
});

// --- Admin -----------------------------------------------------------------
app.post('/api/admin/login', rateLimiter(5, 15 * 60 * 1000), express.json({ limit: '2kb' }), (req, res) => {
  if (!ADMIN_PASSWORD) return res.status(503).json({ error: "ADMIN_PASSWORD n'est pas configuré sur le serveur." });
  if (!passwordMatches(req.body && req.body.password)) return res.status(401).json({ error: 'Mot de passe incorrect.' });
  const token = crypto.randomBytes(32).toString('hex');
  sessions.set(token, Date.now() + SESSION_HOURS * 3600 * 1000);
  res.json({ token, expires_in_hours: SESSION_HOURS });
});

app.post('/api/admin/logout', requireAdmin, (req, res) => {
  sessions.delete(req.get('authorization').slice(7));
  res.status(204).end();
});

app.get('/api/admin/stats', requireAdmin, (req, res) => {
  const s = stmt.stats.get();
  res.json({ reports: s.reports, photos: s.photos || 0, photo_bytes: s.photo_bytes });
});

// Retrait manuel d'un signalement : la ligne ET la photo sont supprimées.
app.delete('/api/reports/:id', requireAdmin, (req, res) => {
  const r = stmt.get.get(req.params.id);
  if (!r) return res.status(404).json({ error: 'Signalement introuvable.' });
  stmt.del.run(r.id);
  if (r.photo) fs.rmSync(path.join(UPLOAD_DIR, r.photo), { force: true });
  res.status(204).end();
});

// --- Fichiers statiques ------------------------------------------------------
// Bibliothèques servies localement : pas de CDN tiers, pas de traceur, fonctionne hors ligne.
app.use('/vendor/leaflet', express.static(path.join(__dirname, 'node_modules/leaflet/dist'), { maxAge: '30d' }));
app.use('/vendor/protomaps', express.static(path.join(__dirname, 'node_modules/protomaps-leaflet/dist'), { maxAge: '30d' }));
app.use('/vendor/chart.js', express.static(path.join(__dirname, 'node_modules/chart.js/dist'), { maxAge: '30d' }));
// Photos : noms uniques et immuables -> cache long.
app.use('/uploads', express.static(UPLOAD_DIR, { maxAge: '365d', immutable: true }));
app.use(express.static(path.join(__dirname, 'public'), { extensions: ['html'] }));

// --- Erreurs -----------------------------------------------------------------
app.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    const msg = err.code === 'LIMIT_FILE_SIZE' ? 'Photo trop lourde (1,5 Mo max).' : 'Envoi invalide.';
    return res.status(400).json({ error: msg });
  }
  console.error(err);
  res.status(500).json({ error: 'Erreur serveur.' });
});

if (require.main === module) {
  if (!ADMIN_PASSWORD) console.warn('⚠ ADMIN_PASSWORD non défini : la page admin sera inaccessible.');
  app.listen(PORT, () => console.log(`GéoMaurice Citizen : http://localhost:${PORT}  (admin : /admin)`));
}

module.exports = { app, stripJpegMetadata };
