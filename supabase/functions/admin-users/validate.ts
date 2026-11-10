/* Validations côté serveur de l'Edge Function admin-users (v1.4.33).
   Le client valide déjà ces règles, mais seule la validation serveur est fiable. */

export const ROLES = ['user', 'admin'] as const;

export function isRole(r: unknown): boolean {
  return typeof r === 'string' && (ROLES as readonly string[]).includes(r);
}

/* Mêmes règles que PWD_RULES dans js/main.js. Retourne null si le mot de passe est valide. */
export function passwordError(p: unknown): string | null {
  if (typeof p !== 'string' || p.length < 8) return 'Mot de passe : 8 caractères minimum.';
  if (!/[A-Z]/.test(p))        return 'Mot de passe : au moins une majuscule.';
  if (!/[a-z]/.test(p))        return 'Mot de passe : au moins une minuscule.';
  if (!/[0-9]/.test(p))        return 'Mot de passe : au moins un chiffre.';
  if (!/[^A-Za-z0-9]/.test(p)) return 'Mot de passe : au moins un caractère spécial.';
  return null;
}

export function emailError(e: unknown): string | null {
  return typeof e === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e.trim()) ? null : 'Email invalide.';
}
