import { fileURLToPath, URL } from 'node:url'
import fs from 'node:fs'
import path from 'node:path'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueDevTools from 'vite-plugin-vue-devtools'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    vueDevTools(),
  ],
  // Electron 生产环境关键配置：使用相对路径（'./'）确保 file:// 协议下能正确加载资源
  // 开发环境（npm run dev）使用 '/'，生产环境打包后使用 './'
  base: process.env.ELECTRON === 'true' ? './' : '/',
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    },
    extensions: ['.ts', '.js', '.vue', '.json']
  },
  // 添加 assets 目录作为静态资源目录
  publicDir: 'public',
  // 额外的静态资源目录
  server: {
    // HTTPS 配置（用于支持局域网访问时的激活码验证）
    https: fs.existsSync(path.resolve(__dirname, 'dev-cert.pem'))
      ? {
          key: fs.readFileSync(path.resolve(__dirname, 'dev-key.pem')),
          cert: fs.readFileSync(path.resolve(__dirname, 'dev-cert.pem'))
        }
      : undefined,
    // 允许局域网访问
    host: '0.0.0.0', // 监听所有网络接口
    port: 5173,
    strictPort: false, // 端口被占用时自动尝试下一个端口
    fs: {
      // 允许访问项目根目录的文件
      strict: false
    }
  },
  optimizeDeps: {
    exclude: ['sql.js'] // 排除sql.js的预构建
  },
  worker: {
    format: 'es',
    plugins: () => [
      vue()
    ]
  },
  assetsInclude: ['**/*.sql', '**/*.db'], // 包含SQL文件作为资源
  // 构建配置
  build: {
    // 确保资源路径正确
    assetsDir: 'assets',
    // 将 assets 目录复制到输出目录
    copyPublicDir: true,
    // 生产环境移除 console
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true
      }
    },
    rollupOptions: {
      output: {
        // 手动分块策略优化加载性能
        manualChunks: {
          'element-plus': ['element-plus'],
          'echarts': ['echarts', 'vue-echarts']
        }
      }
    }
  }
})
