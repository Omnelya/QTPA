/* ═══ STATE — État partagé et constantes ══════════════════════════════════
   vbeta.2 — Tags spécifiques par catégorie, Gestion du sifflet ajoutée
════════════════════════════════════════════════════════════════════════════ */

/* ── Catégories d'observations ── */
export const CA = [
  'SPP','SPA','J7M','Jet Franc','Continuité','Exécution du Jet','Passage en Force','Mauvais Bloc',
  'Jeu Passif','Marcher','Pied','Reprise de dribble','Zone',
  'Communication','Protocole'
];
export const CP = ["Placement","Déplacement","Zone d'influence","Gestion du sifflet","Gestuelle"];
export const CAU = 'Autre';

/* v1.5.1 : groupes A/B/C de la grille d'observations rapides.
   Les catégories gardent leur nom d'origine (les anciens suivis restent lisibles).
   cols = nombre de colonnes de cases du bloc (la grille de l'écran compte
   6 colonnes pour A, 1 pour B, 7 pour C — alignées sur 7 colonnes).
   'Autre' occupe la case libre de A1 (affichée en gris).
   Contiennent exactement CA + CP + CAU (vérifié par tests/families.test.mjs). */
export const FAMILIES = [
  { code: 'A', title: 'PROTECTION DU JEU', blocks: [
    { code: 'A1', title: 'GESTION DES DUELS', cols: 4, cats: ['Marcher', 'Reprise de dribble', 'Mauvais Bloc', 'Passage en Force', 'Pied', 'J7M', 'Zone', 'Autre'] },
    { code: 'A2', title: 'CONTINUITÉ DU JEU', cols: 2, cats: ['Continuité', 'Jeu Passif', 'Exécution du Jet', 'Jet Franc'] }
  ] },
  { code: 'B', title: 'PROTECTION DES JOUEURS', short: 'JOUEURS', blocks: [
    { code: 'B1 / B2', title: 'IRRÉGULARITÉS ET COMPORTEMENTS ANTISPORTIFS', cols: 1, cats: ['SPP', 'SPA'] }
  ] },
  { code: 'C', title: 'SAVOIR ÊTRE', blocks: [
    { code: 'C1', title: "TECHNIQUE D'ARBITRAGE", cols: 4, cats: ['Placement', 'Déplacement', "Zone d'influence", 'Gestuelle'] },
    { code: 'C2', title: 'POUVOIR DÉCISIONNEL', cols: 3, cats: ['Communication', 'Gestion du sifflet', 'Protocole'] }
  ] }
];

