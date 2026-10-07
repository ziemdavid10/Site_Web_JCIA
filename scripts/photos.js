/**
 * Modération des photos des participants.
 *
 *   npm run photos -- list                          photos enregistrées (participant, poids, date, publiée ?)
 *   npm run photos -- remove cmd-JCIA27-XXXXXX-1    retire la photo d'un participant
 *   npm run photos -- remove JCIA27-XXXXXX          retire toutes les photos d'une commande
 *   … --base=data/simulation.sqlite                 agit sur une autre base (ex. celle de la simulation)
 *
 * Un retrait est immédiat dans la liste publique ; les navigateurs qui avaient
 * déjà affiché la photo peuvent la garder en cache jusqu'à une heure.
 */
const args = process.argv.slice(2)
const base = args.find((a) => a.startsWith('--base='))
if (base) process.env.DB_PATH = base.slice('--base='.length)
const [command = 'list', target] = args.filter((a) => !a.startsWith('--'))

const { all, run, closeDb, dbReady, dbPath } = await import('../src/database/db.js')
const { attendeeId, attendeeNames, parseAttendeeId } = await import('../src/services/photos.js')
await dbReady

if (command === 'list') {
  const rows = await all(`
    SELECT p.order_id, p.position, p.bytes, p.width, p.height, p.updated_at,
           o.attendees_json, o.customer_name, o.public_listing, o.status
    FROM attendee_photos p JOIN orders o ON o.id = p.order_id
    ORDER BY p.updated_at DESC`)
  console.log(`Base : ${dbPath}\n${rows.length} photo(s)\n`)
  for (const r of rows) {
    const name = attendeeNames(r)[r.position - 1] ?? ''
    const published = r.public_listing === 1 && ['paid', 'free'].includes(r.status)
    console.log(
      `  ${attendeeId(r.order_id, r.position).padEnd(22)} ${name.padEnd(28).slice(0, 28)} ${String(Math.round(r.bytes / 1024)).padStart(4)} Ko  ${r.width}×${r.height}  ${r.updated_at.slice(0, 16).replace('T', ' ')}  ${published ? 'publiée' : 'privée'}`,
    )
  }
} else if (command === 'remove' && target) {
  const one = parseAttendeeId(target)
  const { changes } = one
    ? await run('DELETE FROM attendee_photos WHERE order_id = ? AND position = ?', [one.orderId, one.position])
    : /^JCIA27-[A-Z0-9]{6}$/.test(target)
      ? await run('DELETE FROM attendee_photos WHERE order_id = ?', [target])
      : { changes: -1 }
  if (changes < 0) {
    console.error(`Identifiant invalide : « ${target} » (attendu : cmd-JCIA27-XXXXXX-1 ou JCIA27-XXXXXX)`)
    process.exitCode = 1
  } else console.log(changes ? `✓ ${changes} photo(s) retirée(s)` : 'Aucune photo pour cet identifiant')
} else {
  console.error('Usage : npm run photos -- list | remove <cmd-JCIA27-XXXXXX-1 | JCIA27-XXXXXX> [--base=chemin.sqlite]')
  process.exitCode = 1
}
await closeDb()
