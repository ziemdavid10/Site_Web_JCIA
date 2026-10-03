import { CONFIG } from '../config/env.js'

const PAYMENT_STATUSES = new Set(['PENDING', 'SUCCESSFUL', 'FAILED'])

function createDemoPaymentId() {
  return `PAY-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`
}

async function providerRequest(path, { method = 'GET', body } = {}) {
  if (!CONFIG.payment.apiUrl || !CONFIG.payment.apiKey) {
    throw new Error('PAYMENT_PROVIDER_URL et PAYMENT_PROVIDER_KEY sont requis en mode live')
  }

  const response = await fetch(`${CONFIG.payment.apiUrl}${path}`, {
    method,
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      Authorization: `Bearer ${CONFIG.payment.apiKey}`,
    },
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(15_000),
  })

  const data = await response.json().catch(() => null)
  if (!response.ok || !data) {
    throw new Error(`Fournisseur de paiement: HTTP ${response.status}`)
  }
  return data
}

export async function initiateMerchantPayment(params) {
  if (CONFIG.payment.mode !== 'live') {
    return { paymentId: createDemoPaymentId(), redirectUrl: null }
  }

  const data = await providerRequest('/payments', { method: 'POST', body: params })
  if (typeof data.paymentId !== 'string' || !data.paymentId) {
    throw new Error('Réponse fournisseur invalide: paymentId manquant')
  }

  return {
    paymentId: data.paymentId,
    redirectUrl: typeof data.redirectUrl === 'string' ? data.redirectUrl : null,
  }
}

export async function checkMerchantPaymentStatus(paymentId) {
  if (CONFIG.payment.mode !== 'live') {
    return {
      status: 'SUCCESSFUL',
      transactionId: `TXN-${Date.now()}`,
      reason: null,
    }
  }

  const data = await providerRequest(`/payments/${encodeURIComponent(paymentId)}`)
  const status = String(data.status || '').toUpperCase()
  if (!PAYMENT_STATUSES.has(status)) {
    throw new Error('Réponse fournisseur invalide: statut inconnu')
  }

  return {
    status,
    transactionId: data.transactionId ? String(data.transactionId) : null,
    reason: data.reason ? String(data.reason) : null,
  }
}