/* ═══ TAGS SPÉCIFIQUES PAR CATÉGORIE ═════════════════════════════════════
   red   → tags affichés uniquement sur appui long rouge
   green → tags affichés uniquement sur appui long vert
   both  → tags affichés quelle que soit la couleur
═══════════════════════════════════════════════════════════════════════════ */
export const CAT_TAGS = {
  /* v1.10.0 : tags revus catégorie par catégorie avec Vincent (red = Non conforme, green = Conforme) */
  'SPP': {
    red:   ['Verbale retard', 'Manque CJ', 'Manque explication', 'Pas CJ après but'],
    green: ['Bonne verbale', 'Bon CJ'],
    both:  ['Duel pivot', 'Différée', 'Ne retient pas', 'Maillot', 'Pousse', 'Râle', 'Théâtralité', 'SPP pas assez']
  },
  'SPA': {
    red:   [],  green: [],
    both:  ['Retient', 'Pousse', 'Ceinturage', 'Dépassée', 'Ferme en retard', 'Neutralise par derrière', 'Tête visage gorge', 'Amène au sol', 'Ne retient pas', 'Duel pivot', 'Différée', 'SPA 2' ,'SPA CR', 'SPA CR+CB', 'Tir dans la tête', 'Pas besoin de concertation']
  },
  'J7M': {
    red:   ['Contact hors zone => JF', 'Joueur équilibré'],
    green: ['Défense en zone'],
    both:  ['OMB déjouée', 'Arrachage bras', 'Déséquilibre', 'Retient', 'Fermeture tardive']
  },
  'Protocole': {
    red:   ['Manque protocole', 'Sanctions', 'Décisions différentes'],
    green: ['Bon protocole', 'Sanctions', 'Décisions différentes'],
    both:  ['Protocole Sanction', 'Protocole TME', 'Protocole Jet 7m', 'Arrêter le temps', 'Regarde table', 'Protocole Soin', 'Entrée Soins']
  },
  'Passage en Force': {
    red:   ['Corps projectile', 'Non passif', 'Zone', "Pas gain d'intervalle", 'En retard'],
    green: ["Pas d'intervalle"],
    both:  ['Raffut', 'Épaule en avant']
  },
  'Mauvais Bloc': {
    red:   [],  green: [],
    both:  ['Hors cylindre (bras)', 'Hors cylindre (fesses)', 'Écran illégal']
  },
  'Pied': {
    red:   ['Pied hors cylindre => SPA2'],  green: [],
    both:  []
  },
  'Jet Franc': {
    red:   ['Bras bloqué', 'Reviens à la faute'],  green: [],
    both:  ['Pied hors du terrain']
  },
  'Exécution du Jet': {
    red:   [],  green: [],
    both:  ['Engagement', 'Jet Franc', 'J7M', 'Renvoi', 'Remise en jeu', 'Respect 3m', 'Replacer', 'Hors des 9m', 'Franchissement de la ligne', 'Ballon non maîtrisé', 'Pas dans le rond central', 'Debout']
  },
  'Jeu Passif': {
    red:   ['Trop tôt', 'Trop tard', 'Non cohérent', 'Lors maîtrise ballon'],
    green: ['Bon avertissement'],
    both:  ['2-3 passes après JF']
  },
  'Marcher': {
    red:   ['Marcher + but'],  green: [],
    both:  ['Piétine', '4 pas']
  },
  'Reprise de dribble': {
    red:   ['Ballon non dirigé vers sol'],  green: [],
    both:  ['Pas de maîtrise ballon']
  },
  'Zone': {
    red:   [],  green: [],
    both:  ['Passage en zone', 'Dribble en zone', 'Appui zone', 'Gardien non maître de son équilibre ET du ballon', 'Retour de zone']
  },
  'Continuité': {
    red:   ['Marcher + but'],  green: [],
    both:  ['Bras libre + équilibré', 'Irrégularité + perd la balle', 'Pas de faute', 'Siffle trop vite']
  },
  'Communication': {
    red:   ['TME long'],  green: ['Bonne comm.'],
    both:  ['Binôme','Banc', 'Coachs', 'Chronométreur', 'Secrétaire', 'Gestuelle floue', 'Gardien', 'Joueurs']
  },
  'Placement': {
    red:   [],  green: [],
    both:  ['Trop loin', 'Trop proche', 'Latéralité', 'Profondeur', 'Angle de vue', 'Côté opposé au banc']
  },
  'Déplacement': {
    red:   ['Contre-attaque trop lent'],  green: [],
    both:  ['Jaillissement', 'Permutation', 'Latéral', 'Profondeur', 'Course en C']
  },
  "Zone d'influence": {
    red:   [],  green: [],
    both:  ['Regarde le pivot en AZ', 'Pas ta zone', 'Crédibilité', 'Changement de zone']
  },
  'Gestuelle': {
    red:   ['Prend le temps'],
    green: ['Bonne théâtralité', 'Bonne gestuelle'],
    both:  []
  },
  'Gestion du sifflet': {
    red:   ['Enlève de la bouche', 'Adapte volume'],  green: [],
    both:  ['Croissant', 'Décroissant', 'Coups de sifflet brefs', 'Arrêt du temps', 'Coup de sifflet de reprise']  /* v1.13.0 : venu d'Exécution du Jet */
  }
};

/* ── Tags généraux (après les spécifiques dans l'appui long) ── */
/* v0.4.7 : tA et tB sont injectés dynamiquement en tête dans observations.js */
export const TAGS_GENERAUX = [
  'Contre-attaque', 'Montée balle rapide', 'Repli défensif', 'Attaque placée',
  'Jeu supériorité', 'Jeu infériorité', 'Ballon hors jeu', 'Après TME'
];

