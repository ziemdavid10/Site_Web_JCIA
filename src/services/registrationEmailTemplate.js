import { TIER_NAMES, esc, formatXAF } from './receiptTemplate.js'

/**
 * E-mail « Bienvenue aux JCIA » envoyé juste après l'inscription à un billet
 * PAYANT (formulaire du site). BILINGUE : français et anglais dans le même
 * message (la langue choisie sur le site passe en premier).
 *
 *   1. payer le billet sur TIKORA, avec cette adresse e-mail ;
 *   2. collecter le code du billet (ORD-…) dans l'e-mail envoyé par TIKORA ;
 *   3. revenir sur le site des JCIA et le coller pour finaliser la procédure ;
 *   4. ne pas oublier le formulaire participant.
 *
 * Tout texte inséré dans le HTML est échappé.
 */
const BRAND = { navy: '#19203a', orange: '#f6a343', teal: '#2db8bd', sand: '#faf5ef', text: '#2b3350', muted: '#6b7390' }

const T = {
  fr: {
    flag: 'Français',
    title: 'Bienvenue aux JCIA 2027 !',
    hello: (n) => `Bonjour ${n},`,
    intro: (tier, price, id) => `Votre inscription au billet ${tier} (${price}) est enregistrée sous le numéro ${id}. Pour la finaliser :`,
    step1: (tier) => `Payez votre billet sur TIKORA : choisissez « ${tier} » et indiquez cette adresse e-mail`,
    step1Cta: 'Payer sur TIKORA',
    step2: 'Collectez le code de votre billet (ex. ORD-410F271F) dans l’e-mail envoyé par TIKORA après le paiement.',
    step3: 'Revenez sur le site des JCIA et collez-le pour finaliser la procédure.',
    step3Cta: 'Finaliser mon inscription',
    step4: 'N’oubliez pas de remplir le formulaire participant :',
    step4Cta: 'Remplir le formulaire',
    auto: 'Si vous payez avec cette même adresse e-mail, le site reconnaît généralement votre paiement tout seul en quelques minutes.',
    fallback: 'Si un bouton ne fonctionne pas, copiez ce lien :',
    question: (e) => `Une question ? Écrivez à ${e}.`,
    ignore: 'Vous n’êtes pas à l’origine de cette inscription ? Ignorez simplement cet e-mail.',
  },
  en: {
    flag: 'English',
    title: 'Welcome to JCIA 2027!',
    hello: (n) => `Hello ${n},`,
    intro: (tier, price, id) => `Your registration for the ${tier} ticket (${price}) is recorded under number ${id}. To complete it:`,
    step1: (tier) => `Pay for your ticket on TIKORA: choose “${tier}” and enter this e-mail address`,
    step1Cta: 'Pay on TIKORA',
    step2: 'Collect your ticket code (e.g. ORD-410F271F) from the e-mail TIKORA sends you after payment.',
    step3: 'Come back to the JCIA website and paste it to complete the process.',
    step3Cta: 'Complete my registration',
    step4: 'Don’t forget to fill in the attendee form:',
    step4Cta: 'Fill in the form',
    auto: 'If you pay with this same e-mail address, the website usually recognises your payment on its own within a few minutes.',
    fallback: 'If a button does not work, copy this link:',
    question: (e) => `Any question? Write to ${e}.`,
    ignore: 'Did not register? Simply ignore this e-mail.',
  },
}

const button = (href, label, bg, color) =>
  `<a href="${esc(href)}" style="display:inline-block;padding:12px 20px;background:${bg};color:${color};font-weight:700;text-decoration:none;border-radius:999px">${esc(label)}</a>`

const num = (n) =>
  `<td width="34" valign="top" style="padding:2px 10px 0 0"><span style="display:inline-block;width:26px;height:26px;line-height:26px;text-align:center;border-radius:50%;background:${BRAND.orange};color:${BRAND.navy};font-weight:700;font-size:13px">${n}</span></td>`

