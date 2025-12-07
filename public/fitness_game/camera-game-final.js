// 最终版本 - 结合v2的连接稳定性和当前版本的防闪烁机制
class FitRhythmCameraGameFinal {
    constructor() {
        // 游戏状态
        this.gameState = 'ready';
        this.currentPhase = 'prepare';
        this.currentRound = 1;
        this.totalRounds = 5;
        this.timeRemaining = 300;
        this.phaseTimeRemaining = 0;
        
        // 游戏数据
        this.score = 0;
        this.combo = 0;
        this.maxCombo = 0;
        this.calories = 0;
        this.weight = 60;
        this.gameMode = 'modeA';
        
        // 性能优化
        this.targetFPS = 25;
        this.frameInterval = 1000 / this.targetFPS;
        this.lastFrameTime = 0;
        this.detectionInterval = 150;
        this.lastDetectionTime = 0;
        
        // 动作识别
        this.currentAction = null;
        this.landmarks = null;
        this.isActionCorrect = false;
        this.detectionBuffer = [];
        this.bufferSize = 3;
        
        // MediaPipe
        this.pose = null;
        this.video = null;
        this.camera = null;
        this.isCameraConnected = false;
        this.currentCamera = 'user';
        
        // DOM元素
        this.videoElement = document.getElementById('video');
        this.skeletonCanvas = document.getElementById('skeletonCanvas');
        
        // 动作定义
        this.actions = [
            { name: '深蹲', key: 'squat', icon: 'squat-icon.png', met: 5.0, instruction: '下蹲至大腿接近平行后站起' },
            { name: '开合跳', key: 'jumpingJack', icon: 'jumping-jack-icon.png', met: 8.0, instruction: '双臂上举同时双腿分开再合拢' },
            { name: '弓步', key: 'lunge', icon: 'lunge-icon.png', met: 6.0, instruction: '一脚前跨双膝约90°后返回' },
            { name: '高抬腿', key: 'highKnees', icon: 'high-knees-icon.png', met: 7.0, instruction: '交替抬膝至髋部高度' }
        ];
        this.keyToResultKey = { squat: 'isSquatting', jumpingJack: 'isJumpingJack', lunge: 'isLunging', highKnees: 'isHighKnee' };
        
        this.init();
    }
    
    init() {
        this.setupEventListeners();
        this.loadLeaderboards();
        this.updateDisplay();
        this.initMediaPipe();
        this.setupCanvas();
        this.startStableRenderLoop();
        this.renderActionRequirements();
        this.updateModeDesc();
    }
    
    setupCanvas() {
        const ctx = this.skeletonCanvas.getContext('2d');
        ctx.imageSmoothingEnabled = false; // 关键：禁用图像平滑减少闪烁
        ctx.imageSmoothingQuality = 'low';
        ctx.translate(0.5, 0.5);
        ctx.lineWidth = 2;
        ctx.lineCap = 'butt';
        ctx.lineJoin = 'miter';
    }
    
    setupEventListeners() {
        // 摄像头控制
        document.getElementById('connectCameraBtn').addEventListener('click', () => this.connectCamera());
        document.getElementById('switchCameraBtn').addEventListener('click', () => this.switchCamera());
        
        // 游戏控制
        document.getElementById('startBtn').addEventListener('click', () => this.startCalibration());
        document.getElementById('pauseBtn').addEventListener('click', () => this.pauseGame());
        document.getElementById('endBtn').addEventListener('click', () => this.endGame());
        
        // 校准控制
        document.getElementById('completeCalibrationBtn').addEventListener('click', () => this.completeCalibration());
        
        // 设置面板
        const weightSlider = document.getElementById('weightSlider');
        weightSlider.addEventListener('input', (e) => {
            this.weight = parseInt(e.target.value);
            document.getElementById('weightDisplay').textContent = this.weight;
        });
        
        // 游戏模式
        document.querySelectorAll('input[name="gameMode"]').forEach(radio => {
            radio.addEventListener('change', (e) => {
                this.gameMode = e.target.value;
                this.totalRounds = this.gameMode === 'modeA' ? 5 : 4;
                document.getElementById('totalRounds').textContent = this.totalRounds;
                this.updateModeDesc();
            });
        });
        
        // 窗口大小变化处理
        window.addEventListener('resize', () => this.handleResize());
        
        // 错误处理
        this.videoElement.addEventListener('error', (e) => {
            console.error('Video error:', e);
            this.handleVideoError();
        });

        // 模态框按钮事件
        const playAgainBtn = document.getElementById('playAgainBtn');
        if (playAgainBtn) {
            playAgainBtn.addEventListener('click', () => {
                document.getElementById('gameOverModal').classList.add('d-none');
                this.resetGame();
                this.startGame();
            });
        }
        const viewRankBtn = document.getElementById('viewRankBtn');
        if (viewRankBtn) {
            viewRankBtn.addEventListener('click', () => {
                document.getElementById('gameOverModal').classList.add('d-none');
                const el = document.getElementById('historyLeaderboard');
                if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
            });
        }
        const closeErrorBtn = document.getElementById('closeErrorBtn');
        if (closeErrorBtn) {
            closeErrorBtn.addEventListener('click', () => {
                const em = document.getElementById('errorModal');
                if (em) em.classList.add('d-none');
            });
        }
    }
    
