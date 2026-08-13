# PinDo 📌

> 极简、常驻置顶、不占任务栏空间的桌面悬浮待办便签工具。

<p align="center">
  <a href="https://github.com/AuCf/pindo/stargazers"><img src="https://img.shields.io/github/stars/AuCf/pindo?style=for-the-badge&logo=github&color=38bdf8" alt="GitHub Stars"></a>
  <a href="https://github.com/AuCf/pindo/network/members"><img src="https://img.shields.io/github/forks/AuCf/pindo?style=for-the-badge&logo=github&color=818cf8" alt="GitHub Forks"></a>
  <a href="https://github.com/AuCf/pindo/releases"><img src="https://img.shields.io/github/downloads/AuCf/pindo/total?style=for-the-badge&logo=github&color=10b981" alt="GitHub Downloads"></a>
  <a href="https://github.com/AuCf/pindo/blob/main/LICENSE"><img src="https://img.shields.io/github/license/AuCf/pindo?style=for-the-badge&color=f59e0b" alt="License"></a>
</p>

<p align="center">
  🌐 <b>官方网站 & 智能离线下载</b>：<a href="https://aucf.github.io/pindo/" target="_blank">https://aucf.github.io/pindo/</a>
</p>

<p align="center">
  <img src="./docs/preview.png" alt="PinDo 悬浮界面预览" width="380" style="border-radius: 18px; box-shadow: 0 20px 40px rgba(0,0,0,0.15);" />
</p>

基于 **Tauri 2.0 + React 19 + SQLite** 开发，专为程序员、独立开发者与办公人群打造。随手记、随时勾选今天任务、规划明天计划，不打扰主工作流。

---

## ✨ 核心特性

- 🚫 **无任务栏图标 (Skip Taskbar)**：窗口运行与最小化时，完全不在 Windows 系统任务栏及 `Alt + Tab` 列表中占用空间，保持系统桌面极简。
- 📌 **常驻置顶 (Always on Top)**：固定悬浮在所有应用（如 IDE、浏览器、文档）最上方，支持一键开关置顶。
- 🔒 **锁定保护模式 (Lock Mode)**：一键锁定，隐去控制按键与拖拽响应，防止工作或输入代码时误触、误拖动。
- ↕️ **一键折叠迷你胶囊 (Collapse Mode)**：双击标题栏或点击折叠按钮，窗口瞬间收起为 **42px 微型条**（并显示今日未完成数），再次双击即可展开。
- 🎚️ **透明度调节 (Opacity Control)**：支持 30% ~ 100% 不透明度自由滑动调节。
- 📝 **今日待办 (Today's Checklist)**：
  - 极简成就进度条（实时统计完成百分比与已完成数量）。
  - 支持紧急度标记（🔴紧急 / 🟡普通 / 🔵次要）。
  - 双击任务文本直接原地内联编辑。
  - 完成打勾中划线淡出动画，支持“一键清空已完成”与“未完成推迟至明日”。
- 🗓️ **明日计划 (Tomorrow's List)**：提前规划次日工作，支持晨间“一键导入至今日”。
- 💡 **随手记 (Quick Notes)**：临时粘贴代码片段、网址或灵感备忘，自带字数/行数统计与一键复制。
- 🔔 **系统托盘 (System Tray)**：驻留桌面右下角托盘，单击或右键快捷菜单可随时显示/隐藏窗口或退出。
- 💾 **SQLite 原生持久化 (`pindo.db`)**：所有任务、备忘与窗口偏好（折叠高度、置顶状态、透明度）自动写盘存储，重启零丢失。
- 🚀 **开机自启 (Autostart)**：内置开机自启开关，系统启动时自动后台驻留托盘。

---

## 🛠️ 技术栈详情 (Tech Stack)

| 层级 / 模块 | 技术选型 | 功能说明 |
| :--- | :--- | :--- |
| **桌面壳底层** | **Tauri 2.0 (Rust)** | 安装包体积小于 3MB，极速启动 |
| **前端框架** | **React 19 + Vite 7** | 高性能 UI 交互与构建 |
| **图标库** | **Lucide React** | 简洁现代图标组件 |
| **数据库/存储** | **SQLite (`@tauri-apps/plugin-sql`)** | 本地原生硬核数据持久化 |
| **系统集成** | **`tauri-plugin-autostart`** | Windows 开机自启驻留 |
| **托盘组件** | **Tauri TrayIconBuilder** | 右下角系统托盘与右键菜单 |
| **云端 CI/CD** | **GitHub Actions Matrix** | 自动并行编译 Windows、Mac Arm64 及 Mac x64 安装包 |

---

## 📥 官网与全平台下载

- 🌐 **PinDo 官方网页**：[https://aucf.github.io/pindo/](https://aucf.github.io/pindo/) （打开自动识别您的操作系统）
- 📦 **GitHub Releases 最新发布**：[https://github.com/AuCf/pindo/releases/latest](https://github.com/AuCf/pindo/releases/latest)

---

## 🚀 快速本地开发

```bash
# 1. 安装依赖
npm install

# 2. 启动开发模式
npm run tauri dev

# 3. 生产环境编译打包
npm run tauri build
```

---

## 📄 开源协议

[MIT License](LICENSE)
