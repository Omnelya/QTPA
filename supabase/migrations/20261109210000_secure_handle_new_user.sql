-- v1.4.33 — Sécurisation de handle_new_user() (audit du 2026-11-09)
-- La fonction est un trigger (on_auth_user_created sur auth.users) : elle n'a
-- aucune raison d'être appelable via l'API (/rest/v1/rpc/handle_new_user).
-- 1) search_path vide : la fonction utilise déjà des noms qualifiés (public.profiles).
-- 2) Retrait du droit d'exécution pour PUBLIC, anon et authenticated.
-- Le trigger continue de fonctionner : Postgres ne contrôle EXECUTE qu'à la création du trigger.
alter function public.handle_new_user() set search_path = '';
revoke execute on function public.handle_new_user() from public, anon, authenticated;