/* ── Ordre fixe des tags, rangés par groupes — v1.14.0 (maquette validée) ──
   Chaque tag garde toujours la même place. Au-delà de 6 tags visibles,
   les groupes nommés s'affichent avec un petit titre ; nom '' = sans titre. */
export const TAG_GROUPS = {
  'Marcher':            [['', ['Piétine', '4 pas', 'Marcher + but']]],
  'Reprise de dribble': [['', ['Pas de maîtrise ballon', 'Ballon non dirigé vers sol']]],
  'Mauvais Bloc':       [['', ['Hors cylindre (bras)', 'Hors cylindre (fesses)', 'Écran illégal']]],
  'Passage en Force':   [['Attaquant', ['Raffut', 'Épaule en avant', 'Corps projectile']],
                         ['Défenseur', ["Pas d'intervalle", "Pas gain d'intervalle", 'Non passif', 'En retard', 'Zone']]],
  'Pied':               [['', ['Pied hors cylindre => SPA2']]],
  'J7M':                [['Situation', ['OMB déjouée', 'Défense en zone', 'Contact hors zone => JF', 'Joueur équilibré']],
                         ['Défenseur', ['Retient', 'Arrachage bras', 'Déséquilibre', 'Fermeture tardive']]],
  'Zone':               [['', ['Passage en zone', 'Dribble en zone', 'Appui zone', 'Retour de zone', 'Gardien non maître de son équilibre ET du ballon']]],
  'Continuité':         [['', ['Pas de faute', 'Bras libre + équilibré', 'Irrégularité + perd la balle', 'Siffle trop vite', 'Marcher + but']]],
  'Jeu Passif':         [['', ['Bon avertissement', 'Trop tôt', 'Trop tard', 'Non cohérent', 'Lors maîtrise ballon', '2-3 passes après JF']]],
  'Exécution du Jet':   [['Type de jet', ['Engagement', 'Jet Franc', 'J7M', 'Renvoi', 'Remise en jeu']],
                         ['Position', ['Hors des 9m', 'Pas dans le rond central', 'Franchissement de la ligne', 'Respect 3m', 'Debout']],
                         ['Gestion', ['Ballon non maîtrisé', 'Replacer']]],
  'Jet Franc':          [['', ['Pied hors du terrain', 'Bras bloqué', 'Reviens à la faute']]],
  'SPP':                [['Faute', ['Maillot', 'Pousse', 'Ne retient pas', 'Duel pivot', 'Théâtralité', 'Râle']],
                         ['Sanction', ['Bonne verbale', 'Verbale retard', 'Bon CJ', 'Manque CJ', 'Pas CJ après but', 'Manque explication', 'SPP pas assez', 'Différée']]],
  'SPA':                [['Geste', ['Retient', 'Pousse', 'Ceinturage', 'Tête visage gorge', 'Amène au sol', 'Neutralise par derrière', 'Tir dans la tête', 'Duel pivot', 'Ne retient pas']],
                         ['Moment', ['Dépassée', 'Ferme en retard']],
                         ['Sanction', ['SPA 2', 'SPA CR', 'SPA CR+CB', 'Différée', 'Pas besoin de concertation']]],
  'Placement':          [['', ['Trop loin', 'Trop proche', 'Latéralité', 'Profondeur', 'Angle de vue', 'Côté opposé au banc']]],
  'Déplacement':        [['', ['Jaillissement', 'Permutation', 'Latéral', 'Profondeur', 'Course en C', 'Contre-attaque trop lent']]],
  "Zone d'influence":   [['', ['Regarde le pivot en AZ', 'Pas ta zone', 'Changement de zone', 'Crédibilité']]],
  'Gestuelle':          [['', ['Bonne gestuelle', 'Bonne théâtralité', 'Prend le temps']]],
  'Communication':      [['Avec qui', ['Binôme', 'Joueurs', 'Gardien', 'Banc', 'Coachs', 'Chronométreur', 'Secrétaire']],
                         ['Comment', ['Bonne comm.', 'Gestuelle floue', 'TME long']]],
  'Gestion du sifflet': [['Intensité', ['Croissant', 'Décroissant', 'Coups de sifflet brefs', 'Adapte volume']],
                         ['Usage', ['Arrêt du temps', 'Coup de sifflet de reprise']],
                         ['Geste', ['Enlève de la bouche']]],
  'Protocole':          [['Type', ['Protocole Sanction', 'Protocole TME', 'Protocole Jet 7m', 'Protocole Soin']],
                         ['Étapes', ['Arrêter le temps', 'Regarde table', 'Entrée Soins']],
                         ['Appréciation', ['Bon protocole', 'Manque protocole', 'Sanctions', 'Décisions différentes']]]
};

