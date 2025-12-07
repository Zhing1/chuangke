// 强制摄像头连接模块 - 解决点击无反应问题
class CameraForceConnector {
    constructor(videoElement, onSuccess, onError) {
        this.video = videoElement;
        this.onSuccess = onSuccess;
        this.onError = onError;
        
        // 连接状态
        this.isConnecting = false;
        this.hasTriggeredPermission = false;
        this.connectionAttempts = 0;
        this.maxAttempts = 5;
        
        // 调试信息
        this.debugInfo = {
            clickTime: null,
            permissionTime: null,
            connectionTime: null,
            errors: []
        };
        
        this.init();
    }
    
    init() {
        this.setupForceConnectButton();
        this.setupErrorHandling();
        this.setupPermissionHandling();
    }
    
    setupForceConnectButton() {
        const connectBtn = document.getElementById('connectCameraBtn');
        if (!connectBtn) return;
        
        // 完全替换按钮行为
        connectBtn.addEventListener('click', async (e) => {
            e.preventDefault();
            e.stopPropagation();
            
            console.log('强制连接摄像头 - 按钮点击检测');
            this.debugInfo.clickTime = Date.now();
            
            if (this.isConnecting) {
                console.log('连接正在进行中...');
                return;
            }
            
            this.isConnecting = true;
            this.connectionAttempts++;
            
            try {
                await this.forceConnect();
            } catch (error) {
                console.error('强制连接失败:', error);
                this.handleConnectionFailure(error);
            } finally {
                this.isConnecting = false;
            }
        });
        
        // 防止按钮被禁用
        connectBtn.disabled = false;
        
        // 添加视觉反馈
        this.addButtonFeedback(connectBtn);
    }
    
    addButtonFeedback(button) {
        button.style.transition = 'all 0.1s ease';
        
        button.addEventListener('mousedown', () => {
            button.style.transform = 'scale(0.95)';
            button.style.boxShadow = 'inset 0 2px 4px rgba(0,0,0,0.2)';
        });
        
        button.addEventListener('mouseup', () => {
            button.style.transform = 'scale(1)';
            button.style.boxShadow = '';
        });
        
        button.addEventListener('mouseleave', () => {
            button.style.transform = 'scale(1)';
            button.style.boxShadow = '';
        });
    }
    
    async forceConnect() {
        console.log('=== 强制连接摄像头开始 ===');
        
        // 步骤1: 检查基本支持
        this.checkBasicSupport();
        
        // 步骤2: 强制触发权限请求
        await this.triggerPermissionRequest();
        
        // 步骤3: 直接尝试连接
        await this.directConnect();
        
        // 步骤4: 处理连接结果
        this.handleConnectionSuccess();
    }
    
    checkBasicSupport() {
        console.log('检查基本支持...');
        
        // 检查WebRTC支持
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            throw new Error('浏览器不支持WebRTC');
        }
        
        // 检查HTTPS（生产环境）
        if (window.location.protocol !== 'https:' && window.location.hostname !== 'localhost') {
            console.warn('非HTTPS环境，可能影响摄像头访问');
        }
        
        // 检查用户手势
        if (!this.debugInfo.clickTime) {
            console.warn('可能缺少用户手势触发');
        }
        
