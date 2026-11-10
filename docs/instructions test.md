# Instructions de test — v1.1.0

> Tests à exécuter après configuration Supabase et déploiement.
> Prérequis : avoir exécuté les SQL de setup et déployé l'Edge Function.

---

## 0. Prérequis — vérifier la configuration

1. `js/auth.js` → `SUPABASE_ANON_KEY` remplacé par la vraie clé.
2. SQL `01_schema.sql` et `02_rls.sql` exécutés dans le dashboard Supabase.
3. Edge Function `admin-users` déployée (`supabase functions deploy admin-users --no-verify-jwt`).
4. Variables d'environnement de l'Edge Function configurées (`SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`).
5. Un premier compte admin créé manuellement dans Supabase Dashboard → Authentication → Users, avec son rôle inséré dans la table `profiles` : `INSERT INTO profiles (id, role) VALUES ('<uuid>', 'admin');`

---

## 1. Connexion (CRITIQUE)

1. Ouvrir l'app → ✅ écran de connexion affiché (pas l'écran setup).
2. Saisir des identifiants incorrects → ✅ message d'erreur « Identifiants incorrects. »
3. Saisir les identifiants du compte admin → ✅ accès à l'écran de configuration.
4. ✅ Email affiché dans le badge utilisateur.
5. ✅ Bouton « Admin » visible pour le compte admin, invisible pour un compte user.

---

## 2. Persistance de session

1. Se connecter, puis fermer l'onglet et rouvrir l'app.
2. ✅ L'app s'ouvre directement sur l'écran de configuration sans redemander le login.

---

## 3. Flux complet match + sync (non-régression)

1. Démarrer un match, ajouter des observations, terminer, exporter PDF.
2. ✅ Le match apparaît dans l'historique.
3. Pour un admin : ✅ le match est aussi visible dans Supabase Dashboard → Table Editor → matches.

---

## 4. Espace Admin

1. Cliquer « Admin » → ✅ liste des utilisateurs chargée depuis Supabase.
2. Créer un nouvel utilisateur (email + mot de passe respectant la politique) → ✅ apparaît dans la liste.
3. Réinitialiser le mot de passe d'un utilisateur → ✅ confirmation affichée.
4. Supprimer un utilisateur → ✅ disparaît de la liste et de Supabase Auth.

---

## 5. Changement de mot de passe

1. Cliquer « Mot de passe » → ✅ modale affichée.
2. Saisir un mauvais mot de passe actuel → ✅ erreur « Mot de passe actuel incorrect. »
3. Saisir le bon mot de passe actuel + nouveau respectant la politique → ✅ succès.
4. Se déconnecter, se reconnecter avec le nouveau mot de passe → ✅ connexion réussie.

---

## 6. Déconnexion

1. Cliquer « Déconnexion » → confirmer → ✅ retour à l'écran de login.
2. Fermer et rouvrir l'app → ✅ écran de login affiché (session supprimée).

---

## 7. Version affichée

1. Barre copyright → ✅ version `v1.1.0`.


---

## Tests à faire pour les versions 1.4.31 à 1.4.33

Faire ces tests sur l'iPad (ou le navigateur), après avoir rechargé l'application deux fois pour que la nouvelle version s'installe (vérifier le numéro 1.4.33 sur l'écran d'accueil).

1. **Reprise MT3 (1.4.31)** : lancer un match à 3 mi-temps, passer en MT3, fermer l'application sans terminer le match, la rouvrir. Le bandeau de reprise doit apparaître ; cliquer « Reprendre ». Le badge de période doit être orange (MT3) et le match doit être intact.
2. **Pas de doublon (1.4.32)** : terminer un match, exporter le PDF, puis cliquer « Accueil ». Ouvrir l'historique : le match doit apparaître **une seule fois**. Vérifier aussi dans l'écran Admin (tous les matchs) qu'il n'y a qu'une ligne.
3. **Nouveau match (1.4.32)** : faire un second match complet, l'enregistrer. L'historique doit contenir 2 matchs distincts (le premier n'est pas écrasé).
4. **Admin, son propre compte (1.4.33)** : en tant qu'admin, écran Admin, ligne de votre compte : changer votre rôle en « user » doit afficher un message d'erreur rouge et ne rien changer. Le bouton « Supprimer » n'existe pas sur votre ligne.
5. **Admin, autre compte (1.4.33)** : créer un compte de test avec un mot de passe valide, changer son rôle, réinitialiser son mot de passe, puis le supprimer. Tout doit fonctionner. Un mot de passe trop simple doit être refusé.
6. **Inscription (1.4.33)** : créer ou inviter un nouvel utilisateur, puis vérifier qu'il peut se connecter et enregistrer un match (le profil se crée automatiquement).
