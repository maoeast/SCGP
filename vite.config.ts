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

const MIME_BY_EXT: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.ogg': 'video/ogg',
}

/**
 * Dev-only：把 /assets/resources/** 请求映射到项目根 assets/resources/。
 * 生产构建走 electron-builder extraResources + resource:// 协议，不依赖此中间件。
 * 解决 npm run dev 浏览器环境下登录页预置背景（login-backgrounds）等静态资源无法访问的问题。
 */
function servePresetResourcesPlugin(): PluginOption {
  const rootDir = path.resolve(projectRoot, 'assets', 'resources')
  const urlPrefix = '/assets/resources/'

  return {
    name: 'scgp:serve-preset-resources',
    apply: 'serve',
    configureServer(server) {
      // 查找文件；.png 找不到时回退同名 .webp。返回 { filePath, stat } 或 null。
      const resolveFile = (rootDir: string, relPath: string, cb: (result: { filePath: string; stat: fs.Stats } | null) => void) => {
        const primary = path.resolve(rootDir, relPath)
        if (!primary.startsWith(rootDir)) {
          cb(null)
          return
        }
        fs.stat(primary, (err, stat) => {
          if (!err && stat.isFile()) {
            cb({ filePath: primary, stat })
            return
          }
          // 光栅图 → .webp 兜底（.png/.jpg/.jpeg）
          const lower = primary.toLowerCase()
          if (lower.endsWith('.png') || lower.endsWith('.jpg') || lower.endsWith('.jpeg')) {
            const dotIndex = primary.lastIndexOf('.')
            const webp = primary.slice(0, dotIndex) + '.webp'
            if (webp.startsWith(rootDir)) {
              fs.stat(webp, (e2, s2) => {
                if (!e2 && s2.isFile()) {
                  cb({ filePath: webp, stat: s2 })
                } else {
                  cb(null)
                }
              })
              return
            }
          }
          cb(null)
        })
      }

      server.middlewares.use((req, res, next) => {
        const url = req.url || ''
        if (req.method !== 'GET' || !url.startsWith(urlPrefix)) {
          next()
          return
        }

        // 去掉 query/hash，解码 URL 编码
        const relativePath = decodeURIComponent(url.split('?')[0].split('#')[0].slice(urlPrefix.length))

        // 路径穿越防护
        if (relativePath.includes('..') || path.isAbsolute(relativePath)) {
          res.statusCode = 400
          res.end()
          return
        }

        resolveFile(rootDir, relativePath, (result) => {
          if (!result) {
            res.statusCode = 404
            res.end()
            return
          }
          const { filePath: resolved, stat } = result
          const ext = path.extname(resolved).toLowerCase()
          res.setHeader('Content-Type', MIME_BY_EXT[ext] || 'application/octet-stream')
          res.setHeader('Content-Length', stat.size)
          res.setHeader('Cache-Control', 'no-cache')
          const stream = fs.createReadStream(resolved)
          stream.on('error', () => {
            if (!res.headersSent) {
              res.statusCode = 500
            }
            res.end()
          })
          stream.pipe(res)
        })
      })
    },
  }
}

async function resolvePlugins(isProductionBuild: boolean) {
  const plugins: PluginOption[] = [vue()]

  if (isProductionBuild) {
    return plugins
  }

  // dev only：服务预置静态资源（登录页背景等）
  plugins.push(servePresetResourcesPlugin())

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
      watch: {
        // Electron writes locked browser state under this disposable capture workspace.
        ignored: ['**/output/manual-screenshot-capture/**'],
      },
      fs: {
        strict: false,
      },
    },
    optimizeDeps: {
      // sql.js 不再排除：DB Worker 需要依赖预构建（ESM 包装）才能在 dev 下加载。
      // 主线程加载走 ?url + <script> 标签（sqljs-loader.ts），不经过预构建，不受影响。
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
          },
        },
      },
    },
  }
})()
