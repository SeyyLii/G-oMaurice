'use strict';
/*
 * Télécharge le fond de carte de l'île Maurice et de Rodrigues, une seule fois,
 * dans public/tiles/maurice.pmtiles. La carte n'appelle ensuite plus aucun
 * serveur de tuiles externe.
 *
 * Source : fond de carte Protomaps (données © OpenStreetMap, licence ODbL),
 * extrait du fichier mondial publié chaque jour sur build.protomaps.com.
 *
 * Prérequis : l'outil en ligne de commande `pmtiles`
 *   macOS   : brew install pmtiles
 *   Windows : télécharger pmtiles-windows-amd64.exe sur
 *             https://github.com/protomaps/go-pmtiles/releases,
 *             le renommer pmtiles.exe et le placer à la racine du projet
 *   Linux   : même page, archive Linux
 *
 * Utilisation : npm run tiles
 * Variables facultatives :
 *   PMTILES_BIN  chemin vers l'outil pmtiles
 *   BUILD_URL    archive source (par défaut : la plus récente de build.protomaps.com)
 *   MAXZOOM      niveau de zoom maximal (15 par défaut = détail des rues)
 */

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const ROOT = path.join(__dirname, '..');
const OUTPUT = path.join(ROOT, 'public', 'tiles', 'maurice.pmtiles');
const MAXZOOM = process.env.MAXZOOM || '15';

// Zone extraite : île Maurice + Rodrigues, avec une marge de mer.
// GeoJSON : coordonnées [longitude, latitude].
const box = (w, s, e, n) => [[[w, s], [e, s], [e, n], [w, n], [w, s]]];
const REGION = {
  type: 'Feature',
  properties: { name: 'Maurice et Rodrigues' },
  geometry: {
    type: 'MultiPolygon',
    coordinates: [box(57.20, -20.60, 57.90, -19.90), box(63.20, -19.85, 63.60, -19.60)],
  },
};

function findPmtiles() {
  const candidates = [
    process.env.PMTILES_BIN,
    'pmtiles',
    path.join(ROOT, process.platform === 'win32' ? 'pmtiles.exe' : 'pmtiles'),
  ].filter(Boolean);
  for (const bin of candidates) {
    const r = spawnSync(bin, ['version'], { encoding: 'utf8' });
    if (r.status === 0) return bin;
  }
  return null;
}

async function latestBuild() {
  // Les archives quotidiennes sont nommées AAAAMMJJ.pmtiles et conservées environ une semaine.
  for (let daysAgo = 0; daysAgo < 10; daysAgo++) {
    const d = new Date(Date.now() - daysAgo * 86400000);
    const name = d.toISOString().slice(0, 10).replaceAll('-', '');
    const url = `https://build.protomaps.com/${name}.pmtiles`;
    try {
      const res = await fetch(url, { method: 'HEAD' });
      if (res.ok) return url;
    } catch { /* on essaie le jour précédent */ }
  }
  throw new Error("Aucune archive récente trouvée sur build.protomaps.com. Vérifiez la connexion, ou indiquez-la avec BUILD_URL (voir https://maps.protomaps.com/builds/).");
}

async function main() {
  const bin = findPmtiles();
  if (!bin) {
    console.error("L'outil `pmtiles` est introuvable.");
    console.error('  macOS   : brew install pmtiles');
    console.error('  Windows : https://github.com/protomaps/go-pmtiles/releases → pmtiles-windows-amd64.exe,');
    console.error('            renommé pmtiles.exe et placé à la racine du projet');
    process.exit(1);
  }

  const source = process.env.BUILD_URL || await latestBuild();
  const regionFile = path.join(os.tmpdir(), 'geomaurice-region.geojson');
  fs.writeFileSync(regionFile, JSON.stringify(REGION));
  fs.mkdirSync(path.dirname(OUTPUT), { recursive: true });
  const tmpOutput = OUTPUT + '.part';

  console.log(`Source : ${source}`);
  console.log(`Zone   : île Maurice + Rodrigues, zoom 0 à ${MAXZOOM}`);
  const r = spawnSync(bin, ['extract', source, tmpOutput, `--region=${regionFile}`, `--maxzoom=${MAXZOOM}`], { stdio: 'inherit' });
  fs.rmSync(regionFile, { force: true });
  if (r.status !== 0) {
    fs.rmSync(tmpOutput, { force: true });
    console.error("L'extraction a échoué.");
    process.exit(1);
  }
  fs.renameSync(tmpOutput, OUTPUT);
  const mo = (fs.statSync(OUTPUT).size / 1024 / 1024).toFixed(1);
  console.log(`\n✔ Fond de carte enregistré : public/tiles/maurice.pmtiles (${mo} Mo)`);
}

main().catch((err) => { console.error(err.message); process.exit(1); });
