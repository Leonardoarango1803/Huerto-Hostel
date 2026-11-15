import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      globals: globals.browser,
    },
    rules: {
      // Advertencias, no errores: el proyecto carga datos con el patron "pedir en un efecto y guardar al llegar"
      // (con bandera `vigente` para respuestas tardias), que esta regla nueva de React 19 marca igual. El codigo nuevo
      // la evita (estado derivado en vez de setState sincrono); el resto se migra poco a poco sin romper pantallas.
      'react-hooks/set-state-in-effect': 'warn',
      // Solo afecta la recarga en caliente de Vite en desarrollo (contextos que exportan su hook, helpers de Badge).
      'react-refresh/only-export-components': 'warn',
    },
  },
])