        console.log('基本支持检查通过');
    }
    
    async triggerPermissionRequest() {
        console.log('强制触发权限请求...');
        
        try {
            // 方法1: 直接请求权限
            const stream = await navigator.mediaDevices.getUserMedia({ 
                video: true, 
                audio: false 
            });
            
            console.log('权限请求成功');
            this.debugInfo.permissionTime = Date.now();
            this.hasTriggeredPermission = true;
            
            // 立即关闭测试流
            stream.getTracks().forEach(track => track.stop());
            
        } catch (error) {
            console.log('权限请求失败:', error.message);
            
            // 方法2: 使用备用方法触发
            await this.alternativePermissionTrigger();
        }
    }
    
    async alternativePermissionTrigger() {
        console.log('使用备用方法触发权限...');
        
        try {
            // 创建隐藏的input元素来触发权限
            const fileInput = document.createElement('input');
            fileInput.type = 'file';
            fileInput.accept = 'image/*';
            fileInput.style.display = 'none';
            
            document.body.appendChild(fileInput);
            
            // 触发点击（某些浏览器会因此允许摄像头权限）
            fileInput.click();
            
            // 延迟后移除元素
            setTimeout(() => {
                document.body.removeChild(fileInput);
            }, 1000);
            
            console.log('备用触发方法已执行');
            
        } catch (error) {
            console.log('备用触发方法失败:', error.message);
        }
    }
    
    async directConnect() {
        console.log('直接连接摄像头...');
        
        // 停止之前的流
        this.stopCurrentStream();
        
        try {
            // 使用最基础的约束条件
            const constraints = {
                video: {
                    width: { ideal: 640 },
                    height: { ideal: 480 },
                    frameRate: { ideal: 25 }
                },
                audio: false
            };
            
            console.log('连接参数:', constraints);
            
            const stream = await navigator.mediaDevices.getUserMedia(constraints);
            this.currentStream = stream;
            
            console.log('媒体流获取成功');
            
            // 设置视频元素
            this.setupVideoElement();
            
            // 等待视频加载
            await this.waitForVideoLoad();
            
            this.debugInfo.connectionTime = Date.now();
            
        } catch (error) {
            console.error('直接连接失败:', error);
            
            // 尝试降级连接
            await this.fallbackConnect();
        }
    }
    
    setupVideoElement() {
        console.log('设置视频元素...');
        
        this.video.srcObject = this.currentStream;
        this.video.muted = true;
        this.video.playsInline = true;
        this.video.autoplay = true;
        
        // 设置样式
        this.video.style.objectFit = 'cover';
        this.video.style.transform = 'scaleX(-1)';
        
        console.log('视频元素设置完成');
    }
    
    async waitForVideoLoad() {
        console.log('等待视频加载...');
        
        return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                reject(new Error('视频加载超时'));
            }, 15000);
            
            this.video.addEventListener('loadedmetadata', () => {
                console.log('视频元数据加载完成');
                clearTimeout(timeout);
                resolve();
            });
            
            this.video.addEventListener('loadeddata', () => {
                console.log('视频数据加载完成');
            });
            
            this.video.addEventListener('canplay', () => {
                console.log('视频可以播放');
            });
            
            this.video.addEventListener('play', () => {
                console.log('视频开始播放');
            });
            
            this.video.addEventListener('error', (e) => {
                console.error('视频错误:', e);
                clearTimeout(timeout);
                reject(new Error('视频加载错误: ' + e.message));
            });
        });
    }
    
    async fallbackConnect() {
        console.log('尝试降级连接...');
        
        try {
            // 使用最简化的约束
            const constraints = {
                video: true,
                audio: false
            };
            
            const stream = await navigator.mediaDevices.getUserMedia(constraints);
            this.currentStream = stream;
            
            this.setupVideoElement();
            await this.waitForVideoLoad();
            
            console.log('降级连接成功');
            
        } catch (error) {
            console.error('降级连接失败:', error);
            throw error;
        }
    }
    
    handleConnectionSuccess() {
        console.log('=== 摄像头连接成功 ===');
        console.log('连接统计:', this.debugInfo);
        
        // 重置重试计数
        this.connectionAttempts = 0;
        
        // 调用成功回调
        if (this.onSuccess) {
            this.onSuccess(this.currentStream);
        }
        
        // 显示成功信息
        this.showSuccessMessage();
    }
    
    handleConnectionFailure(error) {
        console.error('=== 摄像头连接失败 ===');
        console.error('错误信息:', error);
        console.error('调试信息:', this.debugInfo);
        
        // 记录错误
        this.debugInfo.errors.push({
            message: error.message,
            time: Date.now(),
            stack: error.stack
        });
        
        // 调用错误回调
        if (this.onError) {
            this.onError(error, this.debugInfo);
        }
        
        // 显示错误信息
        this.showErrorMessage(error);
        
        // 如果重试次数未达上限，自动重试
        if (this.connectionAttempts < this.maxAttempts) {
            console.log(`自动重试 (${this.connectionAttempts}/${this.maxAttempts})`);
            setTimeout(() => {
                this.forceConnect();
            }, 3000);
        }
    }
    
    showSuccessMessage() {
        const message = document.createElement('div');
        message.className = 'fixed top-4 right-4 bg-green-500 text-white px-4 py-2 rounded-lg z-50';
        message.textContent = '摄像头连接成功！';
        
        document.body.appendChild(message);
        
        setTimeout(() => {
            if (document.body.contains(message)) {
                document.body.removeChild(message);
            }
        }, 3000);
    }
    
    showErrorMessage(error) {
        const message = document.createElement('div');
        message.className = 'fixed top-4 right-4 bg-red-500 text-white px-4 py-2 rounded-lg z-50';
        message.textContent = '摄像头连接失败: ' + error.message;
        
        document.body.appendChild(message);
        
        setTimeout(() => {
            if (document.body.contains(message)) {
                document.body.removeChild(message);
            }
        }, 5000);
    }
    
    setupErrorHandling() {
        // 全局错误处理
        window.addEventListener('error', (e) => {
            console.error('全局错误:', e.error);
            this.debugInfo.errors.push({
                message: e.message,
                time: Date.now(),
                filename: e.filename,
                lineno: e.lineno
            });
        });
        
        // Promise错误处理
        window.addEventListener('unhandledrejection', (e) => {
            console.error('未处理的Promise错误:', e.reason);
            this.debugInfo.errors.push({
                message: e.reason.message || 'Unhandled promise rejection',
                time: Date.now()
            });
        });
        
        // 媒体错误处理
        this.video.addEventListener('error', (e) => {
            console.error('视频错误:', e);
            this.handleVideoError();
        });
    }
    
    setupPermissionHandling() {
        // 监听权限变化
        if (navigator.permissions && navigator.permissions.query) {
            navigator.permissions.query({ name: 'camera' })
                .then(permissionStatus => {
                    console.log('当前摄像头权限:', permissionStatus.state);
                    
                    permissionStatus.onchange = () => {
                        console.log('摄像头权限变化:', permissionStatus.state);
                        
                        if (permissionStatus.state === 'granted') {
                            // 权限被授予，自动重试连接
                            if (!this.isConnecting) {
                                this.forceConnect();
                            }
                        }
                    };
                })
                .catch(error => {
                    console.log('权限API不受支持:', error);
                });
        }
    }
    
    handleVideoError() {
        console.error('视频播放错误');
        
        // 尝试重新连接
        setTimeout(() => {
            if (!this.isConnecting) {
                this.forceConnect();
            }
        }, 2000);
    }
    
    stopCurrentStream() {
        if (this.currentStream) {
            console.log('停止当前媒体流');
            this.currentStream.getTracks().forEach(track => {
                track.stop();
            });
            this.currentStream = null;
        }
    }
    
    disconnect() {
        console.log('断开摄像头连接');
        this.stopCurrentStream();
        this.video.srcObject = null;
        this.isConnecting = false;
    }
    
    // 获取调试信息
    getDebugInfo() {
        return {
            ...this.debugInfo,
            connectionAttempts: this.connectionAttempts,
            hasTriggeredPermission: this.hasTriggeredPermission,
            isConnecting: this.isConnecting,
            currentStream: this.currentStream ? {
                id: this.currentStream.id,
                active: this.currentStream.active,
                tracks: this.currentStream.getTracks().length
            } : null,
            videoElement: {
                srcObject: this.video.srcObject ? 'has stream' : 'no stream',
                readyState: this.video.readyState,
                videoWidth: this.video.videoWidth,
                videoHeight: this.video.videoHeight,
                error: this.video.error
            }
        };
    }
}

