<div align="center">
  <img src="build/bilimux.png" width="120" height="120" alt="BiliMux Logo" />
  <h1>BiliMux</h1>
  <p><b>高效、快速的 Bilibili 缓存音视频合并工具</b></p>

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

**BiliMux** 是一款基于 Electron 开发的跨平台桌面应用。可以自动扫描 Bilibili 客户端下载的缓存文件（音视频分离的 m4s 文件），调用 MP4Box 工具合并为通用的 MP4 格式。

## ✨ 功能特性 | Features

- **⚡️ 高效合并**: 内置 MP4Box 引擎，实现无损、快速的音视频流混流。
- **🔍 智能扫描**: 自动识别并扫描 Bilibili 缓存目录，批量处理任务。
- **🎨 现代界面**: 基于 UnoCSS 和 PrimeVue 构建的现代化 UI，目前只有深色模式。
- **💻 跨平台**: 支持 Windows, macOS 和 Linux。

## 🛠 技术栈 | Tech Stack

本项目采用现代化的前端技术栈构建：

- **Core**: [Electron](https://www.electronjs.org/), [TypeScript](https://www.typescriptlang.org/)
- **Framework**: [Vue 3](https://vuejs.org/), [Vite](https://vitejs.dev/)
- **UI/Styling**: [UnoCSS](https://unocss.dev/), [PrimeVue](https://primevue.org/)
- **State Management**: [Pinia](https://pinia.vuejs.org/)
- **Code Format and Lint**: [Prettier](https://prettier.io/), [ESLint](https://eslint.org/)
- **Media Engine**: [GPAC / MP4Box](https://gpac.io/)
- **Package Manager**: [pnpm](https://pnpm.io/)

## 🚀 快速开始 | Getting Started

### 安装 | Installation

请前往 [Releases](https://github.com/W-David/bilimux/releases) 页面下载适合您系统的最新安装包：

- Windows：x64 NSIS 安装包（`.exe`）
- macOS：Apple Silicon（arm64）DMG
- Linux：AppImage 与 deb

### MAC报错应用已损坏

#### 原因

macOS 默认只信任 App Store 下载的应用或拥有“已识别开发者”签名的应用。对于未签名或未公证的应用，macOS 会直接拦截。

#### 解决

你可以手动移除该应用的“隔离属性”，先将应用拖入“应用程序”文件夹，然后在终端运行此命令。

```bash
sudo xattr -r -d com.apple.quarantine /Applications/BiliMux.app
```

### 开发 | Development

如果您想参与开发或自行构建，请按照以下步骤操作：

#### 1. 环境准备

确保您的系统已安装 [Node.js >= v22](https://nodejs.org) 和 [pnpm >= 11](https://pnpm.io/)（项目使用 `pnpm@11.18.0`）。

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

#### 6. 代码检查与类型检查

```bash
pnpm lint       # ESLint
pnpm typecheck  # TypeScript + vue-tsc
```

## License

本项目基于 [MIT License](LICENSE) 开源。

## About Me

**rushwang**

- Email: <cooody@163.com>
- Github: [@W-David](https://github.com/W-David)
