// 摄像头调试和错误处理模块
class CameraDebugger {
    constructor() {
        this.errorLog = [];
        this.hasCameraPermission = false;
        this.cameraDevices = [];
        this.browserInfo = this.getBrowserInfo();
        
        this.init();
    }
    
    init() {
        this.checkBrowserSupport();
        this.enumerateDevices();
    }
    
    getBrowserInfo() {
        const ua = navigator.userAgent;
        const browser = {
            name: 'Unknown',
            version: 'Unknown',
            isChrome: /Chrome/.test(ua) && !/Edge/.test(ua),
            isFirefox: /Firefox/.test(ua),
            isSafari: /Safari/.test(ua) && !/Chrome/.test(ua),
            isEdge: /Edge/.test(ua),
            isMobile: /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua),
            isHTTPS: window.location.protocol === 'https:',
            supportsWebRTC: !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia)
        };
        
        // 提取版本号
        if (browser.isChrome) {
            browser.name = 'Chrome';
            browser.version = ua.match(/Chrome\/(\d+)/)?.[1] || 'Unknown';
        } else if (browser.isFirefox) {
            browser.name = 'Firefox';
            browser.version = ua.match(/Firefox\/(\d+)/)?.[1] || 'Unknown';
        } else if (browser.isSafari) {
            browser.name = 'Safari';
            browser.version = ua.match(/Version\/(\d+)/)?.[1] || 'Unknown';
        } else if (browser.isEdge) {
            browser.name = 'Edge';
            browser.version = ua.match(/Edge\/(\d+)/)?.[1] || 'Unknown';
        }
        
        return browser;
    }
    
    checkBrowserSupport() {
        console.log('浏览器信息:', this.browserInfo);
        
        if (!this.browserInfo.supportsWebRTC) {
            this.logError('浏览器不支持WebRTC', 'BROWSER_NOT_SUPPORTED');
            return false;
        }
        
        if (!this.browserInfo.isHTTPS && !window.isLocalhost) {
            this.logError('非HTTPS环境无法访问摄像头', 'INSECURE_CONTEXT');
            return false;
        }
        
        return true;
    }
    
    async enumerateDevices() {
        try {
            if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) {
                this.logError('浏览器不支持设备枚举', 'ENUMERATION_NOT_SUPPORTED');
                return;
            }
            
            const devices = await navigator.mediaDevices.enumerateDevices();
            this.cameraDevices = devices.filter(device => device.kind === 'videoinput');
            
            console.log('摄像头设备:', this.cameraDevices);
            
            if (this.cameraDevices.length === 0) {
                this.logError('未检测到摄像头设备', 'NO_CAMERA_DEVICES');
            }
            
        } catch (error) {
            this.logError('设备枚举失败: ' + error.message, 'ENUMERATION_FAILED');
        }
    }
    
    async checkPermission() {
        try {
            // 尝试获取摄像头权限
            const stream = await navigator.mediaDevices.getUserMedia({ 
                video: true, 
                audio: false 
            });
            
            this.hasCameraPermission = true;
            
            // 立即关闭测试流
            stream.getTracks().forEach(track => track.stop());
            
            console.log('摄像头权限已获得');
            return true;
            
        } catch (error) {
            this.hasCameraPermission = false;
            this.analyzePermissionError(error);
            return false;
        }
    }
    
    analyzePermissionError(error) {
        const errorMessage = error.message || error.name || 'Unknown error';
        console.error('权限错误:', errorMessage);
        
        if (errorMessage.includes('Permission denied') || error.name === 'NotAllowedError') {
            this.logError('用户拒绝了摄像头权限', 'PERMISSION_DENIED');
        } else if (errorMessage.includes('NotFoundError') || error.name === 'NotFoundError') {
            this.logError('未找到摄像头设备', 'DEVICE_NOT_FOUND');
        } else if (errorMessage.includes('NotReadableError') || error.name === 'NotReadableError') {
            this.logError('摄像头被其他应用占用', 'DEVICE_IN_USE');
        } else if (errorMessage.includes('OverconstrainedError') || error.name === 'OverconstrainedError') {
            this.logError('摄像头约束条件无法满足', 'CONSTRAINTS_NOT_MET');
        } else {
            this.logError('未知权限错误: ' + errorMessage, 'UNKNOWN_PERMISSION_ERROR');
        }
    }
    
    logError(message, code) {
        const errorInfo = {
            message,
            code,
            timestamp: new Date().toISOString(),
            browser: this.browserInfo.name,
            version: this.browserInfo.version,
            isMobile: this.browserInfo.isMobile,
            isHTTPS: this.browserInfo.isHTTPS
        };
        
        this.errorLog.push(errorInfo);
        console.error('摄像头错误:', errorInfo);
    }
    
    getErrorReport() {
        return {
            errors: this.errorLog,
            browser: this.browserInfo,
            devices: this.cameraDevices,
            hasPermission: this.hasCameraPermission,
            userAgent: navigator.userAgent,
            timestamp: new Date().toISOString()
        };
    }
    
    generateUserGuidance() {
        const guidance = {
            title: '摄像头连接问题解决方案',
            steps: [],
            browserSpecific: {},
            fallbackOptions: []
        };
        
        // 通用解决步骤
        guidance.steps = [
            {
                title: '检查浏览器兼容性',
                description: '确保使用支持WebRTC的现代浏览器',
                actions: [
                    '推荐使用 Chrome 80+、Firefox 75+、Safari 13+',
                    '避免使用过时或不常见的浏览器',
                    '确保浏览器是最新版本'
                ]
            },
            {
                title: '检查网络环境',
                description: '确保在安全的环境中访问',
                actions: [
                    '必须使用 HTTPS 协议（本地开发除外）',
                    '检查网址是否以 https:// 开头',
                    '避免在隐私模式下使用'
                ]
            },
            {
                title: '检查摄像头权限',
                description: '确保已授予摄像头访问权限',
                actions: [
                    '点击地址栏左侧的锁形图标',
                    '检查摄像头权限设置',
                    '允许当前网站访问摄像头'
                ]
            },
            {
                title: '检查设备状态',
                description: '确保摄像头正常工作',
                actions: [
                    '检查摄像头是否被其他应用占用',
                    '尝试重启摄像头设备',
                    '检查摄像头驱动是否最新'
                ]
            }
        ];
        
        // 浏览器特定指导
        if (this.browserInfo.isChrome) {
            guidance.browserSpecific.chrome = [
                '访问 chrome://settings/content/camera 检查摄像头设置',
                '确保没有安装阻止摄像头访问的扩展程序',
                '尝试清除浏览器缓存和Cookie'
            ];
        } else if (this.browserInfo.isFirefox) {
            guidance.browserSpecific.firefox = [
                '访问 about:preferences#privacy 检查权限设置',
                '在地址栏输入 about:config 检查 media.navigator.enabled',
                '确保摄像头没有被Firefox阻止'
            ];
        } else if (this.browserInfo.isSafari) {
            guidance.browserSpecific.safari = [
                '检查系统偏好设置中的摄像头权限',
                '确保Safari有权限访问摄像头',
                '尝试重启Safari浏览器'
            ];
        }
        
        // 备用方案
        guidance.fallbackOptions = [
            {
                title: '使用其他浏览器',
                description: '尝试使用不同的浏览器访问'
            },
            {
                title: '检查设备管理器',
                description: '在系统设置中检查摄像头设备'
            },
            {
                title: '重启设备',
                description: '重启电脑或移动设备'
            },
            {
                title: '联系技术支持',
                description: '如果问题依然存在，寻求专业帮助'
            }
        ];
        
        return guidance;
    }
    
    // 显示详细的错误信息
    showDetailedError(userErrorCallback) {
        const errorReport = this.getErrorReport();
        const guidance = this.generateUserGuidance();
        
        console.log('=== 摄像头调试报告 ===');
        console.log('浏览器信息:', errorReport.browser);
        console.log('错误日志:', errorReport.errors);
        console.log('设备信息:', errorReport.devices);
        console.log('用户指导:', guidance);
        
        // 调用用户提供的错误处理回调
        if (userErrorCallback && typeof userErrorCallback === 'function') {
            userErrorCallback(errorReport, guidance);
        }
    }
}

