import { useMemo, useState } from 'react'
import { Search, Plus, Ticket, Clock } from 'lucide-react'
import { eur, shortDate } from '../lib/format'

export default function TransactionTable({
  ecritures,
  categories,
  onAdd,
  onEdit,
  editMode,
  emptyLabel = 'Aucune écriture pour ces filtres.',
}) {
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('tous')
  const [catFilter, setCatFilter] = useState('toutes')

  const catById = useMemo(() => Object.fromEntries(categories.map((c) => [c.id, c])), [categories])

  const filtered = useMemo(() => {
    return ecritures
      .filter((e) => (typeFilter === 'tous' ? true : e.type === typeFilter))
      .filter((e) => (catFilter === 'toutes' ? true : e.categorie_id === catFilter))
      .filter((e) => {
        if (!search.trim()) return true
        const q = search.toLowerCase()
        return (
          e.description?.toLowerCase().includes(q) ||
          catById[e.categorie_id]?.nom.toLowerCase().includes(q) ||
          e.note?.toLowerCase().includes(q)
        )
      })
      .sort((a, b) => (a.date < b.date ? 1 : -1))
  }, [ecritures, typeFilter, catFilter, search, catById])

  const total = filtered.reduce((s, e) => s + (e.type === 'recette' ? e.montant : -e.montant), 0)

  return (
    <div className="bg-white rounded-2xl shadow-card overflow-hidden">
      <div className="p-4 flex flex-wrap gap-3 items-center border-b border-ink/5">
        <div className="relative flex-1 min-w-[180px]">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink/30" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher…"
            className="w-full border border-ink/10 rounded-xl pl-9 pr-3 py-2 text-sm bg-ivory/60"
          />
        </div>
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="border border-ink/10 rounded-xl px-3 py-2 text-sm bg-ivory/60"
        >
          <option value="tous">Tous types</option>
          <option value="recette">Recettes</option>
          <option value="depense">Dépenses</option>
        </select>
        <select
          value={catFilter}
          onChange={(e) => setCatFilter(e.target.value)}
          className="border border-ink/10 rounded-xl px-3 py-2 text-sm bg-ivory/60"
        >
          <option value="toutes">Toutes catégories</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.nom}
            </option>
          ))}
        </select>
        {editMode && (
          <button
            onClick={onAdd}
            className="ml-auto flex items-center gap-1.5 bg-felt text-ivory rounded-xl px-4 py-2 text-sm font-semibold hover:bg-felt-light transition-colors"
          >
            <Plus size={16} /> Ajouter
          </button>
        )}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-ink/40 text-xs uppercase tracking-wide border-b border-ink/5">
              <th className="px-4 py-3 font-semibold">Date</th>
              <th className="px-4 py-3 font-semibold">Catégorie</th>
              <th className="px-4 py-3 font-semibold">Description</th>
              <th className="px-4 py-3 font-semibold">Mode</th>
              <th className="px-4 py-3 font-semibold text-right">Montant</th>
              <th className="px-4 py-3 font-semibold"></th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-ink/30">
                  {emptyLabel}
                </td>
              </tr>
            )}
            {filtered.map((e) => {
              const cat = catById[e.categorie_id]
              return (
                <tr
                  key={e.id}
                  onClick={() => editMode && onEdit(e)}
                  className={`border-b border-ink/5 last:border-0 ${
                    editMode ? 'cursor-pointer hover:bg-ivory/70' : ''
                  }`}
                >
                  <td className="px-4 py-3 font-mono tabular-nums text-ink/70">{shortDate(e.date)}</td>
                  <td className="px-4 py-3">
                    <span
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium"
                      style={{ backgroundColor: (cat?.couleur || '#999') + '22', color: cat?.couleur || '#666' }}
                    >
                      <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: cat?.couleur || '#999' }} />
                      {cat?.nom || 'Sans catégorie'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-ink/70">
                    {e.description || '—'}
                    <div className="flex items-center gap-2 mt-0.5">
                      {e.ticket_casino && (
                        <span className="inline-flex items-center gap-1 text-[10px] text-chip-gold font-semibold">
                          <Ticket size={10} /> Ticket casino
                        </span>
                      )}
                      {e.statut === 'en_attente' && (
                        <span className="inline-flex items-center gap-1 text-[10px] text-ink/40 font-semibold">
                          <Clock size={10} /> En attente
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-ink/50">{e.mode_paiement}</td>
                  <td
                    className={`px-4 py-3 text-right font-mono tabular-nums font-semibold ${
                      e.type === 'recette' ? 'text-chip-blue' : 'text-chip-red'
                    }`}
                  >
                    {e.type === 'recette' ? '+' : '−'}
                    {eur(e.montant)}
                  </td>
                  <td></td>
                </tr>
              )
            })}
          </tbody>
          {filtered.length > 0 && (
            <tfoot>
              <tr className="border-t border-ink/10 bg-ivory/40">
                <td colSpan={4} className="px-4 py-3 text-xs uppercase tracking-wide text-ink/40 font-semibold">
                  Total ({filtered.length} écriture{filtered.length > 1 ? 's' : ''})
                </td>
                <td
                  className={`px-4 py-3 text-right font-mono tabular-nums font-bold ${
                    total >= 0 ? 'text-chip-blue' : 'text-chip-red'
                  }`}
                >
                  {eur(total)}
                </td>
                <td></td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  )
}
