# AGENTS.md

BiliMux — Electron app：片库浏览收藏 / 追番 / 追剧并下载；扫描 B 站客户端缓存（split m4s）经内置 MP4Box 合成 MP4。界面三栏：片库、任务、设置。

## Toolchain

- **pnpm only** (`packageManager`: `pnpm@11.18.0`)。Node >= 22。
- pnpm 11 配置在 `pnpm-workspace.yaml`（`allowBuilds`、`shamefullyHoist`、`pmOnFail`），不要写进 `package.json` 的 `pnpm` 字段或 `.npmrc`。
- `.npmrc` 只有 Electron 镜像：`electron_mirror`、`electron_builder_binaries_mirror`。安装慢可设 `ELECTRON_MIRROR=https://npmmirror.com/mirrors/electron/`。
- `allowBuilds` 目前登记 `electron`、`esbuild`、`vue-demi`。带 postinstall 构建脚本的依赖先登记，否则 pnpm 11 会跳过。
- 非 TTY `pnpm install` 在 layout 迁移中失败：删 `node_modules` 再装。

## Commands

```bash
pnpm install
pnpm dev              # electron-vite dev --watch (renderer :8880)
pnpm lint             # eslint .
pnpm lint:fix        # eslint --fix .
pnpm typecheck        # tsc node + vue-tsc web
pnpm build            # typecheck then electron-vite build → out/
pnpm build:mac|win|linux   # build + electron-builder → dist/
pnpm build:unpack     # build + electron-builder --dir
pnpm format           # prettier --write .
```

无测试。CI（`.github/workflows/lint.yml`）：`pnpm lint:fix` 再 `pnpm typecheck`。打 `v*` tag 发版（win/mac/linux）。

`package.json` 脚本内部用 `npm run …`；顶层请用 `pnpm`。

## Release

```bash
pnpm version patch --message "chore: release v%s"   # 或 minor / major / 指定版本
git push origin <branch> --tags
```

`release.yml` 会核对 tag 与 `package.json` `version` 一致，禁止只打 tag 不改版本。产物上传为 **draft** GitHub Release，需手动发布。

## Layout

| Path                          | Role                                                          |
| ----------------------------- | ------------------------------------------------------------- |
| `src/main/`                   | 主进程。入口 `index.ts` → `Application` + `Launcher`          |
| `src/main/ipc/`               | IPC handlers（`registerIpcHandlers`），不要写进 `Application` |
| `src/preload/`                | `contextBridge` → `window.electron`                           |
| `src/renderer/`               | Vue 3 UI（`src/renderer/src/`）                               |
| `src/shared/`                 | 跨进程类型、IPC、下载 qn/codec                                |
| `extra/{darwin,linux,win32}/` | 内置 MP4Box（electron-builder `extraResources`）              |
| `out/` / `dist/`              | 构建产物 / 安装包（gitignore）                                |
| `build/` / `resources/`       | 图标、entitlements / 额外资源                                 |

别名：主进程 `@main/*`、`@shared/*`；渲染进程 `@renderer/*`、`@preload/*`、`@shared/*`。

### Main process

`Application` 拥有：`Context`、`ConfigManager`、`AutoLauncher`、`IPCManager`、`HttpClient`、`ComposEngine` + `ProcessQueue`、`DownloadManager`、`DownloadHistoryStore`、`ConvertHistoryStore`、`WindowManager`、`UpdateManager`。不要另起单例。

IPC 在 `src/main/ipc/`（preference / convert / download / http / app）。渲染进程用 `src/renderer/src/ipc/` 的 `emitter.invoke` / `ipc.on`，没有 api 包装层。

`Launcher`：`ExceptionHandler` + **全平台** 单实例锁。二次启动聚焦已有窗口；macOS 另走 `activate`。

MP4Box：`getEngineBinPath()`，dev 用 `extra/<platform>/`，prod 用 app resources。默认配置在 `ConfigManager.genDefaultConfig()`。并行数钳到 `1/2/4/8`（旧值 `16` → `8`）。转换覆盖只有 `replaceExisting`。

