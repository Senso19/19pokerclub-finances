import { useMemo, useState } from 'react'
import { Wallet, ScanEye } from 'lucide-react'
import TransactionTable from '../components/TransactionTable'
import StatCard from '../components/StatCard'
import { eur } from '../lib/format'

export default function Caisse({ ecritures, categories, onAdd, onEdit, editMode, releve, onSaveReleve }) {
  const caisseEcritures = useMemo(() => ecritures.filter((e) => e.compte === 'caisse'), [ecritures])

  const soldeCaisse = useMemo(
    () =>
      caisseEcritures
        .filter((e) => e.statut === 'valide')
        .reduce((s, e) => s + (e.type === 'recette' ? e.montant : -e.montant), 0),
    [caisseEcritures]
  )

  const [compte, setCompte] = useState(releve?.solde_caisse_compte ?? '')
  const ecart = compte === '' ? null : Number(compte) - soldeCaisse

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="font-display text-xl font-semibold text-felt">Journal de caisse</h2>
        <p className="text-sm text-ink/50 mt-1">Mouvements d'espèces uniquement.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard label="Solde caisse calculé" value={eur(soldeCaisse)} icon={Wallet} />
        <div className="bg-white rounded-2xl shadow-card p-5 md:col-span-2 flex flex-col gap-3">
          <div className="flex items-center gap-2 text-ink/50 text-xs uppercase tracking-widest font-semibold">
            <ScanEye size={14} /> Vérification de fin de mois
          </div>
          <div className="flex items-end gap-3 flex-wrap">
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-ink/40 text-xs">Montant compté en caisse (€)</span>
              <input
                type="number"
                step="0.01"
                disabled={!editMode}
                value={compte}
                onChange={(e) => setCompte(e.target.value)}
                className="border border-ink/15 rounded-xl px-3 py-2 font-mono w-40 disabled:bg-ivory/40"
                placeholder="Ex: 273,00"
              />
            </label>
            {editMode && (
              <button
                onClick={() => onSaveReleve(compte === '' ? null : Number(compte))}
                className="bg-felt text-ivory rounded-xl px-4 py-2 text-sm font-semibold hover:bg-felt-light"
              >
                Enregistrer le pointage
              </button>
            )}
            {ecart !== null && (
              <span
                className={`font-mono text-sm font-semibold ${
                  Math.abs(ecart) < 0.01 ? 'text-chip-blue' : 'text-chip-red'
                }`}
              >
                {Math.abs(ecart) < 0.01 ? 'Caisse conforme ✓' : `Écart : ${eur(ecart)}`}
              </span>
            )}
          </div>
        </div>
      </div>

      <TransactionTable
        ecritures={caisseEcritures}
        categories={categories}
        onAdd={() => onAdd('caisse')}
        onEdit={onEdit}
        editMode={editMode}
        emptyLabel="Aucun mouvement de caisse enregistré."
      />
    </div>
  )
}
