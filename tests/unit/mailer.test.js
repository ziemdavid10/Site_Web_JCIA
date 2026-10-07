import test from 'node:test'
import assert from 'node:assert/strict'
import { mailerService } from '../../src/services/mailer.js'

test('MAILER - service expose sendReceiptEmail', () => {
  assert.equal(typeof mailerService.sendReceiptEmail, 'function')
})
