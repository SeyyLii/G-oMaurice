'use strict';
// Tests de l'API : `npm test`
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'geomaurice-test-'));
process.env.DATA_DIR = dataDir;
process.env.ADMIN_PASSWORD = 'secret-test';
const { app, stripJpegMetadata } = require('../server.js');

// JPEG minimal avec un segment EXIF factice contenant une « position GPS »
function fakeJpegWithExif() {
  const seg = (marker, payload) => {
    const len = Buffer.alloc(2); len.writeUInt16BE(payload.length + 2);
    return Buffer.concat([Buffer.from([0xff, marker]), len, payload]);
  };
  return Buffer.concat([
    Buffer.from([0xff, 0xd8]),
    seg(0xe0, Buffer.from('JFIF\0\x01\x01\0\0\x01\0\x01\0\0', 'binary')),
    seg(0xe1, Buffer.from('Exif\0\0GPS-20.1609,57.4977-SECRET')),
    seg(0xfe, Buffer.from('commentaire perso')),
    seg(0xdb, Buffer.alloc(65, 1)),
    Buffer.from([0xff, 0xda, 0x00, 0x08, 1, 2, 3, 4, 5, 6, 0xaa, 0xbb, 0xff, 0xd9]),
  ]);
}

let server, base;
test.before(async () => {
  server = app.listen(0);
  await new Promise((r) => server.once('listening', r));
  base = `http://127.0.0.1:${server.address().port}`;
});
test.after(() => { server.close(); fs.rmSync(dataDir, { recursive: true, force: true }); });

function form(fields, photo) {
  const fd = new FormData();
  for (const [k, v] of Object.entries(fields)) fd.append(k, String(v));
  if (photo) fd.append('photo', new Blob([photo], { type: 'image/jpeg' }), 'p.jpg');
  return fd;
}
const valid = { category: 'inondation', description: 'Route inondée, 30 cm d’eau', lat: -20.1609, lng: 57.4977 };

test('stripJpegMetadata retire EXIF et commentaires, garde l’image', () => {
  const out = stripJpegMetadata(fakeJpegWithExif());
  assert.ok(!out.includes(Buffer.from('SECRET')));
  assert.ok(!out.includes(Buffer.from('commentaire')));
  assert.ok(out.includes(Buffer.from('JFIF')));
  assert.deepEqual([...out.subarray(-2)], [0xff, 0xd9]);
});

test('création, affichage immédiat, retrait par l’admin', async () => {
  // envoi avec photo
  let res = await fetch(`${base}/api/reports`, { method: 'POST', body: form(valid, fakeJpegWithExif()) });
  assert.equal(res.status, 201);
  const created = await res.json();
  assert.equal(created.properties.category, 'inondation');
  assert.ok(created.properties.photo_url);

  // la photo stockée ne contient plus l'EXIF
  const stored = fs.readFileSync(path.join(dataDir, 'uploads', `${created.properties.id}.jpg`));
  assert.ok(!stored.includes(Buffer.from('SECRET')));

  // visible tout de suite (pas de modération)
  res = await fetch(`${base}/api/reports`);
  let geo = await res.json();
  assert.equal(geo.type, 'FeatureCollection');
  assert.equal(geo.features.length, 1);

  // retrait refusé sans compte admin
  res = await fetch(`${base}/api/reports/${created.properties.id}`, { method: 'DELETE' });
  assert.equal(res.status, 401);

  // mauvais mot de passe
  res = await fetch(`${base}/api/admin/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ password: 'non' }) });
  assert.equal(res.status, 401);

  // connexion admin puis retrait
  res = await fetch(`${base}/api/admin/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ password: 'secret-test' }) });
  const { token } = await res.json();
  const auth = { Authorization: `Bearer ${token}` };

  res = await fetch(`${base}/api/admin/stats`, { headers: auth });
  assert.deepEqual(Object.keys(await res.json()), ['reports', 'photos', 'photo_bytes']);

  res = await fetch(`${base}/api/reports/${created.properties.id}`, { method: 'DELETE', headers: auth });
  assert.equal(res.status, 204);
  assert.ok(!fs.existsSync(path.join(dataDir, 'uploads', `${created.properties.id}.jpg`)), 'photo supprimée du disque');

  geo = await (await fetch(`${base}/api/reports`)).json();
  assert.equal(geo.features.length, 0);

  // déconnexion : le jeton ne marche plus
  await fetch(`${base}/api/admin/logout`, { method: 'POST', headers: auth });
  res = await fetch(`${base}/api/admin/stats`, { headers: auth });
  assert.equal(res.status, 401);
});

test('validation des envois', async () => {
  const cases = [
    [{ ...valid, category: 'xxx' }, null],
    [{ ...valid, description: 'abc' }, null],
    [{ ...valid, lat: 48.85, lng: 2.35 }, null],          // Paris : hors territoire
    [{ ...valid, lat: 'abc' }, null],
    [valid, Buffer.from('pas une image')],
  ];
  for (const [fields, photo] of cases) {
    const res = await fetch(`${base}/api/reports`, { method: 'POST', body: form(fields, photo) });
    assert.equal(res.status, 400, JSON.stringify(fields));
  }
  // Rodrigues est accepté
  const res = await fetch(`${base}/api/reports`, { method: 'POST', body: form({ ...valid, lat: -19.71, lng: 63.42 }) });
  assert.equal(res.status, 201);
});

test('la description est stockée telle quelle (échappée à l’affichage)', async () => {
  const res = await fetch(`${base}/api/reports`, { method: 'POST', body: form({ ...valid, description: '<img src=x onerror=alert(1)>' }) });
  assert.equal(res.status, 201);
  const page = await (await fetch(`${base}/report.js`)).text();
  assert.match(page, /export function escapeHtml/);
});
