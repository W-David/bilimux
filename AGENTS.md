# AGENTS.md

BiliMux — Electron desktop app that scans Bilibili client cache (split m4s) and muxes to MP4 via bundled MP4Box.

## Toolchain

- **Package manager: pnpm only** (`packageManager`: `pnpm@11.18.0`). Node >= 22.
- pnpm 11 settings live in `pnpm-workspace.yaml` (`allowBuilds`, `shamefullyHoist`, `pmOnFail`) — not in `package.json` `pnpm` field or `.npmrc`.
- `.npmrc` only has two Electron-related mirrors (npmmirror): `electron_mirror` and `electron_builder_binaries_mirror`. Slow Electron install: set `ELECTRON_MIRROR=https://npmmirror.com/mirrors/electron/`.
- `allowBuilds` currently registers `electron`, `esbuild` and `vue-demi`. When adding/upgrading a dependency that runs a postinstall build script, register it in `pnpm-workspace.yaml` first — pnpm 11 skips unregistered build scripts.
- If a non-TTY `pnpm install` aborts during a pnpm layout migration, delete `node_modules` and rerun `pnpm install`.

## Commands

```bash
pnpm install
pnpm dev              # electron-vite dev --watch (renderer :8880)
pnpm lint             # eslint .
pnpm lint:fix        # eslint --fix .
pnpm typecheck        # tsc node + vue-tsc web
pnpm build            # typecheck then electron-vite build → out/
pnpm build:mac|win|linux   # build + electron-builder → dist/
pnpm build:unpack     # build + electron-builder --dir (unpacked app, no installer)
pnpm format           # prettier --write .
```

No test suite. CI (`.github/workflows/lint.yml`): `pnpm lint:fix` then `pnpm typecheck`. Release on tag `v*` (matrix win/mac/linux).

`package.json` scripts chain via `npm run …`; prefer invoking top-level scripts with `pnpm`.

## Release

- Bump the version and create the matching tag with one command (tag prefix `v` matches the release workflow):

  ```bash
  pnpm version patch --message "chore: release v%s"   # or minor / major / an explicit version
  git push origin <branch> --tags
  ```

- `release.yml` first verifies that the pushed `v*` tag equals `package.json` `version` and fails the build on mismatch —
  never hand-tag without bumping `package.json` first.
- CI builds Windows (NSIS x64), macOS (DMG arm64) and Linux (AppImage + deb), then uploads to a **draft** GitHub Release
  (`publish.releaseType: draft`); publish the draft manually in GitHub before users can see/update to it.

## Layout

| Path                          | Role                                                                                     |
| ----------------------------- | ---------------------------------------------------------------------------------------- |
| `src/main/`                   | Main process. Entry `index.ts` → `Application` + `Launcher`. Core services under `core/` |
| `src/preload/`                | `contextBridge` → `window.electron`                                                      |
| `src/renderer/`               | Vue 3 UI (`src/renderer/src/`). Root HTML at `src/renderer/index.html`                   |
| `src/shared/`                 | Cross-process types + IPC contracts                                                      |
| `extra/{darwin,linux,win32}/` | Bundled MP4Box binaries (electron-builder `extraResources`)                              |
| `out/`                        | electron-vite output (gitignored)                                                        |
| `dist/`                       | packaged installers (gitignored)                                                         |
| `build/`                      | app icons + mac entitlements                                                             |
| `resources/`                  | extra app assets (e.g. `bilimux.png`)                                                    |
| `PNPM_MIGRATION.md`           | pnpm 11 migration notes (historical)                                                     |

### Path aliases

- Main/node: `@main/*` → `src/main/*`, `@shared/*` → `src/shared/*`
- Renderer: `@renderer/*` → `src/renderer/src/*`, `@preload/*`, `@shared/*`

### Main process wiring

`Application` owns: `Context`, `ConfigManager` (electron-store), `AutoLauncher`, `IPCManager`, `HttpClient` (got), `ComposEngine` + `ProcessQueue`, `DownloadManager`, `DownloadHistoryStore` (node:sqlite), `ConvertHistoryStore` (node:sqlite), `WindowManager`, `UpdateManager`. Do not invent parallel singletons — extend these.

`Launcher` owns `ExceptionHandler` and the single-instance lock (non-macOS).

MP4Box path: `getEngineBinPath()` in `src/main/utils/index.ts` — dev uses `extra/<platform>/`, prod uses app resources. Default convert config built in `ConfigManager.genDefaultConfig()`.

### IPC

