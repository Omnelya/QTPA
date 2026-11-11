/* Vérifie que les familles de la grille couvrent exactement les catégories de l'app.
   Lancer : node tests/families.test.mjs */
import assert from 'node:assert/strict';
import { FAMILIES, CA, CP, CAU } from '../js/state.js';

const shown = FAMILIES.flatMap(f => f.cats);
const expected = [...CA, ...CP, CAU];
assert.equal(shown.length, new Set(shown).size, 'une catégorie apparaît dans deux familles');
assert.deepEqual([...shown].sort(), [...expected].sort(), 'les familles ne couvrent pas exactement CA + CP + CAU');
console.log('OK : ' + shown.length + ' catégories, ' + FAMILIES.length + ' familles');
