const express = require('express');
const path = require('path');
const cors = require('cors');
const axios = require('axios');
const bodyParser = require('body-parser');
const crypto = require('crypto');
const fs = require('fs');
const { getJWTToken } = require('@coze/api');
// Baidu dish recognition integration (AI菜品识别)
let ACCESS_TOKEN = '';
const BAIDU_AK = 'rkNEmJnCPhFMQ20TBoYaW2vy';
const BAIDU_SK = 'stFF6z23RHxuutRWLypC21nmgZ1vk6Ob';
let BAIDU_DEMO_MODE = false;

async function getBaiduAccessToken() {
    try {
        if (!BAIDU_AK || !BAIDU_SK) { BAIDU_DEMO_MODE = true; return; }
        const response = await axios.get(`https://aip.baidubce.com/oauth/2.0/token`, {
            params: { grant_type: 'client_credentials', client_id: BAIDU_AK, client_secret: BAIDU_SK }
        });
        ACCESS_TOKEN = response.data.access_token || '';
        BAIDU_DEMO_MODE = !ACCESS_TOKEN;
        setTimeout(getBaiduAccessToken, 86400000); // Refresh every 24 hours
    } catch (error) {
        BAIDU_DEMO_MODE = true;
        setTimeout(getBaiduAccessToken, 5000);
    }
}

async function callBaiduDishAPI(imageBase64) {
    const url = `https://aip.baidubce.com/rest/2.0/image-classify/v2/dish?access_token=${ACCESS_TOKEN}`;
    const form = new URLSearchParams();
    form.append('image', imageBase64);
    form.append('top_num', '5');
    form.append('filter_threshold', '0.7');
    form.append('with_calorie', '1');
    const resp = await axios.post(url, form, { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } });
    return resp.data;
}

async function callBaiduNutritionAPI(foodName) {
    const url = `https://aip.baidubce.com/rest/2.0/image-classify/v1/nutrition?access_token=${ACCESS_TOKEN}`;
    const form = new URLSearchParams();
    form.append('food', foodName);
    try {
        const resp = await axios.post(url, form, { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } });
        return resp.data;
    } catch (e) { return null; }
}
const liblibConfig = require('../config/liblib-config');

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_DIR = path.join(__dirname, '..', 'data');
const EVENTS_FILE = path.join(DATA_DIR, 'ux-events.jsonl');
const COZE_API_BASE = 'https://api.coze.cn';
const COZE_APP_ID = '1117620483712';
const COZE_KEY_ID = 'HYb1xqhswgx28LrIpR6eufUjti0kLbtZWXNJ9crQuXA';

// 实现随机字符串生成函数
function stringRandom(length) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}

