# 架构设计

- 概览：
  - 前端静态资源位于 `public/`，入口为 `public/index.html`
  - 业务脚本位于 `public/js/app.js`
  - 健身小游戏模块通过 `server` 挂载为静态目录 `/fitness_game`，源位于 `OKComputer_姿态捕捉节奏健身(第二版)`
  - 后端服务位于 `server/server.js`，提供新闻、医疗资讯与图片生成接口

```mermaid
flowchart LR
  A[客户端浏览器] -->|HTTP| B[Express Server]
  B --> C[public/index.html]
  C --> D[public/js/app.js]
  C --> E[/fitness_game/camera-stabilizer.js]
  C --> F[/fitness_game/camera-game-final.js]
  D --> G[/api/news]
  D --> H[/api/medical-info]
  D --> I[/api/generate-image]
  C --> J[Coze Web SDK]
```

- 模块关系：
  - `app.js` 负责页面路由、新闻加载、医疗信息渲染
  - `camera-game-final.js` 负责摄像头健身训练逻辑
  - `camera-stabilizer.js` 提供骨架渲染与性能稳定支持
  - `server.js` 提供 REST API 与静态资源服务
