import { useEffect, useMemo, useState } from 'react'
import { LayoutGrid, BookText, Wallet, Table2, BarChart3, Tags, Lock, Unlock, Spade } from 'lucide-react'
import { supabase } from './supabaseClient'
import Dashboard from './views/Dashboard'
import Journal from './views/Journal'
import Caisse from './views/Caisse'
import Recap from './views/Recap'
import Visualisation from './views/Visualisation'
import PasswordGate from './components/PasswordGate'
import EcritureModal from './components/EcritureModal'
import CategoriesPanel from './components/CategoriesPanel'
import TransferModal from './components/TransferModal'
import { fetchJoueurs, syncJoueurSolde, ticketsSyncEnabled } from './lib/ticketsSync'
import { validateAdhesion, inscriptionSyncEnabled, fetchInscrits } from './lib/inscriptionSync'

const TABS = [
  { id: 'dashboard', label: "Vue d'ensemble", icon: LayoutGrid },
  { id: 'journal', label: 'Journal', icon: BookText },
  { id: 'caisse', label: 'Caisse', icon: Wallet },
  { id: 'recap', label: 'Récap par mois', icon: Table2 },
  { id: 'visualisation', label: 'Visualisation', icon: BarChart3 },
]

export default function App() {
  const [tab, setTab] = useState('dashboard')
  const [saisons, setSaisons] = useState([])
  const [categories, setCategories] = useState([])
  const [ecritures, setEcritures] = useState([])
  const [releves, setReleves] = useState([])
  const [loading, setLoading] = useState(true)
  const [errorMsg, setErrorMsg] = useState('')

  const [editMode, setEditMode] = useState(false)
  const [showPasswordGate, setShowPasswordGate] = useState(false)
  const [showCategories, setShowCategories] = useState(false)
  const [showTransfer, setShowTransfer] = useState(false)
  const [joueurs, setJoueurs] = useState([])
  const [inscrits, setInscrits] = useState([])
  const [syncWarning, setSyncWarning] = useState('')
  const [modalState, setModalState] = useState(null) // { ecriture: null|obj, defaultCompte }

  const saison = useMemo(() => saisons.find((s) => s.active) || saisons[0], [saisons])
  const activeCategories = useMemo(() => categories.filter((c) => !c.archivee), [categories])

  useEffect(() => {
    loadAll()
    if (ticketsSyncEnabled()) {
      fetchJoueurs().then(setJoueurs)
    }
    if (inscriptionSyncEnabled()) {
      fetchInscrits().then(setInscrits)
    }
  }, [])

  async function loadAll() {
    setLoading(true)
    setErrorMsg('')
    try {
      const [{ data: sData, error: sErr }, { data: cData, error: cErr }, { data: eData, error: eErr }, { data: rData, error: rErr }] =
        await Promise.all([
          supabase.from('saisons').select('*').order('date_debut', { ascending: false }),
          supabase.from('categories').select('*').order('ordre'),
          supabase.from('ecritures').select('*').order('date', { ascending: false }),
          supabase.from('releves').select('*'),
        ])
      if (sErr || cErr || eErr || rErr) throw sErr || cErr || eErr || rErr
      setSaisons(sData || [])
      setCategories(cData || [])
      setEcritures(eData || [])
      setReleves(rData || [])
    } catch (err) {
      console.error(err)
      setErrorMsg(
        "Impossible de charger les données Supabase. Vérifie que VITE_SUPABASE_URL et VITE_SUPABASE_ANON_KEY sont bien configurées, et que le schéma SQL a été exécuté."
      )
    } finally {
      setLoading(false)
    }
  }

  function requestEdit(action) {
    if (editMode) {
      action()
    } else {
      setShowPasswordGate(true)
      setModalState({ pending: action })
    }
  }

  function openAdd(defaultCompte) {
    requestEdit(() => setModalState({ ecriture: null, defaultCompte }))
  }

  function openEdit(ecriture) {
    requestEdit(() => setModalState({ ecriture, defaultCompte: ecriture.compte }))
  }

  function openTransfer() {
    requestEdit(() => setShowTransfer(true))
  }

  async function saveEcriture(form) {
    const isNew = !form.id
    const { _joueurNom, _joueurPrenom, _ticketSign, _needsAdhesionValidation, ...clean } = form
    const payload = { ...clean, saison_id: saison?.id }
    let saved = null
    let saveError = null
    if (form.id) {
      const { data, error } = await supabase.from('ecritures').update(payload).eq('id', form.id).select().single()
      saved = data
      saveError = error
      if (!error) setEcritures((prev) => prev.map((e) => (e.id === data.id ? data : e)))
    } else {
      const { data, error } = await supabase.from('ecritures').insert(payload).select().single()
      saved = data
      saveError = error
      if (!error) setEcritures((prev) => [data, ...prev])
    }

    if (saveError) {
      setSyncWarning(
        `L'écriture n'a pas pu être enregistrée (${saveError.message}). Vérifie que les migrations SQL ont bien été exécutées dans Supabase (notamment la colonne "joueur").`
      )
      return
    }

    setModalState(null)

    // Répercute sur le Sheet uniquement si l'écriture est bien enregistrée,
    // à la création (pas à la modification), dans une catégorie ticket, et
    // seulement si un joueur a été sélectionné.
    if (isNew && _joueurNom && _ticketSign && ticketsSyncEnabled()) {
      const sens = _ticketSign > 0 ? 'augmenter' : 'diminuer'
      const result = await syncJoueurSolde({ nom: _joueurNom, prenom: _joueurPrenom, montant: form.montant, sens })
      if (!result.success) {
        setSyncWarning(
          `L'écriture est enregistrée, mais la mise à jour du Sheet a échoué (${result.error || 'erreur inconnue'}). Pense à corriger le solde de ${_joueurPrenom} ${_joueurNom} manuellement.`
        )
      } else {
        setJoueurs((prev) => {
          const exists = prev.some((j) => j.nom === _joueurNom && j.prenom === _joueurPrenom)
          if (exists) {
            return prev.map((j) => (j.nom === _joueurNom && j.prenom === _joueurPrenom ? { ...j, solde: result.newSolde } : j))
          }
          return [...prev, { nom: _joueurNom, prenom: _joueurPrenom, solde: result.newSolde }]
        })
      }
    }

    // Valide (ou alerte par mail) sur le formulaire d'inscription pour les
    // catégories d'adhésion.
    if (isNew && _joueurNom && _needsAdhesionValidation && inscriptionSyncEnabled()) {
      const cat = categories.find((c) => c.id === form.categorie_id)
      const result = await validateAdhesion({ nom: _joueurNom, prenom: _joueurPrenom, categorie: cat?.nom })
      if (!result.success) {
        setSyncWarning(
          `L'écriture est enregistrée, mais la validation sur le formulaire d'inscription a échoué (${result.error || 'erreur inconnue'}).`
        )
      } else if (result.found === false) {
        setSyncWarning(
          `${_joueurPrenom} ${_joueurNom} n'a pas de ligne sur le formulaire d'inscription — un mail d'alerte a été envoyé à 19pokerclub@gmail.com.`
        )
      }
    }
  }

  async function deleteEcriture(id) {
    if (!confirm('Supprimer définitivement cette écriture ?')) return
    const { error } = await supabase.from('ecritures').delete().eq('id', id)
    if (!error) setEcritures((prev) => prev.filter((e) => e.id !== id))
    setModalState(null)
  }

  async function findOrCreateTransferCategory() {
    const existing = categories.find((c) => c.nom === 'Caisse vers banque')
    if (existing) return existing
    const { data, error } = await supabase
      .from('categories')
      .insert({ nom: 'Caisse vers banque', type: 'mixte', couleur: '#2C5F8A', icone: 'repeat', ordre: 99 })
      .select()
      .single()
    if (error) throw error
    setCategories((prev) => [...prev, data])
    return data
  }

  async function transferCaisseToBanque({ date, montant, personne }) {
    const cat = await findOrCreateTransferCategory()
    const base = {
      date,
      categorie_id: cat.id,
      saison_id: saison?.id,
      statut: 'valide',
      mode_paiement: 'Espèces',
      note: `Dépôt en banque effectué par ${personne}`,
    }
    const { data: sortie, error: err1 } = await supabase
      .from('ecritures')
      .insert({ ...base, description: `Retrait caisse → dépôt banque (${personne})`, montant, type: 'depense', compte: 'caisse' })
      .select()
      .single()
    if (err1) throw err1
    const { data: entree, error: err2 } = await supabase
      .from('ecritures')
      .insert({ ...base, description: `Dépôt depuis caisse (${personne})`, montant, type: 'recette', compte: 'banque' })
      .select()
      .single()
    if (err2) throw err2
    setEcritures((prev) => [entree, sortie, ...prev])
    setShowTransfer(false)
  }

  async function createCategorie(payload) {
    const { data, error } = await supabase.from('categories').insert(payload).select().single()
    if (!error) setCategories((prev) => [...prev, data])
  }

  async function updateCategorie(id, patch) {
    const { data, error } = await supabase.from('categories').update(patch).eq('id', id).select().single()
    if (!error) setCategories((prev) => prev.map((c) => (c.id === id ? data : c)))
  }

  async function saveReleve(montant) {
    const mois = new Date()
    mois.setDate(1)
    const isoMonth = mois.toISOString().slice(0, 10)
    const existing = releves.find((r) => r.saison_id === saison?.id && r.mois === isoMonth)
    const payload = {
      saison_id: saison?.id,
      mois: isoMonth,
      solde_caisse_compte: montant,
      date_pointage: new Date().toISOString().slice(0, 10),
    }
    if (existing) {
      const { data, error } = await supabase.from('releves').update(payload).eq('id', existing.id).select().single()
      if (!error) setReleves((prev) => prev.map((r) => (r.id === data.id ? data : r)))
    } else {
      const { data, error } = await supabase.from('releves').insert(payload).select().single()
      if (!error) setReleves((prev) => [...prev, data])
    }
  }

  const currentMonthReleve = useMemo(() => {
    const mois = new Date()
    mois.setDate(1)
    const isoMonth = mois.toISOString().slice(0, 10)
    return releves.find((r) => r.saison_id === saison?.id && r.mois === isoMonth)
  }, [releves, saison])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-ivory">
        <div className="flex flex-col items-center gap-3 text-ink/50">
          <Spade className="animate-pulse" />
          <span className="text-sm">Chargement des comptes du club…</span>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-ivory font-body pb-16">
      <header className="sticky top-0 z-30 bg-ivory/90 backdrop-blur border-b border-ink/5">
        <div className="max-w-5xl mx-auto px-4 md:px-6 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <img src="/logo.png" alt="DIX'9 Poker Club" className="h-8 w-auto" />
            <div className="hidden sm:block border-l border-ink/10 pl-2.5">
              <p className="text-[11px] text-ink/40 leading-tight">Suivi financier</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowCategories(true)}
              className="hidden sm:flex items-center gap-1.5 text-sm text-ink/50 hover:text-ink px-3 py-1.5 rounded-full hover:bg-ink/5"
            >
              <Tags size={15} /> Catégories
            </button>
            <button
              onClick={() => (editMode ? setEditMode(false) : setShowPasswordGate(true))}
              className={`flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-full font-medium transition-colors ${
                editMode ? 'bg-chip-blue/15 text-chip-blue' : 'text-ink/50 hover:bg-ink/5'
              }`}
            >
              {editMode ? <Unlock size={15} /> : <Lock size={15} />}
              {editMode ? 'Édition active' : 'Verrouillé'}
            </button>
          </div>
        </div>
        <nav className="max-w-5xl mx-auto px-4 md:px-6 flex gap-1 overflow-x-auto pb-2">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                tab === t.id ? 'bg-felt text-ivory' : 'text-ink/50 hover:bg-ink/5'
              }`}
            >
              <t.icon size={14} /> {t.label}
            </button>
          ))}
        </nav>
      </header>

      <main className="max-w-5xl mx-auto px-4 md:px-6 pt-6">
        {errorMsg && (
          <div className="mb-6 bg-chip-red/10 border border-chip-red/30 text-chip-red rounded-xl p-4 text-sm">
            {errorMsg}
          </div>
        )}
        {syncWarning && (
          <div className="mb-6 bg-chip-gold/10 border border-chip-gold/30 text-ink rounded-xl p-4 text-sm flex justify-between gap-3">
            <span>{syncWarning}</span>
            <button onClick={() => setSyncWarning('')} className="text-ink/40 hover:text-ink flex-shrink-0">
              ✕
            </button>
          </div>
        )}

        {!errorMsg && tab === 'dashboard' && (
          <Dashboard ecritures={ecritures} saison={saison} categories={categories} />
        )}
        {!errorMsg && tab === 'journal' && (
          <Journal ecritures={ecritures} categories={categories} onAdd={openAdd} onEdit={openEdit} editMode={editMode} />
        )}
        {!errorMsg && tab === 'caisse' && (
          <Caisse
            ecritures={ecritures}
            categories={categories}
            onAdd={openAdd}
            onEdit={openEdit}
            editMode={editMode}
            releve={currentMonthReleve}
            onSaveReleve={saveReleve}
            saison={saison}
            onTransfer={openTransfer}
          />
        )}
        {!errorMsg && tab === 'recap' && <Recap ecritures={ecritures} saison={saison} categories={categories} />}
        {!errorMsg && tab === 'visualisation' && (
          <Visualisation ecritures={ecritures} categories={categories} saison={saison} />
        )}
      </main>

      {showPasswordGate && (
        <PasswordGate
          onUnlock={() => {
            setEditMode(true)
            setShowPasswordGate(false)
            if (modalState?.pending) {
              const action = modalState.pending
              setModalState(null)
              action()
            }
          }}
          onClose={() => {
            setShowPasswordGate(false)
            setModalState(null)
          }}
        />
      )}

      {modalState && !modalState.pending && (
        <EcritureModal
          initial={modalState.ecriture}
          defaultCompte={modalState.defaultCompte}
          categories={activeCategories}
          joueurs={joueurs}
          inscrits={inscrits}
          onSave={saveEcriture}
          onDelete={modalState.ecriture ? deleteEcriture : undefined}
          onClose={() => setModalState(null)}
        />
      )}

      {showTransfer && (
        <TransferModal onConfirm={transferCaisseToBanque} onClose={() => setShowTransfer(false)} />
      )}

      {showCategories && (
        <CategoriesPanel
          categories={categories}
          onCreate={createCategorie}
          onUpdate={updateCategorie}
          onClose={() => setShowCategories(false)}
        />
      )}
    </div>
  )
}