/* ── Catégories liées — v1.11.0 ──
   Même action saisie dans une seule fenêtre (« ＋ SPA » dans J7M…).
   Liaisons fixées par le suiveur, valables dans les deux sens. */
export const LINKS = {
  'J7M': ['SPA', 'SPP', "Zone d'influence"],                             /* v1.17.1 : + Zone d'influence */
  'SPA': ['J7M', 'Exécution du Jet'],
  'SPP': ['J7M', 'Exécution du Jet', 'Protocole'],
  'Jet Franc': ['Exécution du Jet'],
  'Exécution du Jet': ['Jet Franc', 'SPP', 'SPA', 'Gestion du sifflet'],  /* v1.13.0 : + SPP, SPA, Gestion du sifflet */
  'Gestion du sifflet': ['Exécution du Jet'],
  'Protocole': ['SPP'],                                                   /* v1.13.0 */
  "Zone d'influence": ['J7M']                                             /* v1.17.1 */
};

/* ── Durées (secondes) ── */
export const PL  = 30 * 60;
export const PLR =  5 * 60;

/* ── Questions d'évaluation générale ── */
export const QS = [
  { id: 'esprit',  lbl: "Bon etat d'esprit" },
  { id: 'engage',  lbl: 'Engagement physique acceptable' },
  { id: 'niveau',  lbl: 'Niveaux de jeu equilibres' }
];

/* ── Clés localStorage ── */
export const KEY_CURRENT = 'arbitres_hb_current';
export const KEY_HISTORY = 'arbitres_hb_history';

/* ── Réponses aux questions (mutable) ── */
export const ans = { esprit: null, engage: null, niveau: null };

/* ── Filtres tableau de synthèse (mutable) ── */
export const synFilters = { arb: 'all', per: 'all' };

/* ── Durée appui long (ms) ── */
export const LONG_PRESS_MS = 400;

/* ── État principal du match (mutable) ── */
export const S = {
  tA: 'Equipe A', tB: 'Equipe B',
  a1: 'Arb 1',    a2: 'Arb 2',
  mDate: '', mTime: '', mComp: '',

  run: false, elapsed: 0, period: 'MT1',
  timer: null, tick: null,

  sA: 0, sB: 0,
  htA: null, htB: null,

  /* v1.4.22 : TME par période — 2 slots max par MT, réinitialisés à chaque période */
  tme: { A: { MT1:[null,null], MT2:[null,null], MT3:[null,null] }, B: { MT1:[null,null], MT2:[null,null], MT3:[null,null] } },
  /* v1.4.27 : verrou définitif slot 1 dernière MT dès que les 5' sont atteintes sans TME */
  tmeLocked: { A: false, B: false },

  /* v1.4.19 : paramètres réglementaires configurables au démarrage */
  nbMT: 2,                          /* nombre de mi-temps : 2 ou 3         */
  dureesMT: [30 * 60, 30 * 60],     /* durée de chaque MT en secondes       */
  dureeProl: 5 * 60,                /* durée d'une prolongation en secondes */
  ht2A: null, ht2B: null,           /* score après MT2 (si 3 MT)            */

  obs: [],
  detailPending: null,
  pauseTme: false,
  numA: '', numB: '',   /* v1.7.1 : n° de joueurs facultatifs saisis à la préparation (ex « 1, 4, 7 ») */
  pauseNote: '', pauseNote2: '',   /* note de la 1re pause ; pauseNote2 = 2e pause (3 tiers-temps) */   /* v1.7.0 : « à dire à la pause » (écran mi-temps) */

  /* v0.3.31 (BUG-5) : flag indiquant qu'une action réelle a été effectuée
     dans l'écran match (chrono, score, TME, observation, contexte).
     Mis à true par chaque déclencheur, remis à false par startMatch()
     et goHome(). L'autosave sur fermeture ne se déclenche que si ce flag
     est true — empêche le bandeau de reprise fantôme après un simple
     démarrage de match sans action. */
  matchActif: false,

  /* v1.4.32 (BUG-DOUBLON) : identifiants de l'entrée déjà enregistrée pour ce
     match (historique local / table Supabase). Évite qu'un 2e appel à
     saveToHistory() (export PDF puis bouton Accueil) crée un doublon.
     Remis à null par _doGoHome() (match.js). */
  histId: null,
  remoteId: null,
  /* v1.14.2 : identifiant permanent du match (rangé dans matches.etat.uid) — permet de
     supprimer toutes les autres versions en ligne, même créées par un autre appareil. */
  uid: null,
  /* v1.16.0 : Préparation Suivi (js/prep.js) — null tant que l'écran n'a pas été ouvert */
  prep: null
};

