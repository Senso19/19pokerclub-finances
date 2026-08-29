export const MOIS = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre',
]

export function eur(value) {
  const n = Number(value || 0)
  return n.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })
}

export function eurCompact(value) {
  const n = Number(value || 0)
  const sign = n < 0 ? '-' : ''
  return sign + Math.abs(n).toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })
}

export function shortDate(dateStr) {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

export function monthKey(dateStr) {
  const d = new Date(dateStr)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

export function monthLabel(monthKeyStr) {
  const [y, m] = monthKeyStr.split('-').map(Number)
  return `${MOIS[m - 1]} ${y}`
}
