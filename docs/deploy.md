# 部署配置指南

- 前提：
  - Node.js 16+
  - 本地或服务器端口开放 `3000`

- 安装依赖：
  - `npm install`

- 启动服务：
  - 开发：`npm run dev`
  - 生产：`npm start`

- 静态资源：
  - 入口页面：`public/index.html`
  - 健身模块：`/fitness_game`（由 `OKComputer_姿态捕捉节奏健身(第二版)` 挂载为静态目录）

- 环境变量：
  - `COZE_TOKEN`：Coze Web SDK 授权令牌（避免在前端硬编码）
  - 可在 `public/index.html` 中通过占位符注入，或后续在服务端渲染中添加读取逻辑。

- 安全：
  - 不在代码仓库中保存任何敏感密钥。
  - 服务器日志避免输出访问密钥与签名内容。
