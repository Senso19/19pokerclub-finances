const SCRIPT_URL = import.meta.env.VITE_INSCRIPTION_SCRIPT_URL

export function inscriptionSyncEnabled() {
  return Boolean(SCRIPT_URL)
}

export async function fetchInscrits() {
  if (!SCRIPT_URL) return []
  try {
    const res = await fetch(SCRIPT_URL)
    const data = await res.json()
    return data.joueurs || []
  } catch (err) {
    console.error('Impossible de charger la liste des inscrits depuis le formulaire d\'adhésion', err)
    return []
  }
}

export async function envoyerAlerteComplete(pseudos) {
  if (!SCRIPT_URL) return { success: false, error: 'Synchronisation non configurée' }
  try {
    const res = await fetch(SCRIPT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ action: 'alerte_complete', pseudos }),
    })
    return await res.json()
  } catch (err) {
    console.error('Échec de l\'envoi de l\'alerte complète', err)
    return { success: false, error: err.message }
  }
}

export async function validateAdhesion({ nom, prenom, categorie }) {
  if (!SCRIPT_URL) return { success: false, error: 'Synchronisation non configurée' }
  try {
    const res = await fetch(SCRIPT_URL, {
      method: 'POST',
      // text/plain évite le preflight CORS qu'Apps Script ne gère pas.
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ nom, prenom, categorie }),
    })
    return await res.json()
  } catch (err) {
    console.error('Échec de synchronisation avec le formulaire d\'inscription', err)
    return { success: false, error: err.message }
  }
}
