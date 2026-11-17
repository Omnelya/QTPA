# Tests automatiques de l'app (iPad / iPhone simulés)

Ces 17 scénarios ouvrent l'app dans un navigateur automatique (Playwright), simulent
un iPad et un iPhone, et vérifient les parcours : saisie, catégories liées, tags,
mi-temps, fin de match, débrief, réglages, réouverture, doublons…
Ils utilisent une **fausse base Supabase** : ta vraie base n'est jamais touchée.

## Lancer les tests (sur un ordinateur)

1. Installer Node.js (version 18 ou plus) : https://nodejs.org
2. Ouvrir un terminal dans le dossier du dépôt.
3. Une seule fois : `npm install` puis `npx playwright install chromium`
4. Tous les tests : `npm test`
5. Un seul test : `node tests/e2e/run.js doublons` (une partie du nom suffit)

Le bilan affiche ✔ ou ✘ par scénario. Les captures d'écran sont dans `tests/e2e/out/`
(dossier ignoré par git).

## Ajouter un test

Créer `tests/e2e/mon-sujet.test.js` en s'inspirant d'un test existant :
`require('./helpers')` fournit le faux Supabase (`SUPA_STUB`) et le dossier des
captures (`OUT`). L'app est servie sur `http://localhost:8123` par `run.js`.
Écrire `FAIL …` dans la console (ou sortir avec un code ≠ 0) signale un échec.
