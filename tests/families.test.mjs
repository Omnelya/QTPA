/* Vérifie que les familles de la grille couvrent exactement les catégories de l'app.
   Lancer : node tests/families.test.mjs */
import assert from 'node:assert/strict';
import { FAMILIES, CA, CP, CAU } from '../js/state.js';

const shown = FAMILIES.flatMap(g => g.blocks.flatMap(b => b.cats));
const expected = [...CA, ...CP, CAU];
assert.equal(shown.length, new Set(shown).size, 'une catégorie apparaît dans deux familles');
assert.deepEqual([...shown].sort(), [...expected].sort(), 'les familles ne couvrent pas exactement CA + CP + CAU');
console.log('OK : ' + shown.length + ' catégories, ' + FAMILIES.length + ' groupes');

/* v1.18.0 : liaisons valides, symétriques, triées A→Z ; « Autre » rangé dans son groupe */
const { LINKS, blockOf, catLabel, GROUPS } = await import('../js/state.js');
for (const [a, l] of Object.entries(LINKS)) {
  assert.ok(expected.includes(a), 'catégorie liée inconnue : ' + a);
  l.forEach(b => { assert.ok(expected.includes(b), 'catégorie liée inconnue : ' + b); assert.ok(LINKS[b].includes(a), 'liaison non symétrique : ' + a + ' → ' + b); });
  assert.deepEqual(l, [...l].sort((x, y) => x.localeCompare(y, 'fr')), 'liaisons non triées : ' + a);
  assert.equal(l.length, new Set(l).size, 'liaison en double : ' + a);
}
assert.deepEqual(LINKS['J7M'], ['Gestion du sifflet', 'Placement', 'Protocole', 'SPA', 'SPP', "Zone d'influence"]);
assert.deepEqual(LINKS['Gestuelle'], ['Jet Franc', 'Jeu Passif', 'Marcher', 'Passage en Force', 'Reprise de dribble', 'Zone']);
assert.equal(blockOf({}, 'Autre'), 'A1'); assert.equal(blockOf({ grp: 'C2' }, 'Autre'), 'C2');
assert.equal(blockOf({}, 'SPA'), 'B'); assert.equal(blockOf({ grp: 'C2' }, 'J7M'), 'A1');
assert.equal(catLabel({ cat: 'Autre', grp: 'B' }), 'Autre (B)'); assert.equal(catLabel({ cat: 'Autre' }), 'Autre');
assert.deepEqual(Object.keys(GROUPS), ['A1', 'A2', 'B', 'C1', 'C2']);
console.log('OK : ' + Object.keys(LINKS).length + ' catégories avec liaisons (symétriques, triées)');