/* ═══ Libellés de période — v1.7.2 ═══════════════════════════════════════
   Les valeurs internes restent 'MT1' 'MT2' 'MT3' (sauvegardes, PDF, filtres) ;
   seul l'affichage devient TT1 TT2 TT3 quand le match a 3 tiers-temps.     */
export const pl = p => (S.nbMT === 3 && typeof p === 'string' && /^MT\d$/.test(p)) ? 'TT' + p.slice(2) : p;
export const mtWord = () => (S.nbMT === 3 ? 'TT' : 'MT');

/* Met à jour les libellés fixes de la page (badge, filtres, colonnes, bouton). Idempotent. */
/* ── Actions liées (v1.11.0) : une action = 1 à 2 observations partageant `lien` ── */
/** Observations de la même action (ordre d'enregistrement), sinon [o]. */
export function linkGroup(o) {
  return o && o.lien ? S.obs.filter(x => x.lien === o.lien) : [o];
}
/** Une seule observation par action liée (la première rencontrée dans la liste). */
export function oneLinePerAction(list) {
  const seen = new Set();
  return list.filter(o => !o.lien || (!seen.has(o.lien) && seen.add(o.lien)));
}
/** « tags · note » d'une action : tags communs, puis tags propres préfixés par la catégorie. */
export function actionNote(g) {
  const note = (tags, cmt) => [tags.join(', '), cmt].filter(Boolean).join(' · ');
  if (g.length < 2) return note(g[0].tags || [], g[0].cmt);
  const own = (o, t) => { const d = CAT_TAGS[o.cat]; return !!d && (d.red.includes(t) || d.green.includes(t) || d.both.includes(t)); };
  const common = (g[0].tags || []).filter(t => g.every(o => (o.tags || []).includes(t) && !own(o, t)));
  const parts = [common.join(', ')];
  g.forEach(o => { const t = (o.tags || []).filter(x => !common.includes(x)); if (t.length) parts.push(o.cat + ' : ' + t.join(', ')); });
  parts.push(g[0].cmt);
  return parts.filter(Boolean).join(' · ');
}

export function applyPeriodLabels() {
  const w = mtWord();
  const pb = document.getElementById('PBadge');
  if (pb) pb.textContent = pl(S.period);
  document.querySelectorAll('#fltMT option, #fltMTE option').forEach(o => {
    o.textContent = o.value === 'all' ? 'Toutes ' + w : pl(o.value);
  });
  document.querySelectorAll('.olist thead th:nth-child(2)').forEach(t => { t.textContent = w; });
  ['MT1', 'MT2', 'MT3'].forEach(p => { const b = document.getElementById('sfPer-' + p); if (b) b.textContent = pl(p); });
  const bt = document.getElementById('btnMT');
  if (bt) bt.textContent = S.nbMT === 3 ? 'Tiers-temps' : 'Mi-temps';
}
