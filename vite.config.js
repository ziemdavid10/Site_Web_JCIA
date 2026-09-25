import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { fileURLToPath, URL } from 'node:url'
import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'
import { allHeaders, buildCsp, cspForMeta } from './security/headers.mjs'

/**
 * Plugin « sécurité » (build uniquement) :
 *  1. ajoute la Content-Security-Policy dans index.html (<meta>) ;
 *  2. écrit dist/_headers (Netlify, Cloudflare Pages) avec tous les en-têtes ;
 *  3. complète dist/.htaccess (Apache) avec les mêmes en-têtes.
 * En développement, rien n'est ajouté (le rechargement à chaud de Vite a besoin
 * de scripts en ligne).
 */
function securityHeaders(env) {
  const options = { paymentApiUrl: env.VITE_PAYMENT_API_URL }
  let outDir = 'dist'
  return {
    name: 'jcia-security-headers',
    apply: 'build',
    configResolved(config) {
      outDir = resolve(config.root, config.build.outDir)
    },
    transformIndexHtml(html) {
      const meta = `<meta http-equiv="Content-Security-Policy" content="${cspForMeta(buildCsp(options))}" />`
      return html.replace('<meta charset="UTF-8" />', `<meta charset="UTF-8" />\n    ${meta}`)
    },
    closeBundle() {
      const headers = allHeaders(options)

      // Netlify / Cloudflare Pages
      const netlify = [
        '# Généré au build par vite.config.js (source : security/headers.mjs) — ne pas modifier ici',
        '/*',
        ...Object.entries(headers).map(([k, v]) => `  ${k}: ${v}`),
        '/assets/*',
        '  Cache-Control: public, max-age=31536000, immutable',
      ].join('\n')
      writeFileSync(resolve(outDir, '_headers'), `${netlify}\n`)

      // Apache
      const htaccess = resolve(outDir, '.htaccess')
      if (existsSync(htaccess)) {
        const lines = Object.entries(headers)
          .map(([k, v]) => `  Header always set ${k} "${v.replace(/"/g, '\\"')}"`)
          .join('\n')
        const block = `<IfModule mod_headers.c>\n  # En-têtes de sécurité — générés au build (security/headers.mjs)\n${lines}\n</IfModule>`
        writeFileSync(htaccess, readFileSync(htaccess, 'utf8').replace('# @SECURITY_HEADERS@', block))
      }
    },
  }
}

/**
 * Configuration Vite — Site JCIA 2027
 * - Alias "@" → src/ pour des imports lisibles (ex: "@/components/ui/Button")
 * - Les feuilles SCSS peuvent aussi utiliser l'alias : @use '@/styles/abstracts' as *;
 * https://vite.dev/config/
 */
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), 'VITE_')
  return {
    plugins: [react(), securityHeaders(env)],
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
      },
    },
    build: {
      // Les images de motifs sont déjà optimisées en WebP
      assetsInlineLimit: 4096,
      // Pas de fichiers .map publiés : le code source reste privé
      sourcemap: false,
    },
    // Le serveur de développement n'est accessible que depuis la machine locale
    server: { host: 'localhost' },
    preview: { host: 'localhost' },
  }
})
