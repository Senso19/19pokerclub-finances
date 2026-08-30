import { useState } from 'react'
import { X, Trash2 } from 'lucide-react'
import { isTicketAffectingCategory, ticketSign, needsJoueur, needsAdhesionValidation } from '../lib/aggregate'

const MODES = ['Espèces', 'CB', 'Chèque', 'Virement', 'Autre']

export default function EcritureModal({ initial, categories, defaultCompte, joueurs = [], onSave, onDelete, onClose }) {
  const [form, setForm] = useState(
    initial || {
      date: new Date().toISOString().slice(0, 10),
      categorie_id: categories[0]?.id || '',
      description: '',
      montant: '',
      type: categories[0]?.type === 'depense' ? 'depense' : 'recette',
      compte: defaultCompte || 'banque',
      mode_paiement: 'Virement',
      statut: 'valide',
      ticket_casino: false,
      note: '',
      joueur: '',
    }
  )
  // Sélection distincte du texte stocké : évite d'effacer le joueur existant
  // si on modifie une écriture sans retoucher ce champ.
  const [joueurKey, setJoueurKey] = useState('')
  const [nouveauJoueur, setNouveauJoueur] = useState(false)
  const [nouveauNom, setNouveauNom] = useState('')
  const [nouveauPrenom, setNouveauPrenom] = useState('')
  const [saving, setSaving] = useState(false)

  function update(field, val) {
    setForm((f) => ({ ...f, [field]: val }))
  }

  const selectedCategory = categories.find((c) => c.id === form.categorie_id)
  const isTicketCategory = selectedCategory && needsJoueur(selectedCategory.nom, form.type)

  async function submit(e) {
    e.preventDefault()
    if (!form.date || !form.montant || Number(form.montant) <= 0) return
    const hasJoueur = nouveauJoueur ? nouveauNom.trim() : joueurKey
    if (isTicketCategory && !form.joueur && !hasJoueur) return
    setSaving(true)
    const picked = joueurs.find((j) => `${j.nom}|${j.prenom}` === joueurKey)
    const joueurNom = nouveauJoueur ? nouveauNom.trim() : picked?.nom
    const joueurPrenom = nouveauJoueur ? nouveauPrenom.trim() : picked?.prenom
    await onSave({
      ...form,
      montant: Number(form.montant),
      joueur: isTicketCategory ? (joueurNom ? `${joueurPrenom} ${joueurNom}`.trim() : form.joueur || null) : null,
      joueur_nom: isTicketCategory ? joueurNom || form.joueur_nom || null : null,
      joueur_prenom: isTicketCategory ? joueurPrenom || form.joueur_prenom || null : null,
      // Ces deux indicateurs ne sont utilisés que pour d\u00e9clencher les
      // synchros c\u00f4t\u00e9 App.jsx ; ils ne sont pas envoy\u00e9s \u00e0 Supabase.
      _joueurNom: joueurNom || null,
      _joueurPrenom: joueurPrenom || null,
      _ticketSign: isTicketCategory ? ticketSign(selectedCategory.nom, form.type) : null,
      _needsAdhesionValidation: selectedCategory ? needsAdhesionValidation(selectedCategory.nom, form.type) : false,
    })
    setSaving(false)
  }

  const filteredCategories = categories.filter((c) => c.type === 'mixte' || c.type === form.type)

  return (
    <div className="fixed inset-0 bg-ink/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <form
        onSubmit={submit}
        className="bg-ivory rounded-2xl shadow-card p-6 w-full max-w-lg flex flex-col gap-4 relative max-h-[90vh] overflow-y-auto"
      >
        <button type="button" onClick={onClose} className="absolute top-4 right-4 text-ink/40 hover:text-ink">
          <X size={18} />
        </button>
        <h2 className="font-display text-lg font-semibold text-felt">
          {initial ? 'Modifier une écriture' : 'Nouvelle écriture'}
        </h2>

        <div className="flex gap-2">
          {['recette', 'depense'].map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => update('type', t)}
              className={`flex-1 rounded-xl py-2 text-sm font-semibold border transition-colors ${
                form.type === t
                  ? t === 'recette'
                    ? 'bg-chip-blue/10 border-chip-blue text-chip-blue'
                    : 'bg-chip-red/10 border-chip-red text-chip-red'
                  : 'border-ink/10 text-ink/40'
              }`}
            >
              {t === 'recette' ? '+ Recette' : '− Dépense'}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-ink/50 text-xs uppercase tracking-wide">Date</span>
            <input
              type="date"
              required
              value={form.date}
              onChange={(e) => update('date', e.target.value)}
              className="border border-ink/15 rounded-xl px-3 py-2 font-mono"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-ink/50 text-xs uppercase tracking-wide">Montant (€)</span>
            <input
              type="number"
              step="0.01"
              min="0"
              required
              value={form.montant}
              onChange={(e) => update('montant', e.target.value)}
              className="border border-ink/15 rounded-xl px-3 py-2 font-mono"
              placeholder="0,00"
            />
          </label>
        </div>

        <label className="flex flex-col gap-1 text-sm">
          <span className="text-ink/50 text-xs uppercase tracking-wide">Catégorie</span>
          <select
            value={form.categorie_id}
            onChange={(e) => update('categorie_id', e.target.value)}
            className="border border-ink/15 rounded-xl px-3 py-2 bg-white"
          >
            {filteredCategories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nom}
              </option>
            ))}
          </select>
        </label>

        {isTicketCategory && (
          <div className="flex flex-col gap-2">
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-ink/50 text-xs uppercase tracking-wide">
                Joueur {form.joueur && !joueurKey && !nouveauJoueur ? `(actuellement : ${form.joueur})` : ''}
              </span>
              <select
                value={nouveauJoueur ? '__nouveau__' : joueurKey}
                onChange={(e) => {
                  if (e.target.value === '__nouveau__') {
                    setNouveauJoueur(true)
                    setJoueurKey('')
                  } else {
                    setNouveauJoueur(false)
                    setJoueurKey(e.target.value)
                  }
                }}
                className="border border-ink/15 rounded-xl px-3 py-2 bg-white"
              >
                <option value="">
                  {joueurs.length === 0 ? 'Liste des joueurs indisponible' : 'Choisir un joueur…'}
                </option>
                {joueurs.map((j) => (
                  <option key={`${j.nom}|${j.prenom}`} value={`${j.nom}|${j.prenom}`}>
                    {j.prenom} {j.nom}
                  </option>
                ))}
                <option value="__nouveau__">+ Nouveau joueur (pas encore sur le Sheet)</option>
              </select>
              <span className="text-[11px] text-ink/40">
                {isTicketAffectingCategory(selectedCategory?.nom, form.type) && needsAdhesionValidation(selectedCategory?.nom, form.type)
                  ? 'Met à jour le solde du joueur sur le Sheet "Tickets en attente" et valide sa cotisation sur le formulaire d\'inscription.'
                  : isTicketAffectingCategory(selectedCategory?.nom, form.type)
                    ? 'Le solde de ce joueur sera mis à jour automatiquement sur le Sheet "Tickets en attente".'
                    : 'Valide automatiquement la cotisation de ce joueur sur le formulaire d\'inscription.'}
              </span>
            </label>
            {nouveauJoueur && (
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  required
                  value={nouveauNom}
                  onChange={(e) => setNouveauNom(e.target.value)}
                  placeholder="Nom"
                  className="border border-ink/15 rounded-xl px-3 py-2 text-sm"
                />
                <input
                  type="text"
                  value={nouveauPrenom}
                  onChange={(e) => setNouveauPrenom(e.target.value)}
                  placeholder="Prénom"
                  className="border border-ink/15 rounded-xl px-3 py-2 text-sm"
                />
              </div>
            )}
          </div>
        )}

        <label className="flex flex-col gap-1 text-sm">
          <span className="text-ink/50 text-xs uppercase tracking-wide">Description</span>
          <input
            type="text"
            value={form.description}
            onChange={(e) => update('description', e.target.value)}
            className="border border-ink/15 rounded-xl px-3 py-2"
            placeholder="Ex: Buy-ins tournoi du 12/09"
          />
        </label>

        <div className="grid grid-cols-2 gap-3">
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-ink/50 text-xs uppercase tracking-wide">Compte</span>
            <select
              value={form.compte}
              onChange={(e) => update('compte', e.target.value)}
              className="border border-ink/15 rounded-xl px-3 py-2 bg-white"
            >
              <option value="banque">Banque</option>
              <option value="caisse">Caisse</option>
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-ink/50 text-xs uppercase tracking-wide">Mode de paiement</span>
            <select
              value={form.mode_paiement}
              onChange={(e) => update('mode_paiement', e.target.value)}
              className="border border-ink/15 rounded-xl px-3 py-2 bg-white"
            >
              {MODES.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-ink/50 text-xs uppercase tracking-wide">Statut</span>
            <select
              value={form.statut}
              onChange={(e) => update('statut', e.target.value)}
              className="border border-ink/15 rounded-xl px-3 py-2 bg-white"
            >
              <option value="valide">Validé</option>
              <option value="en_attente">En attente</option>
            </select>
          </label>
          <label className="flex items-center gap-2 text-sm mt-6">
            <input
              type="checkbox"
              checked={form.ticket_casino}
              onChange={(e) => update('ticket_casino', e.target.checked)}
              className="accent-chip-gold w-4 h-4"
            />
            <span>Ticket Casino</span>
          </label>
        </div>

        <label className="flex flex-col gap-1 text-sm">
          <span className="text-ink/50 text-xs uppercase tracking-wide">Note (optionnel)</span>
          <textarea
            value={form.note}
            onChange={(e) => update('note', e.target.value)}
            className="border border-ink/15 rounded-xl px-3 py-2 resize-none"
            rows={2}
          />
        </label>

        <div className="flex items-center gap-3 mt-2">
          <button
            type="submit"
            disabled={saving}
            className="flex-1 bg-felt text-ivory rounded-xl py-2.5 font-semibold hover:bg-felt-light transition-colors disabled:opacity-50"
          >
            {saving ? 'Enregistrement…' : initial ? 'Mettre à jour' : 'Ajouter l’écriture'}
          </button>
          {initial && onDelete && (
            <button
              type="button"
              onClick={() => onDelete(initial.id)}
              className="p-2.5 rounded-xl border border-chip-red/30 text-chip-red hover:bg-chip-red/10"
              title="Supprimer"
            >
              <Trash2 size={18} />
            </button>
          )}
        </div>
      </form>
    </div>
  )
}
