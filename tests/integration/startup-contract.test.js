/**
 * Tests d'intégration — démarrage réel du serveur (node src/server.js) et
 * contrat de données partagé avec le frontend.
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import test from 'node:test'
import assert from 'node:assert/strict'
import { spawnServer } from '../helpers/harness.js'
import { createMockTikora, mockEnv } from '../helpers/mock-tikora-server.js'
import { TIERS_CONFIG, PROMOTION } from '../../src/utils/pricing.js'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
// Site à côté du serveur (frontend/ ou site-web-jcia/) ou serveur rangé DANS le dossier du site
const FRONT_CONFIG =
  ['../frontend', '../site-web-jcia', '..']
    .map((dir) => path.resolve(ROOT, dir, 'src/data/config.js'))
    .find((file) => fs.existsSync(file)) ?? path.resolve(ROOT, '../frontend/src/data/config.js')

test('DÉMARRAGE - la production refuse le mode démo (paiements gratuits)', async () => {
  const srv = spawnServer({ NODE_ENV: 'production', PAYMENT_PROVIDER_MODE: 'demo', ALLOWED_ORIGIN: 'https://www.jcia.cm', APP_SECRET: 'x'.repeat(40) })
  const code = await srv.exited
  assert.equal(code, 1)
  assert.match(srv.output(), /PAYMENT_PROVIDER_MODE=demo est interdit en production/)
})

test('DÉMARRAGE - la production refuse une clé TIKORA mal saisie et un CORS ouvert', async () => {
  const srv = spawnServer({
    NODE_ENV: 'production',
    PAYMENT_PROVIDER_MODE: 'live',
    TIKORA_API_KEY: 'Authorization: Bearer tk_live_xxxxxxxx',
    TIKORA_API_URL: 'https://tikora.proditech.online/developpeurs',
    ALLOWED_ORIGIN: '*',
  })
  assert.equal(await srv.exited, 1)
  const out = srv.output()
  assert.match(out, /sans « Authorization: Bearer »/)
  assert.match(out, /page de documentation/)
  assert.match(out, /ALLOWED_ORIGIN/)
  assert.match(out, /APP_SECRET/)
  assert.equal(out.includes('tk_live_xxxxxxxx'), false, 'la clé n’apparaît jamais dans les logs')
})

test('DÉMARRAGE - configuration live valide : le serveur répond et vérifie TIKORA', async () => {
  const mock = await createMockTikora().listen()
  const port = 5600 + Math.floor(Math.random() * 300)
  const srv = spawnServer(
    {
      NODE_ENV: 'production',
      ...mockEnv(mock.url),
      ALLOWED_ORIGIN: 'https://www.jcia.cm',
      APP_SECRET: 'p'.repeat(48),
      SMTP_HOST: 'smtp.example.com',
      SMTP_USER: 'u@example.com',
      SMTP_PASS: 'secret',
      TRUST_PROXY: '1',
    },
    { port },
  )
  try {
    let health = null
    for (let i = 0; i < 50 && !health; i += 1) {
      await new Promise((r) => setTimeout(r, 100))
      health = await fetch(`http://127.0.0.1:${port}/health`).then((r) => r.json()).catch(() => null)
    }
    assert.deepEqual(health, { status: 'ok' })
    const res = await fetch(`http://127.0.0.1:${port}/tickets`, { headers: { Origin: 'https://www.jcia.cm' } })
    assert.equal(res.status, 200)
    assert.equal(res.headers.get('access-control-allow-origin'), 'https://www.jcia.cm')
    assert.ok(res.headers.get('strict-transport-security'))
    const evil = await fetch(`http://127.0.0.1:${port}/tickets`, { headers: { Origin: 'https://evil.example' } })
    assert.equal(evil.status, 403)
  } finally {
    srv.child.kill('SIGTERM')
    await srv.exited
    await mock.close()
  }
})

test('CONTRAT - grille tarifaire identique au frontend (src/data/config.js)', { skip: !fs.existsSync(FRONT_CONFIG) && 'frontend absent' }, () => {
  const source = fs.readFileSync(FRONT_CONFIG, 'utf8')
  const tiers = [...source.matchAll(/\{\s*id:\s*'([\w-]+)',\s*price:\s*(\d+),\s*quota:\s*(null|\d+),\s*sold:\s*\d+,\s*maxQty:\s*(\d+)/g)].map((m) => ({
    id: m[1],
    price: Number(m[2]),
    quota: m[3] === 'null' ? null : Number(m[3]),
    maxQty: Number(m[4]),
  }))
  assert.equal(tiers.length, Object.keys(TIERS_CONFIG).length, 'même nombre de tarifs')
  for (const t of tiers) {
    const back = TIERS_CONFIG[t.id]
    assert.ok(back, `tarif « ${t.id} » connu du backend`)
    assert.equal(back.basePrice, t.price, `prix ${t.id}`)
    assert.equal(back.maxQty, t.maxQty, `maxQty ${t.id}`)
    assert.equal(back.quota, t.quota, `quota ${t.id}`)
  }
  const promo = source.match(/promotion:\s*\{\s*discountPercent:\s*(\d+),\s*startDate:\s*'([^']+)',\s*endDate:\s*'([^']+)'/)
  assert.ok(promo, 'bloc promotion trouvé')
  assert.equal(Number(promo[1]), PROMOTION.discountPercent)
  assert.equal(new Date(promo[2]).getTime(), PROMOTION.start.getTime())
  assert.equal(new Date(promo[3]).getTime(), PROMOTION.end.getTime())
})
