# Technology Stack

**Analysis Date:** 2026-02-28

## Languages

**Primary:**
- TypeScript 5.x - Core logic, APIs, and Vue components
- Vue 3.5.x (SFCs, `<script setup>` syntax) - User Interface

**Secondary:**
- SQL - SQLite schema, queries via sql.js
- HTML/CSS - Web layouts

## Runtime

**Environment:**
- Electron ^34.5.8 (Desktop Application Framework)
- Node.js ^20.19.0 || >=22.12.0

**Package Manager:**
- npm
- Lockfile: present (`package-lock.json`)

## Frameworks

**Core:**
- Vue 3.x - UI Framework
- Vite ^7.2.4 - Build Tool / Bundler
- Element Plus ^2.12.0 - Component Library
- Pinia ^3.0.4 - State Management
- Vue Router ^4.6.3 - Client-side Routing

**Testing:**
- Custom in-app testing tools (no jest/vitest configured)

**Build/Dev:**
- electron-builder ^25.1.8 - Application packaging
- vue-tsc ^3.1.5 - TypeScript checking for Vue

## Key Dependencies

**Critical:**
- `sql.js` ^1.13.0 - Browser-side SQLite engine for Local-First storage
- `html2canvas` ^1.4.1 & `jspdf` ^3.0.4 - Client-side PDF generation for reports
- `docx` ^9.5.1 - Word document generation for IEP/reports
- `electron-updater` ^6.8.3 - In-app auto updates

**Infrastructure:**
- `crypto-js` ^4.2.0 - Encryption, activation, license keys
- `echarts` & `vue-echarts` - Statistical charts
- `uuid` ^13.0.0 - Unique identifier generation

## Configuration

**Environment:**
- `.env.development`, `.env.production` for build flags
- Key configs required: `VITE_DUAL_WRITE`, `VITE_DEV_TOOLS`

**Build:**
- `vite.config.ts`: Vite frontend configuration
- `package.json` build block: `electron-builder` configuration for Windows (nsis), Mac (dmg), and Linux (AppImage)

## Platform Requirements

**Development:**
- Node.js, npm, and C/C++ compiler for Electron native dependencies if any (none required due to Zero Native Dependencies rule).

**Production:**
- Desktop environments: Windows (x64), macOS, Linux.

---

*Stack analysis: 2026-02-28*
