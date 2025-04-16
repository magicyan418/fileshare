# P2P文件共享应用

一个基于Next.js和PeerJS的P2P文件共享Web应用，支持在浏览器中直接进行点对点文件传输，无需服务器中转。

## 功能特点

- 🔒 安全的P2P文件传输，数据直接在两个浏览器之间传输
- 🆔 自动生成6位随机ID，方便快速连接
- 📋 一键复制ID到剪贴板
- 🎯 实时显示连接状态和传输进度
- 📱 响应式设计，支持移动端和桌面端
- 🌓 支持深色模式

## 技术栈

- [Next.js](https://nextjs.org/) - React框架
- [PeerJS](https://peerjs.com/) - WebRTC封装库
- [TailwindCSS](https://tailwindcss.com/) - CSS框架
- [Radix UI](https://www.radix-ui.com/) - UI组件库

## 快速开始

1. 克隆项目

```bash
git clone <your-repo-url>
cd fileshare-nextjs
```

2. 安装依赖

```bash
npm install
```

3. 启动开发服务器

```bash
npm run dev
```

4. 在浏览器中打开 [http://localhost:3000](http://localhost:3000)

## 使用说明

1. 打开应用后，系统会自动为你生成一个6位ID
2. 将你的ID分享给对方
3. 对方在输入框中输入你的ID
4. 连接建立后，你可以通过拖拽或点击选择要传输的文件
5. 点击"发送文件"按钮开始传输

## 开源协议

MIT License
