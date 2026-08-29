import { MOIS, MOIS_SAISON_ORDER } from './format'

// Construit la liste des mois de la saison (Sept -> Août) avec les cumuls
// d'écritures validées, dans l'esprit de l'onglet "Analyse par mois" /
// "Récap par mois" du fichier Google Sheet.
// `categories` sert à exclure les catégories "tickets casino" (Adhésions par
// Bankroll, Dons par Bankroll, Fin de validité TC, Paiement par Bankroll,
// Ticket casino) du calcul du solde de trésorerie réel : ces écritures ne
// déplacent aucun argent, elles ajustent seulement le solde de tickets dû
// aux adhérents.
export function buildMonthlySeries(ecritures, saison, categories = []) {
  const debut = saison ? new Date(saison.date_debut) : null
  const startYear = debut ? debut.getFullYear() : new Date().getFullYear()
  const catById = Object.fromEntries(categories.map((c) => [c.id, c]))

  const months = MOIS_SAISON_ORDER.map((monthIndex, i) => {
    const year = monthIndex >= (debut?.getMonth() ?? 8) ? startYear : startYear + 1
    return {
      key: `${year}-${String(monthIndex + 1).padStart(2, '0')}`,
      label: MOIS[monthIndex],
      monthIndex,
      year,
      revenus: 0,
      depenses: 0,
      ticketsCasino: 0,
      encaisse: 0,
      decaisse: 0,
    }
  })

  const byKey = Object.fromEntries(months.map((m) => [m.key, m]))

  for (const e of ecritures) {
    if (e.statut !== 'valide') continue
    const d = new Date(e.date)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    const m = byKey[key]
    if (!m) continue
    const cat = catById[e.categorie_id]
    const isTicket = cat && TICKETS_CASINO_CATEGORIES.has(cat.nom)
    if (e.type === 'recette') {
      m.revenus += e.montant
      if (e.ticket_casino) m.ticketsCasino += e.montant
      if (!isTicket) m.encaisse += e.montant
    } else {
      m.depenses += e.montant
      if (!isTicket) m.decaisse += e.montant
    }
  }

  let solde = (saison?.solde_banque_debut ?? 0) + (saison?.solde_caisse_debut ?? 0)
  for (const m of months) {
    m.ecart = m.revenus - m.depenses
    solde += m.encaisse - m.decaisse
    m.soldeCumule = solde
  }

  return months
}

export function totalsFromSeries(months) {
  return months.reduce(
    (acc, m) => ({
      revenus: acc.revenus + m.revenus,
      depenses: acc.depenses + m.depenses,
      ticketsCasino: acc.ticketsCasino + m.ticketsCasino,
    }),
    { revenus: 0, depenses: 0, ticketsCasino: 0 }
  )
}

// Somme des écritures validées par catégorie, séparé recettes / dépenses,
// trié du plus grand au plus petit — pour le graphique en barres horizontales
// de l'onglet Visualisation.
export function categoryTotals(ecritures, categories) {
  const catById = Object.fromEntries(categories.map((c) => [c.id, c]))
  const totals = {}

  for (const e of ecritures) {
    if (e.statut !== 'valide') continue
    const cat = catById[e.categorie_id]
    const key = `${e.type}:${e.categorie_id || 'none'}`
    if (!totals[key]) {
      totals[key] = { nom: cat?.nom || 'Sans catégorie', type: e.type, total: 0 }
    }
    totals[key].total += e.montant
  }

  const all = Object.values(totals)
  const recettes = all.filter((t) => t.type === 'recette').sort((a, b) => b.total - a.total)
  const depenses = all.filter((t) => t.type === 'depense').sort((a, b) => b.total - a.total)

  return { recettes, depenses }
}

// Catégories liées au solde de tickets casino en attente (lots dus aux
// adhérents, utilisables pour payer une cotisation ou un buy-in casino).
// Une recette dans ces catégories = un ticket est consommé (solde dû ↓).
// Une dépense dans ces catégories = un ticket est émis (solde dû ↑).
export const TICKETS_CASINO_CATEGORIES = new Set([
  'Adhésions par Bankroll',
  'Dons par Bankroll',
  'Fin de validité TC',
  'Paiement par Bankroll',
  'Ticket casino',
])

export function ticketsCasinoBalance(ecritures, categories, saison) {
  const catById = Object.fromEntries(categories.map((c) => [c.id, c]))
  let solde = saison?.solde_tickets_debut ?? 0
  for (const e of ecritures) {
    if (e.statut !== 'valide') continue
    const cat = catById[e.categorie_id]
    if (!cat || !TICKETS_CASINO_CATEGORIES.has(cat.nom)) continue
    solde += e.type === 'depense' ? e.montant : -e.montant
  }
  return solde
}
