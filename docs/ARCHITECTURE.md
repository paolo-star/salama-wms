# SALAMA WMS – Architecture du démonstrateur

© 2026 JPN Management Consulting – Tous droits réservés. Client : SALAMA.

## Principe
Application web monopage, sans serveur, en JavaScript natif. Le fichier `index.html` est assemblé par `tools/build.py` à partir des modules de `src/` et des bibliothèques de `vendor/`. Les données de démonstration sont conservées dans le stockage local du navigateur (clé `salama_wms_v1`).

## Modules (`src/`)
| Module | Rôle |
|---|---|
| 01-referentiels.js | Sous-parcours du plan de distribution 2027, flotte, logos |
| 02-noyau.js | Utilitaires, sites, agences, cycles, rôles, GS1 (GTIN, SSCC, GLN, analyse des identifiants), FEFO, colisage, choix des véhicules, données de démonstration |
| 03-interface.js | Menu, rendu des écrans, tableaux, QR et codes-barres, exports Excel et PDF |
| 04-entrees-stock.js | Réception, quarantaine, rangement, stock, emplacements, transferts, inventaires, transformation |
| 05-ressources-humaines.js | Pointage, tâches, performance, cibles, badges |
| 06-douchette.js | Lecture des douchettes en mode clavier, normalisation GS1, routage des scans |
| 07-distribution-tracabilite.js | Commandes, plan 2027, préparation, emballage, expédition, POD, agences, rappels, audit, paramétrage |
| 08-controles-integrite.js | Réservations, lots indisponibles, file X3 idempotente, alertes et actions, chaîne du froid, recette |
| 09-signature.js | Signature manuscrite numérique de la POD |
| 10-redevabilite-interoperabilite.js | Stock par bailleur, indicateurs, GS1 Digital Link, EPCIS 2.0, API, matrice des exigences, réclamations, journal chaîné |
| 11-authentification-comptes.js | Authentification, comptes, contrôle des doublons, activation, menu par catégories |
| 12-langues.js | Interface bilingue français / anglais |

## Règles métier principales
- FEFO bloquant avec durée résiduelle minimale par article ; aucun prélèvement sur lot non libéré.
- Séparation des tâches contrôlée par le système (réception / libération, saisie / validation, préparation / contrôle, comptage / validation d'écart).
- Calendrier de cycle J-20 / J-15 / J-3 / J / J+7 ; choix du véhicule minimisant nombre × (volume + 15 m³) ; remplissage cible 95 %, alerte 80 %.
- Colisage en cartons d'origine et cartons 001 / 003 / 007 pour le vrac.
- Journal d'audit chaîné ; POD avec empreinte et signatures.

## Construction
```
python3 tools/build.py
```

## Passage en production (hors démonstrateur)
Serveur applicatif et base de données centralisée SALAMA, authentification côté serveur avec double facteur pour les administrateurs, connecteur Sage X3 réel, messagerie SMTP, sauvegardes chiffrées.
