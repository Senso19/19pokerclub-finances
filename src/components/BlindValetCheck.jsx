import { useState } from 'react'
import { ClipboardPaste, CheckCircle2, AlertTriangle } from 'lucide-react'

function normalise(s) {
  return String(s || '').trim().toLowerCase()
}

// Le copier-coller depuis BlindValet ramène aussi les tapis (lignes
// purement numériques) et parfois les initiales d'avatar sur leur propre
// ligne juste avant le pseudo (ex: "H" avant "HotDoggi" quand la photo de
// profil ne charge pas) — on filtre les deux pour ne garder que les pseudos.
function nettoyerPseudos(texte) {
  return texte
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 3 && !/^\d+$/.test(l))
}

export default function BlindValetCheck({ inscrits }) {
  const [texte, setTexte] = useState('')
  const [resultat, setResultat] = useState(null)

  function verifier() {
    const pseudos = nettoyerPseudos(texte)

    const parPseudo = {}
    inscrits.forEach((j) => {
      if (j.pseudoBlindValet) parPseudo[normalise(j.pseudoBlindValet)] = j
    })

    const trouves = []
    const manquants = []
    pseudos.forEach((pseudo) => {
      const match = parPseudo[normalise(pseudo)]
      if (match) {
        trouves.push({ pseudo, joueur: match })
      } else {
        manquants.push(pseudo)
      }
    })

    setResultat({ trouves, manquants })
  }

  return (
    <div className="bg-white rounded-2xl shadow-card p-5 flex flex-col gap-4">
      <div>
        <h3 className="font-display text-base font-semibold text-felt flex items-center gap-2">
          <ClipboardPaste size={16} /> Check inscrits tournoi BlindValet
        </h3>
        <p className="text-sm text-ink/50 mt-1">
          Colle directement ce que tu copies depuis l'onglet "Joueurs" de BlindValet (tapis et initiales
          d'avatar inclus, ils sont filtrés automatiquement). Le site vérifie ensuite lesquels n'ont pas de
          ligne sur le formulaire d'inscription du club.
        </p>
      </div>

      <textarea
        value={texte}
        onChange={(e) => setTexte(e.target.value)}
        rows={6}
        placeholder={'Philkistuch\nAss de Pig\nParrumeur19\n...'}
        className="border border-ink/15 rounded-xl px-3 py-2 text-sm font-mono resize-y"
      />

      <button
        onClick={verifier}
        disabled={!texte.trim()}
        className="self-start bg-felt text-ivory rounded-xl px-4 py-2 text-sm font-semibold hover:bg-felt-light disabled:opacity-40"
      >
        Vérifier
      </button>

      {resultat && (
        <div className="flex flex-col gap-4 mt-2">
          <div>
            <div className="flex items-center gap-2 text-chip-red font-semibold text-sm mb-2">
              <AlertTriangle size={15} />
              Sans formulaire d'inscription ({resultat.manquants.length})
            </div>
            {resultat.manquants.length === 0 ? (
              <p className="text-sm text-ink/40">Aucun — tous les inscrits ont rempli le formulaire 🎉</p>
            ) : (
              <ul className="flex flex-col gap-1">
                {resultat.manquants.map((pseudo) => (
                  <li key={pseudo} className="text-sm bg-chip-red/10 text-chip-red rounded-lg px-3 py-1.5">
                    {pseudo}
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div>
            <div className="flex items-center gap-2 text-chip-blue font-semibold text-sm mb-2">
              <CheckCircle2 size={15} />
              Trouvés sur le formulaire ({resultat.trouves.length})
            </div>
            <ul className="flex flex-col gap-1">
              {resultat.trouves.map(({ pseudo, joueur }) => (
                <li
                  key={pseudo}
                  className="text-sm flex items-center justify-between bg-ivory rounded-lg px-3 py-1.5"
                >
                  <span>
                    {pseudo} <span className="text-ink/40">— {joueur.prenom} {joueur.nom}</span>
                  </span>
                  <span className={joueur.regle ? 'text-chip-blue text-xs font-medium' : 'text-chip-gold text-xs font-medium'}>
                    {joueur.regle ? 'Cotisation réglée' : 'Cotisation non réglée'}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  )
}
