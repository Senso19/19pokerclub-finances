import { useState } from 'react'
import { Lock, X } from 'lucide-react'

export default function PasswordGate({ onUnlock, onClose }) {
  const [value, setValue] = useState('')
  const [error, setError] = useState(false)
  const editPassword = import.meta.env.VITE_EDIT_PASSWORD || '19pokerclub'

  function submit(e) {
    e.preventDefault()
    if (value === editPassword) {
      onUnlock()
    } else {
      setError(true)
    }
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
          <Lock size={18} />
          <h2 className="font-display text-lg font-semibold">Mode édition</h2>
        </div>
        <p className="text-sm text-ink/60">
          Entre le mot de passe du club pour ajouter ou modifier des écritures.
        </p>
        <input
          autoFocus
          type="password"
          value={value}
          onChange={(e) => {
            setValue(e.target.value)
            setError(false)
          }}
          className={`border rounded-xl px-4 py-2.5 font-mono outline-none focus:ring-2 focus:ring-chip-gold ${
            error ? 'border-chip-red' : 'border-ink/15'
          }`}
          placeholder="Mot de passe"
        />
        {error && <p className="text-xs text-chip-red -mt-2">Mot de passe incorrect.</p>}
        <button
          type="submit"
          className="bg-felt text-ivory rounded-xl py-2.5 font-semibold hover:bg-felt-light transition-colors"
        >
          Déverrouiller
        </button>
      </form>
    </div>
  )
}
