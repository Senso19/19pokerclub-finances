# 19PokerClub — Suivi financier

Web app React + Supabase reprenant (et améliorant) le fichier "Suivi des
finances mensuel - 19PokerClub". Onglets couverts : **Vue d'ensemble**,
**Journal d'enregistrement**, **Caisse**, **Récap par mois**, plus une gestion
des **catégories** accessible depuis l'en-tête.

## Ce que ça ajoute par rapport au Google Sheet
- Ajout/modification/suppression d'écritures depuis un formulaire (plus de
  colonnes à décaler à la main).
- Solde banque et solde caisse calculés automatiquement, avec pointage de fin
  de mois (équivalent de la ligne "Vérification fin de mois").
- Graphique revenus/dépenses/solde cumulé par mois.
- Filtres et recherche dans le journal (catégorie, type, texte).
- Suivi séparé des "tickets casino".
- Mot de passe unique pour passer en mode édition ; consultation libre pour
  le reste du bureau/club.

## 1. Créer le projet Supabase
1. Sur [supabase.com](https://supabase.com), crée un nouveau projet (ex :
   `19pokerclub-finances`).
2. Dans l'éditeur SQL, colle et exécute le contenu de `supabase-schema.sql`
   (crée les tables `saisons`, `categories`, `ecritures`, `releves`, la vue
   `v_recap_mensuel`, et insère les catégories + la saison de départ avec le
   solde de banque 6338,07 € et le stock buvette 288 € lus dans ton fichier).
   Ajuste la date/le montant de départ si besoin (table `saisons`).
3. Dans **Project Settings → API**, récupère `Project URL` et la clé
   `anon public`.

## 2. Configurer l'app en local
```bash
cp .env.example .env
# remplis VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY
# VITE_EDIT_PASSWORD = mot de passe pour débloquer l'édition (par défaut "19pokerclub")

npm install
npm run dev
```

## 3. Déployer (GitHub → Vercel, comme tes autres projets)
1. Crée un repo GitHub sous le compte propriétaire du projet et pousse ce
   dossier.
   ⚠️ Sur tes précédents projets, le déploiement Vercel a échoué à cause d'un
   compte GitHub différent de celui du repo (`Senso19` vs `FredericCaetano`).
   Vérifie que le compte GitHub connecté à Vercel correspond bien au
   propriétaire du repo avant d'importer le projet.
2. Sur [vercel.com](https://vercel.com), "Add New… → Project", importe le
   repo.
3. Dans les Environment Variables du projet Vercel, ajoute
   `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_EDIT_PASSWORD`.
4. Déploie. Le fichier `vercel.json` gère déjà le rewrite SPA.

Je peux aussi le déployer directement pour toi via le connecteur Vercel une
fois que tu m'as donné l'URL et la clé Supabase — dis-le-moi.

## Structure
```
src/
  App.jsx                 orchestration, appels Supabase, onglets
  supabaseClient.js
  lib/format.js            formatage € / dates / mois
  lib/aggregate.js         agrégations mensuelles (partagées Dashboard/Récap)
  components/
    ChipStack.jsx          visuel "pile de jetons" (trésorerie)
    TransactionTable.jsx   tableau filtrable réutilisé Journal + Caisse
    EcritureModal.jsx      formulaire ajout/modif écriture
    PasswordGate.jsx       déverrouillage du mode édition
    CategoriesPanel.jsx    gestion des catégories
    StatCard.jsx
  views/
    Dashboard.jsx, Journal.jsx, Caisse.jsx, Recap.jsx
supabase-schema.sql
```

## Notes
- RLS désactivée sur les tables (cohérent avec tes autres outils internes) :
  la protection se fait uniquement via le mot de passe côté application, pas
  au niveau base de données. N'expose donc pas la clé `service_role`, reste
  sur la clé `anon`.
- La "saison active" est déterminée par `saisons.active = true`. Pour
  démarrer une saison 12, ajoute une nouvelle ligne dans `saisons` avec
  `active = true` et repasse l'ancienne à `false`.
  Test déploiement auto
