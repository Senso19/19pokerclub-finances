-- 19PokerClub · Suivi financier
-- À exécuter dans l'éditeur SQL de ton projet Supabase (RLS désactivée,
-- cohérent avec tes autres outils internes : accès protégé par mot de passe
-- côté application, pas par Supabase Auth).

create extension if not exists "uuid-ossp";

-- ── Saisons ──────────────────────────────────────────────────────────────
create table if not exists saisons (
  id uuid primary key default uuid_generate_v4(),
  nom text not null,                    -- ex: "Saison 11 (2025/2026)"
  date_debut date not null,
  date_fin date,
  solde_banque_debut numeric(10,2) not null default 0,
  stock_buvette_debut numeric(10,2) not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

-- ── Catégories ───────────────────────────────────────────────────────────
create table if not exists categories (
  id uuid primary key default uuid_generate_v4(),
  nom text not null,
  type text not null check (type in ('recette', 'depense', 'mixte')),
  couleur text not null default '#2C5F8A',   -- hex, utilisée pour le badge/chip
  icone text default 'circle',                -- nom d'icône lucide-react
  ordre integer not null default 0,
  archivee boolean not null default false,
  created_at timestamptz not null default now()
);

-- ── Écritures (Journal d'enregistrement) ────────────────────────────────
create table if not exists ecritures (
  id uuid primary key default uuid_generate_v4(),
  saison_id uuid references saisons(id) on delete set null,
  date date not null,
  categorie_id uuid references categories(id) on delete set null,
  description text not null default '',
  montant numeric(10,2) not null,             -- toujours positif
  type text not null check (type in ('recette', 'depense')),
  compte text not null check (compte in ('banque', 'caisse')) default 'banque',
  mode_paiement text default 'Virement',      -- Espèces, CB, Chèque, Virement...
  statut text not null check (statut in ('valide', 'en_attente')) default 'valide',
  ticket_casino boolean not null default false, -- coche les recettes liées aux tickets casino
  note text default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_ecritures_date on ecritures(date);
create index if not exists idx_ecritures_compte on ecritures(compte);
create index if not exists idx_ecritures_categorie on ecritures(categorie_id);
create index if not exists idx_ecritures_saison on ecritures(saison_id);

-- ── Relevés de compte (pour le contrôle "Vérification fin de mois") ─────
create table if not exists releves (
  id uuid primary key default uuid_generate_v4(),
  saison_id uuid references saisons(id) on delete set null,
  mois date not null,                  -- premier jour du mois concerné
  solde_banque_releve numeric(10,2),   -- montant lu sur le relevé bancaire
  solde_caisse_compte numeric(10,2),   -- montant compté en caisse physique
  date_pointage date,
  created_at timestamptz not null default now(),
  unique (saison_id, mois)
);

-- ── Vue : récap mensuel calculé depuis les écritures ────────────────────
create or replace view v_recap_mensuel as
select
  saison_id,
  date_trunc('month', date)::date as mois,
  compte,
  sum(case when type = 'recette' then montant else 0 end) as revenus,
  sum(case when type = 'depense' then montant else 0 end) as depenses,
  sum(case when type = 'recette' then montant else -montant end) as ecart,
  sum(case when ticket_casino then montant else 0 end) as tickets_casino
from ecritures
where statut = 'valide'
group by saison_id, date_trunc('month', date), compte;

-- ── Trigger updated_at ───────────────────────────────────────────────────
create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_ecritures_updated_at on ecritures;
create trigger trg_ecritures_updated_at
before update on ecritures
for each row execute function set_updated_at();

-- ── Désactive RLS (cohérent avec tes autres outils internes) ────────────
alter table saisons disable row level security;
alter table categories disable row level security;
alter table ecritures disable row level security;
alter table releves disable row level security;

-- ── Catégories de départ (modifiables ensuite dans l'appli) ─────────────
insert into categories (nom, type, couleur, icone, ordre) values
  ('Cotisations / Adhésions', 'recette', '#D9A63E', 'ticket', 1),
  ('Tournois - buy-ins', 'recette', '#2C5F8A', 'layers', 2),
  ('Buvette - ventes', 'recette', '#4A8B5C', 'coffee', 3),
  ('Tickets Casino', 'recette', '#8A5FBF', 'landmark', 4),
  ('Subventions / Partenariats', 'recette', '#3D7A8C', 'handshake', 5),
  ('Autres recettes', 'recette', '#7A8B99', 'plus-circle', 6),
  ('Prizepool - reversements', 'depense', '#C1443C', 'trophy', 7),
  ('Buvette - achats', 'depense', '#B5652C', 'shopping-cart', 8),
  ('Location de salle', 'depense', '#7A4A9E', 'home', 9),
  ('Matériel poker', 'depense', '#4B4E6D', 'spade', 10),
  ('Communication / Site', 'depense', '#2C6B6F', 'megaphone', 11),
  ('Assurance / Administratif', 'depense', '#5C5C5C', 'file-text', 12),
  ('Frais bancaires', 'depense', '#8A3B3B', 'landmark', 13),
  ('Autres dépenses', 'depense', '#7A8B99', 'minus-circle', 14)
on conflict do nothing;

-- ── Saison de départ (adapte les montants et dates si besoin) ───────────
insert into saisons (nom, date_debut, solde_banque_debut, stock_buvette_debut, active)
values ('Saison 11 (2025/2026)', '2025-09-01', 6338.07, 288.00, true)
on conflict do nothing;
