import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  // figma-plugin : exécuté dans le bac à sable Figma (global « figma »), hors application
  globalIgnores(['dist', 'figma-plugin', 'test-results', 'playwright-report']),
  {
    files: ['**/*.{js,jsx}'],
    extends: [
      js.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      globals: globals.browser,
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
  },
  {
    // Scripts d'outillage exécutés par Node (ex : vérification des traductions)
    files: ['scripts/**/*.{js,mjs}', 'security/**/*.mjs', 'vite.config.js', 'tests/**/*.{js,mjs}'],
    languageOptions: { globals: globals.node },
  },
  {
    // catch (e) volontairement muet dans le script de thème (stockage indisponible)
    files: ['public/theme-init.js'],
    rules: { 'no-unused-vars': ['error', { caughtErrors: 'none' }] },
  },
])
