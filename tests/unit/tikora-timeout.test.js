/**
 * Régression — TIKORA envoie les en-têtes puis cesse de répondre.
 * Le délai doit être respecté même si le ramasse-miettes passe pendant l'attente
 * (sous Node, les signaux d'annulation de fetch ne sont tenus que par des
 * références faibles : l'ancienne implémentation pouvait attendre indéfiniment).
 */
import test from 'node:test'
import assert from 'node:assert/strict'
import http from 'node:http'
import v8 from 'node:v8'
import vm from 'node:vm'

v8.setFlagsFromString('--expose-gc')
const gc = vm.runInNewContext('gc')

const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'application/json' })
  res.write('{"success":') // corps jamais terminé
})
await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))
Object.assign(process.env, {
  TIKORA_API_URL: `http://127.0.0.1:${server.address().port}/api/v1/partner`,
  TIKORA_API_KEY: 'tk_test_timeout0123456789',
  TIKORA_TIMEOUT_MS: '400',
})
const { tikoraRequest } = await import('../../src/services/tikoraClient.js')

test.after(() => {
  server.closeAllConnections()
  server.close()
})

test('TIKORA - corps bloqué : erreur TIMEOUT en temps borné, même après un passage du ramasse-miettes', { timeout: 15_000 }, async () => {
  const pressure = setInterval(() => {
    Array.from({ length: 2000 }, () => ({ x: Math.random() })) // allocations
    gc()
  }, 40)
  try {
    for (let i = 0; i < 3; i += 1) {
      const started = Date.now()
      await assert.rejects(tikoraRequest('GET', '/me', { retries: 0 }), (e) => e.code === 'TIMEOUT' && e.retryable === true)
      assert.ok(Date.now() - started < 2500, `délai respecté (${Date.now() - started} ms)`)
    }
  } finally {
    clearInterval(pressure)
  }
})
