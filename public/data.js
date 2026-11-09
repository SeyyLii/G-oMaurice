const APP_DATA = {
    "povertyZones": [
        { "name": "Résidence La Cure", "desc": "Zone urbaine vulnérable", "stats": "1,250 foyers précaires", "coords": [[-20.142, 57.520], [-20.142, 57.530], [-20.150, 57.530], [-20.150, 57.520]] },
        { "name": "Roche Bois", "desc": "Forte densité, précarité", "stats": "Rev. moyen < 15k MUR", "coords": [[-20.135, 57.490], [-20.135, 57.505], [-20.145, 57.505], [-20.145, 57.490]] },
        { "name": "Poste de Flacq", "desc": "Communauté côtière vulnérable", "stats": "Tx chômage: 12%", "coords": [[-20.160, 57.725], [-20.160, 57.735], [-20.170, 57.735], [-20.170, 57.725]] },
        { "name": "Le Morne Village", "desc": "Isolement géographique", "stats": "Accès services: Faible", "coords": [[-20.440, 57.330], [-20.440, 57.340], [-20.450, 57.340], [-20.450, 57.330]] },
        { "name": "Cité Tole (Mahebourg)", "desc": "Habitat précaire", "stats": "Logements tôle: 85%", "coords": [[-20.410, 57.690], [-20.410, 57.700], [-20.420, 57.700], [-20.420, 57.690]] },
        { "name": "Bambous", "desc": "Poches de pauvreté identifiées", "stats": "Densité: 2500 hab/km²", "coords": [[-20.240, 57.395], [-20.240, 57.415], [-20.255, 57.415], [-20.255, 57.395]] },
        { "name": "Chemin Grenier", "desc": "Vulnérabilité sociale Sud", "stats": "Foyers aidés: 450+", "coords": [[-20.485, 57.455], [-20.485, 57.470], [-20.495, 57.470], [-20.495, 57.455]] }
    ],
    "floodZones": [
        { "name": "Port Louis (Canal Dayot)", "risk": "Risque crues éclair", "stats": "Débit max: 120 m³/s", "coords": [[-20.160, 57.480], [-20.160, 57.510], [-20.180, 57.510], [-20.180, 57.480]] },
        { "name": "Fond du Sac / Cottage", "risk": "Accumulation d'eau", "stats": "Inondations > 0.5m", "coords": [[-20.040, 57.580], [-20.040, 57.610], [-20.070, 57.610], [-20.070, 57.580]] },
        { "name": "Souillac", "risk": "Débordement rivière", "stats": "Fréquence: 1x/2 ans", "coords": [[-20.510, 57.510], [-20.510, 57.530], [-20.530, 57.530], [-20.530, 57.510]] }
    ],
    "coastalRisks": [
        { "name": "Trou aux Biches", "risk": "Érosion côtière", "stats": "Projet réhabilitation (Épis)", "coords": [[-20.030, 57.545], [-20.030, 57.560], [-20.050, 57.560], [-20.050, 57.545]] },
        { "name": "Flic en Flac", "risk": "Pression anthropique", "stats": "Recul: ~2.7m/an", "coords": [[-20.270, 57.360], [-20.270, 57.375], [-20.300, 57.375], [-20.300, 57.360]] },
        { "name": "Anse La Raie", "risk": "Submersion marine", "stats": "Cote: +1.5m IGN", "coords": [[-19.990, 57.620], [-19.990, 57.640], [-20.005, 57.640], [-20.005, 57.620]] }
    ],
    "pointsOfInterest": [
        { "name": "Ferme solaire SARAKO", "loc": "Bambous", "stats": "15.2 MW (Sarako PVP)", "coords": [-20.262, 57.432], "cat": "green" },
        { "name": "Ferme solaire Henrietta", "loc": "Henrietta", "stats": "17.5 MW (Akuo Energy)", "coords": [-20.354, 57.579], "cat": "green" },
        { "name": "Projet Qair", "loc": "Trou d'Eau Douce", "stats": "Stor'Sun (SS1/SS2)", "coords": [-20.242, 57.786], "cat": "green" },
        { "name": "Projet Qair", "loc": "Balaclava", "stats": "Stor'Sun (SS3)", "coords": [-20.083, 57.516], "cat": "green" },
        { "name": "Ferme Rivière des Anguilles", "loc": "Sud", "stats": "Projet Pilote", "coords": [-20.485, 57.551], "cat": "green" },

        { "name": "Inondations meurtrières 2013", "loc": "Port Louis", "date": "30 Mars 2013", "stats": "11 Victimes, 152mm < 90min", "coords": [-20.162, 57.499], "cat": "history" },
        { "name": "Flash flood 2021", "loc": "Bambous Virieux", "date": "Avril 2021", "stats": "408mm pluie, 9 évacués", "coords": [-20.345, 57.755], "cat": "history" },
        { "name": "Inondations Plaine Magnien", "loc": "Sud-Est", "date": "2022", "stats": "Perturbation aéroport", "coords": [-20.433, 57.633], "cat": "history" },

        { "name": "Hôpital Dr Jeetoo", "type": "Hôpital public", "loc": "Port Louis", "coords": [-20.163, 57.498], "cat": "health" },
        { "name": "Victoria Hospital (Candos)", "type": "Hôpital public", "loc": "Quatre Bornes", "coords": [-20.2783, 57.4765], "cat": "health" },
        { "name": "SSR National Hospital", "type": "Hôpital public", "loc": "Pamplemousses", "coords": [-20.1039, 57.5703], "cat": "health" },
        { "name": "Jawaharlal Nehru Hospital", "type": "Hôpital public", "loc": "Rose Belle", "coords": [-20.4046, 57.5930], "cat": "health" },
        { "name": "Flacq Hospital", "type": "Hôpital public", "loc": "Centre de Flacq", "coords": [-20.1922, 57.7192], "cat": "health" },
        { "name": "Wellkin Hospital", "type": "Clinique privée", "loc": "Moka", "coords": [-20.224, 57.514], "cat": "health" },
        { "name": "Clinique Darné", "type": "Clinique privée", "loc": "Floreal", "coords": [-20.3112, 57.5072], "cat": "health" },
        { "name": "Super Pharm", "type": "Pharmacie", "loc": "Rose Hill", "coords": [-20.244, 57.476], "cat": "pharmacy" },
        { "name": "MedActiv Pharmacy", "type": "Pharmacie", "loc": "Bagatelle", "coords": [-20.225, 57.496], "cat": "pharmacy" },
        { "name": "Pharmacie St Jean", "type": "Pharmacie", "loc": "Quatre Bornes", "coords": [-20.264, 57.480], "cat": "pharmacy" },
        { "name": "Centre Social de Bambous", "type": "Centre social", "loc": "Bambous", "coords": [-20.258, 57.405], "cat": "social" },
        { "name": "Centre Social de Roche Bois", "type": "Centre social", "loc": "Roche Bois", "coords": [-20.145, 57.505], "cat": "social" },
        { "name": "Centre Social de Grand Baie", "type": "Centre social", "loc": "Grand Baie", "coords": [-20.008, 57.582], "cat": "social" },

        { "name": "Caserne Centrale", "type": "Police", "loc": "Port Louis", "coords": [-20.165, 57.503], "cat": "emergency" },
        { "name": "Poste de Police", "type": "Police", "loc": "Rose Hill", "coords": [-20.242, 57.474], "cat": "emergency" },
        { "name": "Poste de Police", "type": "Police", "loc": "Grand Baie", "coords": [-20.010, 57.580], "cat": "emergency" },
        { "name": "Pompiers Coromandel", "type": "Pompiers", "loc": "Coromandel", "coords": [-20.185, 57.470], "cat": "emergency" },
        { "name": "Pompiers Quatre Bornes", "type": "Pompiers", "loc": "Quatre Bornes", "coords": [-20.265, 57.480], "cat": "emergency" },

        { "name": "Plage Flic en Flac", "type": "Baignade dangereuse", "loc": "Passe Sud", "coords": [-20.290, 57.362], "cat": "danger" },
        { "name": "Le Morne", "type": "Baignade dangereuse", "loc": "Courants forts", "coords": [-20.460, 57.310], "cat": "danger" },
        { "name": "Gris Gris", "type": "Baignade dangereuse", "loc": "Falasies", "coords": [-20.520, 57.530], "cat": "danger" },

        { "name": "Le Morne Brabant", "type": "Site touristique", "loc": "Le Morne", "coords": [-20.456, 57.322], "cat": "tourist" },
        { "name": "Chamarel 7 Coloured Earth", "type": "Site touristique", "loc": "Chamarel", "coords": [-20.4402, 57.3733], "cat": "tourist" },
        { "name": "Pamplemousses Garden", "type": "Site touristique", "loc": "Pamplemousses", "coords": [-20.1049, 57.5730], "cat": "tourist" },
        { "name": "Grand Bassin", "type": "Site touristique", "loc": "Savanne", "coords": [-20.4175, 57.4885], "cat": "tourist" },
        { "name": "Ile aux Cerfs", "type": "Site touristique", "loc": "Est", "coords": [-20.2667, 57.8000], "cat": "tourist" },
        { "name": "Trou aux Cerfs", "type": "Site touristique", "loc": "Curepipe", "coords": [-20.318, 57.512], "cat": "tourist" }
    ],
    "districtPolygons": [
        { "name": "Port Louis", "coords": [[-20.14, 57.48], [-20.14, 57.53], [-20.18, 57.53], [-20.18, 57.48], [-20.14, 57.48]] },
        { "name": "Plaines Wilhems", "coords": [[-20.20, 57.45], [-20.20, 57.55], [-20.33, 57.55], [-20.33, 57.45], [-20.20, 57.45]] },
        { "name": "Moka", "coords": [[-20.18, 57.53], [-20.20, 57.60], [-20.28, 57.60], [-20.25, 57.50], [-20.18, 57.53]] },
        { "name": "Pamplemousses", "coords": [[-20.02, 57.50], [-20.02, 57.62], [-20.14, 57.60], [-20.14, 57.48], [-20.02, 57.50]] },
        { "name": "Rivière du Rempart", "coords": [[-19.97, 57.58], [-19.97, 57.70], [-20.12, 57.75], [-20.10, 57.60], [-19.97, 57.58]] },
        { "name": "Flacq", "coords": [[-20.12, 57.65], [-20.12, 57.80], [-20.30, 57.80], [-20.30, 57.60], [-20.12, 57.65]] },
        { "name": "Grand Port", "coords": [[-20.30, 57.55], [-20.30, 57.75], [-20.50, 57.75], [-20.45, 57.55], [-20.30, 57.55]] },
        { "name": "Savanne", "coords": [[-20.40, 57.40], [-20.40, 57.55], [-20.53, 57.55], [-20.50, 57.35], [-20.40, 57.40]] },
        { "name": "Black River", "coords": [[-20.20, 57.30], [-20.20, 57.45], [-20.50, 57.35], [-20.50, 57.30], [-20.20, 57.30]] },
        { "name": "Rodrigues", "coords": [[-19.68, 63.38], [-19.68, 63.46], [-19.76, 63.46], [-19.76, 63.38], [-19.68, 63.38]] }
    ]
};