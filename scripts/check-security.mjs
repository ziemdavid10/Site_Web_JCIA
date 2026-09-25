/**
 * Contrôle de sécurité automatique — `npm run check:security` (après `npm run build`).
 *
 * Vérifie que le code et le site construit respectent les règles du projet :
 *   1. aucune API dangereuse dans le code (eval, innerHTML, dangerouslySetInnerHTML…) ;
 *   2. tout lien target="_blank" porte rel="noopener noreferrer" ;
 *   3. aucune clé secrète dans les variables VITE_ (elles sont publiques !) ;
 *   4. dist/index.html : CSP présente, aucun script en ligne exécutable ;
 *   5. aucun fichier .map ni .env publié ; en-têtes générés (_headers, .htaccess).
 */
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'

const errors = []
const ok = (msg) => console.log(`  ✓ ${msg}`)
const fail = (msg) => errors.push(msg)

function walk(dir, exts) {
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name)
    if (statSync(p).isDirectory()) return walk(p, exts)
    return exts.some((e) => p.endsWith(e)) ? [p] : []
  })
}

// 1. API dangereuses dans src/
const DANGEROUS = [/dangerouslySetInnerHTML/, /\beval\s*\(/, /new Function\s*\(/, /\.innerHTML\s*=/, /\.outerHTML\s*=/, /document\.write\s*\(/]
const sources = walk('src', ['.js', '.jsx'])
for (const f of sources) {
  const code = readFileSync(f, 'utf8')
  for (const re of DANGEROUS) if (re.test(code)) fail(`${f} : usage interdit ${re}`)
  // 2. target="_blank" sans rel
  for (const m of code.matchAll(/target="_blank"[^>]*/g)) {
    if (!/rel="noopener noreferrer"/.test(m[0])) fail(`${f} : target="_blank" sans rel="noopener noreferrer"`)
  }
}
ok(`${sources.length} fichiers source analysés (API dangereuses, liens externes)`)

// 3. Secrets dans les variables publiques
for (const envFile of ['.env', '.env.local', '.env.production']) {
  if (!existsSync(envFile)) continue
  const lines = readFileSync(envFile, 'utf8').split('\n')
  for (const l of lines) {
    if (/^VITE_\w*(SECRET|PRIVATE|PASSWORD|TOKEN|API_KEY)\w*\s*=\s*\S/i.test(l)) {
      fail(`${envFile} : « ${l.split('=')[0]} » ressemble à un secret. Les variables VITE_ sont visibles de tous.`)
    }
  }
}
ok('aucun secret dans les variables publiques VITE_')

// 4-5. Site construit
if (!existsSync('dist/index.html')) {
  fail('dist/ introuvable : lancer « npm run build » avant ce contrôle')
} else {
  const html = readFileSync('dist/index.html', 'utf8')
  if (!/http-equiv="Content-Security-Policy"/.test(html)) fail('dist/index.html : CSP absente')
  else ok('Content-Security-Policy présente dans index.html')
  const inline = [...html.matchAll(/<script(?![^>]*\bsrc=)([^>]*)>/g)].filter((m) => !/application\/ld\+json/.test(m[1]))
  if (inline.length) fail(`dist/index.html : ${inline.length} script(s) en ligne (interdit par la CSP)`)
  else ok('aucun script en ligne exécutable')
  const published = walk('dist', ['.map', '.env'])
  if (published.length) fail(`fichiers sensibles publiés : ${published.join(', ')}`)
  else ok('aucun fichier .map ou .env publié')
  if (!existsSync('dist/_headers')) fail('dist/_headers absent')
  else ok('en-têtes de sécurité générés (dist/_headers)')
  if (existsSync('dist/.htaccess') && readFileSync('dist/.htaccess', 'utf8').includes('@SECURITY_HEADERS@')) {
    fail('dist/.htaccess : en-têtes non insérés')
  } else ok('en-têtes de sécurité insérés dans dist/.htaccess')
}

if (errors.length) {
  console.error(`\n✗ ${errors.length} problème(s) de sécurité :`)
  errors.forEach((e) => console.error(`  - ${e}`))
  process.exit(1)
}
console.log('\n✓ Contrôle de sécurité réussi')
