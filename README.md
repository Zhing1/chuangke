# 医疗健康平台

这是一个综合性的医疗健康平台，集成了AI医疗科普、AI体感健身游戏、AI菜品识别和健康打卡功能。

## 功能特点

1. **AI体感健身游戏** - 基于MediaPipe的实时姿态捕捉，支持深蹲、开合跳等动作检测，包含实时评分和卡路里计算。
2. **AI菜品识别** - 集成百度云AI，上传食物图片自动识别并估算卡路里与营养成分。
3. **智能健康助手** - 集成Coze AI Agent，提供智能医疗咨询对话服务。
4. **居家健身打卡** - 每日健身打卡系统，包含连续打卡统计和可视化日历。
5. **医疗科普** - 动态更新的医疗资讯和健康小贴士。
6. **排行榜系统** - 记录并展示健身游戏的高分记录。

## 技术栈

- **前端**: HTML5, CSS3, JavaScript, Bootstrap 5
- **后端**: Node.js, Express.js
- **AI/ML**: 
  - MediaPipe (姿态识别)
  - 百度云AI (图像识别)
  - Coze SDK (智能对话)
  - Liblib API (AI绘图支持)

## 安装与运行

### 前置要求

- Node.js (v14或更高版本)
- npm

### 安装步骤

1. 克隆项目到本地
2. 安装依赖:
   ```bash
   npm install
   ```

### 运行项目

1. 启动服务器:
   ```bash
   npm start
   ```

2. 在浏览器访问:
   ```
   http://localhost:3000
   ```

## 项目结构

```
chuangke/
├── public/                 # 静态资源目录
│   ├── css/                # 全局样式
│   ├── js/                 # 前端逻辑
│   ├── fitness_game/       # 健身游戏专用资源
│   └── index.html          # 入口页面
├── server/                 # 后端服务
│   └── server.js           # Express服务器与API接口
├── config/                 # 配置文件
├── docs/                   # 项目文档
├── data/                   # 数据持久化存储
├── package.json            # 项目配置
└── README.md               # 项目说明
```

## API接口说明

- **AI菜品识别**: `POST /api/analyze-food`
- **Coze Token获取**: `POST /api/coze/token`
- **用户行为统计**: `GET /api/ux-summary`
- **医疗资讯获取**: `GET /api/medical-info`

## 注意事项

1. **摄像头权限**: 健身游戏需要浏览器摄像头权限，请确保在HTTPS或Localhost环境下运行。
2. **API密钥**: 百度云API和Coze API密钥配置在服务器端，请确保`server.js`中配置正确。
3. **数据存储**: 用户打卡和排行榜数据存储在本地文件系统(`data/`)和浏览器LocalStorage中。

## 许可证

ISC
