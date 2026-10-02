// Service d'interaction avec l'API marchand (Campay, Notch Pay, MTN MoMo, etc.)
export async function initiateMerchantPayment(params) {
  // Exemple d'appel HTTP vers l'agrégateur choisi
  // Pour le moment, simule un paiement initié côté serveur
  const paymentId = `PAY-${Date.now()}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`
  
  return {
    paymentId,
    redirectUrl: null, // Renseigner une URL HTTPS si 3-D Secure est requis
  }
}

export async function checkMerchantPaymentStatus(paymentId) {
  // Interroge l'API de l'opérateur pour vérifier si le client a saisi son code PIN MoMo
  return {
    status: 'SUCCESSFUL', // 'PENDING', 'SUCCESSFUL', 'FAILED'
    transactionId: `TXN-${Date.now()}`,
    reason: null,
  }
}