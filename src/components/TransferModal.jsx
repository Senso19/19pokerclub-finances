import { useState } from 'react'
import { X, ArrowRightLeft } from 'lucide-react'

export default function TransferModal({ onConfirm, onClose }) {
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10))
  const [montant, setMontant] = useState('')
  const [personne, setPersonne] = useState('')
  const [saving, setSaving] = useState(false)

  async function submit(e) {
    e.preventDefault()
    if (!date || !montant || Number(montant) <= 0 || !personne.trim()) return
    setSaving(true)
    await onConfirm({ date, montant: Number(montant), personne: personne.trim() })
    setSaving(false)
  }

  return (
    <div className="fixed inset-0 bg-ink/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <form
        onSubmit={submit}
        className="bg-ivory rounded-2xl shadow-card p-6 w-full max-w-sm flex flex-col gap-4 relative"
      >
        <button type="button" onClick={onClose} className="absolute top-4 right-4 text-ink/40 hover:text-ink">
          <X size={18} />
        </button>
        <div className="flex items-center gap-2 text-felt">
          <ArrowRightLeft size={18} />
          <h2 className="font-display text-lg font-semibold">Dépôt en banque</h2>
        </div>
        <p className="text-sm text-ink/60">
          Retire des espèces de la caisse pour les déposer en banque. Ça crée automatiquement les
          deux écritures liées (sortie caisse + entrée banque, catégorie "Caisse vers banque").
        </p>

        <label className="flex flex-col gap-1 text-sm">
          <span className="text-ink/50 text-xs uppercase tracking-wide">Date du dépôt</span>
          <input
            type="date"
            required
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="border border-ink/15 rounded-xl px-3 py-2 font-mono"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm">
          <span className="text-ink/50 text-xs uppercase tracking-wide">Montant retiré de la caisse (€)</span>
          <input
            type="number"
            step="0.01"
            min="0"
            required
            value={montant}
            onChange={(e) => setMontant(e.target.value)}
            className="border border-ink/15 rounded-xl px-3 py-2 font-mono"
            placeholder="0,00"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm">
          <span className="text-ink/50 text-xs uppercase tracking-wide">Déposé par</span>
          <input
            type="text"
            required
            value={personne}
            onChange={(e) => setPersonne(e.target.value)}
            className="border border-ink/15 rounded-xl px-3 py-2"
            placeholder="Nom du trésorier / bénévole"
          />
        </label>

        <button
          type="submit"
          disabled={saving}
          className="bg-felt text-ivory rounded-xl py-2.5 font-semibold hover:bg-felt-light transition-colors disabled:opacity-50"
        >
          {saving ? 'Enregistrement…' : 'Confirmer le dépôt'}
        </button>
      </form>
    </div>
  )
}
