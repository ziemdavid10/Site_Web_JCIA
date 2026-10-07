/**
 * Gabarit de l'e-mail « récapitulatif de commande » — repris de
 * frontend/scripts/email/receipt-template.mjs et complété :
 *   • version française ET anglaise ;
 *   • frais de service TIKORA et total réellement débité ;
 *   • numéros des billets émis par TIKORA ;
 *   • lien personnel vers les billets (jeton d'accès dans le fragment #,
 *     jamais envoyé aux serveurs ni journalisé).
 * Tout texte inséré dans le HTML est échappé.
 */

const BRAND = { navy: '#19203a', orange: '#f6a343', teal: '#2db8bd', sand: '#faf5ef', text: '#2b3350', muted: '#6b7390' }

export function esc(value = '') {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

export function formatXAF(amount, locale = 'fr-FR') {
  return `${new Intl.NumberFormat(locale).format(Number(amount) || 0)} FCFA`
}

const TIER_NAMES = {
  fr: { gratuit: 'Gratuit', etudiant: 'Étudiant', standard: 'Standard', 'en-ligne': 'En ligne', vip: 'VIP' },
  en: { gratuit: 'Free', etudiant: 'Student', standard: 'Standard', 'en-ligne': 'Online', vip: 'VIP' },
}

const T = {
  fr: {
    subject: (id) => `JCIA 2027 — récapitulatif de votre commande ${id}`,
    title: 'Votre commande est confirmée',
    hello: (n) => `Bonjour ${n},`,
    thanks: (id) => `Merci ! Votre commande ${id} est confirmée pour les Journées Camerounaises de l'Intelligence Artificielle (JCIA 2027).`,
    order: 'Commande', ticket: 'Billet', unit: 'Prix unitaire', fees: 'Frais de service', total: 'Total payé',
    method: 'Moyen de paiement', tx: 'Transaction', dates: 'Dates', venue: 'Lieu', free: 'Gratuit',
    attendees: 'Participants', codes: 'Billets', cta: 'Voir mes billets et leurs QR codes',
    question: (e, p) => `Une question ? Écrivez à ${e} ou appelez le ${p}.`,
    dateLabel: '27 & 28 avril 2027', momo: 'Mobile Money',
  },
  en: {
    subject: (id) => `JCIA 2027 — your order summary ${id}`,
    title: 'Your order is confirmed',
    hello: (n) => `Hello ${n},`,
    thanks: (id) => `Thank you! Your order ${id} is confirmed for the Cameroon Artificial Intelligence Days (JCIA 2027).`,
    order: 'Order', ticket: 'Ticket', unit: 'Unit price', fees: 'Service fee', total: 'Total paid',
    method: 'Payment method', tx: 'Transaction', dates: 'Dates', venue: 'Venue', free: 'Free',
    attendees: 'Attendees', codes: 'Tickets', cta: 'View my tickets and QR codes',
    question: (e, p) => `Any question? Write to ${e} or call ${p}.`,
    dateLabel: 'April 27 & 28, 2027', momo: 'Mobile Money',
  },
}

/**
 * @param {object} order   { id, tierId, quantity, unitPrice, fees, total, customer:{name}, attendees[], payment:{operator, transactionId}, free }
 * @param {object} options { lang, siteUrl, accessToken, tickets[], contactEmail, contactPhone, venue }
 */
export function buildReceipt(order, options = {}) {
  const lang = options.lang === 'en' ? 'en' : 'fr'
  const t = T[lang]
  const locale = lang === 'en' ? 'en-US' : 'fr-FR'
  const {
    siteUrl = 'https://www.jcia.cm',
    accessToken = '',
    tickets = [],
    contactEmail = 'contact@jciacm.com',
    contactPhone = '+237 699 089 937',
    venue = 'Hilton Hotel, Yaoundé',
  } = options
  const tierName = TIER_NAMES[lang][order.tierId] ?? order.tierId
  const op = order.payment?.operator === 'orange' ? 'Orange Money' : order.payment?.operator === 'mtn' ? 'MTN Mobile Money' : t.momo
  const link = `${siteUrl}/billetterie/confirmation/${encodeURIComponent(order.id)}${accessToken ? `#t=${encodeURIComponent(accessToken)}` : ''}`

  const rows = [
    [t.order, order.id],
    [t.ticket, `${tierName} × ${order.quantity}`],
    [t.unit, order.free ? t.free : formatXAF(order.unitPrice, locale)],
    ...(order.free ? [] : [[t.fees, formatXAF(order.fees, locale)]]),
    [t.total, order.free ? t.free : formatXAF(order.total, locale)],
    ...(order.free ? [] : [[t.method, op], [t.tx, order.payment?.transactionId ?? '—']]),
    [t.dates, t.dateLabel],
    [t.venue, venue],
  ]
  const attendees = Array.isArray(order.attendees) && order.attendees.length ? order.attendees : [order.customer.name]
  const codes = tickets.map((x) => x.code).filter(Boolean)
  const subject = t.subject(order.id)

  const text = [
    t.hello(order.customer.name),
    '',
    t.thanks(order.id),
    '',
    ...rows.map(([k, v]) => `${k} : ${v}`),
    '',
    `${t.attendees} :`,
    ...attendees.map((a, i) => `  ${i + 1}. ${a}`),
    ...(codes.length ? ['', `${t.codes} :`, ...codes.map((c) => `  • ${c}`)] : []),
    '',
    `${t.cta} : ${link}`,
    '',
    t.question(contactEmail, contactPhone),
    '',
    'IAC – CAIPI · Intelligence Artificielle Cameroun',
  ].join('\n')

  const html = `<!doctype html>
<html lang="${lang}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width">
<title>${esc(subject)}</title></head>
<body style="margin:0;padding:0;background:${BRAND.sand};font-family:Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:${BRAND.text}">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse"><tr><td align="center" style="padding:24px 12px">
<!--[if mso]><table role="presentation" width="600" cellpadding="0" cellspacing="0"><tr><td><![endif]-->
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="width:100%;max-width:600px;border-collapse:collapse;background:#fff;border-radius:14px;overflow:hidden">
<tr><td style="background:${BRAND.navy};padding:22px 28px;color:#fff">
  <div style="font-size:13px;letter-spacing:.14em;text-transform:uppercase;color:${BRAND.orange}">JCIA 2027</div>
  <div style="font-size:19px;font-weight:700;margin-top:4px">${esc(t.title)}</div>
</td></tr>
<tr><td style="padding:26px 28px 6px">
  <p style="margin:0 0 14px">${esc(t.hello(order.customer.name))}</p>
  <p style="margin:0 0 20px;line-height:1.6">${esc(t.thanks(order.id))}</p>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;font-size:14px">
  ${rows
    .map(
      ([k, v], i) => `<tr style="background:${i % 2 ? '#fff' : BRAND.sand}"><td style="padding:9px 12px;color:${BRAND.muted}">${esc(k)}</td><td style="padding:9px 12px;text-align:right;font-weight:600">${esc(v)}</td></tr>`,
    )
    .join('\n  ')}
  </table>
  <p style="margin:22px 0 8px;font-size:12px;letter-spacing:.1em;text-transform:uppercase;color:${BRAND.muted}">${esc(t.attendees)}</p>
  <ol style="margin:0 0 18px;padding-left:20px;line-height:1.7">${attendees.map((a) => `<li>${esc(a)}</li>`).join('')}</ol>
  ${codes.length ? `<p style="margin:0 0 8px;font-size:12px;letter-spacing:.1em;text-transform:uppercase;color:${BRAND.muted}">${esc(t.codes)}</p><ul style="margin:0 0 22px;padding-left:20px;line-height:1.7;font-family:Consolas,monospace">${codes.map((c) => `<li>${esc(c)}</li>`).join('')}</ul>` : ''}
  <p style="margin:0 0 24px"><a href="${esc(link)}" style="display:inline-block;padding:13px 22px;background:${BRAND.orange};color:${BRAND.navy};font-weight:700;text-decoration:none;border-radius:999px">${esc(t.cta)}</a></p>
  <p style="margin:0 0 6px;font-size:13px;line-height:1.6;color:${BRAND.muted}">${esc(t.question(contactEmail, contactPhone))}</p>
</td></tr>
<tr><td style="padding:18px 28px 24px;border-top:1px solid #ece5db;font-size:12px;line-height:1.6;color:${BRAND.muted}">IAC – CAIPI · Intelligence Artificielle Cameroun<br>Cameroon Artificial Intelligence Policy Institute</td></tr>
</table>
<!--[if mso]></td></tr></table><![endif]-->
</td></tr></table></body></html>`

  return { subject, text, html }
}
