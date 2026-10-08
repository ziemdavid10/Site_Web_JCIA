import { esc, formatXAF } from './receiptTemplate.js'

/**
 * E-mail envoyé après un achat payé sur la page TIKORA de l'événement :
 * remerciement + lien du formulaire participant (Google Forms).
 * Les billets eux-mêmes sont envoyés par TIKORA. Bilingue (la langue de
 * l'acheteur n'est pas connue). Tout texte inséré dans le HTML est échappé.
 */
const BRAND = { navy: '#19203a', orange: '#f6a343', sand: '#faf5ef', text: '#2b3350', muted: '#6b7390' }

/**
 * @param {{ name: string, orderNumber: string, total?: number, formUrl: string, contactEmail?: string }} p
 * @returns {{ subject: string, text: string, html: string }}
 */
export function buildFormEmail({ name, orderNumber, total, formUrl, siteUrl = 'https://www.jcia.cm', contactEmail = 'contact@jciacm.com' }) {
  const flyerUrl = `${siteUrl.replace(/\/$/, '')}/mon-flyer?commande=${encodeURIComponent(orderNumber)}`
  const who = name?.trim() || 'participant(e)'
  const amount = Number(total) > 0 ? ` (${formatXAF(total)})` : ''
  const subject = `JCIA 2027 — Merci pour votre achat : complétez votre fiche participant (${orderNumber})`

  const text = [
    `Bonjour ${who},`,
    '',
    `Merci ! Votre paiement pour les JCIA 2027 est confirmé — commande TIKORA ${orderNumber}${amount}.`,
    'Vos billets (QR codes) vous sont envoyés par TIKORA dans un e-mail séparé.',
    '',
    'Dernière étape : complétez votre fiche participant en remplissant ce formulaire :',
    formUrl,
    '',
    `Créez aussi votre visuel « J’y serai » (avec votre photo, dans la liste des participants si vous le souhaitez) : ${flyerUrl}`,
    `Il vous sera demandé votre numéro de commande (${orderNumber}) et cette adresse e-mail.`,
    '',
    `Une question ? Écrivez à ${contactEmail}.`,
    '',
    '— English —',
    `Thank you! Your JCIA 2027 payment is confirmed (TIKORA order ${orderNumber}). Your tickets are sent by TIKORA in a separate e-mail.`,
    `Last step: please fill in the attendee form: ${formUrl}`,
  ].join('\n')

  const html = `<!doctype html><html lang="fr"><body style="margin:0;background:${BRAND.sand};font-family:Arial,Helvetica,sans-serif;color:${BRAND.text}">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${BRAND.sand};padding:24px 12px"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:16px;overflow:hidden">
<tr><td style="background:${BRAND.navy};padding:22px 28px;color:#ffffff;font-size:20px;font-weight:bold">JCIA 2027 <span style="color:${BRAND.orange}">· Merci !</span></td></tr>
<tr><td style="padding:28px">
<p style="margin:0 0 14px;font-size:16px">Bonjour ${esc(who)},</p>
<p style="margin:0 0 14px;font-size:15px;line-height:1.55">Votre paiement pour les <strong>Journées Camerounaises de l’Intelligence Artificielle</strong> est confirmé — commande TIKORA <strong>${esc(orderNumber)}</strong>${esc(amount)}.</p>
<p style="margin:0 0 22px;font-size:14px;line-height:1.55;color:${BRAND.muted}">Vos billets (QR codes) vous sont envoyés par TIKORA dans un e-mail séparé.</p>
<p style="margin:0 0 14px;font-size:15px;line-height:1.55"><strong>Dernière étape :</strong> complétez votre fiche participant.</p>
<p style="margin:0 0 26px" align="center"><a href="${esc(formUrl)}" style="display:inline-block;background:${BRAND.orange};color:${BRAND.navy};font-weight:bold;font-size:15px;text-decoration:none;padding:14px 26px;border-radius:999px">Remplir le formulaire participant</a></p>
<p style="margin:0 0 22px;font-size:12px;line-height:1.5;color:${BRAND.muted}">Si le bouton ne fonctionne pas : <a href="${esc(formUrl)}" style="color:${BRAND.text}">${esc(formUrl)}</a></p>
<p style="margin:0 0 22px;font-size:14px;line-height:1.55">Créez aussi votre <a href="${esc(flyerUrl)}" style="color:${BRAND.text};font-weight:bold">visuel « J’y serai »</a> aux couleurs de votre billet, avec votre photo. Il vous sera demandé votre numéro de commande (<strong>${esc(orderNumber)}</strong>) et cette adresse e-mail.</p>
<p style="margin:0;font-size:13px;color:${BRAND.muted}">Une question ? Écrivez à <a href="mailto:${esc(contactEmail)}" style="color:${BRAND.text}">${esc(contactEmail)}</a>.</p>
<hr style="border:0;border-top:1px solid #eee;margin:22px 0">
<p style="margin:0;font-size:12px;line-height:1.5;color:${BRAND.muted}" lang="en">Thank you! Your JCIA 2027 payment is confirmed (TIKORA order ${esc(orderNumber)}). Your tickets are sent by TIKORA separately. Last step: <a href="${esc(formUrl)}" style="color:${BRAND.text}">fill in the attendee form</a>.</p>
</td></tr></table></td></tr></table></body></html>`

  return { subject, text, html }
}
