/**
 * Gabarit de l'e-mail « récapitulatif de commande » des JCIA 2027.
 *
 * Ce module est volontairement sans dépendance : il est utilisé par le script
 * d'envoi (scripts/email/send-receipt.mjs), par le test (test-receipt.mjs) et
 * il peut être repris tel quel par le serveur de billetterie.
 *
 * Deux versions sont produites :
 *   • `html`  mise en page pour les clients de messagerie (tableaux, styles en
 *             ligne — c'est ce que les clients savent rendre) ;
 *   • `text`  version texte, indispensable : certains clients ne rendent pas le
 *             HTML, et l'absence de version texte fait chuter la délivrabilité.
 *
 * Aucune donnée sensible n'y figure : pas de numéro de carte (seuls le réseau
 * et les quatre derniers chiffres), pas de code secret, pas de mot de passe.
 */

const BRAND = {
  navy: '#19203a',
  orange: '#f6a343',
  teal: '#2db8bd',
  sand: '#faf5ef',
  text: '#2b3350',
  muted: '#6b7390',
}

/** Échappe le texte inséré dans le HTML (aucune injection possible) */
export function esc(value = '') {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

/** Montant en francs CFA, avec séparateur de milliers */
export function formatXAF(amount, locale = 'fr-FR') {
  return `${new Intl.NumberFormat(locale).format(Number(amount) || 0)} FCFA`
}

/** Moyen de paiement lisible : « MTN Mobile Money » ou « Visa •••• 4242 » */
export function paymentLabel(payment = {}) {
  if (payment.method === 'card') {
    const brand = payment.brand === 'mastercard' ? 'Mastercard' : payment.brand === 'visa' ? 'Visa' : 'Carte bancaire'
    return payment.last4 ? `${brand} •••• ${payment.last4}` : brand
  }
  const op = payment.operator === 'orange' ? 'Orange Money' : payment.operator === 'mtn' ? 'MTN Mobile Money' : 'Mobile Money'
  return payment.phone ? `${op} (${payment.phone})` : op
}

/**
 * Vérifie la commande avant tout envoi : un récapitulatif faux est pire que
 * pas de récapitulatif. Renvoie la liste des problèmes trouvés (vide = OK).
 */
export function validateOrder(order) {
  const problems = []
  if (!order || typeof order !== 'object') return ['commande absente']
  if (!/^JCIA27-[A-Z0-9]{6}$/.test(order.id ?? '')) problems.push('identifiant de commande invalide')
  if (!/^[^@\s]+@[^@\s.]+\.[^@\s]{2,}$/.test(order.customer?.email ?? '')) problems.push('adresse e-mail invalide')
  if (!order.customer?.name) problems.push('nom du client manquant')
  if (!Number.isInteger(order.quantity) || order.quantity < 1) problems.push('quantité invalide')
  if (Number(order.total) !== Number(order.unitPrice) * Number(order.quantity)) problems.push('total incohérent')
  if (!Array.isArray(order.attendees) || order.attendees.length !== order.quantity) {
    problems.push('liste des participants incohérente')
  }
  if (JSON.stringify(order).match(/\b\d{13,19}\b/)) problems.push('la commande contient ce qui ressemble à un numéro de carte')
  return problems
}

/**
 * Construit l'e-mail.
 * @param {object} order   commande (voir src/services/orders.js)
 * @param {object} options { siteUrl, contactEmail, contactPhone, tierName, eventDates, venue }
 */
export function buildReceipt(order, options = {}) {
  const {
    siteUrl = 'https://www.jcia.cm',
    contactEmail = 'contact@jciacm.com',
    contactPhone = '+237 699 089 937',
    tierName = order.tierId,
    eventDates = '27 & 28 avril 2027',
    venue = 'Hilton Hotel, Yaoundé',
  } = options

  const subject = `JCIA 2027 — récapitulatif de votre commande ${order.id}`
  const rows = [
    ['Commande', order.id],
    ['Billet', `${tierName} × ${order.quantity}`],
    ['Prix unitaire', formatXAF(order.unitPrice)],
    ['Total payé', formatXAF(order.total)],
    ['Moyen de paiement', paymentLabel(order.payment)],
    ['Transaction', order.payment?.transactionId ?? '—'],
    ['Dates', eventDates],
    ['Lieu', venue],
  ]

  const text = [
    `Bonjour ${order.customer.name},`,
    '',
    `Merci ! Votre commande ${order.id} est confirmée pour les Journées Camerounaises de l'Intelligence Artificielle (JCIA 2027).`,
    '',
    ...rows.map(([k, v]) => `${k} : ${v}`),
    '',
    `Participant${order.attendees.length > 1 ? 's' : ''} :`,
    ...order.attendees.map((a, i) => `  ${i + 1}. ${a}`),
    '',
    `Votre billet électronique et son QR code sont disponibles sur ${siteUrl}/billetterie/confirmation/${order.id}`,
    '',
    `Une question ? Écrivez à ${contactEmail} ou appelez le ${contactPhone}.`,
    '',
    'IAC – CAIPI · Intelligence Artificielle Cameroun',
    'Cameroon Artificial Intelligence Policy Institute',
  ].join('\n')

  const html = `<!doctype html>
<html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width">
<title>${esc(subject)}</title></head>
<body style="margin:0;padding:0;background:${BRAND.sand};font-family:Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:${BRAND.text}">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse">
<tr><td align="center" style="padding:24px 12px">
  <!-- Outlook (Word) ignore max-width : ce tableau « fantôme » lui impose les
       600 px, tandis que les autres clients suivent le max-width et se
       rétrécissent proprement sur un téléphone. -->
  <!--[if mso]><table role="presentation" width="600" cellpadding="0" cellspacing="0"><tr><td><![endif]-->
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="width:100%;max-width:600px;border-collapse:collapse;background:#fff;border-radius:14px;overflow:hidden">
    <tr><td style="background:${BRAND.navy};padding:22px 28px;color:#fff">
      <div style="font-size:13px;letter-spacing:.14em;text-transform:uppercase;color:${BRAND.orange}">JCIA 2027</div>
      <div style="font-size:19px;font-weight:700;margin-top:4px">Votre commande est confirmée</div>
    </td></tr>
    <tr><td style="padding:26px 28px 6px">
      <p style="margin:0 0 14px">Bonjour <strong>${esc(order.customer.name)}</strong>,</p>
      <p style="margin:0 0 20px;line-height:1.6">Merci ! Votre commande <strong>${esc(order.id)}</strong> est confirmée pour les Journées Camerounaises de l'Intelligence Artificielle.</p>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;font-size:14px">
        ${rows
          .map(
            ([k, v], i) => `<tr style="background:${i % 2 ? '#fff' : BRAND.sand}">
          <td style="padding:9px 12px;color:${BRAND.muted}">${esc(k)}</td>
          <td style="padding:9px 12px;text-align:right;font-weight:600">${esc(v)}</td></tr>`,
          )
          .join('\n        ')}
      </table>
      <p style="margin:22px 0 8px;font-size:12px;letter-spacing:.1em;text-transform:uppercase;color:${BRAND.muted}">Participant${order.attendees.length > 1 ? 's' : ''}</p>
      <ol style="margin:0 0 22px;padding-left:20px;line-height:1.7">${order.attendees.map((a) => `<li>${esc(a)}</li>`).join('')}</ol>
      <p style="margin:0 0 24px">
        <a href="${esc(siteUrl)}/billetterie/confirmation/${esc(order.id)}"
           style="display:inline-block;padding:13px 22px;background:${BRAND.orange};color:${BRAND.navy};font-weight:700;text-decoration:none;border-radius:999px">
          Voir mon billet et son QR code
        </a>
      </p>
      <p style="margin:0 0 6px;font-size:13px;line-height:1.6;color:${BRAND.muted}">
        Une question ? Écrivez à <a href="mailto:${esc(contactEmail)}" style="color:${BRAND.teal}">${esc(contactEmail)}</a>
        ou appelez le <a href="tel:${esc(contactPhone.replace(/[^\d+]/g, ''))}" style="color:${BRAND.teal}">${esc(contactPhone)}</a>.
      </p>
    </td></tr>
    <tr><td style="padding:18px 28px 24px;border-top:1px solid #ece5db;font-size:12px;line-height:1.6;color:${BRAND.muted}">
      IAC – CAIPI · Intelligence Artificielle Cameroun<br>
      Cameroon Artificial Intelligence Policy Institute
    </td></tr>
  </table>
  <!--[if mso]></td></tr></table><![endif]-->
</td></tr></table>
</body></html>`

  return { subject, text, html }
}
