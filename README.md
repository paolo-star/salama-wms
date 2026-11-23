# SALAMA WMS – Démonstrateur multi-sites

Système de gestion d’entrepôt (WMS) pour SALAMA, Madagascar : trois entrepôts centraux, agences régionales et distribution jusqu’au dernier kilomètre.

**Accès au démonstrateur :** https://paolo-star.github.io/salama-wms/

**Manuel d’utilisation (PDF) :** [manuel/SALAMA_WMS_Manuel_utilisation_v1.0.pdf](manuel/SALAMA_WMS_Manuel_utilisation_v1.0.pdf)

## Périmètre fonctionnel
- Réception par scan GS1, quarantaine et libération pharmaceutique
- Emplacements adressés jusqu’à la case (QR, GLN), rangement guidé, transferts, inventaires
- Stock par lot et FEFO, alertes de péremption, transformation et recomposition
- Commandes, validation DVM / DAS, plan de distribution cyclique 2027, préparation, contrôle, colisage SSCC, chargement
- Preuve de livraison électronique signée (POD), restes à livrer, agences
- Rappels de lots, journal d’audit chaîné, chaîne du froid, réclamations et destructions
- Stock par bailleur, indicateurs, interopérabilité (GS1 Digital Link, EPCIS 2.0, e-SIGL, DHIS2)
- Ressources humaines de l’entrepôt, douchettes, interface Sage X3 (simulée)
- Authentification, contrôle des doublons, activation des comptes par un administrateur ; interface FR / EN

## Structure du dépôt
- `index.html` : application assemblée, servie par GitHub Pages
- `src/` : code source par module ; `tools/build.py` : assemblage
- `vendor/` : bibliothèques tierces et leurs licences (voir `THIRD_PARTY_NOTICES.md`)
- `docs/ARCHITECTURE.md` : architecture et règles métier ; `CHANGELOG.md` : historique des versions
- `manuel/` : manuel d'utilisation (PDF)

## Statut
Démonstrateur fonctionnel destiné à la revue et à la validation des processus. Les données sont fictives et restent dans le navigateur de chaque utilisateur (aucun serveur). L’interface Sage X3 et l’envoi des courriels sont simulés.

## Propriété
© 2026 JPN Management Consulting – Tous droits réservés. Client : SALAMA.
Aucune licence d’utilisation, de copie ou de modification n’est accordée sans accord écrit préalable de JPN Management Consulting.
Contact : contact@jpnconsultant.com · www.jpnconsultant.com