Typed contracts in `src/shared/ipc/events.d.ts` (`IpcMainHandleEvents`, `IpcMainListenEvents`, `IpcRendererEvents`). Main: `IPCManager` + handlers in `Application`. Renderer: `src/renderer/src/ipc/`. **Add/change channels in the shared events file first**, then wire both sides.

Download flow: `DownloadManager` fetches `wbi/playurl` (Wbi signed via `src/main/utils/wbi.ts`), downloads DASH m4s or MP4 through `HttpClient.downloadFile`, and reuses `ComposEngine.mergeFiles` for m4s merging. Progress events: `download:item:start/progress/end`. Pause/resume is in-memory only (`download:pause`/`download:resume` IPC): partial files are kept, resume sends `Range` via `HttpClient.downloadFile`, and playurl is refreshed on retry so expired URLs restart from scratch. Download history is persisted in `userData/downloads.db` via `DownloadHistoryStore` (node:sqlite): start/complete/fail transitions write records, and renderer queries them through `download:history:list/get` IPC.

Convert flow: `ComposEngine` emits `process:item:start/end` with `{ bvid, success, message, outputPath?, durationMs?, skipped? }`; `Application` persists finished items to `userData/converts.db` via `ConvertHistoryStore` and exposes `convert:history:list/clear` IPC. Renderer `store/convert.ts` merges in-memory tasks with the persisted history.

### Persistence

- electron-store (`ConfigManager`): `user-info`, `favorites-data`, `convert-config`, `download-config`.
- node:sqlite: `userData/downloads.db` (`DownloadHistoryStore`) and `userData/converts.db` (`ConvertHistoryStore`).

### Renderer

- Vue 3 + Pinia + vue-router **memory history** + Tailwind CSS v4 + shadcn-vue (Reka UI + lucide + vue-sonner)
- shadcn-vue + local components auto-imported via `unplugin-vue-components` (dirs: `src/components`, `src/layout`, relative to the `src/renderer` root)
- shadcn-vue config lives in root `components.json` (aliases `@renderer/components`, `@renderer/components/ui`, `@renderer/lib/utils`); generated UI components live in `src/renderer/src/components/ui/`; `cn` helper in `src/renderer/src/lib/utils.ts`; theme CSS variables in `src/renderer/src/styles/base.css` (dark-only, `.dark` on `<html>`, pink primary). Add/update components with `pnpm dlx shadcn-vue@latest add <component>`.
- Pages: Convert (legacy), Convert Manager (`pages/convert/{index,complete,entire,unconverted}.vue`), Download (auth/task), Settings (`pages/setting/{index,normal,user,convert,download}.vue`), About
- Pinia stores live in `store/` (`auth`, `favorites`, `download`, `convert`, `preference`, `update`); Bilibili data fetching lives in `services/{favorites,user}.ts`. One-shot favorites fetch (`fetchAllFavorites`) waits 500ms between folders to avoid risk control.
- Dark-only UI

### Build gotchas

- `electron.vite.config.ts` main build: `externalizeDeps.exclude: ['electron-store', 'got']` — keep both bundled; do not externalize them.
- `postinstall`: `electron-builder install-app-deps`
- Platform binaries under `extra/` must stay executable and match `ENGINE_BIN_MAP` in `src/main/config/constants.ts`
- `extra/darwin/MP4Box` is a locally built **static arm64** GPAC v26.07.0 binary (only depends on `/usr/lib/libSystem.B.dylib`).
  Rebuild with `./configure --static-bin --use-zlib=no --disable-curl --disable-nghttp2 && make -j4`; keep zlib/curl/nghttp2
  disabled for a minimal self-contained binary. `extra/linux` and `extra/win32` binaries look self-contained (no `libgpac`
  references) but their provenance is unverified.
- `dev-app-update.yml` is a placeholder (`https://example.com/auto-updates`); the real update feed comes from
  `electron-builder.yml` `publish` + GitHub releases.
- Dev `userData` is isolated in `src/main/index.ts` (`app.setPath('userData', …/bilimux-dev)` when `!app.isPackaged`), so
  dev config/cookies never collide with the packaged `BiliMux` profile on case-insensitive filesystems.

## Style

- Prettier: single quotes, **no semicolons**, `printWidth: 120`, `trailingComma: 'none'`, `arrowParens: 'avoid'`
- ESLint flat config (`eslint.config.mjs`); Vue SFCs require `lang="ts"` on `<script>`
- Indent 2 spaces, LF (`.editorconfig`)