下载默认 qn **80（1080P）**、编码 **AVC**；片库再按该片实际流探测。

窗口（`src/main/config/page.ts`）：1440×1000，最小 1280×800，`titleBarStyle: 'hiddenInset'` 仅 macOS 有效。Windows 现用同一属性，不要擅自改。

### IPC

契约：`src/shared/ipc/events.d.ts` + `channels.ts`。**先改这两处**，再接线。

`open-path` / `open-folder` 返回 `string`：空串成功，否则中文错误（`src/main/utils/open-local.ts`）。渲染进程 toast：`openLocalPath` / `revealLocalPath`。路径必须在 `getAllowedUserRoots()` 内（转换/下载输出、缓存、引擎目录、userData、logs）。

### Download

- UGC：`GET /x/player/wbi/playurl`（Wbi，`fnval=4048`，`fourk=1`），`code !== 0` 抛错。
- OGV：`GET /pgc/player/web/playurl`，有则带 `ep_id`；载荷可能是 `result` 或 `data`。
- 收藏 `medias.page` 是 **分 P 数**，不是 cid。入队前走 `GET /x/player/pagelist?bvid=`（`services/video.ts`）；空列表报错，**禁止**回退 `view.data.cid`。番剧用分集 `cid` + `epId`。
- qn 集合：`[16, 32, 64, 80, 112, 116, 120]`（`src/shared/download.ts`）。`download:qualities` 用 `qn=120` 探测，`extractDownloadQns` **并集** `dash.video[].id` + `accept_quality` + `support_formats[].quality` + `quality`，再滤到上述集合。只看 dash 会漏 116/120。
- 默认选档：`pickPreferredDownloadQn`（不超过设置偏好的最高档；全高于偏好则取该片最高）。真正拉流：`pickDashVideo`（`id` ≤ 请求 qn，再按编码排序，**禁止** `dash.video[0]`）。音频：`pickDashAudio` 优先 AAC `id <= 30280`。渲染进程按 `kind:bvid:cid:epId` 缓存。
- 任务键 `bvid + cid`，一行一分 P。DASH 经 `HttpClient.downloadFile`，合成复用 `ComposEngine.mergeFiles`。事件带 `cid`。
- 暂停仅内存：保留半成品，`Range` 续传；重试刷新 playurl。退出后残留 `downloading` 对账为 `interrupted`。`runtime.busy` 防止 pause/resume 双入队。`download:cancel` 中止传输、杀 MP4Box、删临时目录。
- 历史：`userData/downloads.db`，PK `(bvid, cid)`。删除默认只清记录，`deleteFile` 需 `assertAllowedPath`。封面 URL 要持久化。启动对账：`downloading` → `interrupted`；完成但文件没了 → `missing`；文件回来 → `completed`。

下载与转换的引擎、队列、数据库 **不要合并**，只共用 MP4Box 合成。

### Convert

`convert:prescan`：对账产物 + 扫缓存；已 `completed`/`skipped` 跳过，其余 upsert `scanned`，清掉过期 scanned。窗口打开后后台跑一遍（`prescanOnStartup` → `convert:prescan:done`）。

`convert:run` 处理 `scanned` / `failed` / `interrupted` / `missing`。本机缓存页扫描 = `scanAndConvert`（prescan，有 pending 再 run）。仅 scanned 的条目留在片库，**不进任务列表**，直到开始转换。

`ComposEngine` 发 `convert:item:start/progress/end`（及 start/ready/broke/success），**自己写** `ConvertHistoryStore`（`bvid` PK）。`Application` 只转发。`store/convert.ts` 合并 live + 历史。`scanned` 不是运行中任务。

### Library / tasks（勿回退）

片库：收藏 / 追番 / 追剧 / 本机缓存。未登录落在 **缓存**。前三项要登录，缓存不要。浏览壳共用 `LibraryBrowser` + `useCollectionSource`，不要再拆一套。

