<div align="center">
  <img src="build/bilimux.png" width="120" height="120" alt="BiliMux Logo" />
  <h1>BiliMux</h1>
  <p><b>B 站缓存视频一键转 MP4 · 收藏夹视频直接下载</b></p>

  <p>
    <a href="https://github.com/W-David/bilimux/releases">
      <img src="https://img.shields.io/github/v/release/W-David/bilimux?style=flat-square" alt="Release" />
    </a>
    <a href="https://github.com/W-David/bilimux/blob/main/LICENSE">
      <img src="https://img.shields.io/github/license/W-David/bilimux?style=flat-square" alt="License" />
    </a>
  </p>
</div>

---

## 简介

BiliMux 是一款基于 Electron 的跨平台桌面应用，帮你把 B 站视频从“缓存”变成真正属于自己的文件：

- **转换**：自动扫描 Bilibili 客户端的缓存文件（音视频分离的 m4s），调用内置 MP4Box 合并成通用的 MP4。
- **下载**：扫码登录后浏览自己的收藏夹，一键下载视频，并自动合成 MP4。

## 功能特性

- ⚡ **缓存转 MP4**：自动扫描缓存目录，批量识别、批量合成，全程无需手动处理文件。
- 📥 **收藏夹下载**：B 站扫码登录，浏览收藏夹，点击即可下载视频。
- 🚀 **并行下载**：下载任务数可在 1–16 之间调整，多任务下载更快。
- ⏸ **暂停与继续**：下载支持暂停、断点续传，失败时自动尝试备用地址。
- 🗂 **转换与下载历史**：随时查看历史记录，也可一键清空。
- 🖥 **系统托盘**：关闭窗口自动隐藏到托盘，随时恢复或退出。
- 🎨 **现代化深色界面**：全新交互设计，操作更顺手。
- 💻 **跨平台**：支持 Windows（x64）、macOS（Apple Silicon）和 Linux。

## 下载安装

前往 [Releases](https://github.com/W-David/bilimux/releases) 下载适合你平台的安装包：

| 平台                   | 安装包                |
| ---------------------- | --------------------- |
| Windows（x64）         | NSIS 安装包（`.exe`） |
| macOS（Apple Silicon） | DMG（`.dmg`）         |
| Linux                  | AppImage 与 deb       |

> macOS 首次打开提示“已损坏”时，这是未签名应用的正常提示。先把应用拖入“应用程序”文件夹，然后在终端执行：
>
> ```bash
> sudo xattr -rd com.apple.quarantine /Applications/BiliMux.app
> ```

## 技术栈

Electron · Vue 3 · TypeScript · electron-vite · Pinia · Tailwind CSS v4 · shadcn-vue · MP4Box（GPAC）· pnpm

## 开发

需要 Node.js >= 22 与 pnpm >= 11。

```bash
# 安装依赖
pnpm install

# 开发模式（热更新）
pnpm dev

# 代码检查与类型检查
pnpm lint
pnpm typecheck

# 构建
pnpm build
pnpm build:mac   # macOS
pnpm build:win   # Windows
pnpm build:linux # Linux
```

## License

本项目基于 [MIT License](LICENSE) 开源。

## About Me

**rushwang** · [@W-David](https://github.com/W-David) · <cooody@163.com>
