# Manuel d'Ajout de Données

Ce guide explique comment ajouter ou modifier des données (points d'intérêt, zones d'inondation, etc.) dans l'application.

## Emplacement des Données

Toutes les données sont stockées dans le fichier :
`data.js` (à la racine du projet).

Ce fichier contient une variable globale `APP_DATA` qui regroupe toutes les informations affichées sur la carte.

## Comment ajouter un point d'intérêt

Cherchez la section `"pointsOfInterest"` dans `data.js`. C'est une liste (tableau) d'objets.
Pour ajouter un lieu, ajoutez un bloc comme celui-ci à la liste :

```javascript
{
    "name": "Nom du Lieu",
    "loc": "Ville ou District",
    "stats": "Information clé (ex: 15 MW, 2013, ...)",
    "coords": [-20.xxxx, 57.xxxx],  // [Latitude, Longitude]
    "cat": "category_id"
}
```

### 📍 Liste des catégories (`cat`)
Utilisez l'une de ces valeurs pour que le point s'affiche avec la bonne couleur/couche :

| Catégorie (`cat`) | Description |
| :--- | :--- |
| `green` | Énergie verte (solaire, éolien) |
| `history` | Historique des crues |
| `health` | Hôpitaux publics et privés |
| `pharmacy` | Pharmacies |
| `social` | Centres sociaux |
| `emergency` | Police, pompiers |
| `danger` | Zones de baignade dangereuse |
| `tourist` | Sites touristiques |

---

## 🗺️ Comment ajouter une zone (polygone)

Il y a 3 catégories principales de zones (polygones) dans `data.js` :
1. `povertyZones` (Pauvreté)
2. `floodZones` (Inondations)
3. `coastalRisks` (Risques Côtiers/Érosion)

Pour ajouter une zone, ajoutez un bloc dans la section correspondante :

```javascript
{
    "name": "Nom de la Zone",
    "desc": "Brève description",
    "stats": "Statistique (ex: Débit max)",
    "coords": [
        [-20.xxxx, 57.xxxx], // Point 1 [Lat, Lng]
        [-20.xxxx, 57.xxxx], // Point 2
        [-20.xxxx, 57.xxxx], // Point 3
        [-20.xxxx, 57.xxxx]  // Point 4 (Fermer la boucle si possible, ou au moins 3 points)
    ]
}
```

> **Note :** Les coordonnées doivent être au format `[Latitude, Longitude]` (ex: `[-20.16, 57.48]`). L'application se charge de les convertir pour la carte (MapLibre).

---

## Mise à jour

Une fois le fichier `data.js` sauvegardé, rafraîchissez simplement la page de votre navigateur (`index.html`) pour voir les changements. Aucune compilation n'est nécessaire.
