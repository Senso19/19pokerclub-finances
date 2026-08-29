import { useMemo } from 'react'
import {
  ResponsiveContainer, ComposedChart, Bar, Line, XAxis, YAxis, Tooltip, CartesianGrid,
} from 'recharts'
import { Wallet, Banknote, TrendingUp, TrendingDown, Ticket } from 'lucide-react'
import ChipStack from '../components/ChipStack'
import StatCard from '../components/StatCard'
import { eur } from '../lib/format'
import { buildMonthlySeries, totalsFromSeries } from '../lib/aggregate'

export default function Dashboard({ ecritures, saison }) {
  const months = useMemo(() => buildMonthlySeries(ecritures, saison), [ecritures, saison])
  const totals = useMemo(() => totalsFromSeries(months), [months])

  const soldeBanque = useMemo(() => {
    let s = saison?.solde_banque_debut ?? 0
    for (const e of ecritures) {
      if (e.statut !== 'valide' || e.compte !== 'banque') continue
      s += e.type === 'recette' ? e.montant : -e.montant
    }
    return s
  }, [ecritures, saison])

  const soldeCaisse = useMemo(() => {
    let s = 0
    for (const e of ecritures) {
      if (e.statut !== 'valide' || e.compte !== 'caisse') continue
      s += e.type === 'recette' ? e.montant : -e.montant
    }
    return s
  }, [ecritures])

  const soldeTotal = soldeBanque + soldeCaisse
  const dernierMoisActif = [...months].reverse().find((m) => m.revenus || m.depenses)

  return (
    <div className="flex flex-col gap-6">
      <div className="bg-felt felt-texture rounded-3xl p-8 md:p-12 flex flex-col items-center shadow-card">
        <span className="text-ivory/50 text-xs uppercase tracking-[0.2em] font-semibold mb-2">
          {saison?.nom || 'Saison en cours'}
        </span>
        <div className="[&_.font-mono]:text-ivory [&_.text-ink\\/50]:text-ivory/50">
          <ChipStack value={soldeTotal} label="Trésorerie totale (banque + caisse)" />
        </div>
        <div className="flex gap-8 mt-6 text-ivory/80 text-sm">
          <span className="flex items-center gap-1.5">
            <Banknote size={14} /> Banque {eur(soldeBanque)}
          </span>
          <span className="flex items-center gap-1.5">
            <Wallet size={14} /> Caisse {eur(soldeCaisse)}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Revenus (saison)" value={eur(totals.revenus)} tone="good" icon={TrendingUp} />
        <StatCard label="Dépenses (saison)" value={eur(totals.depenses)} tone="bad" icon={TrendingDown} />
        <StatCard
          label="Écart (saison)"
          value={eur(totals.revenus - totals.depenses)}
          tone={totals.revenus - totals.depenses >= 0 ? 'good' : 'bad'}
        />
        <StatCard label="Tickets casino" value={eur(totals.ticketsCasino)} tone="gold" icon={Ticket} />
      </div>

      <div className="bg-white rounded-2xl shadow-card p-5">
        <h3 className="font-display text-lg font-semibold text-felt mb-4">Revenus / Dépenses par mois</h3>
        <ResponsiveContainer width="100%" height={320}>
          <ComposedChart data={months} margin={{ top: 4, right: 8, left: -12, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1C232111" vertical={false} />
            <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#1C232199' }} tickLine={false} axisLine={{ stroke: '#1C232122' }} />
            <YAxis tick={{ fontSize: 11, fill: '#1C232199' }} tickLine={false} axisLine={false} />
            <Tooltip
              formatter={(v, name) => [eur(v), name]}
              contentStyle={{ borderRadius: 12, border: '1px solid #1C232115', fontFamily: 'Inter' }}
            />
            <Bar dataKey="revenus" name="Revenus" fill="#2C5F8A" radius={[6, 6, 0, 0]} />
            <Bar dataKey="depenses" name="Dépenses" fill="#C1443C" radius={[6, 6, 0, 0]} />
            <Line
              type="monotone"
              dataKey="soldeCumule"
              name="Solde cumulé"
              stroke="#D9A63E"
              strokeWidth={2.5}
              dot={false}
            />
          </ComposedChart>
        </ResponsiveContainer>
        {dernierMoisActif && (
          <p className="text-xs text-ink/40 mt-3">
            Dernier mois avec des écritures : {dernierMoisActif.label} — solde cumulé {eur(dernierMoisActif.soldeCumule)}.
          </p>
        )}
      </div>
    </div>
  )
}
