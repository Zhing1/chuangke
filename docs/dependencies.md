# 依赖关系说明

- 后端依赖（package.json）：
  - `express@^4.18.2`
  - `cors@^2.8.5`
  - `body-parser@^1.20.2`
  - `axios@^1.6.0`
  - 开发：`nodemon@^3.0.1`

- 前端 CDN 依赖（index.html）：
  - `bootstrap@5.3.0`
  - `font-awesome@6`
  - `animejs@3.2.1`
  - `@mediapipe/pose@0.5.1675469404`
  - `@mediapipe/camera_utils@0.3.1640029074`
  - `@mediapipe/drawing_utils@0.3.1620248257`
  - `Coze Web SDK@1.2.0-beta.19`

- 健身模块（子页）CDN 依赖：
  - `tailwindcss CDN`
  - `p5.js@1.7.0`
  - `echarts@5.4.3`
  - 同步使用 `animejs` 与 MediaPipe 相关库

- 注意事项：
  - `Coze` 需要配置 `bot_id` 与 `token`，不应硬编码敏感密钥。
  - MediaPipe 通过 CDN 加载，无需本地安装。