预览 `LibraryPreviewPanel`：UGC 与番剧同一套分集列表（单 P 一行、无全选）。默认 **不选**。高亮边框选中，不用 checkbox。下载中 / 已完成不可选。每行播放图标；进行中只显示下载图标，**片库不显示进度**。底栏固定高：清晰度 + 下载在未选时 **禁用仍显示**（单 P 全下完可藏下载区）。「全选未下载」仅总分集 > 1 且还有可选；全下完隐藏全选。标题可写 `已下载 xxP / 共 xxP`（番剧用「话」）。多 P 全下完 **不要** 底栏播放。右侧加载用等尺寸骨架，不要改回转圈文字。

任务：下载 + 转换同一列表（全部 / 进行中 / 已完成）。转换 `scanned` 排除；失败/中断/缺失算已完成。下载进行中用扁平 `ProgressCapsule`；转换用圆形状态标，不用胶囊。完成态：播放 / 打开位置 / 删除（默认只删记录）。取消进行中下载另确认。

### Login

二维码状态在 `store/qrLogin.ts`，不在对话框里。180s TTL。关掉登录窗 **不要** 作废有效码；`ensureQr` 复用未过期会话。过期不自动刷新，用户点了再换。成功：`persist-cookie`、写 `user-info`、重置会话、清空 library store。

### Persistence

- electron-store：`user-info`、`convert-config`、`download-config`、`open-at-login`、`auto-hide-window`、`bind-close-to-hide`、`log-level`。没有收藏夹缓存（`favorites-data` 已删）。
- sqlite：`userData/downloads.db`、`userData/converts.db`。

### Renderer

Vue 3 + Pinia + vue-router **memory history** + Tailwind v4 + shadcn-vue（Reka UI）。组件自动导入 `src/components`、`src/layout`。主题 `styles/base.css`（仅深色、粉主色）。变体 CSS **内联** `shadcn-variants.css`，不要走 CDN。加组件：`pnpm dlx shadcn-vue@latest add <component>`。

页面：`library/{index,created,follow,cache}`（follow 兼追番/追剧）、`tasks/{index,list}` + `unified.ts`、`setting/{index,normal,convert,download}`（共用 PathField / ConcurrentSelect / ClearHistoryRow）、About 在设置下。Store：`auth`、`download`、`convert`、`library`、`preference`、`update`、`qrLogin`。B 站 HTTP 经 `http-get` IPC。禁止把页内图片拖出。

### Build gotchas

- 主进程 `externalizeDeps.exclude: ['electron-store', 'got']`，必须打进包。
- 仅 `serve`：Vue DevTools + CSP 放行 `'unsafe-inline'`。
- `postinstall`：`electron-builder install-app-deps`。`extra/` 二进制保持可执行，文件名对上 `ENGINE_BIN_MAP`。
- darwin MP4Box：本地静态 arm64 GPAC v26.07.0。重建：`./configure --static-bin --use-zlib=no --disable-curl --disable-nghttp2 && make -j4`。linux/win32 来源未核实，哈希见 `THIRD_PARTY_NOTICES.md`。
- macOS 自动更新需要 **zip**（`latest-mac.yml`），`electron-builder.yml` 必须同时有 dmg 和 zip。安装包未签名：darwin 发现更新只开 GitHub 下载页（`update:manual-download`），Win/Linux 仍自动更新。`dev-app-update.yml` 是占位。
- 未打包时 `userData` 指到 `bilimux-dev`，避免和正式版档案冲突。

## Style

Prettier：单引号、**无分号**、`printWidth: 120`、`trailingComma: 'none'`、`arrowParens: 'avoid'`。ESLint flat；Vue SFC 的 `<script>` 必须 `lang="ts"`。缩进 2 空格，LF。

## External references

**改 B 站接口先对文档，不要凭记忆编 URL / 参数 / 错误码。** 本地 `/Users/codyw/GitWork/bilibili-API-collect`（[SocialSisterYi/bilibili-API-collect](https://github.com/SocialSisterYi/bilibili-API-collect)）。

1. 先读该仓库 `AGENTS.md`（任务对照、鉴权、已失效路径）。
2. 再读对应 `docs/**/*.md`，以文档地址和参数表为准。
3. 标明已失效的不要用；优先 `/wbi/` 新地址。

CC-BY-NC 4.0，仅学习测试，不是官方开放平台。
