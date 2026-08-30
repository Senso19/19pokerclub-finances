/**
 * 19PokerClub · Validation des adhésions payées via le formulaire d'inscription
 *
 * Ce script est INDÉPENDANT du script déjà présent sur ce Sheet (celui qui
 * gère les liens Winamax/BlindValet) : il accède au fichier par son ID
 * plutôt que d'être "le" script du Sheet, donc les deux coexistent sans se
 * marcher dessus.
 *
 * Installation :
 * 1. Va sur script.google.com (PAS via Extensions → Apps Script du Sheet,
 *    pour ne pas toucher au script existant) → Nouveau projet.
 * 2. Colle tout ce fichier.
 * 3. Déployer → Nouveau déploiement → type "Application Web".
 *    - Exécuter en tant que : Moi
 *    - Qui a accès : Tous
 * 4. Autorise les permissions demandées (accès à ce Sheet précis + Gmail).
 * 5. Copie l'URL /exec, donne-la moi ou colle-la dans Vercel comme
 *    VITE_INSCRIPTION_SCRIPT_URL.
 * 6. Pour le rapport hebdomadaire (voir plus bas dans ce fichier), exécute
 *    une fois la fonction installerDeclencheurHebdomadaire.
 *
 * Comportement :
 * - Cherche le joueur par Nom + Prénom dans l'onglet "Inscriptions".
 * - S'il existe : marque la colonne "Cotisation réglée" (créée
 *   automatiquement si absente) avec la date du règlement.
 * - S'il n'existe pas : envoie un mail d'alerte à 19pokerclub@gmail.com.
 */

const SPREADSHEET_ID = '1Fd3hRZoqAnhUgerl4exBKEjtetmOKKsRu_QHif_81UA';
const SHEET_TAB = 'Inscriptions';
const COL_NOM = 'Nom';
const COL_PRENOM = 'Prénom';
const COL_VALIDATION = 'Cotisation réglée';
const ALERT_EMAIL = '19pokerclub@gmail.com';

function findInscriptionsSheet_() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName(SHEET_TAB) || ss.getSheets()[0];
  const data = sheet.getDataRange().getValues();
  return { sheet, data, headerRowIndex: 0 };
}

