/**
 * Faux serveur TIKORA — reproduit l'API Partenaire (OpenAPI « TIKORA — API
 * Partenaire » v1.0.0) pour les tests d'intégration, de bout en bout et de
 * charge, sans compte marchand ni débit réel.
 *
 * Fidèle au contrat : authentification Bearer, Idempotency-Key obligatoire sur
 * les POST (rejeu = réponse initiale ; même clé + autre corps = 422), enveloppe
 * { success, statusCode, data, timestamp }, réservation 15 min, frais acheteur
 * 2 % (plancher 100 XAF), statuts de commande et de paiement, billets + QR.
 *
 * Comportement selon le numéro du payeur (derniers chiffres) :
 *   …0000 → refusé (INSUFFICIENT_BALANCE)      …9999 → refus immédiat (REJECTED)
 *   …1111 → reste en attente indéfiniment      autre → payé après MOCK_PAY_DELAY_MS
 *
 * Injection de pannes : POST /__mock/fault { mode: '500'|'429'|'timeout'|'nonjson'|'401', count }
 * Utilitaires : POST /__mock/reset, GET /__mock/state, POST /__mock/orders/:id/expire
 *
 * Lancement autonome : node tests/helpers/mock-tikora-server.js  (port MOCK_TIKORA_PORT, 4010)
 */
import crypto from 'node:crypto'
import http from 'node:http'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { getTicketPricing } from '../../src/utils/pricing.js'

export const MOCK_KEY = 'tk_test_mockkey0123456789'
export const MOCK_EVENT_ID = '7d3c1e8a-0000-4000-8000-00000000e027'
export const MOCK_CATEGORIES = {
  etudiant: '11111111-0000-4000-8000-000000000001',
  standard: '11111111-0000-4000-8000-000000000002',
  'en-ligne': '11111111-0000-4000-8000-000000000003',
  vip: '11111111-0000-4000-8000-000000000004',
}
export const MOCK_WEBHOOK_SECRET = 'whsec_mock_0123456789'

const PREFIX = '/api/v1/partner'

