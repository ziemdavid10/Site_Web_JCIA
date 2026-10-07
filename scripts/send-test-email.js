/**
 * Envoi RÉEL d'un reçu de démonstration, pour valider la configuration SMTP.
 * (Remplace tests/test-real-email.js, qui était exécuté par `npm test` et
 *  envoyait un e-mail à une adresse personnelle codée en dur.)
 *
 *   npm run email:test -- destinataire@example.com [fr|en]
 */
import { sendReceiptEmail } from '../src/services/mailer.js'

const [to, lang = 'fr'] = process.argv.slice(2)
if (!to || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) {
  console.error('Usage : npm run email:test -- destinataire@example.com [fr|en]')
  process.exit(1)
}

await sendReceiptEmail({
  email: to,
  orderId: 'JCIA27-TEST01',
  lang,
  order: {
    id: 'JCIA27-TEST01',
    tierId: 'standard',
    quantity: 1,
    unitPrice: 7000,
    fees: 140,
    total: 7140,
    customer: { name: 'Test JCIA' },
    attendees: ['Test JCIA'],
    payment: { operator: 'mtn', transactionId: 'CMD-TEST-0001' },
  },
  tickets: [{ code: 'TKT-TEST01' }],
})
console.log(`✓ E-mail de test envoyé à ${to}`)
