import { useMemo } from 'react'
import {
  ResponsiveContainer, BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, Cell,
} from 'recharts'
import { ExternalLink, Ticket, UserPlus } from 'lucide-react'
import { eur } from '../lib/format'
import { buildMonthlySeries, categoryTotals } from '../lib/aggregate'

const GREEN = '#2E9E5B'
const RED = '#D93B3B'
const BLUE = '#2E7DD1'

function CategoryBarList({ title, items, color }) {
  const max = Math.max(1, ...items.map((i) => i.total))
  return (
    <div className="bg-white rounded-2xl shadow-card p-5">
      <h3 className="font-display text-base font-semibold text-felt mb-4">{title}</h3>
      {items.length === 0 && <p className="text-sm text-ink/30">Aucune écriture pour l'instant.</p>}
      <div className="flex flex-col gap-2.5">
        {items.map((item) => (
          <div key={item.nom} className="flex items-center gap-3">
            <span className="text-xs text-ink/60 w-40 flex-shrink-0 truncate" title={item.nom}>
              {item.nom}
            </span>
            <div className="flex-1 bg-ink/5 rounded-full h-5 relative overflow-hidden">
              <div
                className="h-full rounded-full flex items-center justify-end px-2"
                style={{ width: `${Math.max(4, (item.total / max) * 100)}%`, backgroundColor: color }}
              >
                <span className="text-[10px] font-mono font-semibold text-white whitespace-nowrap">
                  {eur(item.total)}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function Visualisation({ ecritures, categories, saison }) {
  const months = useMemo(() => buildMonthlySeries(ecritures, saison, categories), [ecritures, saison, categories])
  const { recettes, depenses } = useMemo(() => categoryTotals(ecritures, categories), [ecritures, categories])

  const ticketsUrl = import.meta.env.VITE_TICKETS_URL
  const adhesionUrl = import.meta.env.VITE_ADHESION_URL

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="font-display text-xl font-semibold text-felt">Visualisation</h2>
          <p className="text-sm text-ink/50 mt-1">Les mêmes vues que le fichier Sheet, à jour en direct.</p>
        </div>
        <div className="flex gap-2">
          {ticketsUrl ? (
            <a
              href={ticketsUrl}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1.5 bg-white border border-ink/10 rounded-xl px-3.5 py-2 text-sm font-medium text-ink/70 hover:bg-ink/5"
            >
              <Ticket size={14} /> Tickets en attente <ExternalLink size={12} className="text-ink/30" />
            </a>
          ) : null}
          {adhesionUrl ? (
            <a
              href={adhesionUrl}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1.5 bg-white border border-ink/10 rounded-xl px-3.5 py-2 text-sm font-medium text-ink/70 hover:bg-ink/5"
            >
              <UserPlus size={14} /> Formulaire d'adhésion <ExternalLink size={12} className="text-ink/30" />
            </a>
          ) : null}
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-card p-5">
        <h3 className="font-display text-base font-semibold text-felt mb-4">Revenus / Dépenses</h3>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={months} margin={{ top: 4, right: 8, left: -12, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#12243811" vertical={false} />
            <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#12243899' }} tickLine={false} axisLine={{ stroke: '#12243822' }} />
            <YAxis tick={{ fontSize: 11, fill: '#12243899' }} tickLine={false} axisLine={false} />
            <Tooltip formatter={(v, name) => [eur(v), name]} contentStyle={{ borderRadius: 12, border: '1px solid #12243815', fontFamily: 'Inter' }} />
            <Bar dataKey="revenus" name="Revenus" fill={GREEN} radius={[4, 4, 0, 0]} />
            <Bar dataKey="depenses" name="Dépenses" fill={RED} radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="bg-white rounded-2xl shadow-card p-5">
        <h3 className="font-display text-base font-semibold text-felt mb-4">Évolution du solde</h3>
        <ResponsiveContainer width="100%" height={240}>
          <LineChart data={months} margin={{ top: 4, right: 8, left: -12, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#12243811" vertical={false} />
            <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#12243899' }} tickLine={false} axisLine={{ stroke: '#12243822' }} />
            <YAxis tick={{ fontSize: 11, fill: '#12243899' }} tickLine={false} axisLine={false} />
            <Tooltip formatter={(v) => [eur(v), 'Solde']} contentStyle={{ borderRadius: 12, border: '1px solid #12243815', fontFamily: 'Inter' }} />
            <Line type="monotone" dataKey="soldeCumule" stroke={BLUE} strokeWidth={2.5} dot={{ r: 3, fill: BLUE }} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <CategoryBarList title="Revenus par catégorie" items={recettes} color={GREEN} />
        <CategoryBarList title="Dépenses par catégorie" items={depenses} color={RED} />
      </div>
    </div>
  )
}
