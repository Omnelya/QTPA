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
  'SPP': {
    red:   ['Verbale retard', 'Manque CJ', 'Manque explication', 'Pas CJ après but'],
    green: ['Bonne verbale', 'Bon CJ'],
    both:  ['Duel pivot']
  },
  'SPA': {
    red:   [],  green: [],
    both:  ['Retient', 'Pousse', 'Ceinturage', 'Dépassée', 'Ferme en retard', 'Neutralise par derrière', 'Tête visage gorge', 'Amène au sol', 'Ne retient pas', 'Duel pivot', 'SPA 2' ,'SPA CR', 'SPA CR+CB']
  },
  'J7M': {
    red:   [],  green: [],
    both:  ['Défense en zone', 'OMB', 'Équilibré', 'Retient', 'Retard']
  },
  'Protocole': {
    red:   ['Manque protocole', 'Sanctions', 'Décisions différentes'],
    green: ['Bon protocole', 'Sanctions', 'Décisions différentes'],
    both:  []
  },
  'Passage en Force': {
    red:   [],  green: [],
    both:  ["Pas d'intervalle", 'Raffut', 'Épaule en avant']
  },
  'Mauvais Bloc': {
    red:   [],  green: [],
    both:  ['Hors cylindre (bras)', 'Hors cylindre (fesses)', 'Écran illégal']
  },
  'Jet Franc': {
    red:   [],  green: [],
    both:  ['Pas au bon endroit', 'Sortir des 9m', 'Pied hors du terrain']
  },
  'Exécution du Jet': {
    red:   [],  green: [],
    both:  ['Engagement', 'Jet Franc', 'J7M', 'Renvoi', 'Remise en jeu', 'Respect 3m']  /* v0.4.6 : ajout tag 'Respect des 3m' */
  },
  'Jeu Passif': {
    red:   ['Trop tôt', 'Trop tard', 'Non cohérent'],
    green: ['Bon avertissement'],
    both:  ['2-3 passes après JF']
  },
  'Marcher': {
    red:   [],  green: [],
    both:  ['Piétine']
  },
  'Reprise de dribble': {
    red:   [],  green: [],
    both:  ['Pas de maîtrise ballon']
  },
  'Zone': {
    red:   [],  green: [],
    both:  ['Passage en zone', 'Dribble en zone', 'Appui zone', 'Gardien non maître de son équilibre ET du ballon']
  },
  'Continuité': {
    red:   [],  green: [],
    both:  ['Bras libre + équilibré', 'Irrégularité + perd la balle', 'Pas de faute']
  },
  'Communication': {
    red:   [],  green: ['Bonne comm.'],
   both:  ['Binôme','Banc', 'Coachs', 'Chronométreur', 'Secretaire', 'Gestuelle floue']
  },
  'Placement': {
    red:   [],  green: [],
    both:  ['Trop loin', 'Trop proche', 'Latéralité', 'Profondeur', 'Angle de vue']
  },
  'Déplacement': {
    red:   ['Contre-attaque trop lent'],  green: [],
    both:  ['Jaillissement', 'Permutation', 'Latéral', 'Profondeur']
  },
  "Zone d'influence": {
    red:   [],  green: [],
    both:  ['Regarde le pivot en AZ', 'Pas ta zone', 'Crédibilité', 'Changement de zone']
  },
  'Gestion du sifflet': {
    red:   [],  green: [],
    both:  ['Croissant', 'Décroissant', 'Coup de sifflet brefs', 'Arrêt du temps']
  }
};

/* ── Tags généraux (après les spécifiques dans l'appui long) ── */
/* v0.4.7 : tA et tB sont injectés dynamiquement en tête dans observations.js */
export const TAGS_GENERAUX = [
  'Contre-attaque', 'Montée balle rapide', 'Repli défensif', 'Attaque placée',
  'Jeu supériorité', 'Jeu infériorité', 'Ballon hors jeu'
];

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
  remoteId: null
};
