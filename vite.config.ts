import { defineConfig, type PluginOption } from 'vite'
import vue from '@vitejs/plugin-vue'
import basicSsl from '@vitejs/plugin-basic-ssl'
import { readFileSync } from 'node:fs'
import { fileURLToPath, URL } from 'node:url'

const mpVersion: string = JSON.parse(
  readFileSync(new URL('./node_modules/@mediapipe/tasks-vision/package.json', import.meta.url), 'utf-8'),
).version

// @mediapipe/tasks-vision references a source map it doesn't ship; strip the
// dangling sourceMappingURL so the dev server stops warning about it.
const stripMediapipeSourcemap: PluginOption = {
  name: 'strip-mediapipe-sourcemap',
  apply: 'serve',
  enforce: 'pre',
  load(id) {
    const file = id.split('?')[0]
    if (!/[\\/]@mediapipe[\\/]tasks-vision[\\/].*\.m?js$/.test(file)) return null
    const code = readFileSync(file, 'utf-8')
    return { code: code.replace(/\/\/# sourceMappingURL=\S+\s*$/, ''), map: null }
  },
}

export default defineConfig(({ mode }) => {
  const plugins: PluginOption[] = [stripMediapipeSourcemap, vue()]
  if (mode === 'https') plugins.push(basicSsl())
  return {
    base: './',
    plugins,
    define: {
      __MP_VERSION__: JSON.stringify(mpVersion),
    },
    resolve: {
      alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
    },
    optimizeDeps: {
      exclude: ['@mediapipe/tasks-vision'],
    },
    build: {
      target: 'es2019',
      chunkSizeWarningLimit: 1500,
    },
  }
})