/** Section d'une langue (texte et HTML). */
function section(L, d) {
  const t = T[L]
  const tier = TIER_NAMES[L][d.tierId] ?? d.tierId
  const price = formatXAF(d.unitPrice, L === 'en' ? 'en-US' : 'fr-FR')
  const colon = L === 'en' ? ':' : ' :' // typographie anglaise / française
  const text = [
    `— ${t.flag} —`,
    t.hello(d.who),
    '',
    t.intro(tier, price, d.id),
    `  1. ${t.step1(tier)}${colon} ${d.email}`,
    `     ${t.step1Cta}${colon} ${d.eventUrl}`,
    `  2. ${t.step2}`,
    `  3. ${t.step3}`,
    `     ${t.step3Cta}${colon} ${d.back}`,
    `  4. ${t.step4} ${d.formUrl}`,
    '',
    t.auto,
  ].join('\n')

  const row = (n, body) => `<tr>${num(n)}<td style="padding:0 0 16px;font-size:14px;line-height:1.6">${body}</td></tr>`
  const html = `
  <p style="margin:0 0 4px;font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:${BRAND.muted}">${esc(t.flag)}</p>
  <h2 style="margin:0 0 14px;font-size:20px;color:${BRAND.navy}">${esc(t.title)}</h2>
  <p style="margin:0 0 10px">${esc(t.hello(d.who))}</p>
  <p style="margin:0 0 18px;line-height:1.6">${esc(t.intro(tier, price, d.id))}</p>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse">
    ${row(1, `${esc(t.step1(tier))}${colon} <strong>${esc(d.email)}</strong><br><span style="display:inline-block;margin-top:10px">${button(d.eventUrl, t.step1Cta, BRAND.orange, BRAND.navy)}</span>`)}
    ${row(2, esc(t.step2))}
    ${row(3, `${esc(t.step3)}<br><span style="display:inline-block;margin-top:10px">${button(d.back, t.step3Cta, BRAND.navy, '#ffffff')}</span>`)}
    ${row(4, `${esc(t.step4)}<br><span style="display:inline-block;margin-top:10px">${button(d.formUrl, t.step4Cta, BRAND.teal, '#ffffff')}</span><br><span style="font-size:12px;color:${BRAND.muted}">${esc(t.fallback)} <a href="${esc(d.formUrl)}" style="color:${BRAND.text};word-break:break-all">${esc(d.formUrl)}</a></span>`)}
  </table>
  <p style="margin:4px 0 0;padding:12px 14px;font-size:13px;line-height:1.55;color:${BRAND.text};background:${BRAND.sand};border-radius:10px">${esc(t.auto)}</p>`
  return { text, html }
}

/**
 * @param {object} order  commande au format public (services/orders.js#toPublicOrder)
 * @param {{ lang?: 'fr'|'en', accessToken: string, siteUrl: string, eventUrl: string, formUrl: string, contactEmail?: string }} o
 * @returns {{ subject: string, text: string, html: string }}
 */
export function buildRegistrationEmail(order, { lang = 'fr', accessToken, siteUrl, eventUrl, formUrl, contactEmail = 'contact@jciacm.com' }) {
  const first = lang === 'en' ? 'en' : 'fr'
  const order2 = first === 'fr' ? ['fr', 'en'] : ['en', 'fr']
  const d = {
    id: order.id,
    tierId: order.tierId,
    unitPrice: order.unitPrice,
    who: order.customer?.firstName || order.customer?.name || '',
    email: order.customer?.email ?? '',
    eventUrl,
    formUrl,
    back: `${siteUrl.replace(/\/$/, '')}/billetterie/confirmation/${encodeURIComponent(order.id)}#t=${encodeURIComponent(accessToken)}`,
  }
  const parts = order2.map((L) => section(L, d))
  const subject =
    first === 'fr'
      ? `JCIA 2027 — Bienvenue ! Finalisez votre inscription (${order.id}) · Complete your registration`
      : `JCIA 2027 — Welcome! Complete your registration (${order.id}) · Finalisez votre inscription`

  const text = [
    ...parts.flatMap((p) => [p.text, '']),
    `${T[first].question(contactEmail)} / ${T[order2[1]].question(contactEmail)}`,
    T[first].ignore,
    '',
    'IAC – CAIPI · Intelligence Artificielle Cameroun',
  ].join('\n')

  const html = `<!doctype html><html lang="${first}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>${esc(subject)}</title></head>
<body style="margin:0;padding:0;background:${BRAND.sand};font-family:Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:${BRAND.text}">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse"><tr><td align="center" style="padding:24px 12px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="width:100%;max-width:600px;border-collapse:collapse;background:#fff;border-radius:14px;overflow:hidden">
<tr><td style="background:${BRAND.navy};padding:22px 28px;color:#fff">
  <div style="font-size:13px;letter-spacing:.14em;text-transform:uppercase;color:${BRAND.orange}">JCIA 2027 · Hilton Yaoundé</div>
  <div style="font-size:19px;font-weight:700;margin-top:4px">${esc(T[first].title)} · ${esc(T[order2[1]].title)}</div>
</td></tr>
<tr><td style="padding:26px 28px 8px">${parts[0].html}</td></tr>
<tr><td style="padding:0 28px"><hr style="border:0;border-top:1px solid #ece5db;margin:18px 0"></td></tr>
<tr><td style="padding:8px 28px 8px" lang="${order2[1]}">${parts[1].html}</td></tr>
<tr><td style="padding:18px 28px 24px;font-size:12px;line-height:1.6;color:${BRAND.muted}">
  ${esc(T[first].question(contactEmail))} · ${esc(T[order2[1]].question(contactEmail))}<br>${esc(T[first].ignore)}<br><br>IAC – CAIPI · Intelligence Artificielle Cameroun
</td></tr>
</table></td></tr></table></body></html>`

  return { subject, text, html }
}
