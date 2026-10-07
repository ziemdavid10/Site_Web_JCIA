/**
 * Photos des participants — contrôle et nettoyage des JPEG (sans réseau).
 */
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { attendeeId, attendeeNames, parseAttendeeId, publicPhotoPath, sanitizeJpeg } from '../../src/services/photos.js'

const FIXTURES = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../fixtures')
const read = (name) => fs.readFileSync(path.join(FIXTURES, name))
const rejects = (buf, code = 'INVALID_PHOTO') =>
  assert.throws(() => sanitizeJpeg(buf), (e) => e.status === 400 && e.code === code)

test('PHOTO - JPEG valide : dimensions lues, EXIF et commentaires retirés', () => {
  const original = read('photo.jpg')
  assert.ok(original.includes('TestCam') && original.includes('commentaire'), 'la fixture contient bien des métadonnées')
  const { data, width, height } = sanitizeJpeg(original)
  assert.equal(width, 320)
  assert.equal(height, 320)
  assert.equal(data.includes('TestCam'), false, 'EXIF retiré')
  assert.equal(data.includes('secret-software'), false, 'EXIF retiré')
  assert.equal(data.includes('commentaire'), false, 'commentaire retiré')
  assert.deepEqual([...data.subarray(0, 2)], [0xff, 0xd8])
  assert.deepEqual([...data.subarray(-2)], [0xff, 0xd9])
  assert.ok(data.length < original.length)
  // Idempotent : un JPEG déjà nettoyé ressort à l'identique
  assert.deepEqual(sanitizeJpeg(data).data, data)
})

test('PHOTO - JPEG progressif accepté (plusieurs balayages)', () => {
  const { width, height, data } = sanitizeJpeg(read('photo-progressive.jpg'))
  assert.equal(width, 320)
  assert.equal(height, 320)
  assert.deepEqual([...data.subarray(-2)], [0xff, 0xd9])
})

test('PHOTO - contenu caché après la fin de l’image (fichier « polyglotte ») supprimé', () => {
  const evil = Buffer.concat([read('photo.jpg'), Buffer.from('<script>alert(1)</script>PK\u0003\u0004')])
  const { data } = sanitizeJpeg(evil)
  assert.equal(data.includes('<script>'), false)
  assert.deepEqual([...data.subarray(-2)], [0xff, 0xd9])
})

test('PHOTO - refus : PNG, JPEG tronqué, octets au hasard, vide, trop petite', () => {
  rejects(read('photo.png'))
  const jpeg = read('photo.jpg')
  rejects(jpeg.subarray(0, Math.floor(jpeg.length / 2)))
  rejects(Buffer.concat([Buffer.from([0xff, 0xd8]), Buffer.alloc(500, 0x41)]))
  rejects(Buffer.alloc(0))
  rejects('pas un buffer')
  assert.throws(() => sanitizeJpeg(read('photo-small.jpg')), /trop petite/)
})

test('PHOTO - identifiants publics', () => {
  assert.equal(attendeeId('JCIA27-ABCDEF', 2), 'cmd-JCIA27-ABCDEF-2')
  assert.deepEqual(parseAttendeeId('cmd-JCIA27-ABCDEF-2'), { orderId: 'JCIA27-ABCDEF', position: 2 })
  for (const bad of ['cmd-JCIA27-ABCDEF-0', 'cmd-JCIA27-abcdef-1', 'JCIA27-ABCDEF', 'cmd-JCIA27-ABCDEF-1/../x', '', null]) {
    assert.equal(parseAttendeeId(bad), null, String(bad))
  }
  assert.equal(publicPhotoPath('JCIA27-ABCDEF', 1, 'v1'), '/attendees/cmd-JCIA27-ABCDEF-1/photo?v=v1')
  assert.deepEqual(attendeeNames({ attendees_json: '["A","B"]', customer_name: 'C' }), ['A', 'B'])
  assert.deepEqual(attendeeNames({ attendees_json: '{bad', customer_name: 'C' }), ['C'])
})
