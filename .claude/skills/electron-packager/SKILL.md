---
name: electron-packager
description: 提供 Electron 应用打包、构建和发布功能。当用户需要打包应用、创建安装包、配置打包参数或处理跨平台构建时使用此 skill。
---

# Electron 打包 Skill

此 skill 提供感官综合训练与评估系统 Electron 应用的打包、构建和发布功能。

## 何时使用

- 打包 Electron 应用为可执行文件
- 创建 Windows 安装程序（.exe）
- 创建 Mac 安装包（.dmg）
- 配置打包参数和优化
- 处理应用签名和公证
- 优化应用体积和启动速度
- 构建多平台版本
- 自动化构建和发布流程

## 项目 Electron 配置

### 当前配置文件

- `package.json` - 包含构建脚本和依赖
- `vite.config.ts` - Vite 构建配置
- `electron-builder.yml` - Electron Builder 配置（如存在）

### 主要打包工具

- **electron-builder**: 主要打包工具
- **vite-plugin-electron**: 集成 Vite 和 Electron

## 使用方法

### 1. 开发环境构建

```bash
# 安装依赖
npm install

# 启动开发服务器
npm run dev
```

### 2. 生产环境打包

#### Windows 打包

```bash
# 打包为 .exe 可执行文件
npm run build:win

# 打包为安装程序（.exe）
npm run build:win:installer
```

#### Mac 打包

```bash
# 打包为 .dmg 磁盘映像
npm run build:mac

# 打包为 .app 应用
npm run build:mac:app
```

#### Linux 打包

```bash
# 打包为 AppImage
npm run build:linux:appimage

# 打包为 deb 包
npm run build:linux:deb

# 打包为 rpm 包
npm run build:linux:rpm
```

#### 打包所有平台

```bash
npm run build:all
```

### 3. 配置 Electron Builder

#### electron-builder.yml 配置示例

参考 `references/electron-builder-config.yml`：

```yaml
appId: com.selfcare.ats
productName: 感官综合训练与评估系统
directories:
  buildResources: build
  output: release
files:
  - dist/**/*
  - package.json
win:
  target:
    - nsis
    - portable
  icon: build/icon.ico
nsis:
  oneClick: false
  allowToChangeInstallationDirectory: true
  createDesktopShortcut: true
  createStartMenuShortcut: true
mac:
  target:
    - dmg
    - zip
  icon: build/icon.icns
  category: public.app-category.education
linux:
  target:
    - AppImage
    - deb
  icon: build/icons/
  category: Education
```

### 4. 应用图标配置

#### Windows 图标

- 格式：`.ico`
- 尺寸：256x256
- 位置：`build/icon.ico`
- 生成工具：使用 `scripts/generate-icons.js`

#### Mac 图标

- 格式：`.icns`
- 位置：`build/icon.icns`
- 生成工具：使用 `scripts/generate-icons.js`

#### Linux 图标

- 格式：PNG
- 尺寸：512x512
- 位置：`build/icons/`

#### 图标生成脚本

```bash
# 从源图标生成所有平台图标
node scripts/generate-icons.js assets/icon.png
```

### 5. 应用签名（Windows）

#### 代码签名

```bash
# 使用 signtool 签名（需要代码签名证书）
signtool sign /f certificate.pfx /p password /t http://timestamp.digicert.com dist/*.exe
```

#### 配置 electron-builder 签名

```yaml
win:
  signingHashAlgorithms:
    - sha256
  certificateFile: path/to/certificate.pfx
  certificatePassword: password
```

### 6. Mac 公证

```bash
# 上传到 Apple 公证服务
xcrun notarytool submit build/YourApp.dmg --apple-id "your@email.com" --password "app-specific-password" --team-id "TEAMID" --wait

# 装订公证票据
xcrun stapler staple build/YourApp.dmg
```

## 构建优化

### 1. 减小应用体积

参考 `references/build-optimization.md`：

- 使用 `asar` 压缩（默认启用）
- 排除不必要的文件和依赖
- 使用 production 模式构建
- 压缩资源文件
- 移除开发依赖

### 2. 加快构建速度

- 使用增量构建
- 缓存 node_modules
- 并行构建多平台版本
- 使用 GitHub Actions 或 CI/CD

### 3. 优化启动速度

- 延迟加载非核心模块
- 预加载关键资源
- 使用 Vite 的构建优化
- 减少初始渲染内容

## 自动化构建

### GitHub Actions 配置

参考 `scripts/github-actions.yml`：

```yaml
name: Build Electron App

on:
  push:
    tags:
      - 'v*'
  release:
    types: [created]

jobs:
  build:
    runs-on: ${{ matrix.os }}
    strategy:
      matrix:
        os: [windows-latest, macos-latest, ubuntu-latest]

    steps:
      - uses: actions/checkout@v2
      - name: Setup Node.js
        uses: actions/setup-node@v2
        with:
          node-version: '18'
      - name: Install dependencies
        run: npm install
      - name: Build
        run: npm run build:all
      - name: Upload artifacts
        uses: actions/upload-artifact@v2
        with:
          name: ${{ matrix.os }}-build
          path: release/*
```

## 常用脚本

### 生成安装程序

```bash
# Windows NSIS 安装程序
npm run build:win:installer

# 生成自定义安装程序配置
node scripts/create-installer.js
```

### 清理构建文件

```bash
# 清理 dist 和 release 目录
npm run clean

# 清理所有构建产物
node scripts/clean-build.js
```

### 版本管理

```bash
# 更新版本号
npm version patch/minor/major

# 生成 CHANGELOG
npm run changelog
```

## 版本发布流程

### 1. 准备发布

- 更新版本号（`package.json`）
- 更新 CHANGELOG
- 测试应用功能
- 准备发布说明

### 2. 构建应用

```bash
# 构建所有平台
npm run build:all
```

### 3. 创建 Git Tag

```bash
git tag v1.0.0
git push origin v1.0.0
```

### 4. 发布到 GitHub

```bash
# 使用 gh CLI 发布
gh release create v1.0.0 release/* --notes "Release notes"
```

## 调试打包问题

### 1. 查看构建日志

```bash
# 详细构建日志
npm run build:win -- --verbose
```

### 2. 测试打包后的应用

```bash
# 运行打包后的应用
./release/感官综合训练与评估系统-1.0.0.exe
```

### 3. 常见问题

#### 应用无法启动

- 检查 `package.json` 中的 `main` 字段
- 确保所有依赖都已包含
- 检查文件路径是否正确

#### 资源文件缺失

- 检查 `files` 配置是否包含资源目录
- 使用 `extraResources` 配置添加额外资源

#### 构建体积过大

Resources` 配置添加额外资源

#### 构建体积过大

- 使用 `asarUnpack` 排除需要本地访问的模块
- 检查是否有不必要的依赖
- 使用压缩选项

## 注意事项

- **跨平台构建**：在对应操作系统上构建，或使用虚拟机/CI
- **代码签名**：发布前进行代码签名，避免安全警告
- **测试环境**：在干净的环境中测试打包后的应用
- **备份配置**：保存打包配置和脚本，方便后续使用
- **版本管理**：使用语义化版本号，清晰标记变更

## 相关文件位置

- 打包配置：`electron-builder.yml`
- 构建脚本：`scripts/` 目录
- 资源文件：`build/` 目录
- 构建产物：`release/` 目录
