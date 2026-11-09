# GéoMaurice Citizen 🌊

Carte des vulnérabilités climatiques de l'île Maurice (prototype 2025) **+ signalements citoyens** (2026).
Projet du module RSE ENV 5001 — Télécom SudParis × CEDTI.

## Ce que fait cette version

- **Carte** du prototype 2025 conservée : zones de pauvreté, zones inondables, risques côtiers, points d'intérêt, districts, graphiques.
- **Signaler** : un citoyen place un point (clic sur la carte ou « Utiliser ma position »), choisit un type de problème, écrit une description et ajoute une photo s'il le souhaite. Aucun compte n'est nécessaire et l'envoi est anonyme.
- **Publication immédiate** : il n'y a **pas de file de modération** dans cette version. Tout signalement envoyé apparaît tout de suite sur la carte.
- **Retrait manuel** : un signalement reste affiché jusqu'à ce qu'un admin le retire depuis `/admin`. Le retrait supprime définitivement le signalement et sa photo.

## Lancer sans Docker (développement)

Il faut Node.js 22.13 ou plus récent. La base de données est SQLite, intégrée à Node : rien d'autre à installer.

```bash
npm install
cp .env.example .env     # puis changer ADMIN_PASSWORD
npm run tiles            # une seule fois : télécharge le fond de carte de Maurice (voir plus bas)
npm start                # http://localhost:3000   — admin : http://localhost:3000/admin
npm test                 # tests de l'API
```

La base (`data/geomaurice.db`) et les photos (`data/uploads/`) sont créées automatiquement.

### Fond de carte local (`npm run tiles`)

Le fond de carte n'est pas chargé depuis un serveur externe. On télécharge **une seule fois** l'extrait couvrant l'île Maurice et Rodrigues, enregistré dans `public/tiles/maurice.pmtiles`. Ce fichier unique est servi par notre propre serveur, et le navigateur n'en lit que les morceaux dont il a besoin.

1. Installer l'outil `pmtiles` :
   - macOS : `brew install pmtiles`
   - Windows : télécharger `pmtiles-windows-amd64.exe` sur https://github.com/protomaps/go-pmtiles/releases, le renommer `pmtiles.exe` et le placer à la racine du projet.
2. Lancer `npm run tiles`. Le script trouve la version la plus récente du fond de carte Protomaps (données OpenStreetMap) et en extrait la zone de Maurice et de Rodrigues, jusqu'au zoom 15 (détail des rues).

Pour mettre la carte à jour, il suffit de relancer `npm run tiles`. Si le fichier est absent, la carte utilise les tuiles OpenStreetMap en ligne en solution de repli.

## Lancer avec Docker (recommandé, notamment en production)

Il faut Docker Desktop (Mac/Windows) ou Docker Engine (serveur Linux). Node et `pmtiles` n'ont pas besoin d'être installés : ils sont inclus dans l'image.

```bash
cp .env.example .env                           # puis changer ADMIN_PASSWORD
docker compose up -d --build                   # http://localhost:3000
docker compose run --rm app npm run tiles      # une seule fois : fond de carte de Maurice
```

| Commande | Effet |
|---|---|
| `docker compose logs -f app` | Voir les journaux |
| `docker compose down` | Arrêter (les données sont conservées) |
| `docker compose up -d --build` | Mettre à jour après une modification du code |
| `docker compose exec -T app tar czf - -C /app data > sauvegarde.tgz` | Sauvegarder la base et les photos |

**Où sont les données ?** Dans deux volumes Docker, qui survivent aux redémarrages et aux mises à jour :
- `geomaurice_data` : la base SQLite et les photos. **C'est celui-là qu'il faut sauvegarder.**
- `geomaurice_tiles` : le fond de carte.

`docker compose down -v` supprime ces volumes, donc **toutes les données**.

### En production (serveur du CEDTI)

1. Faire pointer le nom de domaine vers le serveur et ouvrir les ports 80 et 443.
2. Dans `.env`, renseigner `DOMAIN=…`, `TRUST_PROXY=1` et un mot de passe admin fort.
3. Lancer `docker compose --profile prod up -d --build`.

Le profil `prod` ajoute **Caddy** en reverse proxy (fichier `Caddyfile`). Caddy obtient et renouvelle le certificat HTTPS tout seul. L'application n'est jamais exposée directement : son port n'est ouvert que sur la machine elle-même (127.0.0.1).

```
Internet ──443──▶ caddy ──▶ app:3000 ──▶ volumes data (base + photos) et tiles (fond de carte)
```

Prévoir une sauvegarde automatique, par exemple chaque nuit via `cron`, avec la commande de sauvegarde ci-dessus, et garder une copie hors du serveur.

## Structure

