alter table public.matches add column if not exists etat jsonb not null default '{}'::jsonb;
comment on column public.matches.etat is 'Etat du match pour reouverture : nbMT, periode, scores mi-temps, durees, numeros joueurs, notes de pause...';
