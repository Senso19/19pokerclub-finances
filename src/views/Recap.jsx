import { useMemo } from 'react'
import { eur } from '../lib/format'
import { buildMonthlySeries, totalsFromSeries } from '../lib/aggregate'

function Row({ label, values, format = eur, tone, bold }) {
  return (
    <tr className="border-b border-ink/5 last:border-0">
      <td className={`px-4 py-3 sticky left-0 bg-white ${bold ? 'font-semibold text-ink' : 'text-ink/60'}`}>
        {label}
      </td>
      {values.map((v, i) => (
        <td
          key={i}
          className={`px-4 py-3 text-right font-mono tabular-nums whitespace-nowrap ${
            tone ? tone(v) : 'text-ink/80'
          } ${bold ? 'font-semibold' : ''}`}
        >
          {format(v)}
        </td>
      ))}
    </tr>
  )
}

export default function Recap({ ecritures, saison }) {
  const months = useMemo(() => buildMonthlySeries(ecritures, saison), [ecritures, saison])
  const totals = useMemo(() => totalsFromSeries(months), [months])

  const goodBad = (v) => (v >= 0 ? 'text-chip-blue' : 'text-chip-red')

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="font-display text-xl font-semibold text-felt">Récap par mois</h2>
        <p className="text-sm text-ink/50 mt-1">
          {saison?.nom} · solde de départ {eur(saison?.solde_banque_debut)}
        </p>
      </div>

      <div className="bg-white rounded-2xl shadow-card overflow-x-auto">
        <table className="text-sm min-w-[900px] w-full">
          <thead>
            <tr className="border-b border-ink/10 text-xs uppercase tracking-wide text-ink/40">
              <th className="px-4 py-3 text-left sticky left-0 bg-white">Mois</th>
              {months.map((m) => (
                <th key={m.key} className="px-4 py-3 text-right font-semibold whitespace-nowrap">
                  {m.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <Row label="Revenus" values={months.map((m) => m.revenus)} tone={() => 'text-chip-blue'} />
            <Row label="Dépenses" values={months.map((m) => m.depenses)} tone={() => 'text-chip-red'} />
            <Row label="Écart mensuel" values={months.map((m) => m.ecart)} tone={goodBad} bold />
            <Row label="Solde cumulé" values={months.map((m) => m.soldeCumule)} tone={goodBad} bold />
            <Row label="Tickets casino" values={months.map((m) => m.ticketsCasino)} tone={() => 'text-chip-gold'} />
          </tbody>
        </table>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl shadow-card p-5">
          <div className="text-xs uppercase tracking-widest text-ink/40 font-semibold mb-1">Total revenus</div>
          <div className="font-mono text-xl font-bold text-chip-blue">{eur(totals.revenus)}</div>
        </div>
        <div className="bg-white rounded-2xl shadow-card p-5">
          <div className="text-xs uppercase tracking-widest text-ink/40 font-semibold mb-1">Total dépenses</div>
          <div className="font-mono text-xl font-bold text-chip-red">{eur(totals.depenses)}</div>
        </div>
        <div className="bg-white rounded-2xl shadow-card p-5">
          <div className="text-xs uppercase tracking-widest text-ink/40 font-semibold mb-1">Écart saison</div>
          <div className={`font-mono text-xl font-bold ${totals.revenus - totals.depenses >= 0 ? 'text-chip-blue' : 'text-chip-red'}`}>
            {eur(totals.revenus - totals.depenses)}
          </div>
        </div>
      </div>
    </div>
  )
}
