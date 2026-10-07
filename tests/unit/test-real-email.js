import 'dotenv/config' // Charge les variables du fichier .env
import { sendReceiptEmail } from '../../src/services/mailer.js'

async function runRealTest() {
  //  Remplacez par votre propre adresse e-mail personnelle pour recevoir le test
  const DESTINATION_EMAIL = 'davidloic10@gmail.com'

  console.log(`Envoi d'un e-mail de test vers : ${DESTINATION_EMAIL}...`)

  try {
    await sendReceiptEmail({
      email: DESTINATION_EMAIL,
      orderId: 'JCIA27-TEST01',
      lang: 'fr',
      customerName: 'Ziem',
      total: 10000,
    })
    console.log(' E-mail envoyé avec succès ! Vérifiez votre boîte de réception (et vos spams).')
  } catch (error) {
    console.error(' Échec de l\'envoi de l\'e-mail :')
    console.error(error)
  }
}

runRealTest()