// 增强的摄像头连接类
class EnhancedCameraConnector {
    constructor(videoElement, onSuccess, onError) {
        this.video = videoElement;
        this.onSuccess = onSuccess;
        this.onError = onError;
        this.debugger = new CameraDebugger();
        
        this.currentStream = null;
        this.retryCount = 0;
        this.maxRetries = 3;
        this.retryDelay = 2000;
        
        this.constraints = {
            video: {
                width: { ideal: 640, max: 1280 },
                height: { ideal: 480, max: 720 },
                frameRate: { ideal: 25, max: 30 }
            },
            audio: false
        };
    }
    
    async connect() {
        try {
            console.log('开始连接摄像头...');
            
            // 检查浏览器支持
            if (!this.debugger.checkBrowserSupport()) {
                throw new Error('浏览器不支持摄像头功能');
            }
            
            // 检查权限
            const hasPermission = await this.debugger.checkPermission();
            if (!hasPermission) {
                console.log('需要请求摄像头权限...');
            }
            
            // 尝试连接摄像头
            await this.tryConnect();
            
        } catch (error) {
            console.error('摄像头连接失败:', error);
            this.handleConnectionError(error);
        }
    }
    
    async tryConnect() {
        try {
            // 停止之前的流
            this.stopCurrentStream();
            
            // 获取摄像头流
            const stream = await navigator.mediaDevices.getUserMedia(this.constraints);
            this.currentStream = stream;
            
            // 设置视频元素
            this.video.srcObject = stream;
            this.video.muted = true;
            this.video.playsInline = true;
            
            // 等待视频加载完成
            await this.waitForVideoLoad();
            
            // 连接成功
            this.retryCount = 0;
            this.onSuccess(stream);
            
        } catch (error) {
            if (this.retryCount < this.maxRetries) {
                this.retryCount++;
                console.log(`重试连接摄像头 (${this.retryCount}/${this.maxRetries})...`);
                
                setTimeout(() => {
                    this.tryConnect();
                }, this.retryDelay);
            } else {
                throw error;
            }
        }
    }
    
