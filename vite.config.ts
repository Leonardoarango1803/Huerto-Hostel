import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv, type Plugin } from 'vite'

/**
 * El portal administrativo no debe aparecer en Google: se le pone noindex y un titulo propio.
 * La web publica queda igual. Que sitio se compila lo decide VITE_SITIO (ver src/sitio.ts).
 */
function htmlSegunSitio(sitio: string | undefined): Plugin {
  return {
    name: 'html-segun-sitio',
    transformIndexHtml(html) {
      if (sitio !== 'admin') return html
      return html
        .replace('<title>El Huerto Hostel</title>', '<title>El Huerto · Portal administrativo</title>')
        .replace('</head>', '    <meta name="robots" content="noindex, nofollow" />\n  </head>')
    },
  }
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // "npm run dev:admin" / "npm run dev:web": tu entorno local de siempre (.env.development.local: backend, Google,
  // captcha) pero con un solo sitio, como quedaran publicados. Lo ya definido en la consola tiene prioridad.
  if (mode === 'admin' || mode === 'web') {
    const local = loadEnv('development', process.cwd(), 'VITE_')
    for (const [clave, valor] of Object.entries(local)) {
      if (process.env[clave] === undefined) process.env[clave] = valor
    }
    process.env.VITE_SITIO = mode
  }
  const env = loadEnv(mode, process.cwd(), '')
  return {
    plugins: [react(), htmlSegunSitio(env.VITE_SITIO)],
  }
})
