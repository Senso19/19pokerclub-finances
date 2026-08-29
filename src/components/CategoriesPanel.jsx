import { useState } from 'react'
import { X, Plus, Archive } from 'lucide-react'

const PALETTE = ['#D9A63E', '#C1443C', '#2C5F8A', '#4A8B5C', '#8A5FBF', '#3D7A8C', '#B5652C', '#7A4A9E', '#5C5C5C', '#7A8B99']

export default function CategoriesPanel({ categories, onCreate, onUpdate, onClose }) {
  const [nom, setNom] = useState('')
  const [type, setType] = useState('depense')
  const [couleur, setCouleur] = useState(PALETTE[0])

  async function submit(e) {
    e.preventDefault()
    if (!nom.trim()) return
    await onCreate({ nom: nom.trim(), type, couleur, icone: 'circle', ordre: categories.length })
    setNom('')
  }

  return (
    <div className="fixed inset-0 bg-ink/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-ivory rounded-2xl shadow-card p-6 w-full max-w-lg flex flex-col gap-4 relative max-h-[85vh] overflow-y-auto">
        <button onClick={onClose} className="absolute top-4 right-4 text-ink/40 hover:text-ink">
          <X size={18} />
        </button>
        <h2 className="font-display text-lg font-semibold text-felt">Catégories</h2>

        <form onSubmit={submit} className="flex flex-wrap gap-2 items-end bg-white rounded-xl p-3">
          <label className="flex flex-col gap-1 text-xs flex-1 min-w-[140px]">
            <span className="text-ink/40 uppercase tracking-wide">Nom</span>
            <input
              value={nom}
              onChange={(e) => setNom(e.target.value)}
              className="border border-ink/15 rounded-lg px-2.5 py-1.5 text-sm"
              placeholder="Ex: Frais de déplacement"
            />
          </label>
          <label className="flex flex-col gap-1 text-xs">
            <span className="text-ink/40 uppercase tracking-wide">Type</span>
            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="border border-ink/15 rounded-lg px-2.5 py-1.5 text-sm bg-white"
            >
              <option value="recette">Recette</option>
              <option value="depense">Dépense</option>
              <option value="mixte">Mixte</option>
            </select>
          </label>
          <div className="flex gap-1">
            {PALETTE.map((c) => (
              <button
                type="button"
                key={c}
                onClick={() => setCouleur(c)}
                className="w-6 h-6 rounded-full border-2"
                style={{ backgroundColor: c, borderColor: couleur === c ? '#1C2321' : 'transparent' }}
              />
            ))}
          </div>
          <button type="submit" className="bg-felt text-ivory rounded-lg px-3 py-1.5 text-sm font-semibold flex items-center gap-1">
            <Plus size={14} /> Ajouter
          </button>
        </form>

        <div className="flex flex-col gap-1.5">
          {categories.map((c) => (
            <div key={c.id} className="flex items-center gap-2 bg-white rounded-xl px-3 py-2">
              <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: c.couleur }} />
              <span className="flex-1 text-sm">{c.nom}</span>
              <span className="text-xs text-ink/30 uppercase">{c.type}</span>
              <button
                onClick={() => onUpdate(c.id, { archivee: !c.archivee })}
                title={c.archivee ? 'Réactiver' : 'Archiver'}
                className={`text-ink/30 hover:text-ink ${c.archivee ? 'opacity-40' : ''}`}
              >
                <Archive size={15} />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