// 根据官方示例实现的Liblib API签名生成函数
function generateLiblibSignature(url, secretKey) {
    const timestamp = Date.now().toString(); // 当前时间戳
    const signatureNonce = Math.random().toString(36).substring(2, 18); // 16位随机字符串
    
    // 原文 = URL地址 + "&" + 时间戳 + "&" + 随机字符串
    const str = `${url}&${timestamp}&${signatureNonce}`;
    
    // 使用HMAC-SHA1生成签名
    const hash = crypto.createHmac('sha1', secretKey)
        .update(str)
        .digest('base64');
    
    // 最后一步：生成安全字符串
    const signature = hash
        .replace(/\+/g, "-")
        .replace(/\//g, "_")
        .replace(/=+$/, "");
    
    return {
        signature,
        timestamp,
        signatureNonce
    };
}

// 中间件
app.use(cors());
app.use(bodyParser.json({ limit: '5mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '5mb' }));
app.use(express.static(path.join(__dirname, '..', 'public')));
// app.use('/fitness_game', express.static(path.join(__dirname, '..', 'OKComputer_姿态捕捉节奏健身(第二版)'))); // Moved to public/fitness_game
try { fs.mkdirSync(DATA_DIR, { recursive: true }); } catch(e) {}

// 模拟医疗新闻数据
const medicalNewsData = [
    {
        id: 1,
        title: "新型疫苗研发取得重大突破",
        content: "科学家们最近开发出一种新型疫苗，能够有效预防多种病毒感染，预计将在明年进入临床试验阶段。这项研究成果发表在《自然医学》期刊上，引起了医学界的广泛关注。",
        date: "2023-11-15",
        image: "https://picsum.photos/seed/news1/400/250.jpg",
        source: "医学前沿"
    },
    {
        id: 2,
        title: "研究发现：规律运动可降低心脏病风险",
        content: "最新研究表明，每周进行至少150分钟的中等强度运动，可以显著降低心脏病的发病风险。研究团队跟踪了5000名参与者长达10年，发现规律运动的人群心脏病发病率降低了30%。",
        date: "2023-11-14",
        image: "https://picsum.photos/seed/news2/400/250.jpg",
        source: "健康日报"
    },
    {
        id: 3,
        title: "健康饮食指南更新：减少加工食品摄入",
        content: "世界卫生组织更新了健康饮食指南，建议人们减少加工食品的摄入，增加天然食物的比例。指南指出，过度摄入加工食品与多种慢性疾病风险增加有关。",
        date: "2023-11-13",
        image: "https://picsum.photos/seed/news3/400/250.jpg",
        source: "WHO"
    },
    {
        id: 4,
        title: "睡眠质量与免疫力关系研究",
        content: "一项新研究发现，高质量的睡眠对于维持免疫系统正常功能至关重要，成年人每晚应保证7-9小时的睡眠。研究还发现，睡眠不足会导致抗体产生减少，影响疫苗效果。",
        date: "2023-11-12",
        image: "https://picsum.photos/seed/news4/400/250.jpg",
        source: "睡眠医学"
    },
    {
        id: 5,
        title: "儿童青少年近视防控新策略",
        content: "教育部和国家卫健委联合发布儿童青少年近视防控新策略，建议每天户外活动不少于2小时，严格控制电子产品使用时间，并定期进行视力检查。",
        date: "2023-11-11",
        image: "https://picsum.photos/seed/news5/400/250.jpg",
        source: "教育健康"
    }
];

// 模拟排行榜数据
let leaderboardData = [
    { id: 1, player: "健康达人", score: 1500, date: "2023-11-15" },
    { id: 2, player: "运动健将", score: 1200, date: "2023-11-14" },
    { id: 3, player: "医疗专家", score: 1000, date: "2023-11-13" },
    { id: 4, player: "养生达人", score: 850, date: "2023-11-12" },
    { id: 5, player: "健康小白", score: 700, date: "2023-11-11" }
];

// API路由

// 获取医疗新闻
app.get('/api/news', (req, res) => {
    // 模拟API延迟
    setTimeout(() => {
        res.json({
            success: true,
            data: medicalNewsData
        });
    }, 800);
});

// 获取特定新闻详情
app.get('/api/news/:id', (req, res) => {
    const newsId = parseInt(req.params.id);
    const news = medicalNewsData.find(item => item.id === newsId);
    
    if (!news) {
        return res.status(404).json({
            success: false,
            message: "新闻不存在"
        });
    }
    
    res.json({
        success: true,
        data: news
    });
});

// 获取排行榜
app.get('/api/leaderboard', (req, res) => {
    // 按分数降序排序
    const sortedLeaderboard = [...leaderboardData].sort((a, b) => b.score - a.score);
    
    res.json({
        success: true,
        data: sortedLeaderboard
    });
});

// 提交游戏分数
app.post('/api/leaderboard', (req, res) => {
    const { player, score } = req.body;
    
    if (!player || score === undefined) {
        return res.status(400).json({
            success: false,
            message: "缺少必要参数"
        });
    }
    
    // 创建新记录
    const newEntry = {
        id: leaderboardData.length + 1,
        player: player,
        score: score,
        date: new Date().toISOString().split('T')[0]
    };
    
    // 添加到排行榜
    leaderboardData.push(newEntry);
    
    // 按分数降序排序
    leaderboardData.sort((a, b) => b.score - a.score);
    
    // 只保留前10名
    if (leaderboardData.length > 10) {
        leaderboardData = leaderboardData.slice(0, 10);
    }
    
    res.status(201).json({
        success: true,
        message: "分数已提交",
        data: newEntry
    });
});

// 查询图片生成状态 (GET版本)
app.get('/api/image-status/:generateUuid', async (req, res) => {
    try {
        const { generateUuid } = req.params;
        
        if (!generateUuid) {
            return res.status(400).json({
                success: false,
                message: "缺少生成UUID"
            });
        }
        
        // 生成签名
        const urlPath = '/api/generate/webui/status';
        const { signature, timestamp, signatureNonce } = generateLiblibSignature(urlPath, liblibConfig.secretKey);
        
        // 构建最终URL（只包含认证参数）
        const url = new URL(`https://openapi.liblibai.cloud${urlPath}`);
        // 添加认证参数
        url.searchParams.append('AccessKey', liblibConfig.accessKey);
        url.searchParams.append('Signature', signature);
        url.searchParams.append('Timestamp', timestamp);
        url.searchParams.append('SignatureNonce', signatureNonce);
        
        console.log('查询图片生成状态，请求URL:', url.toString());
        // 构建状态查询请求体
        const statusRequestBody = {
          generateUuid: generateUuid
        };
          
          // 发送状态查询请求
          const response = await axios.post(url.toString(), statusRequestBody, {
            timeout: 30000 // 30秒超时
          });
        
        console.log('图片状态查询响应:', JSON.stringify(response.data, null, 2));
        
          // 处理响应
          if (response.data && response.data.code === 0 && response.data.data) {
            // 检查是否有images数组且有有效图片
            if (response.data.data.images && response.data.data.images.some(img => img !== null)) {
              // 找到第一张非空图片
              const imageObj = response.data.data.images.find(img => img !== null);
              const imageUrl = imageObj.imageUrl; // 提取imageUrl属性
              console.log('获取到图片URL:', imageUrl);
              return res.json({
                success: true,
                data: {
                  url: imageUrl,
                  generateUuid: generateUuid
                }
              });
            } else {
              // 图片还在生成中
              console.log('图片还在生成中，稍后再试');
              return res.json({
                success: true,
                data: {
                  status: 'processing',
                  generateUuid: generateUuid,
                  message: '图片还在生成中，请稍后再试'
                }
              });
            }
          } else {
            throw new Error(`查询图片状态失败: ${response.data.msg || '未知错误'}`);
          }
    } catch (error) {
        console.error('查询图片生成状态失败:', error);
        res.status(500).json({
            success: false,
            message: "查询图片生成状态失败",
            error: error.message
        });
    }
});

// AI图片生成接口 (使用Liblib API)
app.post('/api/generate-image', async (req, res) => {
    try {
        const { prompt, negativePrompt, style } = req.body;
        
        if (!prompt) {
            return res.status(400).json({
                success: false,
                message: "缺少图片描述"
            });
        }
        
        
        
        // 准备请求参数 - 根据官方示例格式
        const requestData = {
            templateUuid: "e10adc3949ba59abbe56e057f20f883e",
            generateParams: {
                checkPointId: "d303ad58c0fc4c989b60351d5eac68e6",
                prompt: prompt,
                negativePrompt: negativePrompt || "ng_deepnegative_v1_75t,(badhandv4:1.2),EasyNegative,(worst quality:2)",
                sampler: 15,
                steps: 20,
                cfgScale: 7,
                width: 512,
                height: 512,
                imgCount: 1,
                randnSource: 0,
                seed: -1,
                restoreFaces: 0
            }
        };
        
        // 根据风格调整提示词
        if (style === 'cartoon') {
            requestData.generateParams.prompt += ', cartoon style, animated, illustration';
        } else if (style === 'realistic') {
            requestData.generateParams.prompt += ', photorealistic, high detail, realistic';
        }
        
        // 生成签名
        const urlPath = '/api/generate/webui/text2img';
        const { signature, timestamp, signatureNonce } = generateLiblibSignature(urlPath, liblibConfig.secretKey);
        
        // 构建最终URL（只包含认证参数）
        const url = new URL(`https://openapi.liblibai.cloud${urlPath}`);
        // 添加认证参数
        url.searchParams.append('AccessKey', liblibConfig.accessKey);
        url.searchParams.append('Signature', signature);
        url.searchParams.append('Timestamp', timestamp);
        url.searchParams.append('SignatureNonce', signatureNonce);
        
        // 调用Liblib API - 使用POST请求，参数放在请求体中
          console.log('调用Liblib API，请求URL:', url.toString());
          console.log('请求参数:', JSON.stringify(requestData, null, 2));
          
          const response = await axios.post(url.toString(), requestData, {
              headers: {
                  'Content-Type': 'application/json'
              },
              timeout: 60000 // 60秒超时
          });
          
          // 处理响应
        console.log('Liblib API响应:', JSON.stringify(response.data, null, 2));
        
        // 检查是否有任务ID（根据API文档）
        if (response.data.code === 0 && response.data.data && response.data.data.generateUuid) {
            const generateUuid = response.data.data.generateUuid;
            console.log('收到generateUuid，图片正在异步生成中:', generateUuid);
            
            // 返回包含generateUuid的响应，前端可以轮询状态
            res.json({
            success: true,
            data: {
                generateUuid: generateUuid,
                prompt: prompt,
                style: style || "cartoon"
            }
        });
        return;
        } else {
            throw new Error('获取任务ID失败: ' + JSON.stringify(response.data));
        }
    } catch (error) {
        console.error('生成图片失败:', error);
        
        // 如果API调用失败，返回错误信息而不是模拟图片
        console.error('Liblib API调用失败:', error.message);
        
        res.json({
            success: false,
            message: "生成图片失败: " + error.message,
            error: error.message
        });
    }
});

// 查询图片生成状态 (POST版本)
app.post('/api/generate-image/status', async (req, res) => {
    try {
        const { generateUuid } = req.body;
        
        if (!generateUuid) {
            return res.status(400).json({
                success: false,
                message: "缺少generateUuid参数"
            });
        }
        
        console.log('开始查询任务状态，generateUuid:', generateUuid);
        
        // 生成签名
        const urlPath = '/api/generate/webui/status';
        const { signature, timestamp, signatureNonce } = generateLiblibSignature(urlPath, liblibConfig.secretKey);
        
        // 构建URL
        const url = new URL(`https://openapi.liblibai.cloud${urlPath}`);
        url.searchParams.append('AccessKey', liblibConfig.accessKey);
        url.searchParams.append('Signature', signature);
        url.searchParams.append('Timestamp', timestamp);
        url.searchParams.append('SignatureNonce', signatureNonce);
        
        // 调用API
        const response = await axios.post(url.toString(), { generateUuid }, {
            headers: {
                'Content-Type': 'application/json'
            },
            timeout: 60000
        });
        
        // 处理响应
        console.log('任务状态响应:', JSON.stringify(response.data, null, 2));
        
        // 检查响应是否成功
        if (response.data.code === 0 && response.data.data) {
            const apiData = response.data.data;
            
            // 构建返回数据
            const result = {
                success: true,
                data: {
                    generateUuid: apiData.generateUuid,
                    status: apiData.generateStatus === 5 ? 'SUCCESS' : 
                            apiData.generateStatus === 4 ? 'FAILED' : 'PROCESSING',
                    percentCompleted: apiData.percentCompleted || 0,
                    generateMsg: apiData.generateMsg || ''
                }
            };
            
            // 如果图片生成成功且有图片列表，提取第一个图片URL
            if (apiData.generateStatus === 5 && apiData.images && apiData.images.length > 0) {
                result.data.url = apiData.images[0].imageUrl;
                result.data.seed = apiData.images[0].seed;
                result.data.auditStatus = apiData.images[0].auditStatus;
            }
            
            res.json(result);
        } else {
            throw new Error(`获取任务状态失败: ${response.data.msg || '未知错误'}`);
        }
        
    } catch (error) {
        console.error('查询图片状态失败:', error);
        res.status(500).json({
            success: false,
            message: "查询图片状态失败",
            error: error.message
        });
    }
});

// 获取医疗资讯 (模拟AI Agent抓取)
app.get('/api/medical-info', async (req, res) => {
    try {
        // 模拟API调用延迟
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        // 模拟AI抓取的医疗资讯
        const medicalInfo = [
            {
                title: "冬季流感预防指南",
                content: "冬季是流感高发季节，专家建议：1.及时接种流感疫苗；2.保持室内空气流通；3.勤洗手，避免触摸口鼻眼；4.保持充足睡眠，增强免疫力。",
                category: "疾病预防",
                date: new Date().toISOString().split('T')[0]
            },
            {
                title: "高血压患者饮食建议",
                content: "高血压患者应注意：1.减少钠盐摄入，每日不超过5克；2.增加钾的摄入，多吃香蕉、菠菜等；3.控制脂肪摄入，选择低脂乳制品；4.限制酒精摄入。",
                category: "慢性病管理",
                date: new Date().toISOString().split('T')[0]
            },
            {
                title: "儿童疫苗接种时间表",
                content: "根据国家免疫规划，儿童疫苗接种时间表：出生时：乙肝疫苗、卡介苗；1月龄：乙肝疫苗；2月龄：脊髓灰质炎疫苗；3月龄：百白破疫苗、脊髓灰质炎疫苗。",
                category: "儿童健康",
                date: new Date().toISOString().split('T')[0]
            }
        ];
        
        res.json({
            success: true,
            data: medicalInfo
        });
    } catch (error) {
        console.error('获取医疗资讯失败:', error);
        res.status(500).json({
            success: false,
            message: "获取医疗资讯失败"
        });
    }
});

let uxEvents = [];
app.post('/api/ux-events', (req, res) => {
    const { sessionId, events } = req.body || {};
    if (!sessionId || !Array.isArray(events)) return res.status(400).json({ success:false });
    events.forEach(e => uxEvents.push({ sessionId, ...e }));
    try { fs.appendFileSync(EVENTS_FILE, events.map(e => JSON.stringify({ sessionId, ...e })).join('\n') + '\n'); } catch(e) {}
    res.json({ success:true });
});

app.get('/api/ux-summary', (req, res) => {
    const tasks = ['browse_news','connect_camera','training','view_rank','browse_nutrition','checklist'];
    const byTask = {};
    tasks.forEach(t => byTask[t] = { starts:0, ends:0, durations:[] });
    const sessions = new Map();
    uxEvents.forEach(e => {
        if (e.t === 'task:start' && byTask[e.id]) { byTask[e.id].starts++; sessions.set(e.sessionId, true); }
        if (e.t === 'task:end' && byTask[e.id]) { byTask[e.id].ends++; if (e.duration) byTask[e.id].durations.push(e.duration); }
    });
    const summary = tasks.map(id => {
        const s = byTask[id];
        const avg = s.durations.length ? Math.round(s.durations.reduce((a,b)=>a+b,0)/s.durations.length) : 0;
        const rate = s.starts ? +(s.ends/s.starts*100).toFixed(1) : 0;
        return { id, completionRate: rate, averageMs: avg, starts: s.starts, ends: s.ends };
    });
    const errors = uxEvents.filter(e => e.t==='error').length;
    res.json({ success:true, data:{ summary, sessions: sessions.size, errors } });
});

app.get('/api/ux-heatmap', (req, res) => {
    const grid = {};
    uxEvents.filter(e=>e.t==='click').forEach(e => {
        const gx = Math.floor(e.x/40);
        const gy = Math.floor(e.y/40);
        const key = gx+':'+gy;
        grid[key] = (grid[key]||0)+1;
    });
    res.json({ success:true, data:grid });
});

// Diagnose OAuth JWT config (no secrets)
app.get('/api/coze/diagnose', (req, res) => {
    const privateKeyPath = path.join(__dirname, '..', 'private_key.pem');
    const exists = fs.existsSync(privateKeyPath);
    res.json({
        success: true,
        data: {
            privateKeyExists: exists,
            appId: COZE_APP_ID,
            keyId: COZE_KEY_ID,
            baseURL: COZE_API_BASE
        }
    });
});
// Coze JWT OAuth token issuance with session isolation
app.post('/api/coze/token', async (req, res) => {
    try {
        const sessionName = (req.body && req.body.sessionName) ? String(req.body.sessionName) : 'web_' + stringRandom(8);
        const privateKeyPath = path.join(__dirname, '..', 'private_key.pem');
        let privateKey = '';
        
        if (process.env.COZE_PRIVATE_KEY) {
            // 优先使用环境变量（适配Vercel等云环境）
            privateKey = process.env.COZE_PRIVATE_KEY.replace(/\\n/g, '\n').trim();
            // 自动补全PEM头尾（如果用户只粘贴了内容）
            if (!privateKey.includes('-----BEGIN PRIVATE KEY-----')) {
                privateKey = `-----BEGIN PRIVATE KEY-----\n${privateKey}\n-----END PRIVATE KEY-----`;
            }
        } else if (fs.existsSync(privateKeyPath)) {
            // 本地开发环境读取文件
            privateKey = fs.readFileSync(privateKeyPath, 'utf8');
        } else {
            console.error('Private key not found in env or file');
            return res.status(500).json({ success:false, message:'Private key configuration missing' });
        }

        const aud = new URL(COZE_API_BASE).host;
        const token = await getJWTToken({ baseURL: COZE_API_BASE, appId: COZE_APP_ID, aud, keyid: COZE_KEY_ID, privateKey, sessionName });
        // Persist session state
        // 在Vercel环境跳过文件写入
        if (!process.env.VERCEL) {
            const stateFile = path.join(DATA_DIR, 'sessions.json');
            let state = {};
            try { state = JSON.parse(fs.readFileSync(stateFile,'utf8')); } catch(e) {}
            state[sessionName] = { last_issued_at: Date.now(), expires_in: token.expires_in };
            try { fs.writeFileSync(stateFile, JSON.stringify(state, null, 2)); } catch(e) {}
        }
        res.json({ token_type: token.token_type, access_token: token.access_token, expires_in: token.expires_in });
    } catch (e) {
        console.error('Issue Coze token failed:', e);
        res.status(500).json({ success:false, message:'Issue Coze token failed', error: e.message });
    }
});

app.get('/api/ux-events/raw', (req, res) => {
    const limit = parseInt(req.query.limit || '0');
    try {
        const data = fs.readFileSync(EVENTS_FILE, 'utf8');
        const lines = data.trim().split('\n');
        const slice = limit > 0 ? lines.slice(-limit) : lines;
        res.type('text/plain').send(slice.join('\n'));
    } catch (e) {
        res.type('text/plain').send('');
    }
});

// AI菜品识别统一接口
app.post('/api/analyze-food', async (req, res) => {
    try {
        const image = req.body && req.body.image;
        if (!image) return res.status(400).json({ error: '请上传图片！' });
        if (BAIDU_DEMO_MODE || !ACCESS_TOKEN) {
            return res.json({
                items: [
                    { name: '鸡胸肉', serving: '100g', calories: 165, confidence: 0.92 },
                    { name: '西兰花', serving: '100g', calories: 34, confidence: 0.88 }
                ],
                totalCalories: 199
            });
        }
        const dishResult = await callBaiduDishAPI(image);
        const items = [];
        let totalCalories = 0;
        if (dishResult.result && dishResult.result.length) {
            for (const dish of dishResult.result) {
                const serving = '100g';
                const calories = Math.round(dish.calorie);
                totalCalories += calories;
                const nutritionData = await callBaiduNutritionAPI(dish.name);
                // Return structured nutrition data instead of baking it into the string
                // This allows the frontend to handle filtering and display
                items.push({ 
                    name: dish.name, 
                    nutrition: nutritionData, 
                    serving, 
                    calories, 
                    confidence: dish.probability 
                });
            }
        }
        res.json({ items, totalCalories });
    } catch (error) {
        console.error('AI分析失败:', error);
        res.status(500).json({ error: 'AI分析失败，请重试！' });
    }
});
// 启动服务器
if (require.main === module) {
    getBaiduAccessToken().then(() => {
        app.listen(PORT, () => {
            console.log(`服务器运行在 http://localhost:${PORT}`);
        });
    }).catch(() => {
        // 即使获取失败也启动服务并进入演示模式
        BAIDU_DEMO_MODE = true;
        app.listen(PORT, () => {
            console.log(`服务器运行在 http://localhost:${PORT}（AI菜品识别演示模式）`);
        });
    });
} else {
    // Vercel环境：异步初始化Baidu Token但不阻塞导出
    getBaiduAccessToken().catch(() => { BAIDU_DEMO_MODE = true; });
}
module.exports = app;