// 摄像头连接管理器
class CameraConnectionManager {
    constructor() {
        this.connector = null;
        this.isConnected = false;
        this.debugInfo = {};
        
        this.setupGlobalErrorHandling();
    }
    
    setupGlobalErrorHandling() {
        // 监听重试事件
        window.addEventListener('retryCameraConnection', () => {
            console.log('收到重试摄像头连接事件');
            this.connect();
        });
    }
    
    async connect() {
        const videoElement = document.getElementById('video');
        if (!videoElement) {
            console.error('视频元素未找到');
            return;
        }
        
        try {
            // 创建强制连接器
            this.connector = new CameraForceConnector(
                videoElement,
                (stream) => this.handleConnectionSuccess(stream),
                (error, debugInfo) => this.handleConnectionError(error, debugInfo)
            );
            
            console.log('摄像头连接管理器已初始化');
            
        } catch (error) {
            console.error('初始化摄像头连接管理器失败:', error);
            this.showConnectionError(error);
        }
    }
    
    handleConnectionSuccess(stream) {
        console.log('摄像头连接成功');
        this.isConnected = true;
        
        // 更新UI状态
        this.updateUIStatus('connected');
        
        // 启用相关功能
        this.enableCameraFeatures();
        
        // 保存调试信息
        this.debugInfo = this.connector.getDebugInfo();
        console.log('连接调试信息:', this.debugInfo);
    }
    
    handleConnectionError(error, debugInfo) {
        console.error('摄像头连接错误:', error);
        this.isConnected = false;
        
        // 更新UI状态
        this.updateUIStatus('error', error.message);
        
        // 显示错误信息
        this.showConnectionError(error, debugInfo);
    }
    
    updateUIStatus(status, message = '') {
        const statusElement = document.getElementById('cameraStatus');
        const connectBtn = document.getElementById('connectCameraBtn');
        const switchBtn = document.getElementById('switchCameraBtn');
        
        switch (status) {
            case 'connected':
                statusElement.textContent = '摄像头已连接';
                statusElement.className = 'camera-status camera-connected';
                connectBtn.textContent = '已连接';
                connectBtn.disabled = true;
                switchBtn.disabled = false;
                break;
                
            case 'error':
                statusElement.textContent = '摄像头连接失败';
                statusElement.className = 'camera-status camera-disconnected';
                connectBtn.textContent = '重试连接';
                connectBtn.disabled = false;
                switchBtn.disabled = true;
                break;
                
            default:
                statusElement.textContent = '摄像头未连接';
                statusElement.className = 'camera-status camera-disconnected';
                connectBtn.textContent = '连接摄像头';
                connectBtn.disabled = false;
                switchBtn.disabled = true;
        }
    }
    
