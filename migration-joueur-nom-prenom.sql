-- 19PokerClub · Colonnes joueur séparées (pour le rapport hebdomadaire)
alter table ecritures
  add column if not exists joueur_nom text,
  add column if not exists joueur_prenom text;
