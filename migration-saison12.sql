-- 19PokerClub · Migration Saison 12 (2026-2027)
-- À exécuter dans l'éditeur SQL Supabase, à la suite du schéma initial.

-- ── 1. Archive les anciennes catégories génériques (on ne les supprime pas,
--       au cas où des écritures de test les référencent) ──────────────────
update categories set archivee = true where archivee = false;

-- ── 2. Catégories réelles du club ────────────────────────────────────────
insert into categories (nom, type, couleur, icone, ordre) values
  ('Adhésions', 'recette', '#D9A63E', 'ticket', 1),
  ('Adhésions par Bankroll', 'recette', '#D9A63E', 'ticket', 2),
  ('Buvette', 'recette', '#4A8B5C', 'coffee', 3),
  ('Buvette par CB', 'recette', '#4A8B5C', 'credit-card', 4),
  ('Frais bancaire', 'recette', '#3D7A8C', 'landmark', 5),
  ('Dons', 'recette', '#8A5FBF', 'gift', 6),
  ('Dons par Bankroll', 'recette', '#8A5FBF', 'gift', 7),
  ('Divers recettes', 'recette', '#7A8B99', 'plus-circle', 8),
  ('Fin de validité TC', 'recette', '#B5652C', 'ticket', 9),
  ('Paiement par Bankroll', 'recette', '#2C5F8A', 'wallet', 10),
  ('Festival: Buvette & restauration', 'recette', '#4A8B5C', 'utensils', 11),
  ('Charges Fixes', 'depense', '#5C5C5C', 'file-text', 12),
  ('Buvette', 'depense', '#4A8B5C', 'coffee', 13),
  ('Traiteur ou repas divers', 'depense', '#B5652C', 'utensils', 14),
  ('Matériel poker', 'depense', '#4B4E6D', 'spade', 15),
  ('Consommable', 'depense', '#7A4A9E', 'package', 16),
  ('Cadeaux offerts', 'depense', '#C1443C', 'gift', 17),
  ('Frais bancaire', 'depense', '#8A3B3B', 'landmark', 18),
  ('Retrait espèces', 'depense', '#2C5F8A', 'banknote', 19),
  ('Ticket casino', 'depense', '#8A5FBF', 'ticket', 20),
  ('Adhésions par Bankroll', 'depense', '#D9A63E', 'ticket', 21),
  ('Dons par Bankroll', 'depense', '#8A5FBF', 'gift', 22),
  ('Location et achats divers', 'depense', '#7A4A9E', 'home', 23),
  ('Fin de validité TC', 'depense', '#B5652C', 'ticket', 24),
  ('Paiement par Bankroll', 'depense', '#2C5F8A', 'wallet', 25),
  ('Festival: Buvette & restauration', 'depense', '#4A8B5C', 'utensils', 26),
  ('Festival: Autres', 'depense', '#7A8B99', 'minus-circle', 27)
on conflict do nothing;

-- ── 3. Nouvelle saison 12 ────────────────────────────────────────────────
-- Désactive la saison précédente, ouvre la saison 12 avec le solde relevé
-- le 25/08/2026 (6985,05 €). Ajuste la date si tu préfères démarrer au
-- 1er septembre 2026 — la valeur ci-dessous n'a pas d'impact fonctionnel,
-- seul le nom des mois est affiché dans l'appli (pas l'année).
update saisons set active = false where active = true;

insert into saisons (nom, date_debut, solde_banque_debut, stock_buvette_debut, active)
values ('Saison 12 (2026-2027)', '2026-08-25', 6985.05, 0, true);