    async waitForVideoLoad() {
        return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                reject(new Error('视频加载超时'));
            }, 10000);
            
            this.video.addEventListener('loadedmetadata', () => {
                clearTimeout(timeout);
                resolve();
            });
            
            this.video.addEventListener('error', (e) => {
                clearTimeout(timeout);
                reject(new Error('视频加载错误: ' + e.message));
            });
        });
    }
    
    stopCurrentStream() {
        if (this.currentStream) {
            this.currentStream.getTracks().forEach(track => {
                track.stop();
            });
            this.currentStream = null;
        }
    }
    
    handleConnectionError(error) {
        this.debugger.analyzePermissionError(error);
        
        // 显示详细错误信息
        this.debugger.showDetailedError((errorReport, guidance) => {
            // 构建用户友好的错误消息
            let userMessage = '摄像头连接失败。';
            
            if (errorReport.errors.length > 0) {
                const latestError = errorReport.errors[errorReport.errors.length - 1];
                switch (latestError.code) {
                    case 'PERMISSION_DENIED':
                        userMessage = '请允许网站访问您的摄像头。';
                        break;
                    case 'DEVICE_NOT_FOUND':
                        userMessage = '未检测到摄像头设备。';
                        break;
                    case 'DEVICE_IN_USE':
                        userMessage = '摄像头正在被其他应用使用。';
                        break;
                    case 'BROWSER_NOT_SUPPORTED':
                        userMessage = '您的浏览器不支持摄像头功能。';
                        break;
                    case 'INSECURE_CONTEXT':
                        userMessage = '请在安全的环境中访问（HTTPS）。';
                        break;
                    default:
                        userMessage = '摄像头连接遇到问题，请检查设置。';
                }
            }
            
            // 调用错误回调
            this.onError(userMessage, guidance, errorReport);
        });
    }
    
    // 切换摄像头
    async switchCamera() {
        try {
            const devices = await navigator.mediaDevices.enumerateDevices();
            const videoDevices = devices.filter(device => device.kind === 'videoinput');
            
            if (videoDevices.length > 1) {
                // 切换到下一个摄像头
                const currentDeviceId = this.constraints.video.deviceId;
                const currentIndex = videoDevices.findIndex(device => device.deviceId === currentDeviceId);
                const nextIndex = (currentIndex + 1) % videoDevices.length;
                const nextDevice = videoDevices[nextIndex];
                
                this.constraints.video.deviceId = { exact: nextDevice.deviceId };
                await this.connect();
            } else {
                console.log('只有一个摄像头设备');
            }
        } catch (error) {
            console.error('切换摄像头失败:', error);
            throw error;
        }
    }
    
    disconnect() {
        this.stopCurrentStream();
        this.video.srcObject = null;
    }
}

