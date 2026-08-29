-- 19PokerClub · Ajout du solde de caisse initial
-- À exécuter dans l'éditeur SQL Supabase.

alter table saisons
  add column if not exists solde_caisse_debut numeric(10,2) not null default 0;

-- Renseigne le solde de caisse actuel (343 €) sur la saison active.
-- Si tu as déjà ajouté une écriture "Solde de départ caisse" à la main
-- dans le Journal/Caisse pour compenser, supprime-la avant de lancer ceci
-- (sinon les 343 € seraient comptés deux fois).
update saisons
set solde_caisse_debut = 343.00
where active = true;
