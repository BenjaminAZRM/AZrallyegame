// ─── ENVOI D'E-MAILS (Brevo SMTP via nodemailer) ────────────────────────────────
// Piloté par variables d'environnement (jamais de secret en dur) :
//   SMTP_HOST   ex. smtp-relay.brevo.com
//   SMTP_PORT   ex. 587
//   SMTP_USER   identifiant SMTP fourni par Brevo
//   SMTP_PASS   clé SMTP fournie par Brevo
//   MAIL_FROM   ex. "CHRONORALLYERACE <admin@chronorallyerace.com>"
//   SMTP_SECURE "true" pour du TLS direct (port 465). Par défaut false (STARTTLS, port 587).
//
// Tant que SMTP_HOST / SMTP_USER / SMTP_PASS ne sont pas tous fournis, aucun mail
// n'est réellement envoyé : le lien est journalisé dans les logs du serveur
// (parfait pour tester le parcours avant que Brevo/DNS soient prêts).
'use strict';

const SMTP_OK = !!(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
const MAIL_FROM = process.env.MAIL_FROM || 'CHRONORALLYERACE <admin@chronorallyerace.com>';

let transporter = null;
if (SMTP_OK) {
  try {
    const nodemailer = require('nodemailer');
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587', 10),
      secure: String(process.env.SMTP_SECURE || 'false') === 'true',
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    });
    console.log('Mailer : SMTP configuré (' + process.env.SMTP_HOST + ') ✔');
  } catch (e) {
    console.error('Mailer : nodemailer indisponible → simulation :', e.message);
    transporter = null;
  }
} else {
  console.log('Mailer : SMTP non configuré → simulation (liens dans les logs)');
}

function journaliser(type, email, lien) {
  console.log('────────────────────────────────────────────────────────');
  console.log('[MAIL:' + type + '] (SMTP non configuré → simulation)');
  console.log('  Destinataire : ' + email);
  console.log('  Lien         : ' + lien);
  console.log('────────────────────────────────────────────────────────');
}

function esc(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
  });
}

// Gabarit commun (compatible clients mail : styles en ligne, polices système)
function envelope(titre, intro, libelleBouton, lien, complement) {
  const A = '#f97316', BG = '#0e1013', CARD = '#15181d', LINE = '#2a2f37',
        PAPER = '#eceef1', FOG = '#8b929c';
  const html =
`<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:${BG};">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${BG};padding:28px 12px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:440px;background:${CARD};border:1px solid ${LINE};border-radius:12px;overflow:hidden;">
        <tr><td style="padding:26px 28px 6px;text-align:center;">
          <div style="font-family:Arial,Helvetica,sans-serif;font-weight:700;letter-spacing:.10em;font-size:22px;">
            <span style="color:#fff;">CHRONO</span><span style="color:#F57C00;">RALLYE</span><span style="color:#fff;">RACE</span>
          </div>
        </td></tr>
        <tr><td style="padding:14px 28px 4px;">
          <h1 style="margin:0 0 12px;font-family:Arial,Helvetica,sans-serif;font-size:19px;color:${PAPER};">${esc(titre)}</h1>
          <p style="margin:0 0 18px;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.6;color:${PAPER};">${intro}</p>
        </td></tr>
        <tr><td align="center" style="padding:4px 28px 8px;">
          <a href="${esc(lien)}" style="display:inline-block;background:${A};color:#141414;text-decoration:none;font-family:Arial,Helvetica,sans-serif;font-weight:700;font-size:15px;padding:14px 26px;border-radius:9px;">${esc(libelleBouton)}</a>
        </td></tr>
        <tr><td style="padding:12px 28px 4px;">
          <p style="margin:0 0 6px;font-family:Arial,Helvetica,sans-serif;font-size:11px;color:${FOG};">Si le bouton ne fonctionne pas, copie ce lien dans ton navigateur :</p>
          <p style="margin:0 0 16px;font-family:Arial,Helvetica,sans-serif;font-size:11px;word-break:break-all;"><a href="${esc(lien)}" style="color:${A};">${esc(lien)}</a></p>
          ${complement ? `<p style="margin:0 0 8px;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:1.6;color:${FOG};">${complement}</p>` : ''}
        </td></tr>
        <tr><td style="padding:10px 28px 24px;border-top:1px solid ${LINE};">
          <p style="margin:12px 0 0;font-family:Arial,Helvetica,sans-serif;font-size:10px;letter-spacing:.06em;color:${FOG};text-align:center;">CHRONORALLYERACE — Simulation amateur, non officielle</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
  return html;
}

function gabaritVerification(lien) {
  return {
    sujet: 'Vérifie ton adresse — CHRONORALLYERACE',
    html: envelope(
      'Bienvenue au départ !',
      'Confirme ton adresse e-mail pour activer ton compte et pouvoir lancer une saison. Ce lien est valable 24&nbsp;heures.',
      'Vérifier mon adresse', lien,
      "Tu n'es pas à l'origine de cette inscription ? Ignore simplement ce message."
    ),
    texte: 'Bienvenue sur CHRONORALLYERACE !\n\nConfirme ton adresse e-mail (valable 24 h) :\n' + lien +
           "\n\nTu n'es pas à l'origine de cette inscription ? Ignore ce message."
  };
}

function gabaritReset(lien) {
  return {
    sujet: 'Réinitialise ton mot de passe — CHRONORALLYERACE',
    html: envelope(
      'Nouveau mot de passe',
      'Tu as demandé à réinitialiser ton mot de passe. Clique ci-dessous pour en choisir un nouveau. Ce lien est valable 1&nbsp;heure.',
      'Choisir un nouveau mot de passe', lien,
      "Tu n'as rien demandé ? Ignore ce message : ton mot de passe actuel reste inchangé."
    ),
    texte: 'Réinitialisation de ton mot de passe CHRONORALLYERACE.\n\nChoisis un nouveau mot de passe (lien valable 1 h) :\n' + lien +
           "\n\nTu n'as rien demandé ? Ignore ce message."
  };
}

async function envoyer(email, g) {
  if (!transporter) { return { ok: false, simule: true }; }
  await transporter.sendMail({ from: MAIL_FROM, to: email, subject: g.sujet, html: g.html, text: g.texte });
  return { ok: true };
}

async function envoyerVerification(email, lien) {
  const g = gabaritVerification(lien);
  if (!transporter) { journaliser('VERIFICATION', email, lien); return { ok: false, simule: true }; }
  return envoyer(email, g);
}

async function envoyerReset(email, lien) {
  const g = gabaritReset(lien);
  if (!transporter) { journaliser('RESET', email, lien); return { ok: false, simule: true }; }
  return envoyer(email, g);
}

module.exports = {
  envoyerVerification, envoyerReset,
  gabaritVerification, gabaritReset, // exportés pour prévisualisation/tests
  smtpConfigure: SMTP_OK,
};
