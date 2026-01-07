<div align="center">
  <img src="build/bilimux.png" width="120" height="120" alt="BiliMux Logo" />
  <h1>BiliMux</h1>
  <p><b>高效、快速的 Bilibili 缓存音视频合并工具</b></p>
  <p>An Electron application with Vue and TypeScript</p>

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

## 📖 简介 | Introduction

**BiliMux** 是一款基于 Electron + Vue 3 开发的跨平台桌面应用，专为 Bilibili 用户设计。它可以自动扫描 Bilibili 客户端下载的缓存文件（音视频分离的 m4s 文件），并调用高性能的 MP4Box 工具将其无损合并为通用的 MP4 格式，方便本地收藏与播放。

## ✨ 功能特性 | Features

- **⚡️ 高效合并**: 内置 MP4Box 引擎，实现无损、快速的音视频流混流。
- **🔍 智能扫描**: 自动识别并扫描 Bilibili 缓存目录，批量处理任务。
- **🎨 现代界面**: 基于 UnoCSS 和 PrimeVue 构建的现代化 UI，支持深色模式。
- **🔄 自动更新**: 集成 Electron-Updater，支持应用内自动检查并更新版本。
- **🛠 灵活配置**: 支持自定义缓存目录、输出目录及日志管理。
- **💻 跨平台**: 支持 Windows, macOS 和 Linux。

## 🛠 技术栈 | Tech Stack

本项目采用现代化的前端技术栈构建：

- **Core**: [Electron](https://www.electronjs.org/), [TypeScript](https://www.typescriptlang.org/)
- **Framework**: [Vue 3](https://vuejs.org/), [Vite](https://vitejs.dev/)
- **UI/Styling**: [UnoCSS](https://unocss.dev/), [PrimeVue](https://primevue.org/)
- **State Management**: [Pinia](https://pinia.vuejs.org/)
- **Tooling**: [Electron-Builder](https://www.electron.build/), [ESLint](https://eslint.org/), [Prettier](https://prettier.io/)
- **Media Engine**: [GPAC / MP4Box](https://gpac.wp.imt.fr/mp4box/)

## 🚀 快速开始 | Getting Started

### 安装 | Installation

请前往 [Releases](https://github.com/W-David/bilimux/releases) 页面下载适合您系统的最新安装包。

### 开发 | Development

如果您想参与开发或自行构建，请按照以下步骤操作：

#### 1. 环境准备

确保您的系统已安装 [Node.js](https://nodejs.org/) 和 [pnpm](https://pnpm.io/)。

#### 2. 克隆项目

```bash
git clone https://github.com/W-David/bilimux.git
cd bilimux
```

#### 3. 安装依赖

```bash
pnpm install
```

#### 4. 启动开发模式

```bash
pnpm dev
```

#### 5. 构建应用

```bash
# 构建 Windows 版本
pnpm build:win

# 构建 macOS 版本
pnpm build:mac

# 构建 Linux 版本
pnpm build:linux
```

## ⚙️ 推荐 IDE 设置 | Recommended IDE Setup

- [VSCode](https://code.visualstudio.com/)
- 插件:
  - [ESLint](https://marketplace.visualstudio.com/items?itemName=dbaeumer.vscode-eslint)
  - [Prettier](https://marketplace.visualstudio.com/items?itemName=esbenp.prettier-vscode)
  - [Vue - Official (Volar)](https://marketplace.visualstudio.com/items?itemName=Vue.volar)

## 📄 许可证 | License

本项目基于 [MIT License](LICENSE) 开源。

## 👨‍💻 作者 | Author

**rushwang**

- Email: <cooody@163.com>
- Github: [@W-David](https://github.com/W-David)