// Liste des joueurs inscrits (pour le menu déroulant "Joueur" du site quand
// la catégorie est "Adhésions").
function doGet(e) {
  const { data, headerRowIndex } = findInscriptionsSheet_();
  const headers = data[headerRowIndex];
  const colNom = headers.indexOf(COL_NOM);
  const colPrenom = headers.indexOf(COL_PRENOM);
  const colValidation = headers.indexOf(COL_VALIDATION);

  const joueurs = [];
  for (let i = headerRowIndex + 1; i < data.length; i++) {
    const nom = data[i][colNom];
    if (!nom) continue;
    joueurs.push({
      nom: String(nom).trim(),
      prenom: String(data[i][colPrenom] || '').trim(),
      regle: colValidation !== -1 ? Boolean(data[i][colValidation]) : false,
    });
  }

  return ContentService.createTextOutput(JSON.stringify({ joueurs }))
    .setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  try {
    const body = JSON.parse(e.postData.contents);
    const nomRaw = String(body.nom || '').trim();
    const prenomRaw = String(body.prenom || '').trim();
    const nom = nomRaw.toUpperCase();
    const prenom = prenomRaw.toUpperCase();
    const categorie = body.categorie || '';

    if (!nom) throw new Error('Nom manquant.');

    const { sheet, data, headerRowIndex } = findInscriptionsSheet_();
    const headers = data[headerRowIndex];
    const colNom = headers.indexOf(COL_NOM);
    const colPrenom = headers.indexOf(COL_PRENOM);
    let colValidation = headers.indexOf(COL_VALIDATION);

    if (colNom === -1 || colPrenom === -1) {
      throw new Error('Colonnes Nom/Prénom introuvables dans l\'onglet ' + SHEET_TAB);
    }

    if (colValidation === -1) {
      colValidation = headers.length;
      sheet.getRange(headerRowIndex + 1, colValidation + 1).setValue(COL_VALIDATION);
    }

    let rowIndex = -1;
    for (let i = headerRowIndex + 1; i < data.length; i++) {
      const rowNom = String(data[i][colNom] || '').trim().toUpperCase();
      const rowPrenom = String(data[i][colPrenom] || '').trim().toUpperCase();
      if (rowNom === nom && rowPrenom === prenom) {
        rowIndex = i;
        break;
      }
    }

    if (rowIndex === -1) {
      MailApp.sendEmail({
        to: ALERT_EMAIL,
        subject: 'Adhésion payée sans inscription — ' + prenomRaw + ' ' + nomRaw,
        body:
          'Le joueur ' + prenomRaw + ' ' + nomRaw + ' a réglé sa cotisation' +
          (categorie ? ' (catégorie : ' + categorie + ')' : '') +
          ', mais n\'a pas de ligne dans le formulaire d\'inscription 2026/2027.\n\n' +
          'Vérifie s\'il s\'agit d\'une erreur de nom, ou relance-le pour qu\'il remplisse le formulaire.',
      });
      return ContentService.createTextOutput(JSON.stringify({ success: true, found: false }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    const sheetRow = rowIndex + 1; // getRange est en base 1
    const dateStr = Utilities.formatDate(new Date(), 'Europe/Paris', 'dd/MM/yyyy HH:mm');
    sheet.getRange(sheetRow, colValidation + 1).setValue('Réglée le ' + dateStr);

    return ContentService.createTextOutput(JSON.stringify({ success: true, found: true }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ success: false, error: err.message }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

/* ────────────────────────────────────────────────────────────────────────
 * Rapport hebdomadaire : croise les paiements Supabase avec les inscriptions
 * du Sheet, avec un compteur de semaines consécutives par joueur/motif.
 * ──────────────────────────────────────────────────────────────────────── */

// Clé anon Supabase : volontairement publique (c'est sa fonction), lecture
// seule via les policies RLS/permissions déjà en place côté site.
const SUPABASE_URL = 'https://gpmpghjqkhuobcnqgasm.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdwbXBnaGpxa2h1b2JjbnFnYXNtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODgwMDQ0MDgsImV4cCI6MjEwMzU4MDQwOH0.rMJy2lXJy4zrbyme_Iasim7atZmJExvTI7qjkeJ7Rio';
const TRACKING_SHEET_NAME = 'Suivi Relances';

function normName_(s) {
  return String(s || '').trim().toUpperCase();
}

// Récupère (nom, prénom) de tous les paiements d'adhésion validés dans
// Supabase (catégories "Adhésions" et "Adhésions par Bankroll").
function getJoueursPayes_() {
  const headers = { apikey: SUPABASE_ANON_KEY, Authorization: 'Bearer ' + SUPABASE_ANON_KEY };

  const catRes = UrlFetchApp.fetch(
    SUPABASE_URL + '/rest/v1/categories?select=id,nom&nom=in.(%22Adh%C3%A9sions%22,%22Adh%C3%A9sions%20par%20Bankroll%22)',
    { headers: headers, muteHttpExceptions: true }
  );
  const cats = JSON.parse(catRes.getContentText());
  const catIds = cats.map(function (c) { return c.id; });
  if (catIds.length === 0) return [];

  const idsFilter = catIds.map(function (id) { return '"' + id + '"'; }).join(',');
  const ecrituresUrl =
    SUPABASE_URL + '/rest/v1/ecritures?select=joueur_nom,joueur_prenom,categorie_id' +
    '&type=eq.recette&statut=eq.valide&joueur_nom=not.is.null&categorie_id=in.(' + idsFilter + ')';
  const res = UrlFetchApp.fetch(ecrituresUrl, { headers: headers, muteHttpExceptions: true });
  const ecritures = JSON.parse(res.getContentText());

  const seen = {};
  const joueurs = [];
  (ecritures || []).forEach(function (e) {
    const key = normName_(e.joueur_nom) + '|' + normName_(e.joueur_prenom);
    if (seen[key]) return;
    seen[key] = true;
    joueurs.push({ nom: e.joueur_nom, prenom: e.joueur_prenom || '' });
  });
  return joueurs;
}

// Récupère la liste des inscrits, avec leur statut de règlement.
function getInscrits_() {
  const { data, headerRowIndex } = findInscriptionsSheet_();
  const headers = data[headerRowIndex];
  const colNom = headers.indexOf(COL_NOM);
  const colPrenom = headers.indexOf(COL_PRENOM);
  const colValidation = headers.indexOf(COL_VALIDATION);

  const inscrits = [];
  for (let i = headerRowIndex + 1; i < data.length; i++) {
    const nom = data[i][colNom];
    if (!nom) continue;
    inscrits.push({
      nom: nom,
      prenom: data[i][colPrenom] || '',
      regle: colValidation !== -1 && data[i][colValidation],
    });
  }
  return inscrits;
}

function getTrackingSheet_() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  let sheet = ss.getSheetByName(TRACKING_SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(TRACKING_SHEET_NAME);
    sheet.appendRow(['Nom', 'Prénom', 'Motif', 'Compteur', 'Dernière alerte']);
  }
  return sheet;
}

// Met à jour le compteur pour chaque (nom, prénom, motif) présent cette
// semaine, retire les entrées résolues, et renvoie la liste à jour avec
// leur compteur pour l'email.
function updateTracking_(motif, personnes) {
  const sheet = getTrackingSheet_();
  const data = sheet.getDataRange().getValues();
  const existing = {}; // clé -> { rowNumber, compteur }
  for (let i = 1; i < data.length; i++) {
    if (data[i][2] !== motif) continue;
    const key = normName_(data[i][0]) + '|' + normName_(data[i][1]);
    existing[key] = { row: i + 1, compteur: Number(data[i][3]) || 0 };
  }

  const presentKeys = {};
  const resultat = personnes.map(function (p) {
    const key = normName_(p.nom) + '|' + normName_(p.prenom);
    presentKeys[key] = true;
    const prev = existing[key];
    const compteur = prev ? prev.compteur + 1 : 1;
    const dateStr = Utilities.formatDate(new Date(), 'Europe/Paris', 'dd/MM/yyyy');
    if (prev) {
      sheet.getRange(prev.row, 4).setValue(compteur);
      sheet.getRange(prev.row, 5).setValue(dateStr);
    } else {
      sheet.appendRow([p.nom, p.prenom, motif, compteur, dateStr]);
    }
    return { nom: p.nom, prenom: p.prenom, compteur: compteur };
  });

  // Retire les entrées de ce motif qui ne sont plus présentes (régularisées)
  const rowsToDelete = [];
  Object.keys(existing).forEach(function (key) {
    if (!presentKeys[key]) rowsToDelete.push(existing[key].row);
  });
  rowsToDelete.sort(function (a, b) { return b - a; }).forEach(function (row) {
    sheet.deleteRow(row);
  });

  return resultat;
}

function formatListeHtml_(titre, personnes, singulier) {
  if (personnes.length === 0) {
    return '<h3>' + titre + '</h3><p>Aucun joueur concerné 🎉</p>';
  }
  const items = personnes
    .map(function (p) {
      const semaine = p.compteur > 1 ? p.compteur + 'e semaine' : '1re semaine';
      return '<li>' + p.prenom + ' ' + p.nom + ' — <strong>' + semaine + '</strong> (' + singulier + ')</li>';
    })
    .join('');
  return '<h3>' + titre + ' (' + personnes.length + ')</h3><ul>' + items + '</ul>';
}

function envoyerRapportHebdomadaire() {
  const inscrits = getInscrits_();
  const payes = getJoueursPayes_();

  const inscritsParClef = {};
  inscrits.forEach(function (p) {
    inscritsParClef[normName_(p.nom) + '|' + normName_(p.prenom)] = p;
  });
  const payesParClef = {};
  payes.forEach(function (p) {
    payesParClef[normName_(p.nom) + '|' + normName_(p.prenom)] = p;
  });

  // Inscrits mais pas (encore) réglés
  const inscritsNonPayes = inscrits.filter(function (p) { return !p.regle; });

  // Payés mais sans ligne d'inscription
  const payesNonInscrits = payes.filter(function (p) {
    return !inscritsParClef[normName_(p.nom) + '|' + normName_(p.prenom)];
  });

  const listeA = updateTracking_('Pas réglé', inscritsNonPayes);
  const listeB = updateTracking_('Pas de formulaire', payesNonInscrits);

  const html =
    '<h2>19PokerClub — Suivi hebdomadaire des adhésions</h2>' +
    formatListeHtml_('Inscrits sans cotisation réglée', listeA, 'relance à faire') +
    formatListeHtml_('Cotisation réglée sans formulaire rempli', listeB, 'à faire remplir le formulaire');

  MailApp.sendEmail({
    to: '19pokerclub@gmail.com',
    subject: '19PokerClub — Suivi adhésions du ' + Utilities.formatDate(new Date(), 'Europe/Paris', 'dd/MM/yyyy'),
    htmlBody: html,
  });
}

// À exécuter UNE SEULE FOIS manuellement (sélectionne cette fonction dans le
// menu déroulant en haut de l'éditeur, puis clique sur "Exécuter") pour
// installer le déclencheur automatique du jeudi.
function installerDeclencheurHebdomadaire() {
  ScriptApp.getProjectTriggers().forEach(function (t) {
    if (t.getHandlerFunction() === 'envoyerRapportHebdomadaire') ScriptApp.deleteTrigger(t);
  });
  ScriptApp.newTrigger('envoyerRapportHebdomadaire')
    .timeBased()
    .onWeekDay(ScriptApp.WeekDay.THURSDAY)
    .nearMinute(30)
    .atHour(19)
    .create();
}
