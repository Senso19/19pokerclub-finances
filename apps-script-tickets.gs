/**
 * 19PokerClub · Synchronisation des soldes de tickets casino
 *
 * Installation :
 * 1. Ouvre la feuille "Tickets en attente" sur Google Sheets.
 * 2. Menu Extensions → Apps Script.
 * 3. Supprime le contenu par défaut, colle tout ce fichier.
 * 4. Menu Déployer → Nouveau déploiement → type "Application Web".
 *    - Exécuter en tant que : Moi
 *    - Qui a accès : Tous
 * 5. Copie l'URL de déploiement (se termine par /exec) et donne-la moi,
 *    ou colle-la toi-même dans Vercel comme VITE_TICKETS_SCRIPT_URL.
 *
 * Le script cherche les colonnes par leur EN-TÊTE (pas par lettre fixe) et
 * les joueurs par NOM + Prénom (pas par numéro de ligne), donc les
 * insertions de lignes ou de colonnes ne cassent rien.
 */

const COL_NOM = 'NOM';
const COL_PRENOM = 'Prénom';
const COL_SOLDE = 'Nouveau total';
const COL_COMMENTAIRES = 'Commentaires';

function findPlayersSheet_() {
  const sheets = SpreadsheetApp.getActiveSpreadsheet().getSheets();
  for (const sheet of sheets) {
    const data = sheet.getDataRange().getValues();
    for (let r = 0; r < data.length; r++) {
      if (data[r].includes(COL_NOM) && data[r].includes(COL_PRENOM)) {
        return { sheet, data, headerRowIndex: r };
      }
    }
  }
  throw new Error('Feuille avec colonnes NOM/Prénom introuvable.');
}

function doGet(e) {
  const { data, headerRowIndex } = findPlayersSheet_();
  const headers = data[headerRowIndex];
  const colNom = headers.indexOf(COL_NOM);
  const colPrenom = headers.indexOf(COL_PRENOM);
  const colSolde = headers.indexOf(COL_SOLDE);

  const joueurs = [];
  for (let i = headerRowIndex + 1; i < data.length; i++) {
    const nom = data[i][colNom];
    if (!nom || String(nom).trim().toUpperCase() === 'TOTAL') continue;
    joueurs.push({
      nom: String(nom).trim(),
      prenom: String(data[i][colPrenom] || '').trim(),
      solde: Number(data[i][colSolde]) || 0,
    });
  }

  return ContentService.createTextOutput(JSON.stringify({ joueurs }))
    .setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  try {
    const body = JSON.parse(e.postData.contents);
    const nom = String(body.nom || '').trim().toUpperCase();
    const prenom = String(body.prenom || '').trim().toUpperCase();
    const montant = Number(body.montant);
    const sens = body.sens; // 'augmenter' ou 'diminuer'

    if (!nom || !montant || (sens !== 'augmenter' && sens !== 'diminuer')) {
      throw new Error('Paramètres invalides.');
    }

    const { sheet, data, headerRowIndex } = findPlayersSheet_();
    const headers = data[headerRowIndex];
    const colNom = headers.indexOf(COL_NOM);
    const colPrenom = headers.indexOf(COL_PRENOM);
    const colSolde = headers.indexOf(COL_SOLDE);
    const colCommentaires = headers.indexOf(COL_COMMENTAIRES);

    let rowIndex = -1;
    let totalRowIndex = -1;
    for (let i = headerRowIndex + 1; i < data.length; i++) {
      const rowNomRaw = String(data[i][colNom] || '').trim();
      if (rowNomRaw.toUpperCase() === 'TOTAL' && totalRowIndex === -1) {
        totalRowIndex = i;
      }
      const rowNom = rowNomRaw.toUpperCase();
      const rowPrenom = String(data[i][colPrenom] || '').trim().toUpperCase();
      if (rowNom === nom && rowPrenom === prenom) {
        rowIndex = i;
        break;
      }
    }

    if (rowIndex === -1) {
      // Joueur pas encore sur la feuille (ex: nouvelle dotation) : on crée
      // sa ligne juste au-dessus de la ligne TOTAL pour que les formules de
      // somme continuent de l'inclure.
      const insertAt = totalRowIndex !== -1 ? totalRowIndex + 1 : data.length + 1; // 1-indexé
      sheet.insertRowBefore(insertAt);
      const newRow = insertAt;
      sheet.getRange(newRow, colNom + 1).setValue(body.nom);
      sheet.getRange(newRow, colPrenom + 1).setValue(body.prenom || '');
      const startSolde = sens === 'augmenter' ? montant : 0;
      sheet.getRange(newRow, colSolde + 1).setValue(startSolde);
      if (colCommentaires !== -1) {
        const dateStr = Utilities.formatDate(new Date(), 'Europe/Paris', 'dd/MM/yyyy');
        sheet.getRange(newRow, colCommentaires + 1).setValue(dateStr + ' : ligne créée automatiquement (site finances)');
      }
      return ContentService.createTextOutput(JSON.stringify({ success: true, newSolde: startSolde, created: true }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    const sheetRow = rowIndex + 1; // getRange est en base 1
    const currentSolde = Number(sheet.getRange(sheetRow, colSolde + 1).getValue()) || 0;
    const delta = sens === 'augmenter' ? montant : -montant;
    const newSolde = currentSolde + delta;
    sheet.getRange(sheetRow, colSolde + 1).setValue(newSolde);

    if (colCommentaires !== -1) {
      const existing = sheet.getRange(sheetRow, colCommentaires + 1).getValue();
      const dateStr = Utilities.formatDate(new Date(), 'Europe/Paris', 'dd/MM/yyyy');
      const note = dateStr + ' : ' + (sens === 'augmenter' ? '+' : '-') + montant + '€ (site finances)';
      const updated = existing ? existing + ' | ' + note : note;
      sheet.getRange(sheetRow, colCommentaires + 1).setValue(updated);
    }

    return ContentService.createTextOutput(JSON.stringify({ success: true, newSolde: newSolde }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ success: false, error: err.message }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}
