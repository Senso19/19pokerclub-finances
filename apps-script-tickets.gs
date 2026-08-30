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
 *
 * IMPORTANT : "Nouveau total" contient une formule (ex: =SOMME(I2:J2)) que
 * ce script NE MODIFIE JAMAIS directement. Il écrit uniquement dans la
 * dernière colonne que cette formule additionne (ex: "Dotation 2026-2027"),
 * lue dynamiquement à chaque appel — donc si tu ajoutes d'autres colonnes
 * entre les deux, il continue de viser la bonne.
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

function letterToCol_(letters) {
  let col = 0;
  for (let i = 0; i < letters.length; i++) {
    col = col * 26 + (letters.charCodeAt(i) - 64);
  }
  return col - 1; // 0-indexé
}

// Lit la formule de la cellule "Nouveau total" d'une ligne (ex:
// "=SOMME(I2:J2)") et renvoie l'index (0-indexé) de la DERNIÈRE colonne
// qu'elle additionne : c'est celle-là qu'on doit ajuster, jamais le total
// lui-même.
function getAdjustmentColumn_(sheet, sheetRow, colSoldeIndex) {
  const formula = sheet.getRange(sheetRow, colSoldeIndex + 1).getFormula();
  const match = formula.match(/([A-Za-z]+)\d+\s*\)?\s*$/);
  if (match) {
    return letterToCol_(match[1].toUpperCase());
  }
  // Repli si jamais il n'y a pas de formule : colonne juste avant le total.
  return colSoldeIndex - 1;
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
    const colDepart = colPrenom + 1; // première colonne de données après Prénom

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

    const delta = sens === 'augmenter' ? montant : -montant;

    if (rowIndex === -1) {
      // Joueur pas encore sur la feuille (ex: nouvelle dotation) : on trouve
      // la position alphabétique (sur NOM) où l'insérer, pour garder le
      // tableau trié. Par défaut, juste au-dessus de la ligne TOTAL.
      let insertAt = totalRowIndex !== -1 ? totalRowIndex + 1 : data.length + 1; // 1-indexé
      for (let i = headerRowIndex + 1; i < data.length; i++) {
        const rowNomRaw = String(data[i][colNom] || '').trim();
        if (!rowNomRaw || rowNomRaw.toUpperCase() === 'TOTAL') break;
        if (rowNomRaw.toUpperCase() > nom) {
          insertAt = i + 1; // 1-indexé
          break;
        }
      }
      sheet.insertRowBefore(insertAt);
      const newRow = insertAt;

      // Recopie la ligne du dessus (formules + mise en forme incluses) pour
      // que "Nouveau total" garde sa formule sur la nouvelle ligne, puis on
      // écrase seulement les cellules qui doivent changer.
      if (newRow > headerRowIndex + 2) {
        sheet
          .getRange(newRow - 1, 1, 1, sheet.getLastColumn())
          .copyTo(sheet.getRange(newRow, 1, 1, sheet.getLastColumn()));
      }

      sheet.getRange(newRow, colNom + 1).setValue(body.nom);
      sheet.getRange(newRow, colPrenom + 1).setValue(body.prenom || '');
      // Remet à zéro toutes les colonnes de données entre Prénom et le
      // total (au cas où la ligne recopiée avait des montants), avant d'y
      // mettre le premier mouvement.
      for (let c = colDepart; c < colSolde; c++) {
        sheet.getRange(newRow, c + 1).setValue(0);
      }
      const colAjustement = getAdjustmentColumn_(sheet, newRow, colSolde);
      sheet.getRange(newRow, colAjustement + 1).setValue(delta);

      if (colCommentaires !== -1) {
        const dateStr = Utilities.formatDate(new Date(), 'Europe/Paris', 'dd/MM/yyyy');
        sheet.getRange(newRow, colCommentaires + 1).setValue(dateStr + ' : ligne créée automatiquement (site finances)');
      }

      SpreadsheetApp.flush();
      const newSolde = Number(sheet.getRange(newRow, colSolde + 1).getValue()) || delta;
      return ContentService.createTextOutput(JSON.stringify({ success: true, newSolde: newSolde, created: true }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    const sheetRow = rowIndex + 1; // getRange est en base 1
    const colAjustement = getAdjustmentColumn_(sheet, sheetRow, colSolde);
    const currentAjustement = Number(sheet.getRange(sheetRow, colAjustement + 1).getValue()) || 0;
    sheet.getRange(sheetRow, colAjustement + 1).setValue(currentAjustement + delta);

    if (colCommentaires !== -1) {
      const existing = sheet.getRange(sheetRow, colCommentaires + 1).getValue();
      const dateStr = Utilities.formatDate(new Date(), 'Europe/Paris', 'dd/MM/yyyy');
      const note = dateStr + ' : ' + (sens === 'augmenter' ? '+' : '-') + montant + '€ (site finances)';
      const updated = existing ? existing + ' | ' + note : note;
      sheet.getRange(sheetRow, colCommentaires + 1).setValue(updated);
    }

    SpreadsheetApp.flush();
    const newSolde = Number(sheet.getRange(sheetRow, colSolde + 1).getValue());

    return ContentService.createTextOutput(JSON.stringify({ success: true, newSolde: newSolde }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ success: false, error: err.message }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}