export function createMockTikora({
  key = MOCK_KEY,
  payDelayMs = Number(process.env.MOCK_PAY_DELAY_MS ?? 300),
  webhookUrl = process.env.MOCK_WEBHOOK_URL || '',
  webhookSecret = process.env.MOCK_WEBHOOK_SECRET || MOCK_WEBHOOK_SECRET,
  stock = Number(process.env.MOCK_STOCK ?? 100_000),
  priceOverrides = {},
  // Comme le vrai TIKORA : montants renvoyés en texte décimal ("3500.00")
  decimalStrings = false,
  // Journal lisible (simulation locale) : onEvent(type, détails)
  onEvent = () => {},
} = {}) {
  const state = {
    orders: new Map(),
    idempotency: new Map(),
    requests: [],
    webhooksSent: [],
    fault: null,
    stock: {},
    createdEvents: new Map(),
    timers: new Set(),
  }
  const resetStock = () => {
    for (const tier of Object.keys(MOCK_CATEGORIES)) state.stock[tier] = stock
  }
  resetStock()

  const now = () => new Date().toISOString()
  const MONEY_KEYS = new Set(['price', 'subtotal', 'buyerFee', 'partnerCommission', 'total', 'unitPrice', 'amount'])
  const asDecimalStrings = (v) => {
    if (!decimalStrings || v === null || typeof v !== 'object') return v
    if (Array.isArray(v)) return v.map(asDecimalStrings)
    return Object.fromEntries(
      Object.entries(v).map(([k, x]) => [k, MONEY_KEYS.has(k) && typeof x === 'number' ? x.toFixed(2) : asDecimalStrings(x)]),
    )
  }
  const ok = (res, statusCode, data) => send(res, statusCode, { success: true, statusCode, data, timestamp: now() })
  const fail = (res, statusCode, code, message, extra = {}) =>
    send(res, statusCode, { success: false, statusCode, error: http.STATUS_CODES[statusCode], message, code, path: res.req.url, timestamp: now(), ...extra })
  function send(res, status, body, headers = {}) {
    res.writeHead(status, { 'Content-Type': 'application/json', ...headers })
    res.end(JSON.stringify(body))
  }

  const tierOfCategory = (id) => Object.entries(MOCK_CATEGORIES).find(([, c]) => c === id)?.[0]
  const priceOf = (tier) => priceOverrides[tier] ?? getTicketPricing(tier).price

  function eventView() {
    return {
      id: MOCK_EVENT_ID,
      title: 'JCIA 2027',
      description: null,
      program: null,
      category: 'Conférence',
      status: 'published',
      rejectionReason: null,
      visibility: 'public',
      city: 'Yaoundé',
      venue: 'Hilton Hotel',
      address: null,
      latitude: null,
      longitude: null,
      startAt: '2027-04-27T07:00:00.000Z',
      endAt: '2027-04-28T22:00:00.000Z',
      maxParticipants: 500,
      posterUrl: null,
      ticketsOnSale: true,
      buyerFee: { type: 'percent', value: 2 },
      ticketCategories: Object.entries(MOCK_CATEGORIES).map(([tier, id]) => ({
        id,
        name: tier,
        kind: 'ticket',
        description: null,
        price: priceOf(tier),
        currency: 'XAF',
        available: state.stock[tier],
        purchaseLimitPerBuyer: 10,
        onSale: true,
      })),
    }
  }

  function orderView(o) {
    if (['pending', 'awaiting_payment'].includes(o.status) && Date.parse(o.expiresAt) < Date.now()) {
      o.status = 'expired'
      state.stock[o.tier] += o.quantity
      onEvent('order.expired', { reference: o.reference, orderNumber: o.orderNumber })
    }
    return {
      id: o.id,
      orderNumber: o.orderNumber,
      reference: o.reference ?? null,
      eventId: MOCK_EVENT_ID,
      status: o.status,
      subtotal: o.subtotal,
      buyerFee: o.buyerFee,
      partnerCommission: o.partnerCommission,
      total: o.total,
      currency: 'XAF',
      expiresAt: o.expiresAt,
      buyer: o.buyer,
      items: o.items,
      payment: o.payment,
      tickets: o.status === 'paid' ? o.tickets : [],
      createdAt: o.createdAt,
    }
  }

  async function fireWebhook(o, event) {
    if (!webhookUrl) return
    const body = JSON.stringify({ event, data: { id: o.id, orderId: o.id, reference: o.reference, status: o.status } })
    const signature = `sha256=${crypto.createHmac('sha256', webhookSecret).update(body).digest('hex')}`
    state.webhooksSent.push({ event, orderId: o.id })
    try {
      const response = await fetch(webhookUrl, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Tikora-Signature': signature }, body })
      onEvent('webhook', { event, reference: o.reference, status: response.status })
    } catch {
      /* le webhook est un signal : le backend rattrape par sondage */
      onEvent('webhook', { event, reference: o.reference, status: 0 })
    }
  }

  function settle(o, phone) {
    const fn = () => {
      state.timers.delete(timer)
      if (o.status !== 'awaiting_payment') return
      if (phone.endsWith('0000')) {
        o.payment = { status: 'failed', method: 'mtn_momo', failureCode: 'INSUFFICIENT_BALANCE', failureReason: 'Solde insuffisant', confirmedAt: null }
        onEvent('payment.failed', { reference: o.reference, reason: 'Solde insuffisant' })
        fireWebhook(o, 'payment.failed')
        return
      }
      o.status = 'paid'
      o.payment = { status: 'confirmed', method: phone.startsWith('2376') && /^2376(9|5[5-9])/.test(phone) ? 'orange_money' : 'mtn_momo', failureCode: null, failureReason: null, confirmedAt: now() }
      o.tickets = Array.from({ length: o.quantity }, (_, i) => ({
        id: crypto.randomUUID(),
        ticketCode: `TKT-${crypto.randomBytes(3).toString('hex').toUpperCase()}`,
        qrToken: `tikora.qr.${crypto.randomBytes(16).toString('base64url')}`,
        qrCodeImageUrl: `https://cdn.tikora.example/qr/${o.id}-${i + 1}.png`,
        holderFullName: o.buyer.fullName,
        category: o.tier,
        status: 'valid',
      }))
      onEvent('payment.confirmed', { reference: o.reference, orderNumber: o.orderNumber, total: o.total, method: o.payment.method })
      fireWebhook(o, 'order.paid')
    }
    const timer = setTimeout(fn, payDelayMs)
    state.timers.add(timer)
  }

  async function readBody(req) {
    const chunks = []
    for await (const c of req) chunks.push(c)
    const text = Buffer.concat(chunks).toString('utf8')
    return { text, json: text ? JSON.parse(text) : {} }
  }

  async function handle(req, res) {
    const url = new URL(req.url, 'http://mock')
    const p = url.pathname

    // --- Pilotage du faux serveur -------------------------------------------
    if (p === '/__mock/reset') {
      state.orders.clear()
      state.idempotency.clear()
      state.requests.length = 0
      state.webhooksSent.length = 0
      state.fault = null
      resetStock()
      return send(res, 200, { reset: true })
    }
    if (p === '/__mock/state') {
      return send(res, 200, { orders: [...state.orders.values()].map(orderView), requests: state.requests.length, webhooksSent: state.webhooksSent, stock: state.stock })
    }
    if (p === '/__mock/fault') {
      const { json } = await readBody(req)
      state.fault = json.mode ? { mode: json.mode, count: Number(json.count ?? 1) } : null
      return send(res, 200, { fault: state.fault })
    }
    const expire = p.match(/^\/__mock\/orders\/([^/]+)\/expire$/)
    if (expire) {
      const o = state.orders.get(expire[1])
      if (o) o.expiresAt = new Date(Date.now() - 1000).toISOString()
      return send(res, 200, { expired: Boolean(o) })
    }

    if (!p.startsWith(PREFIX)) return fail(res, 404, 'NOT_FOUND', 'Route inconnue')
    const route = p.slice(PREFIX.length)
    state.requests.push({ method: req.method, route, at: Date.now() })

    // --- Pannes injectées -----------------------------------------------------
    if (state.fault && state.fault.count > 0) {
      state.fault.count -= 1
      const { mode } = state.fault
      if (state.fault.count === 0) state.fault = null
      if (mode === '500') return fail(res, 500, 'INTERNAL', 'Erreur interne simulée')
      if (mode === '429') return fail(res, 429, 'RATE_LIMITED', 'Trop de requêtes', {})
      if (mode === '401') return fail(res, 401, 'INVALID_API_KEY', 'Clé invalide')
      if (mode === 'nonjson') {
        res.writeHead(502, { 'Content-Type': 'text/html' })
        return res.end('<html>Bad gateway</html>')
      }
      if (mode === 'timeout') return // aucune réponse : le client doit abandonner
      if (mode === 'stall') {
        // En-têtes envoyés, corps jamais terminé (cas observé sur GET /commissions)
        res.writeHead(200, { 'Content-Type': 'application/json' })
        res.write('{"success":')
        return
      }
    }

    // --- Authentification -----------------------------------------------------
    const auth = req.headers.authorization || ''
    const apiKey = auth.startsWith('Bearer ') ? auth.slice(7) : req.headers['x-api-key']
    if (!apiKey) return fail(res, 401, 'MISSING_API_KEY', 'Clé d’API manquante')
    if (apiKey !== key) return fail(res, 401, 'INVALID_API_KEY', 'Clé d’API invalide')

    // --- Idempotence des POST -------------------------------------------------
    let body = {}
    let raw = ''
    if (req.method === 'POST' || req.method === 'PUT') {
      try {
        const r = await readBody(req)
        body = r.json
        raw = r.text
      } catch {
        return fail(res, 400, undefined, 'Corps invalide')
      }
    }
    if (req.method === 'POST') {
      const idem = req.headers['idempotency-key']
      if (!idem || idem.length < 8 || idem.length > 100) return fail(res, 400, 'IDEMPOTENCY_KEY_REQUIRED', 'Idempotency-Key requise')
      const k = `${route}|${idem}`
      const previous = state.idempotency.get(k)
      if (previous) {
        if (previous.raw !== raw) return fail(res, 422, 'IDEMPOTENCY_KEY_REUSED', 'Clé déjà utilisée avec un autre corps')
        return send(res, previous.status, previous.body)
      }
      const capture = { raw }
      const originalSend = send
      res.__capture = (status, payload) => {
        capture.status = status
        capture.body = payload
        state.idempotency.set(k, capture)
        originalSend(res, status, payload)
      }
    }
    const reply = (status, raw) => {
      const data = asDecimalStrings(raw)
      return res.__capture ? res.__capture(status, { success: true, statusCode: status, data, timestamp: now() }) : ok(res, status, data)
    }
    const replyError = (status, code, message) =>
      res.__capture
        ? res.__capture(status, { success: false, statusCode: status, error: http.STATUS_CODES[status], message, code, path: req.url, timestamp: now() })
        : fail(res, status, code, message)

    // --- Routes ---------------------------------------------------------------
    if (req.method === 'GET' && route === '/me') return reply(200, { id: crypto.randomUUID(), name: 'IAC – CAIPI', status: 'active' })
    if (req.method === 'GET' && route === '/commissions') {
      return reply(200, {
        partnerCommission: { type: 'percent', value: 2, editable: false, description: 'Commission TIKORA' },
        buyerFee: { type: 'percent', value: 2, editable: true, description: 'Frais acheteur', min: 2, max: 20 },
        minimumFeeAmount: 100,
        currency: 'XAF',
      })
    }
    if (req.method === 'GET' && route === '/event-categories') {
      return reply(200, [{ name: 'Conférence', ticketsForSale: true }, { name: 'Concert', ticketsForSale: true }, { name: 'Annonce', ticketsForSale: false }])
    }
    if (req.method === 'GET' && route === '/events') return reply(200, [eventView(), ...state.createdEvents.values()])
    if (req.method === 'POST' && route === '/events') {
      const required = ['title', 'description', 'category', 'city', 'venue', 'startAt', 'maxParticipants', 'ticketCategories']
      if (required.some((k) => body[k] === undefined || body[k] === '')) return replyError(400, undefined, 'Corps invalide')
      let cats
      try {
        cats = JSON.parse(body.ticketCategories)
      } catch {
        return replyError(400, undefined, 'ticketCategories doit être un tableau JSON')
      }
      const total = cats.filter((c) => (c.kind ?? 'ticket') === 'ticket').reduce((n, c) => n + Number(c.totalQuantity || 0), 0)
      if (total > Number(body.maxParticipants)) return replyError(400, 'CAPACITY_EXCEEDED', 'Capacité dépassée')
      const ev = {
        id: crypto.randomUUID(),
        title: body.title,
        description: body.description,
        program: null,
        category: body.category,
        status: 'pending_review',
        rejectionReason: null,
        visibility: body.visibility ?? 'public',
        city: body.city,
        venue: body.venue,
        address: body.address ?? null,
        latitude: null,
        longitude: null,
        startAt: body.startAt,
        endAt: body.endAt ?? body.startAt,
        maxParticipants: body.maxParticipants,
        posterUrl: null,
        ticketsOnSale: false,
        buyerFee: { type: 'percent', value: 2 },
        ticketCategories: cats.map((c) => ({
          id: crypto.randomUUID(),
          name: c.name,
          kind: c.kind ?? 'ticket',
          description: c.description ?? null,
          price: c.price,
          currency: 'XAF',
          available: c.totalQuantity,
          purchaseLimitPerBuyer: c.purchaseLimitPerUser ?? null,
          onSale: false,
        })),
      }
      state.createdEvents.set(ev.id, ev)
      return reply(201, ev)
    }
    const eventMatch = route.match(/^\/events\/([^/]+)$/)
    if (req.method === 'GET' && eventMatch) {
      if (state.createdEvents.has(eventMatch[1])) return reply(200, state.createdEvents.get(eventMatch[1]))
      if (eventMatch[1] !== MOCK_EVENT_ID) return replyError(404, 'EVENT_NOT_FOUND', 'Événement introuvable ou non publié.')
      return reply(200, eventView())
    }

    if (req.method === 'POST' && route === '/orders') {
      const { eventId, items, buyer, reference } = body
      if (eventId !== MOCK_EVENT_ID) return replyError(404, 'EVENT_NOT_FOUND', 'Événement introuvable ou non publié.')
      if (!Array.isArray(items) || items.length !== 1 || !buyer?.fullName || !buyer?.email || !/^\+\d{8,15}$/.test(buyer?.phone ?? '')) {
        return replyError(400, undefined, 'Corps invalide')
      }
      const [{ ticketCategoryId, quantity }] = items
      const tier = tierOfCategory(ticketCategoryId)
      if (!tier || !Number.isInteger(quantity) || quantity < 1 || quantity > 50) return replyError(400, undefined, 'Corps invalide')
      if (state.stock[tier] < quantity) return replyError(400, undefined, 'Stock insuffisant')
      state.stock[tier] -= quantity
      const unitPrice = priceOf(tier)
      const subtotal = unitPrice * quantity
      const buyerFee = Math.max(100, Math.round(subtotal * 0.02))
      const o = {
        id: crypto.randomUUID(),
        orderNumber: `CMD-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${String(state.orders.size + 1).padStart(4, '0')}`,
        reference: reference ?? null,
        tier,
        quantity,
        status: 'awaiting_payment',
        subtotal,
        buyerFee,
        partnerCommission: Math.max(100, Math.round(subtotal * 0.02)),
        total: subtotal + buyerFee,
        expiresAt: new Date(Date.now() + 15 * 60_000).toISOString(),
        buyer: { fullName: buyer.fullName, email: buyer.email, phone: buyer.phone },
        items: [{ ticketCategoryId, name: tier, quantity, unitPrice, subtotal }],
        payment: null,
        tickets: [],
        createdAt: now(),
      }
      state.orders.set(o.id, o)
      onEvent('order.created', { reference: o.reference, orderNumber: o.orderNumber, tier, quantity, subtotal, buyerFee, total: o.total })
      return reply(201, orderView(o))
    }

    if (req.method === 'GET' && route.startsWith('/orders') && !route.slice(7)) {
      const reference = url.searchParams.get('reference')
      const items = [...state.orders.values()].filter((o) => !reference || o.reference === reference).map(orderView)
      return reply(200, { items, meta: { page: 1, limit: 20, totalItems: items.length, totalPages: 1 } })
    }

    const orderMatch = route.match(/^\/orders\/([^/]+)$/)
    if (req.method === 'GET' && orderMatch) {
      const o = state.orders.get(orderMatch[1])
      if (!o) return replyError(404, 'ORDER_NOT_FOUND', 'Commande introuvable')
      return reply(200, orderView(o))
    }

    const payMatch = route.match(/^\/orders\/([^/]+)\/payments$/)
    if (req.method === 'POST' && payMatch) {
      const o = state.orders.get(payMatch[1])
      if (!o) return replyError(404, 'ORDER_NOT_FOUND', 'Commande introuvable')
      orderView(o) // applique l'expiration éventuelle
      if (!['pending', 'awaiting_payment'].includes(o.status)) return replyError(400, undefined, 'Commande non payable')
      const phone = String(body.phoneNumber ?? '')
      if (!/^2376\d{8}$/.test(phone)) return replyError(400, undefined, 'phoneNumber invalide')
      const depositId = crypto.randomUUID()
      if (phone.endsWith('9999')) {
        o.payment = { status: 'failed', method: 'mtn_momo', failureCode: 'PAYMENT_NOT_APPROVED', failureReason: 'Refusé', confirmedAt: null }
        onEvent('payment.requested', { reference: o.reference, phone, total: o.total, outcome: 'rejected' })
        return reply(201, { orderId: o.id, depositId, status: 'REJECTED', amount: o.total, currency: 'XAF', message: 'Paiement refusé' })
      }
      o.payment = { status: 'pending', method: 'mtn_momo', failureCode: null, failureReason: null, confirmedAt: null }
      const outcome = phone.endsWith('1111') ? 'never' : phone.endsWith('0000') ? 'refused' : 'confirmed'
      onEvent('payment.requested', { reference: o.reference, phone, total: o.total, outcome, delayMs: payDelayMs })
      if (outcome !== 'never') settle(o, phone)
      return reply(201, { orderId: o.id, depositId, status: 'ACCEPTED', amount: o.total, currency: 'XAF', message: 'Demande envoyée sur le téléphone du payeur' })
    }

    return replyError(404, 'NOT_FOUND', 'Route inconnue')
  }

  const server = http.createServer((req, res) => {
    handle(req, res).catch((error) => {
      if (!res.headersSent) fail(res, 500, 'INTERNAL', error.message)
    })
  })

  return {
    server,
    state,
    listen(port = 0) {
      return new Promise((resolve) => {
        server.listen(port, '127.0.0.1', () => {
          this.port = server.address().port
          this.url = `http://127.0.0.1:${this.port}${PREFIX}`
          this.base = `http://127.0.0.1:${this.port}`
          resolve(this)
        })
      })
    },
    close() {
      for (const t of state.timers) clearTimeout(t)
      server.closeAllConnections?.()
      return new Promise((resolve) => server.close(() => resolve()))
    },
    setFault(mode, count = 1) {
      state.fault = mode ? { mode, count } : null
    },
    setWebhookUrl(u) {
      webhookUrl = u
    },
    setPrice(tier, price) {
      if (price == null) delete priceOverrides[tier]
      else priceOverrides[tier] = price
    },
    setStock(tier, n) {
      state.stock[tier] = n
    },
  }
}

/** Variables d'environnement à donner au backend pour viser ce faux serveur. */
export function mockEnv(mockUrl) {
  return {
    PAYMENT_PROVIDER_MODE: 'live',
    TIKORA_API_URL: mockUrl,
    TIKORA_API_KEY: MOCK_KEY,
    TIKORA_EVENT_ID: MOCK_EVENT_ID,
    TIKORA_CATEGORY_MAP: JSON.stringify(MOCK_CATEGORIES),
    TIKORA_WEBHOOK_SECRET: MOCK_WEBHOOK_SECRET,
  }
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url))
if (isMain) {
  const mock = createMockTikora()
  await mock.listen(Number(process.env.MOCK_TIKORA_PORT || 4010))
  process.stdout.write(`Faux TIKORA prêt : ${mock.url}\n`)
  for (const [k, v] of Object.entries(mockEnv(mock.url))) process.stdout.write(`  ${k}=${v}\n`)
}
