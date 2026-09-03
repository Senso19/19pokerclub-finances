import { useState } from 'react'
import { ClipboardPaste, Mail, Printer } from 'lucide-react'
import { previsualiserAdhesions, envoyerAlerteComplete } from '../lib/inscriptionSync'

// Le copier-coller depuis BlindValet ramène aussi les tapis (lignes
// purement numériques) et parfois les initiales d'avatar sur leur propre
// ligne juste avant le pseudo (ex: "H" avant "HotDoggi" quand la photo de
// profil ne charge pas) — on filtre les deux pour ne garder que les pseudos.
function nettoyerPseudos(texte) {
  return texte
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 3 && !/^\d+$/.test(l) && l.toLowerCase() !== 'tapis')
}

const CATEGORIE_STYLE = {
  'En règle': 'bg-chip-blue/10 text-chip-blue',
  'A régulariser - Cotisation': 'bg-chip-gold/10 text-chip-gold',
  'A régulariser - Cotisation & Inscrit BV': 'bg-chip-red/10 text-chip-red',
  'A régulariser - Formulaire': 'bg-chip-gold/10 text-chip-gold',
  'A régulariser - Formulaire & Inscrit BV': 'bg-chip-red/10 text-chip-red',
  'A régulariser - All': 'bg-chip-red/10 text-chip-red',
  'A régulariser - All & Inscrit BV': 'bg-chip-red/10 text-chip-red',
}

function RosterTable({ roster }) {
  const rows = [...roster].sort((a, b) => {
    if (a.categorie !== b.categorie) {
      if (a.categorie === 'En règle') return 1
      if (b.categorie === 'En règle') return -1
      return a.categorie.localeCompare(b.categorie)
    }
    if (a.nom !== b.nom) return a.nom.localeCompare(b.nom)
    return (a.prenom || '').localeCompare(b.prenom || '')
  })

  return (
    <div id="roster-imprimable" className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-ink/40 text-xs uppercase tracking-wide border-b border-ink/10">
            <th className="px-3 py-2 font-semibold">Joueur</th>
            <th className="px-3 py-2 font-semibold">Catégorie</th>
            <th className="px-3 py-2 font-semibold">Étapes BV</th>
            <th className="px-3 py-2 font-semibold">Depuis</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((p, i) => (
            <tr key={i} className="border-b border-ink/5 last:border-0">
              <td className="px-3 py-2">{p.prenom ? `${p.prenom} ${p.nom}` : p.nom}</td>
              <td className="px-3 py-2">
                <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-medium ${CATEGORIE_STYLE[p.categorie] || ''}`}>
                  {p.categorie.replace('A régulariser - ', '')}
                </span>
              </td>
              <td className="px-3 py-2 text-ink/60">{p.etapes || '—'}</td>
              <td className="px-3 py-2 text-ink/60">
                {p.semaines ? `${p.semaines} semaine${p.semaines > 1 ? 's' : ''}` : '—'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default function BlindValetCheck() {
  const [texte, setTexte] = useState('')
  const [roster, setRoster] = useState(null)
  const [chargement, setChargement] = useState(false)
  const [envoi, setEnvoi] = useState('idle') // idle | envoi | ok | erreur
  const [envoiInfo, setEnvoiInfo] = useState('')

  async function verifier() {
    setChargement(true)
    setEnvoiInfo('')
    setEnvoi('idle')
    const pseudos = nettoyerPseudos(texte)
    const result = await previsualiserAdhesions(pseudos)
    if (result.success) {
      setRoster(result.roster)
    } else {
      setEnvoiInfo(result.error || 'Erreur lors de la vérification')
    }
    setChargement(false)
  }

  async function envoyerAlertes() {
    setEnvoi('envoi')
    setEnvoiInfo('')
    const pseudos = nettoyerPseudos(texte)
    const result = await envoyerAlerteComplete(pseudos)
    if (result.success) {
      setEnvoi('ok')
      setEnvoiInfo(`Mail envoyé — ${result.problemeCount} joueur${result.problemeCount > 1 ? 's' : ''} à relancer, ${result.okCount} en règle.`)
      setRoster(result.roster)
    } else {
      setEnvoi('erreur')
      setEnvoiInfo(result.error || 'Erreur inconnue')
    }
  }

  function imprimer() {
    const contenu = document.getElementById('roster-imprimable')?.outerHTML || ''
    const fenetre = window.open('', '_blank')
    fenetre.document.write(`
      <html>
        <head>
          <title>19PokerClub — Récapitulatif adhésions</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 24px; }
            table { border-collapse: collapse; width: 100%; font-size: 13px; }
            th { background: #0F3D66; color: #fff; text-align: left; padding: 6px 10px; }
            td { padding: 6px 10px; border-bottom: 1px solid #ddd; }
          </style>
        </head>
        <body>
          <h2>19PokerClub — Récapitulatif adhésions (${new Date().toLocaleDateString('fr-FR')})</h2>
          ${contenu}
        </body>
      </html>
    `)
    fenetre.document.close()
    fenetre.print()
  }

  return (
    <div className="bg-white rounded-2xl shadow-card p-5 flex flex-col gap-4">
      <div>
        <h3 className="font-display text-base font-semibold text-felt flex items-center gap-2">
          <ClipboardPaste size={16} /> Check adhésions & tournoi BlindValet
        </h3>
        <p className="text-sm text-ink/50 mt-1">
          Colle (optionnel) la liste des pseudos BlindValet inscrits à un tournoi — tapis et initiales
          d'avatar sont filtrés automatiquement. "Vérifier" affiche un aperçu ; "Alertes" enregistre le
          suivi (compteurs semaines/étapes) et envoie le récap complet par mail.
        </p>
      </div>

      <textarea
        value={texte}
        onChange={(e) => setTexte(e.target.value)}
        rows={6}
        placeholder={'Philkistuch\nAss de Pig\nParrumeur19\n...'}
        className="border border-ink/15 rounded-xl px-3 py-2 text-sm font-mono resize-y"
      />

      <div className="flex items-center gap-3 flex-wrap">
        <button
          onClick={verifier}
          disabled={chargement}
          className="bg-felt text-ivory rounded-xl px-4 py-2 text-sm font-semibold hover:bg-felt-light disabled:opacity-40"
        >
          {chargement ? 'Vérification…' : 'Vérifier (aperçu)'}
        </button>
        <button
          onClick={envoyerAlertes}
          disabled={envoi === 'envoi'}
          className="flex items-center gap-1.5 bg-white border border-ink/10 rounded-xl px-4 py-2 text-sm font-medium text-ink/70 hover:bg-ink/5 disabled:opacity-40"
        >
          <Mail size={14} />
          {envoi === 'envoi' ? 'Envoi en cours…' : 'Alertes (enregistrer + mail)'}
        </button>
        {roster && (
          <button
            onClick={imprimer}
            className="flex items-center gap-1.5 bg-white border border-ink/10 rounded-xl px-4 py-2 text-sm font-medium text-ink/70 hover:bg-ink/5"
          >
            <Printer size={14} /> Imprimer
          </button>
        )}
        {envoiInfo && (
          <span className={`text-xs font-medium ${envoi === 'erreur' ? 'text-chip-red' : 'text-chip-blue'}`}>
            {envoiInfo}
          </span>
        )}
      </div>

      {roster && <RosterTable roster={roster} />}
    </div>
  )
}
