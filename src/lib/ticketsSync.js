const SCRIPT_URL = import.meta.env.VITE_TICKETS_SCRIPT_URL

export function ticketsSyncEnabled() {
  return Boolean(SCRIPT_URL)
}

export async function fetchJoueurs() {
  if (!SCRIPT_URL) return []
  try {
    const res = await fetch(SCRIPT_URL)
    const data = await res.json()
    return data.joueurs || []
  } catch (err) {
    console.error('Impossible de charger la liste des joueurs depuis le Sheet', err)
    return []
  }
}

// sens: 'augmenter' (le club émet un ticket, le joueur est plus crédité)
//    ou 'diminuer' (le joueur consomme un ticket)
export async function syncJoueurSolde({ nom, prenom, montant, sens }) {
  if (!SCRIPT_URL) return { success: false, error: 'Synchronisation non configurée' }
  try {
    const res = await fetch(SCRIPT_URL, {
      method: 'POST',
      // text/plain évite le preflight CORS qu'Apps Script ne gère pas ; le
      // script lit quand même e.postData.contents comme du JSON classique.
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ nom, prenom, montant, sens }),
    })
    return await res.json()
  } catch (err) {
    console.error('Échec de synchronisation avec le Sheet', err)
    return { success: false, error: err.message }
  }
}
