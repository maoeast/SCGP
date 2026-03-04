# Technology Stack

**Project:** Stellar Competency Growth Platform (SCGP)
**Researched:** Current Date

## Recommended Stack

### Core Framework
| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| Vue | 3.x | Frontend framework | Current ecosystem standard, component-based UI. |
| TypeScript | 5.x | Type system | Enhances maintainability and refactoring safety, heavily utilized in domain logic. |
| Vite | latest | Build tool | Fast local development and bundled output. |
| Element Plus | latest | UI Component Library | Rapid construction of administrative and clinical interfaces. |

### Database
| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| SQL.js | latest | Browser-side SQLite | Enables Local-First architecture without requiring native Node bindings (`node-gyp`). |

### Infrastructure
| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| Electron | latest | Desktop Application Wrapper | Distributes the web application as a standalone desktop app for schools/clinics. |
| archiver | latest | Backup streams | Pure JS library for streaming backups to avoid native deps. |
| browser-image-compression | latest | Image Optimization | Resizes and optimizes uploads in Web Workers without `sharp`. |

### Supporting Libraries
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Pinia | latest | State management | Managing cross-component state like Auth and current module context. |
| ECharts | latest | Data visualization | Displaying assessment results, trends, and progress tracking. |
| WebGazer.js | (Paused) | Eye tracking | For visual tracking games (currently paused due to hardware constraints). |

## Architectural Constraints

1. **Zero Native Dependencies (No-Native-Deps):** Do not use any libraries that require `node-gyp` (e.g., `sqlite3`, `sharp`). Pure JS or WASM only.
2. **Local-First:** All data lives in the local SQLite database.

## Sources

- `PROJECT_CONTEXT.md` (HIGH)
- `重构实施技术规范.md` (HIGH)