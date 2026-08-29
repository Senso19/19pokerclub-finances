-- 19PokerClub · Solde tickets casino en attente
-- À exécuter dans l'éditeur SQL Supabase.

alter table saisons
  add column if not exists solde_tickets_debut numeric(10,2) not null default 0;

-- Renseigne le solde actuel de tickets casino en attente (3206 €) sur la
-- saison active. Ce solde est ensuite ajusté automatiquement par l'appli à
-- chaque écriture validée dans les catégories : Adhésions par Bankroll,
-- Dons par Bankroll, Fin de validité TC, Paiement par Bankroll, Ticket casino.
update saisons
set solde_tickets_debut = 3206.00
where active = true;
