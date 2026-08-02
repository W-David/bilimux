# PNPM 11 迁移方案（已执行版）

> 分支：`codex/pnpm-migration`（基于 `dev` 创建）
> 状态：配置迁移 + 重装依赖 + 验证已完成，待人工检查后提交

## 一、背景

- 项目原依赖由 pnpm 10 管理，全局 pnpm 已升级到 11.13.0。
- pnpm 11 认为旧 `node_modules` 布局已过期，需要清空重装；非交互环境下会自动中止：
  `ERR_PNPM_ABORTED_REMOVE_MODULES_DIR_NO_TTY`。
- pnpm 11 的破坏性变更：
  - 不再读取 `package.json` 中的 `pnpm` 字段；
  - 不再读取 `.npmrc` 中除 registry/认证外的配置；
  - `onlyBuiltDependencies` 合并为 `pnpm-workspace.yaml` 的 `allowBuilds` 映射。

## 二、已执行步骤

### 1. 创建迁移分支

```bash
git checkout -b codex/pnpm-migration
```

### 2. 配置迁移

| 文件 | 改动 |
| --- | --- |
| `pnpm-workspace.yaml`（新增） | `allowBuilds: { electron: true, esbuild: true }`、`shamefullyHoist: true`、`pmOnFail: ignore`（本地 pnpm 版本与 packageManager 不一致时直接使用本地版本，不触发自动下载切换） |
| `package.json` | 新增 `"packageManager": "pnpm@11.18.0"`（11.13.0 已被 npm 标记为 broken 版本，故直接升到最新 11.x）；删除整个 `pnpm.onlyBuiltDependencies` 字段 |
| `.npmrc` | 删除 `shamefully-hoist=true`；保留两条 electron 镜像配置 |

`pnpm-lock.yaml` 无变化（lockfileVersion 9.0 与 pnpm 11 兼容）。

### 3. 清理旧环境

```bash
rm -rf node_modules .pnpm-store
```

`.pnpm-store/` 是之前沙箱内失败安装产生的 8K 本地缓存（仅 index.db + 空 files 目录），已删除；正常安装使用全局 store，不依赖它。

### 4. 重装依赖

```bash
pnpm install
```

结果：

- pnpm v11.13.0 安装成功，720 个包，耗时约 5m40s；
- `allowBuilds` 生效，esbuild、electron 的 postinstall 均执行成功；
- electron 38.7.1 二进制下载完成；
- `electron-builder install-app-deps` 执行成功；
- 全程无 `ERR_PNPM_ABORTED_REMOVE_MODULES_DIR_NO_TTY`、无配置忽略警告。

### 5. 验证

| 检查项 | 结果 |
| --- | --- |
| `pnpm typecheck`（node + web） | ✅ 通过 |
| `pnpm lint` | ✅ 通过 |
| `node_modules/electron/dist/Electron.app` 二进制存在 | ✅ |

## 三、待办检查项

- [ ] 人工检查 `git diff`（改动仅 3 个文件：新增 `pnpm-workspace.yaml`，修改 `package.json`、`.npmrc`）
- [ ] 提交到 `codex/pnpm-migration`
- [ ] 可选：手动跑一次 `pnpm dev` 确认窗口正常启动
- [ ] 确认 electron 镜像配置是否仍生效（本次安装成功，但不能确定走的是 npmmirror 还是 GitHub；若后续 electron 下载慢，用 `ELECTRON_MIRROR=https://npmmirror.com/mirrors/electron/` 环境变量重装）
- [ ] 推送分支，CI 验证通过后合回 `dev`

## 四、回滚方案

```bash
git checkout dev
git branch -D codex/pnpm-migration
git checkout -- package.json .npmrc   # 若已提交则用 git revert 或 reset
rm -rf node_modules
pnpm install                          # 使用 pnpm 10 或 11 均可重新安装
```

配置改动均可通过 git 恢复，`node_modules` 可随时重装，风险点仅剩 electron 二进制下载（国内网络）。
