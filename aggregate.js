import { MOIS, MOIS_SAISON_ORDER } from './format'

// Construit la liste des mois de la saison (Sept -> Août) avec les cumuls
// d'écritures validées, dans l'esprit de l'onglet "Analyse par mois" /
// "Récap par mois" du fichier Google Sheet.
export function buildMonthlySeries(ecritures, saison) {
  const debut = saison ? new Date(saison.date_debut) : null
  const startYear = debut ? debut.getFullYear() : new Date().getFullYear()

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
    }
  })

  const byKey = Object.fromEntries(months.map((m) => [m.key, m]))

  for (const e of ecritures) {
    if (e.statut !== 'valide') continue
    const d = new Date(e.date)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    const m = byKey[key]
    if (!m) continue
    if (e.type === 'recette') {
      m.revenus += e.montant
      if (e.ticket_casino) m.ticketsCasino += e.montant
    } else {
      m.depenses += e.montant
    }
  }

  let solde = saison?.solde_banque_debut ?? 0
  for (const m of months) {
    m.ecart = m.revenus - m.depenses
    solde += m.ecart
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
