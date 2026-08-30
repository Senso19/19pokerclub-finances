import { MOIS } from './format'

// Construit la liste des mois de la saison, dans l'ordre réel à partir du
// mois de début de saison (ex: si la saison démarre le 25/08, l'ordre est
// Août -> Juillet suivant), avec les cumuls d'écritures validées, dans
// l'esprit de l'onglet "Analyse par mois" / "Récap par mois" du Sheet.
// `categories` sert à exclure les catégories "tickets casino" (Adhésions par
// Bankroll, Dons par Bankroll, Fin de validité TC, Paiement par Bankroll,
// Ticket casino) du calcul du solde de trésorerie réel : ces écritures ne
// déplacent aucun argent, elles ajustent seulement le solde de tickets dû
// aux adhérents.
export function buildMonthlySeries(ecritures, saison, categories = []) {
  const debut = saison ? new Date(saison.date_debut) : null
  const startMonth = debut ? debut.getMonth() : 8
  const startYear = debut ? debut.getFullYear() : new Date().getFullYear()
  const catById = Object.fromEntries(categories.map((c) => [c.id, c]))

  const monthOrder = Array.from({ length: 12 }, (_, i) => (startMonth + i) % 12)

  const months = monthOrder.map((monthIndex, i) => {
    const year = monthIndex >= startMonth ? startYear : startYear + 1
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
    const isTicket = cat && isNonCashTicketCategory(cat.nom, e.type)
    const isTransfer = cat && isInternalTransferCategory(cat.nom, e.type)
    if (e.type === 'recette') {
      if (e.ticket_casino) m.ticketsCasino += e.montant
      if (!isTicket && !isTransfer) m.revenus += e.montant
      if (!isTicket) m.encaisse += e.montant
    } else {
      if (!isTicket && !isTransfer) m.depenses += e.montant
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
    if (cat && (isNonCashTicketCategory(cat.nom, e.type) || isInternalTransferCategory(cat.nom, e.type))) continue
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
// La clé combine type ET nom car certaines catégories existent en recette
// ET en dépense sous le même nom, avec des effets différents sur le solde :
//  -1 = le solde dû diminue (un ticket est consommé / réglé)
//  +1 = le solde dû augmente (un nouveau ticket est dû à un joueur)
export const TICKET_ADJUSTMENTS = {
  'recette:Adhésions par Bankroll': -1,
  'recette:Dons par Bankroll': -1,
  'recette:Paiement par Bankroll': -1,
  'recette:Fin de validité TC': -1,
  'depense:Ticket casino': -1,
  'depense:Dotation Tickets casino': 1,
}

export function ticketSign(categorieNom, type) {
  return TICKET_ADJUSTMENTS[`${type}:${categorieNom}`]
}

export function isTicketAffectingCategory(categorieNom, type) {
  return ticketSign(categorieNom, type) !== undefined
}

// Parmi les catégories qui touchent le solde de tickets, certaines ne
// déplacent aucun argent réel (le joueur paie/est crédité avec son solde de
// tickets, pas avec de l'argent) : elles ne doivent donc pas impacter les
// soldes banque/caisse. "Ticket casino" (dépense) fait exception : c'est un
// vrai rachat en argent, il doit bien sortir de la trésorerie.
const NON_CASH_TICKET_CATEGORIES = new Set([
  'recette:Adhésions par Bankroll',
  'recette:Dons par Bankroll',
  'recette:Paiement par Bankroll',
  'recette:Fin de validité TC',
  'depense:Dotation Tickets casino',
])

export function isNonCashTicketCategory(categorieNom, type) {
  return NON_CASH_TICKET_CATEGORIES.has(`${type}:${categorieNom}`)
}

// "Caisse vers banque" déplace de l'argent d'un compte du club à l'autre :
// ça doit bien bouger les soldes banque/caisse individuellement, mais ce
// n'est ni une vraie recette ni une vraie dépense pour la saison.
const INTERNAL_TRANSFER_CATEGORIES = new Set(['recette:Caisse vers banque', 'depense:Caisse vers banque'])

export function isInternalTransferCategory(categorieNom, type) {
  return INTERNAL_TRANSFER_CATEGORIES.has(`${type}:${categorieNom}`)
}

// Catégories qui déclenchent la validation de la cotisation sur le
// formulaire d'inscription (recherche du joueur + mail d'alerte s'il est
// introuvable). "Adhésions par Bankroll" est dans les deux listes : elle
// touche le solde de tickets ET valide l'inscription.
const ADHESION_VALIDATION_CATEGORIES = new Set(['recette:Adhésions', 'recette:Adhésions par Bankroll'])

export function needsAdhesionValidation(categorieNom, type) {
  return ADHESION_VALIDATION_CATEGORIES.has(`${type}:${categorieNom}`)
}

export function needsJoueur(categorieNom, type) {
  return isTicketAffectingCategory(categorieNom, type) || needsAdhesionValidation(categorieNom, type)
}

export function ticketsCasinoBalance(ecritures, categories, saison) {
  const catById = Object.fromEntries(categories.map((c) => [c.id, c]))
  let solde = saison?.solde_tickets_debut ?? 0
  for (const e of ecritures) {
    if (e.statut !== 'valide') continue
    const cat = catById[e.categorie_id]
    if (!cat) continue
    const sign = ticketSign(cat.nom, e.type)
    if (sign === undefined) continue
    solde += sign * e.montant
  }
  return solde
}
