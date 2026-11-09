# Sources et Références - Observatoire Résilience Côtière

Ce document détaille les sources officielles et rapports techniques utilisés pour élaborer les cartes et jeux de données de l'Observatoire.

## 1. Risques Climatiques & Environnementaux

### Zones Inondables (306 Zones)
- **Source Principale** : Land Drainage Authority (LDA) - Land Drainage Master Plan (2022/2025).
- **Détails** : La LDA a identifié 306 zones inondables à travers l'île, dont environ 62 sont classées à haut risque.
- **Référence** : Land Drainage Authority - Master Plan / Rapports de presse sur le lancement du Master Plan (Défi Média/L'Express 2025).
- **Données Cartographiées** :
    - Port Louis (Canal Dayot) : Zone historique de crues éclairs (Débit max observé >120 m³/s lors des crues de 2013).
    - Fond du Sac : Zone de cuvette sujette à l'accumulation d'eau.

### Risques Côtiers & Érosion
- **Source Principale** : Ministry of Environment, Solid Waste Management and Climate Change - Third National Communication (TNC) et Rapports JICA.
- **Données Spécifiques** :
    - Flic en Flac : Érosion active documentée (~2.7m/an sur certains segments). Source : University of Mauritius Research / Press Reports (2018-2024).
    - Trou aux Biches : Site prioritaire de réhabilitation côtière (Projet gouvernemental de protection avec épis et rechargement).
    - Le Morne / Sud : Zones exposées aux fortes houles et à la montée du niveau de la mer (Estimations : recul potentiel de 5-50m d'ici 2050).

### Historique des Crues
- **2013 (30 Mars)** : Inondations de Port Louis. Source : Mauritius Meteorological Services (MMS). Pluie record : 152mm en < 2h. 11 Victimes.
- **2021 (Avril)** : Crues Sud-Est. Source : MMS. 408mm en 24h à Plaisance.
- **2022 (Mars)** : Crues éclairs Vallée-des-Prêtres.

---

## 2. Socio-Économie & Vulnérabilité

### Pauvreté (Poches de Pauvreté)
- **Source Principale** : Statistics Mauritius & Social Register of Mauritius (SRM).
- **Précision** : Le terme "229 Poches" fait référence aux groupes de foyers bénéficiaires identifiés par le SRM et la National Empowerment Foundation (NEF) pour le plan Marshall.
- **Statistiques** :
    - Rodrigues : Taux de pauvreté relative nettement supérieur à l'île principale (souvent cité autour de 40% dans les rapports économiques comparatifs).
    - Cités Ouvrières : Zones urbaines denses (Ex: La Cure, Roche Bois) avec forte concentration de bénéficiaires SRM.
    - Rapport Récent : IMF Staff Country Report No. 25/137 (2025) - Basé sur le Household Budget Survey 2023. Confirme les fortes disparités régionales et la vulnérabilité accrue de Rodrigues (Figure 4 du rapport).

### Démographie & Infrastructures
- **Données de Base** : Statistics Mauritius - Census 2011 & 2022.
- **Districts** : Limites administratives officielles.

---

## 3. Énergie & Infrastructures Vertes

### Fermes Solaires
- **Source** : Central Electricity Board (CEB) - Renewable Energy Projects.
- **Sites Vérifiés** :
    - Sarako (Bambous) : 15.2 MW (Opérationnel depuis 2014).
    - Henrietta (Akuo Energy) : 17.5 MW (Opérationnel depuis 2019).
    - Qair (Stor'Sun) : Projets à Trou d'Eau Douce et Balaclava (Technologie SS1/SS2).

---

## 4. Services Publics & Points d'Intérêt

### Santé
- **Source** : Ministry of Health and Wellness.
- **Établissements** : Liste des 5 Hôpitaux Régionaux (Jeetoo, Victoria, SSRN, Nehru, Flacq) et cliniques privées majeures (Wellkin, C-Care).

### Sécurité (Police/Pompiers)
- **Source** : Mauritius Police Force (MPF) & Mauritius Fire and Rescue Service.

---

## Technologies & Outils Techniques

- **Leaflet 1.9** (open source, sans clé) : moteur de cartographie, avec **protomaps-leaflet** pour dessiner le fond de carte vectoriel. Fond de carte : extrait Protomaps de Maurice et Rodrigues (données © OpenStreetMap, ODbL), hébergé localement.
- **Chart.js** : Visualisation des données statistiques.
- **Historique** : Leaflet puis Mapbox GL JS (prototype 2025) ; retour à Leaflet en 2026 (pas de clé ni de facturation à l'usage, bibliothèque légère).
- **GeoJSON** : Format de structuration des données géospatiales.