```
server.js            serveur Express : API, admin, fichiers statiques
scripts/download-tiles.js   téléchargement du fond de carte (npm run tiles)
Dockerfile           image de l'application (Node + outil pmtiles)
compose.yaml         services app (+ caddy avec le profil prod), volumes
Caddyfile            reverse proxy HTTPS de production
public/
  index.html         page de la carte
  app.js             carte Leaflet, couches, graphiques
  report.js          formulaire de signalement + compression photo
  admin.html/.js     espace admin (liste, indicateurs, retrait)
  data.js            données du prototype 2025 (voir MANUEL_DONNEES.md)
  tiles/             fond de carte local maurice.pmtiles (non versionné)
  style.css
test/api.test.js     tests automatiques de l'API
```

## API (le « connecteur GéoMaurice »)

| Méthode | Route | Accès | Rôle |
|---|---|---|---|
| GET | `/api/reports` | public | Tous les signalements, en **GeoJSON** (réutilisable par n'importe quel SIG : QGIS, carte GéoMaurice…) |
| POST | `/api/reports` | public | Nouveau signalement (multipart : `category`, `description`, `lat`, `lng`, `photo` facultative) |
| GET | `/api/categories` | public | Liste des types de problèmes |
| POST | `/api/admin/login` | — | `{ "password": "…" }` → jeton de session (8 h) |
| DELETE | `/api/reports/:id` | admin | Retire un signalement et sa photo |
| GET | `/api/admin/stats` | admin | Nombre de signalements, de photos, volume stocké |

Exemple d'import dans QGIS : *Couche → Ajouter une couche vecteur → Protocole HTTP* → `https://<serveur>/api/reports`.

## Choix d'écoconception et de protection des données

| Choix | Pourquoi |
|---|---|
| **Leaflet + OpenStreetMap** à la place de Mapbox | Open source, pas de clé ni de facturation à l'usage. Le prototype 2025 ne démarrait pas sans clé Mapbox. Leaflet pèse environ 40 Ko contre environ 800 Ko pour une bibliothèque 3D, et fonctionne sur les téléphones modestes. |
| **Pas de vue 3D** | Le relief 3D n'apportait rien à la lecture des vulnérabilités, mais coûtait en données et en calcul. |
| **Fond de carte local**, limité à Maurice et Rodrigues | Plus de dépendance à un serveur de tuiles tiers, ni de clé ou de quota. Les tuiles vectorielles sont plus légères que des images. La carte reste centrée sur la zone utile. |
| **Plan clair par défaut**, plan sombre en option | Les deux styles sont dessinés dans le navigateur à partir du même fichier, sans aucun téléchargement supplémentaire. Le choix est mémorisé dans le navigateur. |
| **Photo compressée dans le navigateur** (1280 px max, JPEG qualité 0,7) | Une photo de smartphone de 9,5 Mo est envoyée en environ 250 Ko (mesuré en test), d'où moins de données mobiles et de stockage. |
| **Métadonnées supprimées** (navigateur + serveur) | L'EXIF peut contenir la position GPS et le modèle du téléphone. |
| **Aucune donnée personnelle stockée** | Ni nom, ni e-mail, ni adresse IP. L'IP sert seulement, en mémoire, à limiter le spam (10 envois par heure). |
| Position arrondie à 5 décimales (~1 m) | Inutile de stocker plus de précision. |
| Retrait = **suppression réelle** de la photo | Pas de stockage inutile. |
| Bibliothèques servies **localement**, pas de Google Fonts | Pas de CDN tiers ni de traceur, et moins de requêtes. |
| Photo affichée seulement à l'ouverture de la bulle, cache long, ETag sur l'API | Moins de transferts répétés. |
| Indicateurs dans l'admin (Mo stockés, Ko par photo) | Alimente directement les indicateurs RSE du projet. |

## Limites connues (à traiter plus tard)

- **Pas de modération** : un faux signalement ou une photo inappropriée reste visible jusqu'à son retrait manuel. La limite de 10 envois par heure réduit le spam, sans l'empêcher.
- **Un seul mot de passe admin**, et des sessions gardées en mémoire : un redémarrage du serveur (ou du conteneur) déconnecte l'admin.
- **Un seul conteneur applicatif** : SQLite et les sessions en mémoire ne permettent pas de lancer plusieurs copies de l'application en parallèle. C'est largement suffisant pour le volume attendu.
- **Fond de carte** : l'extrait local doit être mis à jour à la main (`npm run tiles`) pour suivre les évolutions d'OpenStreetMap. Données © OpenStreetMap (licence ODbL) : la mention de source doit rester affichée.
- **Graphiques de la barre latérale** : leurs valeurs, reprises du prototype 2025, sont écrites en dur dans `app.js` et **ne sont rattachées à aucune source**. Il faut les sourcer ou les retirer avant toute diffusion.
- **HTTPS obligatoire en production** : sans HTTPS, la géolocalisation est bloquée par les navigateurs et le mot de passe admin circule en clair.
- **Pas de mode hors ligne** : un envoi sans réseau échoue, et l'utilisateur doit réessayer.
- Les zones du prototype 2025 (`data.js`) sont des **rectangles approximatifs**, pas les contours officiels.