// 摄像头状态管理器
class CameraStatusManager {
    constructor() {
        this.statusElement = document.getElementById('cameraStatus');
        this.indicatorElement = document.getElementById('cameraStatusIndicator');
        this.connectButton = document.getElementById('connectCameraBtn');
        this.switchButton = document.getElementById('switchCameraBtn');
        
        this.setupEventListeners();
    }
    
    setupEventListeners() {
        // 监听权限变化
        navigator.permissions && navigator.permissions.query({ name: 'camera' })
            .then(permissionStatus => {
                permissionStatus.onchange = () => {
                    this.updatePermissionStatus(permissionStatus.state);
                };
            })
            .catch(() => {
                // 权限API不受支持
            });
    }
    
    updatePermissionStatus(state) {
        switch (state) {
            case 'granted':
                this.updateStatus('connected', '摄像头权限已授予');
                break;
            case 'denied':
                this.updateStatus('disconnected', '摄像头权限被拒绝');
                break;
            case 'prompt':
                this.updateStatus('loading', '等待权限确认');
                break;
        }
    }
    
    updateStatus(status, message) {
        const statusClass = `camera-status camera-${status}`;
        
        this.statusElement.className = statusClass;
        this.statusElement.textContent = message;
        
        this.indicatorElement.className = statusClass;
        this.indicatorElement.textContent = message;
        
        // 更新按钮状态
        switch (status) {
            case 'connected':
                this.connectButton.disabled = true;
                this.connectButton.textContent = '已连接';
                this.switchButton.disabled = false;
                break;
            case 'disconnected':
                this.connectButton.disabled = false;
                this.connectButton.textContent = '连接摄像头';
                this.switchButton.disabled = true;
                break;
            case 'loading':
                this.connectButton.disabled = true;
                this.connectButton.textContent = '连接中...';
                this.switchButton.disabled = true;
                break;
        }
    }
    
    showError(message, guidance) {
        // 创建错误提示面板
        const errorPanel = document.createElement('div');
        errorPanel.id = 'cameraErrorPanel';
        errorPanel.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
        
        errorPanel.innerHTML = `
            <div class="card rounded-2xl p-8 max-w-md w-full mx-4">
                <div class="text-center">
                    <div class="text-6xl mb-4">📷</div>
                    <h2 class="text-2xl font-bold mb-4 text-red-400">摄像头连接问题</h2>
                    <p class="text-gray-300 mb-6">${message}</p>
                    
                    <div class="text-left mb-6">
                        <h3 class="text-lg font-semibold text-cyan-400 mb-3">解决步骤：</h3>
                        <ol class="list-decimal list-inside space-y-2 text-sm text-gray-300">
                            ${guidance.steps.map(step => `
                                <li><strong>${step.title}：</strong>${step.description}
                                    <ul class="list-disc list-inside ml-4 mt-1 text-xs text-gray-400">
                                        ${step.actions.map(action => `<li>${action}</li>`).join('')}
                                    </ul>
                                </li>
                            `).join('')}
                        </ol>
                    </div>
                    
                    <div class="space-y-3">
                        <button id="retryCameraBtn" class="w-full btn-primary text-white font-bold py-3 px-6 rounded-lg">
                            重试连接
                        </button>
                        <button id="closeErrorPanelBtn" class="w-full btn-secondary font-bold py-3 px-6 rounded-lg">
                            关闭
                        </button>
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(errorPanel);
        
        // 添加事件监听
        document.getElementById('retryCameraBtn').addEventListener('click', () => {
            document.body.removeChild(errorPanel);
            // 触发重试事件
            window.dispatchEvent(new CustomEvent('retryCameraConnection'));
        });
        
        document.getElementById('closeErrorPanelBtn').addEventListener('click', () => {
            document.body.removeChild(errorPanel);
        });
    }
}

// 导出类
window.CameraDebugger = CameraDebugger;
window.EnhancedCameraConnector = EnhancedCameraConnector;
window.CameraStatusManager = CameraStatusManager;