    async initMediaPipe() {
        try {
            this.pose = new Pose({
                locateFile: (file) => {
                    return `https://cdn.jsdelivr.net/npm/@mediapipe/pose@0.5.1675469404/${file}`;
                }
            });
            
            // 使用最轻量级的配置
            this.pose.setOptions({
                modelComplexity: 0,        // 最简单的模型
                smoothLandmarks: true,     // 保持平滑
                enableSegmentation: false,
                smoothSegmentation: false,
                minDetectionConfidence: 0.5,
                minTrackingConfidence: 0.3  // 降低跟踪要求
            });
            
            this.pose.onResults((results) => {
                this.onPoseResults(results);
            });
            
        } catch (error) {
            console.error('MediaPipe初始化失败:', error);
            this.showError('MediaPipe初始化失败，请刷新页面重试');
        }
    }
    
    // 直接复制v2版本的connectCamera方法，这个版本能稳定连接
    async connectCamera() {
        if (this.isCameraConnected) {
            console.log('摄像头已连接');
            return;
        }

        // 检查安全上下文（HTTPS或localhost）
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            const error = new Error('Secure Context Required');
            error.name = 'SecureContextRequired';
            this.analyzeConnectionError(error);
            return;
        }
        
        try {
            this.updateCameraStatus('loading', '摄像头连接中...');
            
            // 方法1: 直接尝试连接（v2版本的核心逻辑）
            const constraints = {
                video: {
                    width: { ideal: 640, max: 1280 },
                    height: { ideal: 480, max: 720 },
                    frameRate: { ideal: 25, max: 30 },
                    facingMode: this.currentCamera
                },
                audio: false
            };
            
            console.log('尝试连接摄像头，参数:', constraints);
            
            const stream = await navigator.mediaDevices.getUserMedia(constraints);
            this.videoElement.srcObject = stream;
            
            console.log('媒体流获取成功');
            
            // 等待视频加载完成
            await this.waitForVideoLoad();
            
            console.log('视频加载完成');
            
            // 连接成功后的处理
            this.handleCameraConnected();
            
        } catch (error) {
            console.error('摄像头连接失败:', error);
            this.updateCameraStatus('disconnected', '摄像头连接失败');
            this.showError('无法访问摄像头，请检查权限设置');
            
            // 方法2: 使用降级约束重试
            await this.retryWithFallbackConstraints(error);
        }
    }
    
    async waitForVideoLoad() {
        return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                reject(new Error('视频加载超时'));
            }, 10000);
            
            this.videoElement.addEventListener('loadedmetadata', () => {
                console.log('视频元数据加载完成');
                clearTimeout(timeout);
                resolve();
            });
            
            this.videoElement.addEventListener('error', (e) => {
                console.error('视频错误:', e);
                clearTimeout(timeout);
                reject(new Error('视频加载错误'));
            });
        });
    }
    
    handleCameraConnected() {
        this.isCameraConnected = true;
        this.updateCameraStatus('connected', '摄像头已连接');
        document.getElementById('startBtn').disabled = false;
        document.getElementById('switchCameraBtn').disabled = false;
        
        // 设置视频属性
        this.videoElement.style.objectFit = 'contain';
        this.videoElement.style.transform = 'scaleX(-1)';
        
        // 调整Canvas大小
        this.updateCanvasSize();
        
        // 启动MediaPipe
        this.startMediaPipe();
    }
    
    async retryWithFallbackConstraints(originalError) {
        console.log('使用降级约束重试连接...');
        
        try {
            // 使用最简化的约束
            const fallbackConstraints = {
                video: true,
                audio: false
            };
            
            const stream = await navigator.mediaDevices.getUserMedia(fallbackConstraints);
            this.videoElement.srcObject = stream;
            
            await this.waitForVideoLoad();
            this.handleCameraConnected();
            
            console.log('降级连接成功');
            
        } catch (fallbackError) {
            console.error('降级连接也失败:', fallbackError);
            this.analyzeConnectionError(originalError);
        }
    }
    
    analyzeConnectionError(error) {
        console.error('分析连接错误:', error);
        
        let userMessage = '摄像头连接失败。';
        
        if (error.name === 'SecureContextRequired') {
            userMessage = '浏览器安全限制：摄像头功能仅在 HTTPS 协议或 localhost 本地环境下可用。如果您已部署到服务器，请配置 HTTPS 证书。';
        } else if (error.name === 'NotAllowedError' || error.message.includes('Permission denied')) {
            userMessage = '请允许网站访问您的摄像头。点击地址栏的摄像头图标，选择"总是允许"。';
        } else if (error.name === 'NotFoundError' || error.message.includes('NotFoundError')) {
            userMessage = '未找到摄像头设备。请检查摄像头是否连接正常。';
        } else if (error.name === 'NotReadableError' || error.message.includes('NotReadableError')) {
            userMessage = '摄像头被其他应用占用。请关闭可能使用摄像头的应用，如Zoom、Teams等。';
        } else if (error.name === 'OverconstrainedError') {
            userMessage = '摄像头不支持所需的分辨率或帧率。';
        } else if (error.message.includes('timeout')) {
            userMessage = '摄像头连接超时。请检查设备性能和网络状况。';
        }
        
        this.showDetailedError(userMessage, error);
    }
    
    async switchCamera() {
        if (!this.isCameraConnected) {
            console.log('摄像头未连接，无法切换');
            return;
        }
        
        try {
            // 停止当前流
            if (this.currentStream) {
                this.currentStream.getTracks().forEach(track => track.stop());
            }
            
            if (this.camera) {
                this.camera.stop();
            }
            
            // 切换摄像头
            this.currentCamera = this.currentCamera === 'user' ? 'environment' : 'user';
            
            // 重新连接
            await this.connectCamera();
            
        } catch (error) {
            console.error('切换摄像头失败:', error);
            this.showError('切换摄像头失败');
        }
    }
    
    startMediaPipe() {
        if (this.pose && this.isCameraConnected) {
            this.camera = new Camera(this.videoElement, {
                onFrame: async () => {
                    const now = Date.now();
                    if (now - this.lastDetectionTime >= this.detectionInterval) {
                        this.lastDetectionTime = now;
                        await this.pose.send({ image: this.videoElement });
                    }
                },
                width: this.videoElement.videoWidth || 640,
                height: this.videoElement.videoHeight || 480
            });
            this.camera.start();
            
            console.log('MediaPipe已启动');
        }
    }
    
    updateCanvasSize() {
        if (!this.videoElement.videoWidth) return;
        
        const rect = this.videoElement.getBoundingClientRect();
        this.skeletonCanvas.width = rect.width;
        this.skeletonCanvas.height = rect.height;
        
        // 重新设置Canvas属性
        this.setupCanvas();
    }
    
    handleResize() {
        clearTimeout(this.resizeTimeout);
        this.resizeTimeout = setTimeout(() => {
            this.updateCanvasSize();
        }, 300);
    }
    
    handleVideoError() {
        console.error('视频播放错误，尝试重新连接');
        
        setTimeout(() => {
            if (!this.isCameraConnected) {
                this.connectCamera();
            }
        }, 2000);
    }
    
    startStableRenderLoop() {
        const render = (currentTime) => {
            // 控制渲染频率
            if (currentTime - this.lastFrameTime >= this.frameInterval) {
                this.lastFrameTime = currentTime;
                this.renderStableFrame();
            }
            
            requestAnimationFrame(render);
        };
        
        requestAnimationFrame(render);
    }
    
    renderStableFrame() {
        const ctx = this.skeletonCanvas.getContext('2d');
        
        // 清空画布 - 使用更高效的清空方式
        ctx.clearRect(-0.5, -0.5, this.skeletonCanvas.width + 1, this.skeletonCanvas.height + 1);
        
        // 绘制骨架
        if (this.landmarks) {
            const isResting = this.currentPhase === 'rest';
            this.drawUltraStableSkeleton(ctx, this.landmarks, this.isActionCorrect, isResting);
        }
    }
    
    onPoseResults(results) {
        if (!results.poseLandmarks) {
            this.landmarks = null;
            return;
        }
        
        this.landmarks = results.poseLandmarks;
        
        // 检测当前动作
        if (this.gameState === 'playing' && this.currentPhase === 'exercise' && this.currentAction) {
            this.detectCurrentAction();
        }
    }
    
    detectCurrentAction() {
        if (!this.landmarks || !this.currentAction) return;
        
        let detectionResult = null;
        let resultKey = '';
        
        switch (this.currentAction.key) {
            case 'squat':
                detectionResult = this.detectSquat(this.landmarks);
                resultKey = 'isSquatting';
                break;
            case 'jumpingJack':
                detectionResult = this.detectJumpingJack(this.landmarks);
                resultKey = 'isJumpingJack';
                break;
            case 'lunge':
                detectionResult = this.detectLunge(this.landmarks);
                resultKey = 'isLunging';
                break;
            case 'highKnees':
                detectionResult = this.detectHighKnees(this.landmarks);
                resultKey = 'isHighKnee';
                break;
        }
        this.lastDetectionKey = resultKey;
        
        if (detectionResult) {
            this.addToBuffer(detectionResult[resultKey]);
            this.isActionCorrect = this.getStableResult();
        }
    }
    
    drawUltraStableSkeleton(ctx, landmarks, isCorrect = true, isResting = false) {
        if (!landmarks || landmarks.length === 0) return;

        // 设置颜色
        let strokeColor, fillColor;
        if (isResting) {
            strokeColor = '#00d4ff';
            fillColor = '#00d4ff';
        } else if (isCorrect) {
            strokeColor = '#00ff88';
            fillColor = '#00ff88';
        } else {
            strokeColor = '#ff4757';
            fillColor = '#ff4757';
        }

        ctx.strokeStyle = strokeColor;
        ctx.fillStyle = fillColor;

        // 预计算坐标
        const vw = this.videoElement.videoWidth || 640;
        const vh = this.videoElement.videoHeight || 480;
        const cw = this.skeletonCanvas.width;
        const ch = this.skeletonCanvas.height;
        const scale = Math.min(cw / vw, ch / vh);
        const drawW = vw * scale;
        const drawH = vh * scale;
        const offsetX = (cw - drawW) / 2;
        const offsetY = (ch - drawH) / 2;

        const points = landmarks.map((landmark, index) => ({
            index,
            x: offsetX + landmark.x * drawW,
            y: offsetY + landmark.y * drawH,
            visibility: landmark.visibility
        })).filter(point => point.visibility > 0.5);

        // 定义连接关系
        const connections = [
            [11, 12], [11, 13], [13, 15], [12, 14], [14, 16], // 手臂
            [11, 23], [12, 24], [23, 24], [23, 25], [25, 27], // 腿部
            [24, 26], [26, 28]  // 腿部
        ];

        // 批量绘制连接线
        ctx.beginPath();
        connections.forEach(connection => {
            const [startIdx, endIdx] = connection;
            const start = points.find(p => p.index === startIdx);
            const end = points.find(p => p.index === endIdx);
            
            if (start && end) {
                ctx.moveTo(start.x, start.y);
                ctx.lineTo(end.x, end.y);
            }
        });
        ctx.stroke();

        // 批量绘制关键点
        ctx.beginPath();
        points.forEach(point => {
            ctx.moveTo(point.x + 3, point.y);
            ctx.arc(point.x, point.y, 3, 0, 2 * Math.PI);
        });
        ctx.fill();
    }
    
    // 超稳定的动作检测算法
    detectSquat(landmarks) {
        const leftHip = landmarks[POSE_LANDMARKS.LEFT_HIP];
        const leftKnee = landmarks[POSE_LANDMARKS.LEFT_KNEE];
        const leftAnkle = landmarks[POSE_LANDMARKS.LEFT_ANKLE];
        const rightHip = landmarks[POSE_LANDMARKS.RIGHT_HIP];
        const rightKnee = landmarks[POSE_LANDMARKS.RIGHT_KNEE];
        const rightAnkle = landmarks[POSE_LANDMARKS.RIGHT_ANKLE];
        
        const leftAngle = this.calculateAngleOptimized(leftHip, leftKnee, leftAnkle);
        const rightAngle = this.calculateAngleOptimized(rightHip, rightKnee, rightAnkle);
        
        const isSquatting = leftAngle < 140 && leftAngle > 60 && rightAngle < 140 && rightAngle > 60;
        const confidence = Math.min(leftKnee.visibility, rightKnee.visibility);
        
        return { isSquatting, confidence: confidence > 0.6 ? confidence : 0 };
    }
    
    detectJumpingJack(landmarks) {
        const leftShoulder = landmarks[POSE_LANDMARKS.LEFT_SHOULDER];
        const rightShoulder = landmarks[POSE_LANDMARKS.RIGHT_SHOULDER];
        const leftWrist = landmarks[POSE_LANDMARKS.LEFT_WRIST];
        const rightWrist = landmarks[POSE_LANDMARKS.RIGHT_WRIST];
        const leftAnkle = landmarks[POSE_LANDMARKS.LEFT_ANKLE];
        const rightAnkle = landmarks[POSE_LANDMARKS.RIGHT_ANKLE];
        
        // Hands must be above shoulders (Y is smaller)
        const handsUp = leftWrist.y < leftShoulder.y && rightWrist.y < rightShoulder.y;
        // Legs must be wide
        const shoulderWidth = Math.abs(leftShoulder.x - rightShoulder.x);
        const ankleWidth = Math.abs(leftAnkle.x - rightAnkle.x);
        const legsWide = ankleWidth > shoulderWidth * 1.5;
        
        const isJumpingJack = handsUp && legsWide;
        const confidence = Math.min(leftWrist.visibility, rightWrist.visibility, leftAnkle.visibility, rightAnkle.visibility);
        
        return { isJumpingJack, confidence: confidence > 0.6 ? confidence : 0 };
    }
    
    detectLunge(landmarks) {
        const leftHip = landmarks[POSE_LANDMARKS.LEFT_HIP];
        const leftKnee = landmarks[POSE_LANDMARKS.LEFT_KNEE];
        const leftAnkle = landmarks[POSE_LANDMARKS.LEFT_ANKLE];
        const rightHip = landmarks[POSE_LANDMARKS.RIGHT_HIP];
        const rightKnee = landmarks[POSE_LANDMARKS.RIGHT_KNEE];
        const rightAnkle = landmarks[POSE_LANDMARKS.RIGHT_ANKLE];
        
        const leftAngle = this.calculateAngleOptimized(leftHip, leftKnee, leftAnkle);
        const rightAngle = this.calculateAngleOptimized(rightHip, rightKnee, rightAnkle);
        
        // One leg bent significantly (< 110), the other might be straight or bent
        const isLunging = (leftAngle < 110 && leftAngle > 60) || (rightAngle < 110 && rightAngle > 60);
        const confidence = Math.min(leftKnee.visibility, rightKnee.visibility);
        
        return { isLunging, confidence: confidence > 0.6 ? confidence : 0 };
    }
    
    detectHighKnees(landmarks) {
        const leftHip = landmarks[POSE_LANDMARKS.LEFT_HIP];
        const leftKnee = landmarks[POSE_LANDMARKS.LEFT_KNEE];
        const rightHip = landmarks[POSE_LANDMARKS.RIGHT_HIP];
        const rightKnee = landmarks[POSE_LANDMARKS.RIGHT_KNEE];
        
        // Check relative height of knee vs hip
        // Knee Y should be close to Hip Y (or smaller/higher)
        // Normal standing: Knee Y >> Hip Y (e.g. 0.8 vs 0.5)
        // High knee: Knee Y ~= Hip Y (e.g. 0.5 vs 0.5)
        
        const leftLift = (leftKnee.y - leftHip.y) < 0.15; // Threshold for "high enough"
        const rightLift = (rightKnee.y - rightHip.y) < 0.15;
        
        const isHighKnee = leftLift || rightLift;
        const confidence = Math.min(leftKnee.visibility, rightKnee.visibility);
        
        return { isHighKnee, confidence: confidence > 0.6 ? confidence : 0 };
    }
    
    // 超优化的数学计算
    calculateAngleOptimized(a, b, c) {
        const abx = b.x - a.x;
        const aby = b.y - a.y;
        const cbx = b.x - c.x;
        const cby = b.y - c.y;
        
        const dot = abx * cbx + aby * cby;
        const cross = abx * cby - aby * cbx;
        
        let angle = Math.atan2(Math.abs(cross), dot);
        return angle * 180 / Math.PI;
    }
    
    calculateDistanceOptimized(a, b) {
        const dx = a.x - b.x;
        const dy = a.y - b.y;
        return Math.sqrt(dx * dx + dy * dy);
    }
    
    addToBuffer(result) {
        this.detectionBuffer.push(result);
        if (this.detectionBuffer.length > this.bufferSize) {
            this.detectionBuffer.shift();
        }
    }
    
    getStableResult() {
        if (this.detectionBuffer.length < this.bufferSize) {
            return false;
        }
        
        const trueCount = this.detectionBuffer.filter(r => r).length;
        return trueCount >= this.bufferSize * 0.6;
    }
    
    // 游戏逻辑（简化版本，专注于稳定性）
    startCalibration() {
        if (!this.isCameraConnected) {
            this.showError('请先连接摄像头');
            return;
        }
        
        this.gameState = 'calibrating';
        document.getElementById('calibrationOverlay').classList.remove('hidden');
        
        anime({
            targets: '#calibrationOverlay',
            opacity: [0, 1],
            duration: 500,
            easing: 'easeOutQuart'
        });
    }
    
    completeCalibration() {
        var lm = this.landmarks || [];
        var vis = lm.filter(function(p){ return p && (p.visibility === undefined || p.visibility > 0.3); });
        if (vis.length < 5) {
            this.showError('未检测到人体，请站到画面内');
            return;
        }
        this.gameState = 'ready';
        document.getElementById('calibrationOverlay').classList.add('hidden');
        this.showSuccess('校准完成，开始训练');
        this.startGame();
    }
    
    startGame() {
        if (this.gameState !== 'ready') return;
        
        this.gameState = 'playing';
        this.currentPhase = 'exercise';
        this.currentRound = 1;
        this.timeRemaining = 300;
        this.phaseTimeRemaining = this.gameMode === 'modeA' ? 30 : 45;
        
        document.getElementById('startBtn').disabled = true;
        document.getElementById('pauseBtn').disabled = false;
        document.getElementById('endBtn').disabled = false;
        
        document.getElementById('actionGuide').classList.remove('hidden');
        
        this.startGameLoop();
        this.scheduleNextAction();
        
        anime({
            targets: '#actionGuide',
            opacity: [0, 1],
            translateY: [50, 0],
            duration: 500,
            easing: 'easeOutBack'
        });
    }
    
    pauseGame() {
        if (this.gameState === 'playing') {
            this.gameState = 'paused';
            document.getElementById('pauseBtn').textContent = '继续';
            document.getElementById('currentPhase').textContent = '已暂停';
            document.getElementById('currentPhase').className = 'text-lg font-semibold text-yellow-400 mb-2';
        } else if (this.gameState === 'paused') {
            this.gameState = 'playing';
            document.getElementById('pauseBtn').textContent = '暂停';
            this.updatePhaseDisplay();
        }
    }
    
    endGame() {
        this.gameState = 'ended';
        this.showGameOver();
    }
    
    startGameLoop() {
        this.gameLoop = setInterval(() => {
            if (this.gameState === 'playing') {
                this.updateTimer();
                this.checkActionTiming();
            }
        }, 50);
    }
    
    updateTimer() {
        this.timeRemaining -= 0.05;
        this.phaseTimeRemaining -= 0.05;
        
        if (this.timeRemaining <= 0) {
            this.timeRemaining = 0;
            this.gameState = 'ended';
            this.showGameOver();
            return;
        }
        
        if (this.phaseTimeRemaining <= 0) {
            this.switchPhase();
        }
        
        this.updateDisplay();
    }
    
    switchPhase() {
        if (this.currentPhase === 'exercise') {
            this.currentPhase = 'rest';
            this.phaseTimeRemaining = 30;
            this.combo = Math.max(0, this.combo - 3);
            this.hideCurrentAction();
            this.showRestOverlay();
        } else if (this.currentPhase === 'rest') {
            this.currentPhase = 'exercise';
            this.phaseTimeRemaining = this.gameMode === 'modeA' ? 30 : 45;
            this.currentRound++;
            this.scheduleNextAction();
        }
        
        this.updatePhaseDisplay();
    }
    
    updatePhaseDisplay() {
        const phaseElement = document.getElementById('currentPhase');
        if (this.currentPhase === 'exercise') {
            phaseElement.textContent = `第${this.currentRound}轮训练`;
            phaseElement.className = 'text-lg font-semibold text-green-400 mb-2';
        } else if (this.currentPhase === 'rest') {
            phaseElement.textContent = '休息时间';
            phaseElement.className = 'text-lg font-semibold text-blue-400 mb-2';
        }
    }
    
    scheduleNextAction() {
        if (this.currentPhase === 'exercise' && this.gameState === 'playing') {
            this.selectRandomAction();
            this.showCurrentAction();
            this.isActionCorrect = false;
            this.detectionBuffer = [];
        }
    }
    
    selectRandomAction() {
        this.currentAction = this.actions[Math.floor(Math.random() * this.actions.length)];
    }
    
    showCurrentAction() {
        const iconElement = document.getElementById('currentActionIcon');
        const nameElement = document.getElementById('currentActionName');
        const instructionElement = document.getElementById('actionInstruction');
        
        iconElement.src = `/fitness_game/${this.currentAction.icon}`;
        document.getElementById('actionGuide').classList.remove('hidden');
        nameElement.textContent = this.currentAction.name;
        instructionElement.textContent = this.currentAction.instruction;
        const items = document.querySelectorAll('#actionsList .list-group-item');
        items.forEach(el => {
            const k = el.getAttribute('data-key');
            if (k === this.currentAction.key) el.classList.add('active');
            else el.classList.remove('active');
        });
        
        const rhythmBar = document.getElementById('rhythmBar');
        rhythmBar.style.opacity = '1';
        
        // Add fallback for image error
        iconElement.onerror = () => {
             iconElement.src = 'https://via.placeholder.com/64?text=' + this.currentAction.name;
        };
        
        anime({
            targets: iconElement,
            scale: [0, 1],
            rotate: [0, 360],
            opacity: [0, 1],
            duration: 500,
            easing: 'easeOutBack'
        });
    }

    showRestOverlay() {
        const iconElement = document.getElementById('currentActionIcon');
        const nameElement = document.getElementById('currentActionName');
        const instructionElement = document.getElementById('actionInstruction');
        const rhythmBar = document.getElementById('rhythmBar');
        document.getElementById('actionGuide').classList.remove('hidden');
        iconElement.style.opacity = '0';
        rhythmBar.style.opacity = '0';
        nameElement.textContent = '休息';
        instructionElement.textContent = '请稍作休息，保持呼吸';
    }

    renderActionRequirements() {
        const list = document.getElementById('actionsList');
        if (!list) return;
        list.innerHTML = '';
        this.actions.forEach(a => {
            const item = document.createElement('div');
            item.className = 'list-group-item d-flex align-items-center';
            item.setAttribute('data-key', a.key);
            item.innerHTML = `
                <img src="/fitness_game/${a.icon}" alt="${a.name}" style="width:32px;height:32px;" class="me-2" onerror="this.src='https://via.placeholder.com/32?text=Action'"/>
                <div>
                    <div class="fw-bold">${a.name}</div>
                    <div class="text-muted small">${a.instruction}</div>
                </div>
            `;
            list.appendChild(item);
        });
    }

    updateModeDesc() {
        const el = document.getElementById('modeDesc');
        if (!el) return;
        const work = this.gameMode === 'modeA' ? 30 : 45;
        const rest = 30;
        const rounds = this.totalRounds;
        el.textContent = `${work}s动作 + ${rest}s休息 × ${rounds}轮`;
    }
    
    hideCurrentAction() {
        const iconElement = document.getElementById('currentActionIcon');
        iconElement.style.opacity = '0';
        
        const rhythmBar = document.getElementById('rhythmBar');
        rhythmBar.style.opacity = '0';
    }
    
    checkActionTiming() {
        if (this.currentPhase === 'exercise' && this.currentAction && this.landmarks) {
            const expectedKey = this.keyToResultKey[this.currentAction.key];
            if (this.isActionCorrect && this.lastDetectionKey === expectedKey) {
                this.registerPerfect();
                this.isActionCorrect = false;
                this.detectionBuffer = [];
            }
        }
    }
    
    registerPerfect() {
        this.perfectCount++;
        this.combo++;
        this.maxCombo = Math.max(this.maxCombo, this.combo);
        
        const baseScore = 100;
        const multiplier = this.getComboMultiplier();
        const score = Math.floor(baseScore * multiplier);
        this.score += score;
        
        this.addCalories(this.currentAction.met);
        this.showScorePopup(score, 'perfect');
        this.updateDisplay();
        
        this.createHitEffect('#00ff88');
    }
    
    getComboMultiplier() {
        if (this.combo >= 20) return 5.0;
        if (this.combo >= 15) return 4.0;
        if (this.combo >= 10) return 3.0;
        if (this.combo >= 5) return 2.0;
        return 1.0;
    }
    
    addCalories(metValue) {
        const timeHours = 2.0 / 3600;
        const calories = metValue * this.weight * timeHours * 1.05;
        this.calories += calories;
    }
    
    showScorePopup(score, type) {
        const popup = document.createElement('div');
        popup.className = `score-popup ${type}`;
        popup.textContent = type === 'miss' ? 'MISS' : `+${score}`;
        
        const x = Math.random() * (window.innerWidth - 200) + 100;
        const y = Math.random() * (window.innerHeight - 200) + 100;
        
        popup.style.left = `${x}px`;
        popup.style.top = `${y}px`;
        
        document.body.appendChild(popup);
        
        anime({
            targets: popup,
            translateY: [-50, -100],
            opacity: [1, 0],
            scale: [1, 1.5],
            duration: 1500,
            easing: 'easeOutQuart',
            complete: () => {
                if (document.body.contains(popup)) {
                    document.body.removeChild(popup);
                }
            }
        });
    }
    
    createHitEffect(color) {
        anime({
            targets: '#skeletonCanvas',
            boxShadow: [`0 0 30px ${color}`, '0 0 10px rgba(0, 212, 255, 0.3)'],
            duration: 300,
            direction: 'alternate',
            easing: 'easeInOutQuad'
        });
    }
    
    updateDisplay() {
        const minutes = Math.floor(this.timeRemaining / 60);
        const seconds = Math.floor(this.timeRemaining % 60);
        document.getElementById('countdownDisplay').textContent = 
            `${minutes}:${seconds.toString().padStart(2, '0')}`;
        
        const progress = (300 - this.timeRemaining) / 300;
        const circumference = 2 * Math.PI * 35;
        const offset = circumference - (progress * circumference);
        document.getElementById('progressCircle').style.strokeDashoffset = offset;
        
        document.getElementById('currentRound').textContent = this.currentRound;
        document.getElementById('scoreDisplay').textContent = this.score;
        document.getElementById('comboCount').textContent = this.combo;
        document.getElementById('comboMultiplier').textContent = `${this.getComboMultiplier().toFixed(1)}x`;
        document.getElementById('caloriesDisplay').textContent = Math.floor(this.calories);
    }
    
    showGameOver() {
        if (this.gameLoop) {
            clearInterval(this.gameLoop);
        }
        
        const totalHits = this.perfectCount + this.goodCount + this.missCount;
        const accuracy = totalHits > 0 ? Math.round(((this.perfectCount + this.goodCount) / totalHits) * 100) : 0;
        
        document.getElementById('finalScore').textContent = this.score;
        document.getElementById('maxCombo').textContent = this.maxCombo;
        document.getElementById('totalCalories').textContent = Math.floor(this.calories);
        document.getElementById('accuracy').textContent = `${accuracy}%`;
        
        document.getElementById('gameOverModal').classList.remove('d-none');
        this.saveToLeaderboard();
        
        document.getElementById('startBtn').disabled = false;
        document.getElementById('pauseBtn').disabled = true;
        document.getElementById('endBtn').disabled = true;
        document.getElementById('pauseBtn').textContent = '暂停';
    }
    
    resetGame() {
        this.gameState = 'ready';
        this.currentPhase = 'prepare';
        this.currentRound = 1;
        this.timeRemaining = 300;
        this.score = 0;
        this.combo = 0;
        this.maxCombo = 0;
        this.calories = 0;
        this.perfectCount = 0;
        this.goodCount = 0;
        this.missCount = 0;
        this.totalActions = 0;
        this.currentAction = null;
        this.isActionCorrect = false;
        this.detectionBuffer = [];
        
        document.getElementById('currentPhase').textContent = '准备开始';
        document.getElementById('currentPhase').className = 'text-lg font-semibold text-green-400 mb-2';
        this.hideCurrentAction();
        this.updateDisplay();
        document.getElementById('actionGuide').classList.add('hidden');
        
        // Ensure action list is clean and up to date
        this.renderActionRequirements();
        console.log('Interface fully reset');
    }
    
    saveToLeaderboard() {
        const scoreData = {
            score: this.score,
            maxCombo: this.maxCombo,
            calories: Math.floor(this.calories),
            date: new Date().toISOString(),
            weight: this.weight,
            gameMode: this.gameMode
        };
        
        let todayScores = JSON.parse(localStorage.getItem('fitRhythmCameraToday') || '[]');
        todayScores.push(scoreData);
        localStorage.setItem('fitRhythmCameraToday', JSON.stringify(todayScores));
        
        let historyScores = JSON.parse(localStorage.getItem('fitRhythmCameraHistory') || '[]');
        historyScores.push(scoreData);
        localStorage.setItem('fitRhythmCameraHistory', JSON.stringify(historyScores));
        
        const todayHigh = Math.max(...todayScores.map(s => s.score), 0);
        document.getElementById('todayHighScore').textContent = todayHigh;
        
        this.loadLeaderboards();
    }
    
    loadLeaderboards() {
        this.loadTodayLeaderboard();
        this.loadHistoryLeaderboard();
        
        const todayScores = JSON.parse(localStorage.getItem('fitRhythmCameraToday') || '[]');
        const todayHigh = todayScores.length > 0 ? Math.max(...todayScores.map(s => s.score)) : 0;
        document.getElementById('todayHighScore').textContent = todayHigh;
    }
    
    loadTodayLeaderboard() {
        const todayScores = JSON.parse(localStorage.getItem('fitRhythmCameraToday') || '[]');
        const sortedScores = todayScores.sort((a, b) => b.score - a.score).slice(0, 10);
        
        const container = document.getElementById('todayLeaderboard');
        container.innerHTML = '';
        
        if (sortedScores.length === 0) {
            container.innerHTML = '<div class="text-center text-gray-400 py-4">暂无记录</div>';
            return;
        }
        
        sortedScores.forEach((score, index) => {
            const item = document.createElement('div');
            item.className = 'flex justify-between items-center p-2 bg-gray-800 rounded';
            item.innerHTML = `
                <div class="flex items-center space-x-3">
                    <span class="font-bold text-cyan-400">#${index + 1}</span>
                    <span>${score.score}分</span>
                </div>
                <div class="text-sm text-gray-400">
                    ${score.maxCombo}连击 | ${score.calories}卡
                </div>
            `;
            container.appendChild(item);
        });
    }
    
    loadHistoryLeaderboard() {
        const historyScores = JSON.parse(localStorage.getItem('fitRhythmCameraHistory') || '[]');
        const sortedScores = historyScores.sort((a, b) => b.score - a.score).slice(0, 10);
        
        const container = document.getElementById('historyLeaderboard');
        container.innerHTML = '';
        
        if (sortedScores.length === 0) {
            container.innerHTML = '<div class="text-center text-gray-400 py-4">暂无记录</div>';
            return;
        }
        
        sortedScores.forEach((score, index) => {
            const date = new Date(score.date).toLocaleDateString();
            const item = document.createElement('div');
            item.className = 'flex justify-between items-center p-2 bg-gray-800 rounded';
            item.innerHTML = `
                <div class="flex items-center space-x-3">
                    <span class="font-bold text-yellow-400">#${index + 1}</span>
                    <span>${score.score}分</span>
                </div>
                <div class="text-sm text-gray-400">
                    ${date} | ${score.maxCombo}连击
                </div>
            `;
            container.appendChild(item);
        });
    }
    
    updateCameraStatus(status, message) {
        const statusElement = document.getElementById('cameraStatus');
        const indicatorElement = document.getElementById('cameraStatusIndicator');
        
        statusElement.className = `camera-status camera-${status}`;
        statusElement.textContent = message;
        
        indicatorElement.className = `camera-status camera-${status}`;
        indicatorElement.textContent = message;
    }
    
    showDetailedError(userMessage, originalError) {
        const errorPanel = document.createElement('div');
        errorPanel.id = 'cameraErrorPanel';
        errorPanel.className = 'modal-overlay';
        
        errorPanel.innerHTML = `
            <div class="card rounded-2xl p-8 max-w-lg w-full mx-4">
                <div class="text-center">
                    <div class="text-6xl mb-4">📷</div>
                    <h2 class="text-2xl font-bold mb-4 text-red-400">摄像头连接问题</h2>
                    <p class="text-gray-300 mb-6">${userMessage}</p>
                    
                    <div class="text-left mb-6 bg-gray-800 p-4 rounded-lg">
                        <h3 class="text-lg font-semibold text-cyan-400 mb-3">错误详情：</h3>
                        <div class="text-xs text-gray-400 space-y-1">
                            <div>错误类型: ${originalError.name || 'Unknown'}</div>
                            <div>错误信息: ${originalError.message || 'No message'}</div>
                        </div>
                    </div>
                    
                    <div class="space-y-3">
                        <button id="retryCameraConnectionBtn" class="w-full btn-primary text-white font-bold py-3 px-6 rounded-lg">
                            重试连接
                        </button>
                        <button id="closeCameraErrorBtn" class="w-full bg-gray-600 hover:bg-gray-700 text-white font-bold py-3 px-6 rounded-lg">
                            关闭
                        </button>
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(errorPanel);
        
        document.getElementById('retryCameraConnectionBtn').addEventListener('click', () => {
            document.body.removeChild(errorPanel);
            this.connectCamera();
        });
        
        document.getElementById('closeCameraErrorBtn').addEventListener('click', () => {
            document.body.removeChild(errorPanel);
        });
    }
    
    showError(message) {
        document.getElementById('errorMessage').textContent = message;
        document.getElementById('errorModal').classList.remove('d-none');
    }
    
    showSuccess(message) {
        console.log('Success:', message);
    }
}

// 初始化最终版本的游戏
document.addEventListener('DOMContentLoaded', () => {
    const game = new FitRhythmCameraGameFinal();
    
    // 添加页面加载动画
    anime({
        targets: '.card',
        translateY: [50, 0],
        opacity: [0, 1],
        delay: anime.stagger(200),
        duration: 800,
        easing: 'easeOutQuart'
    });
    
    // 标题动画
    anime({
        targets: 'h1',
        scale: [0.8, 1],
        opacity: [0, 1],
        duration: 1000,
        easing: 'easeOutBack'
    });
});