    enableCameraFeatures() {
        // 启用开始按钮
        const startBtn = document.getElementById('startBtn');
        if (startBtn) {
            startBtn.disabled = false;
        }
        
        // 启用切换按钮
        const switchBtn = document.getElementById('switchCameraBtn');
        if (switchBtn) {
            switchBtn.disabled = false;
        }
        
        // 触发摄像头已连接事件
        window.dispatchEvent(new CustomEvent('cameraConnected', {
            detail: { debugInfo: this.debugInfo }
        }));
    }
    
    showConnectionError(error, debugInfo) {
        // 创建详细的错误提示
        const errorPanel = document.createElement('div');
        errorPanel.id = 'cameraErrorPanel';
        errorPanel.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
        
        errorPanel.innerHTML = `
            <div class="card rounded-2xl p-8 max-w-lg w-full mx-4">
                <div class="text-center">
                    <div class="text-6xl mb-4">📷</div>
                    <h2 class="text-2xl font-bold mb-4 text-red-400">摄像头连接失败</h2>
                    <p class="text-gray-300 mb-6">${error.message}</p>
                    
                    <div class="text-left mb-6 bg-gray-800 p-4 rounded-lg">
                        <h3 class="text-lg font-semibold text-cyan-400 mb-3">调试信息：</h3>
                        <div class="text-xs text-gray-400 space-y-1">
                            <div>点击时间: ${debugInfo.clickTime ? new Date(debugInfo.clickTime).toLocaleTimeString() : 'N/A'}</div>
                            <div>权限时间: ${debugInfo.permissionTime ? new Date(debugInfo.permissionTime).toLocaleTimeString() : 'N/A'}</div>
                            <div>连接时间: ${debugInfo.connectionTime ? new Date(debugInfo.connectionTime).toLocaleTimeString() : 'N/A'}</div>
                            <div>重试次数: ${debugInfo.connectionAttempts || 0}</div>
                            <div>错误数量: ${debugInfo.errors ? debugInfo.errors.length : 0}</div>
                        </div>
                    </div>
                    
                    <div class="space-y-3">
                        <button id="retryCameraConnectionBtn" class="w-full btn-primary text-white font-bold py-3 px-6 rounded-lg">
                            强制重试连接
                        </button>
                        <button id="openSettingsBtn" class="w-full btn-secondary font-bold py-3 px-6 rounded-lg">
                            打开浏览器设置
                        </button>
                        <button id="closeCameraErrorBtn" class="w-full bg-gray-600 hover:bg-gray-700 text-white font-bold py-3 px-6 rounded-lg">
                            关闭
                        </button>
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(errorPanel);
        
        // 添加事件监听
        document.getElementById('retryCameraConnectionBtn').addEventListener('click', () => {
            document.body.removeChild(errorPanel);
            this.connect(); // 重新连接
        });
        
        document.getElementById('openSettingsBtn').addEventListener('click', () => {
            this.openBrowserSettings();
        });
        
        document.getElementById('closeCameraErrorBtn').addEventListener('click', () => {
            document.body.removeChild(errorPanel);
        });
    }
    
    openBrowserSettings() {
        const userAgent = navigator.userAgent;
        let settingsUrl = '';
        
        if (userAgent.includes('Chrome')) {
            settingsUrl = 'chrome://settings/content/camera';
        } else if (userAgent.includes('Firefox')) {
            settingsUrl = 'about:preferences#privacy';
        } else if (userAgent.includes('Safari')) {
            settingsUrl = 'preferences://';
        }
        
        if (settingsUrl) {
            window.open(settingsUrl, '_blank');
        } else {
            alert('请手动打开浏览器设置，检查摄像头权限');
        }
    }
    
    disconnect() {
        if (this.connector) {
            this.connector.disconnect();
        }
        
        this.isConnected = false;
        this.updateUIStatus('disconnected');
        
        // 禁用相关功能
        const startBtn = document.getElementById('startBtn');
        if (startBtn) {
            startBtn.disabled = true;
        }
        
        const switchBtn = document.getElementById('switchCameraBtn');
        if (switchBtn) {
            switchBtn.disabled = true;
        }
    }
    
    getDebugInfo() {
        return {
            isConnected: this.isConnected,
            connectorDebugInfo: this.connector ? this.connector.getDebugInfo() : null,
            userAgent: navigator.userAgent,
            timestamp: new Date().toISOString()
        };
    }
}

// 导出类
window.CameraForceConnector = CameraForceConnector;
window.CameraConnectionManager = CameraConnectionManager;