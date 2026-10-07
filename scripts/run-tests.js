/**
 * Lance les tests d'un dossier sans dépendre des motifs « ** » (non gérés par
 * Node 20, ni par l'invite de commandes Windows) : la liste des fichiers est
 * construite ici, puis transmise explicitement à `node --test`.
 *
 *   node scripts/run-tests.js tests/unit
 *   node scripts/run-tests.js tests/integration --test-concurrency=1
 */
import { spawn } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

const [dir = 'tests/unit', ...extra] = process.argv.slice(2)
const pattern = /\.test\.(m?js)$/

function walk(d) {
  return fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(d, e.name)
    return e.isDirectory() ? walk(p) : pattern.test(e.name) ? [p] : []
  })
}

if (!fs.existsSync(dir)) {
  console.error(`Dossier introuvable : ${dir}`)
  process.exit(1)
}
// Un dossier (tous ses *.test.js) ou un fichier de test précis
const files = fs.statSync(dir).isFile() ? [dir] : walk(dir).sort()
if (!files.length) {
  console.error(`Aucun fichier *.test.js dans ${dir}`)
  process.exit(1)
}

const setup = path.resolve('tests/helpers/setup.js')
// URL file:// : gère les lettres de lecteur et les espaces des chemins Windows
const args = ['--test', ...extra, '--import', pathToFileURL(setup).href, ...files]
const child = spawn(process.execPath, args, { stdio: 'inherit' })
child.on('exit', (code) => process.exit(code ?? 1))
