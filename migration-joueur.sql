-- 19PokerClub · Traçabilité du joueur sur les écritures tickets casino
alter table ecritures
  add column if not exists joueur text;
