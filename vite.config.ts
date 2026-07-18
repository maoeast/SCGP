import { fileURLToPath, URL } from 'node:url'
import fs from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'

import { type ConfigEnv, type PluginOption, type UserConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

const require = createRequire(import.meta.url)
const projectRoot = fileURLToPath(new URL('.', import.meta.url))

function canEnableVueDevTools() {
  try {
    require.resolve('vite-plugin-vue-devtools/package.json')
    require.resolve('@babel/core/package.json')
    return true
  } catch {
    return false
  }
}

async function resolvePlugins(isProductionBuild: boolean) {
  const plugins: PluginOption[] = [vue()]

  if (isProductionBuild) {
    return plugins
  }

  if (!canEnableVueDevTools()) {
    console.warn('[vite] Skip vite-plugin-vue-devtools: missing optional dependency @babel/core')
    return plugins
  }

  const { default: vueDevTools } = await import('vite-plugin-vue-devtools')
  plugins.push(vueDevTools())
  return plugins
}

export default (async (configEnv?: ConfigEnv): Promise<UserConfig> => {
  const command = configEnv?.command || 'serve'
  const mode = configEnv?.mode || 'development'
  const isProductionBuild = command === 'build' && mode === 'production'
  const plugins = await resolvePlugins(isProductionBuild)

  return {
    plugins,
    base: process.env.ELECTRON === 'true' ? './' : '/',
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
      },
      extensions: ['.ts', '.js', '.vue', '.json'],
    },
    publicDir: 'public',
    server: {
      https: fs.existsSync(path.resolve(projectRoot, 'dev-cert.pem'))
        ? {
            key: fs.readFileSync(path.resolve(projectRoot, 'dev-key.pem')),
            cert: fs.readFileSync(path.resolve(projectRoot, 'dev-cert.pem')),
          }
        : undefined,
      host: '0.0.0.0',
      port: 5173,
      strictPort: false,
      fs: {
        strict: false,
      },
    },
    optimizeDeps: {
      exclude: ['sql.js'],
    },
    worker: {
      format: 'es',
      plugins: () => [vue()],
    },
    assetsInclude: ['**/*.sql', '**/*.db'],
    build: {
      assetsDir: 'assets',
      copyPublicDir: true,
      minify: 'terser',
      terserOptions: {
        compress: {
          drop_console: true,
          drop_debugger: true,
        },
      },
      rollupOptions: {
        output: {
          manualChunks: {
            'element-plus': ['element-plus'],
            echarts: ['echarts', 'vue-echarts'],
            three: ['three'],
          },
        },
      },
    },
  }
})()
