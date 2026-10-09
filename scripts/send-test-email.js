/**
 * Test RÉEL de l'envoi des e-mails (configuration SMTP du .env).
 *
 *   npm run email:test                          → davidloic10@gmail.com
 *   npm run email:test -- autre@example.com     → autre destinataire
 *   npm run email:test -- autre@example.com en  → langue principale anglaise
 *
 * 1. vérifie la connexion et l'identification SMTP ;
 * 2. envoie les trois e-mails du parcours, avec des données d'exemple :
 *    a. « Bienvenue aux JCIA » (inscription à un billet payant : TIKORA, code, formulaire) ;
 *    b. confirmation d'un billet payé sur TIKORA (formulaire + retour sur le site) ;
 *    c. confirmation d'un billet gratuit (QR, formulaire).
 * Aucune commande n'est créée. En cas d'échec, le motif SMTP est expliqué.
 */
import { CONFIG } from '../src/config/env.js'
import { mailerService, senderAddress, smtpOptions, verifySmtp } from '../src/services/mailer.js'

const DEFAULT_TO = 'davidloic10@gmail.com'
const [to = DEFAULT_TO, lang = 'fr'] = process.argv.slice(2)
if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) {
  console.error('Usage : npm run email:test -- destinataire@example.com [fr|en]')
  process.exit(1)
}

const o = smtpOptions()
console.log('\nConfiguration SMTP utilisée')
console.log(`  serveur     : ${o.host || '(SMTP_HOST vide)'}:${o.port} · ${o.secure ? 'SSL (port 465)' : 'STARTTLS'}`)
console.log(`  compte      : ${o.auth.user || '(SMTP_USER vide)'} · mot de passe ${CONFIG.smtp.pass ? 'renseigné' : 'ABSENT'}`)
console.log(`  expéditeur  : ${senderAddress()}`)
console.log(`  destinataire: ${to}\n`)

/** Explication lisible des erreurs SMTP les plus fréquentes (GoDaddy, Microsoft 365). */
function explain(error) {
  const m = `${error.code ?? ''} ${error.responseCode ?? ''} ${error.message ?? ''}`
  if (/EAUTH|535|534|Invalid login|authentication/i.test(m)) {
    return 'Identifiants refusés : vérifiez SMTP_USER (adresse complète) et SMTP_PASS (mot de passe de la boîte contact@jciacm.com). Microsoft 365 : l’« authentification SMTP » doit être activée pour la boîte.'
  }
  if (/ENOTFOUND|EAI_AGAIN/i.test(m)) return `Serveur introuvable : ${o.host}. GoDaddy : smtpout.secureserver.net ; Microsoft 365 : smtp.office365.com.`
  if (/ETIMEDOUT|ECONNREFUSED|ECONNRESET|ESOCKET|Greeting never received/i.test(m)) {
    return `Connexion impossible à ${o.host}:${o.port}. Essayez l’autre port (465 ↔ 587) ; certains réseaux / hébergeurs bloquent le port 25 ou 465.`
  }
  if (/wrong version number|SSL routines|self.signed|certificate/i.test(m)) return 'Problème TLS : le port et le chiffrement ne correspondent pas (465 = SSL, 587 = STARTTLS).'
  if (/550|553|554|sender|relay/i.test(m)) return 'Expéditeur refusé : l’adresse d’envoi doit être celle du compte SMTP (SMTP_USER).'
  return error.message
}

const base = {
  id: 'JCIA27-TEST01',
  createdAt: new Date().toISOString(),
  lang,
  quantity: 1,
  fees: 0,
  customer: { name: 'David Test', firstName: 'David', lastName: 'Test', email: to, org: 'IAC – CAIPI', role: 'Testeur' },
  attendees: ['David Test'],
}
const paid = { ...base, tierId: 'standard', unitPrice: 7000, subtotal: 7000, total: 7000 }

const steps = [
  ['Connexion et identification SMTP', () => verifySmtp()],
  [
    '« Bienvenue aux JCIA » (inscription, billet payant)',
    () => mailerService.sendRegistrationEmail({ email: to, lang, order: paid, accessToken: 'jeton-de-test-0000000000000000' }),
  ],
  [
    'Confirmation — billet payé sur TIKORA',
    () =>
      mailerService.sendReceiptEmail({
        email: to,
        orderId: paid.id,
        lang,
        order: { ...paid, status: 'paid', payment: { mode: 'tikora_page', tikoraOrderNumber: 'ORD-TEST0001' } },
        tickets: [],
        accessToken: 'jeton-de-test-0000000000000000',
      }),
  ],
  [
    'Confirmation — billet gratuit',
    () =>
      mailerService.sendReceiptEmail({
        email: to,
        orderId: 'JCIA27-TEST02',
        lang,
        order: { ...base, id: 'JCIA27-TEST02', tierId: 'gratuit', unitPrice: 0, total: 0, free: true, payment: { mode: 'free' } },
        tickets: [{ code: 'JCIA27-TEST02-1' }],
        accessToken: 'jeton-de-test-0000000000000000',
      }),
  ],
]

let failed = 0
for (const [label, run] of steps) {
  try {
    await run()
    console.log(`  ✓ ${label}`)
  } catch (error) {
    failed += 1
    console.log(`  ✗ ${label}\n    → ${explain(error)}`)
    if (label.startsWith('Connexion')) break // inutile d'essayer les envois
  }
}

if (failed) {
  console.log('\nCorrigez backend/.env puis relancez : npm run email:test')
  process.exit(1)
}
console.log(`\n✓ 3 e-mails envoyés à ${to}. Pensez à regarder les courriers indésirables (spam).`)
