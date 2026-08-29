-- 19PokerClub · Nouvelle catégorie "Dotation Tickets casino"
-- Représente les tickets gagnés par les joueurs (le club leur doit ce
-- montant), à distinguer de "Ticket casino" (dépense) qui représente le
-- rachat en argent réel d'un ticket existant.
insert into categories (nom, type, couleur, icone, ordre)
values ('Dotation Tickets casino', 'depense', '#8A5FBF', 'trophy', 28)
on conflict do nothing;
