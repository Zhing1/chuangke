// API配置文件

// Liblib API配置
const liblibConfig = {
    // 在这里填写你的Liblib API密钥
    accessKey: 'A6D77iwidWzrpt3P-ocztw', // 替换为你的实际AccessKey (20-30位)
    secretKey: 'n3VkJeqNWkrZPMsf2YufKmqnY23Xuo4d', // 替换为你的实际SecretKey (30位以上)
    
    // API端点URL
    apiUrls: {
        text2img: 'https://openapi.liblibai.cloud/api/generate/webui/text2img',
        status: 'https://openapi.liblibai.cloud/api/generate/webui/status'
    },
    
    // 模板UUID
    templateUuid: 'e10adc3949ba59abbe56e057f20f883e',
    
    // 底模modelVersionUUID
    checkPointId: 'd303ad58c0fc4c989b60351d5eac68e6',
    
    // 默认图片生成参数
    defaultParams: {
        // 基础参数
        prompt: 'Fatty food,burger,',
        negativePrompt: 'ng_deepnegative_v1_75t,(badhandv4:1.2),EasyNegative,(worst quality:2),1girl,1boy,',
        sampler: 15, // DPM++ 2M Karras对应的枚举值
        steps: 20,
        cfgScale: 7,
        width: 512,
        height: 512,
        imgCount: 1,
        randnSource: 0,
        seed: -1, // -1表示随机种子
        restoreFaces: 0
        
    }
};

// 导出配置
module.exports = liblibConfig;