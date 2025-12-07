class FitRhythmCameraGameAuto {
    constructor() {
        this.gameState = 'ready'; // ready, calibrating, playing, paused, completed
        this.currentPhase = 'prepare';
        this.currentRound = 1;
        this.totalRounds = 5;
        this.timeRemaining = 30;
        this.phaseDuration = 30;
        this.restDuration = 30;
        this.score = 0;
        this.combo = 0;
        this.maxCombo = 0;
        this.calories = 0;
        this.weight = 60;
        this.gameMode = 'modeA';
        this.currentAction = 'squat';
        this.actions = ['squat', 'jumpingJacks', 'lunge', 'highKnees', 'pushUps'];
        this.actionIndex = 0;
        this.timer = null;
        this.countdownTimer = null;
        this.gameInterval = null;
        
        // MediaPipe相关
        this.pose = null;
        this.video = null;
        this.canvas = null;
        this.ctx = null;
        this.isMediaPipeReady = false;
        this.mediaPipeLoading = false;
        
        // 动作识别相关
        this.previousLandmarks = null;
        this.isActionDetected = false;
        this.actionStartTime = 0;
        this.calibrationData = null;
        this.isCalibrated = false;
        
        // 自动开始相关
        this.autoStartTimer = null;
        this.calibrationCompleteTime = null;
        
        // 统计
        this.actionStats = {
            squat: { total: 0, correct: 0, accuracy: 0 },
            jumpingJacks: { total: 0, correct: 0, accuracy: 0 },
            lunge: { total: 0, correct: 0, accuracy: 0 },
            highKnees: { total: 0, correct: 0, accuracy: 0 },
            pushUps: { total: 0, correct: 0, accuracy: 0 }
        };
        
        this.init();
    }
    
    init() {
        this.setupElements();
        this.setupEventListeners();
        this.loadGameData();
        this.updateDisplay();
        
        // 初始化调试模块
        if (window.CameraDebugger) {
            this.debugger = new CameraDebugger();
        }
    }
    
    setupElements() {
        this.video = document.getElementById('video');
        this.canvas = document.getElementById('skeletonCanvas');
        this.ctx = this.canvas.getContext('2d');
        
        // 设置画布尺寸
        this.resizeCanvas();
        window.addEventListener('resize', () => this.resizeCanvas());
    }
    
    resizeCanvas() {
        const container = this.video.parentElement;
        const rect = container.getBoundingClientRect();
        this.canvas.width = rect.width;
        this.canvas.height = rect.height;
    }
    
    setupEventListeners() {
        // 摄像头连接
        document.getElementById('connectCameraBtn').addEventListener('click', () => {
            this.connectCamera();
        });
        
        // 切换摄像头
        document.getElementById('switchCameraBtn').addEventListener('click', () => {
            this.switchCamera();
        });
        
        // 开始按钮
        document.getElementById('startBtn').addEventListener('click', () => {
            this.startGame();
        });
        
        // 暂停按钮
        document.getElementById('pauseBtn').addEventListener('click', () => {
            this.pauseGame();
        });
        
        // 结束按钮
        document.getElementById('endBtn').addEventListener('click', () => {
            this.endGame();
        });
        
        // 体重滑块
        document.getElementById('weightSlider').addEventListener('input', (e) => {
            this.weight = parseInt(e.target.value);
            document.getElementById('weightDisplay').textContent = this.weight;
        });
        
        // 游戏模式选择
        document.querySelectorAll('input[name="gameMode"]').forEach(radio => {
            radio.addEventListener('change', (e) => {
                this.gameMode = e.target.value;
                this.updateGameMode();
            });
        });
        
        // 校准完成按钮
        document.getElementById('completeCalibrationBtn').addEventListener('click', () => {
            this.completeCalibration();
        });
        
        // 游戏结束模态框
        document.getElementById('playAgainBtn').addEventListener('click', () => {
            this.resetGame();
            document.getElementById('gameOverModal').classList.add('hidden');
        });
        
        document.getElementById('viewRankBtn').addEventListener('click', () => {
            this.showLeaderboard();
        });
        
        // 错误模态框
        document.getElementById('closeErrorBtn').addEventListener('click', () => {
            document.getElementById('errorModal').classList.add('hidden');
        });
    }
    
    async connectCamera() {
        try {
            this.updateCameraStatus('loading', '连接中...');
            
            // 使用强制连接模块
            if (window.CameraForceConnector) {
                const connector = new CameraForceConnector(
                    this.video,
                    () => this.onCameraConnected(),
                    (error) => this.onCameraError(error)
                );
                await connector.forceConnect();
            } else {
                // 标准连接方式
                const constraints = {
                    video: {
                        width: { ideal: 640, max: 1280 },
                        height: { ideal: 480, max: 720 },
                        frameRate: { ideal: 25, max: 30 }
                    },
                    audio: false
                };
                
                const stream = await navigator.mediaDevices.getUserMedia(constraints);
                this.video.srcObject = stream;
                this.video.muted = true;
                this.video.playsInline = true;
                this.video.autoplay = true;
                
                await this.waitForVideoLoad();
                this.onCameraConnected();
            }
        } catch (error) {
            this.onCameraError(error);
        }
    }
    
    waitForVideoLoad() {
        return new Promise((resolve) => {
            if (this.video.readyState >= 2) {
                resolve();
            } else {
                this.video.addEventListener('loadedmetadata', resolve, { once: true });
            }
        });
    }
    
    onCameraConnected() {
        this.updateCameraStatus('connected', '已连接');
        document.getElementById('connectCameraBtn').disabled = true;
        document.getElementById('switchCameraBtn').disabled = false;
        document.getElementById('startBtn').disabled = false;
        
        // 初始化MediaPipe
        this.initMediaPipe();
        
        // 显示校准界面
        this.showCalibration();
    }
    
    onCameraError(error) {
        console.error('摄像头连接失败:', error);
        this.updateCameraStatus('disconnected', '连接失败');
        this.showError('摄像头连接失败，请检查权限设置');
        
        // 显示调试信息
        if (this.debugger) {
            const guidance = this.debugger.generateUserGuidance();
            console.log('用户指导:', guidance);
        }
    }
    
    updateCameraStatus(status, text) {
        const statusElement = document.getElementById('cameraStatus');
        const indicatorElement = document.getElementById('cameraStatusIndicator');
        
        statusElement.className = `camera-status camera-${status}`;
        statusElement.textContent = text;
        
        indicatorElement.className = `camera-status camera-${status}`;
        indicatorElement.textContent = text;
    }
    
    async initMediaPipe() {
        if (this.mediaPipeLoading || this.isMediaPipeReady) return;
        
        this.mediaPipeLoading = true;
        console.log('开始初始化MediaPipe...');
        
        try {
            this.pose = new Pose({
                locateFile: (file) => {
                    return `https://cdn.jsdelivr.net/npm/@mediapipe/pose@0.5.1675469404/${file}`;
                }
            });
            
            this.pose.setOptions({
                modelComplexity: 0,        // 最简单的模型
                smoothLandmarks: true,
                enableSegmentation: false,
                smoothSegmentation: false,
                minDetectionConfidence: 0.5,
                minTrackingConfidence: 0.3
            });
            
            this.pose.onResults((results) => {
                this.onPoseResults(results);
            });
            
            // 等待MediaPipe准备就绪
            await this.waitForMediaPipeReady();
            
            // 启动摄像头处理
            await this.startCameraProcessing();
            
            this.isMediaPipeReady = true;
            this.mediaPipeLoading = false;
            console.log('MediaPipe初始化完成');
            
        } catch (error) {
            console.error('MediaPipe初始化失败:', error);
            this.mediaPipeLoading = false;
            this.showError('MediaPipe初始化失败，请刷新页面重试');
        }
    }
    
    async waitForMediaPipeReady() {
        return new Promise((resolve) => {
            const checkInterval = setInterval(() => {
                if (this.isMediaPipeReady) {
                    clearInterval(checkInterval);
                    resolve();
                }
            }, 100);
            
            setTimeout(() => {
                clearInterval(checkInterval);
                if (!this.isMediaPipeReady) {
                    console.warn('MediaPipe加载超时，继续执行');
                    resolve();
                }
            }, 10000);
        });
    }
    
    async startCameraProcessing() {
        if (!this.video.srcObject) return;
        
        const camera = new Camera(this.video, {
            onFrame: async () => {
                if (this.pose && this.video.readyState >= 2) {
                    await this.pose.send({ image: this.video });
                }
            },
            width: 640,
            height: 480
        });
        
        await camera.start();
    }
    
    onPoseResults(results) {
        if (!results.poseLandmarks) return;
        
        // 绘制骨架
        this.drawSkeleton(results.poseLandmarks);
        
        // 动作识别
        if (this.gameState === 'playing' && this.currentPhase === 'action') {
            this.detectAction(results.poseLandmarks);
        }
        
        // 校准处理
        if (this.gameState === 'calibrating') {
            this.updateCalibration(results.poseLandmarks);
        }
    }
    
    drawSkeleton(landmarks) {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        const connections = [
            [11, 12], [11, 13], [13, 15], [12, 14], [14, 16], // 手臂
            [11, 23], [12, 24], [23, 24], [23, 25], [25, 27], // 身体
            [24, 26], [26, 28], [27, 29], [28, 30], [29, 31], [30, 32] // 腿部
        ];
        
        const isCorrect = this.isActionCorrect(landmarks);
        const isResting = this.currentPhase === 'rest';
        
        this.ctx.strokeStyle = isCorrect ? '#00ff88' : (isResting ? '#00d4ff' : '#ff4757');
        this.ctx.lineWidth = 3;
        this.ctx.lineCap = 'round';
        
        connections.forEach(([start, end]) => {
            const startPoint = landmarks[start];
            const endPoint = landmarks[end];
            
            if (startPoint && endPoint && startPoint.visibility > 0.5 && endPoint.visibility > 0.5) {
                this.ctx.beginPath();
                this.ctx.moveTo(startPoint.x * this.canvas.width, startPoint.y * this.canvas.height);
                this.ctx.lineTo(endPoint.x * this.canvas.width, endPoint.y * this.canvas.height);
                this.ctx.stroke();
            }
        });
        
        // 绘制关键点
        landmarks.forEach((landmark, index) => {
            if (landmark.visibility > 0.5) {
                this.ctx.fillStyle = isCorrect ? '#00ff88' : (isResting ? '#00d4ff' : '#ff4757');
                this.ctx.beginPath();
                this.ctx.arc(landmark.x * this.canvas.width, landmark.y * this.canvas.height, 4, 0, 2 * Math.PI);
                this.ctx.fill();
            }
        });
    }
    
    showCalibration() {
        this.gameState = 'calibrating';
        document.getElementById('calibrationOverlay').classList.remove('hidden');
        document.getElementById('startBtn').disabled = true;
    }
    
    updateCalibration(landmarks) {
        // 简单的校准逻辑 - 检查是否能看到全身
        const visiblePoints = landmarks.filter(landmark => landmark.visibility > 0.5);
        const requiredPoints = [11, 12, 23, 24, 25, 26, 27, 28]; // 关键身体点
        const hasRequiredPoints = requiredPoints.every(index => landmarks[index] && landmarks[index].visibility > 0.5);
        
        if (hasRequiredPoints && visiblePoints.length >= 15) {
            this.calibrationData = landmarks;
            document.getElementById('completeCalibrationBtn').disabled = false;
        } else {
            document.getElementById('completeCalibrationBtn').disabled = true;
        }
    }
    
    completeCalibration() {
        if (!this.isMediaPipeReady) {
            this.showError('MediaPipe尚未准备好，请稍候...');
            return;
        }
        
        this.gameState = 'ready';
        this.isCalibrated = true;
        this.calibrationCompleteTime = Date.now();
        
        // 隐藏校准界面
        document.getElementById('calibrationOverlay').classList.add('hidden');
        document.getElementById('startBtn').disabled = false;
        
        // 自动开始游戏
        this.autoStartGame();
    }
    
    autoStartGame() {
        console.log('准备自动开始游戏...');
        
        // 显示倒计时
        this.showAutoStartCountdown();
        
        // 3秒后自动开始
        this.autoStartTimer = setTimeout(() => {
            this.startGame();
        }, 3000);
    }
    
    showAutoStartCountdown() {
        const countdownElement = document.createElement('div');
        countdownElement.id = 'autoStartCountdown';
        countdownElement.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
        countdownElement.innerHTML = `
            <div class="card rounded-2xl p-8 text-center">
                <h2 class="text-3xl font-bold text-cyan-400 mb-4">准备开始训练！</h2>
                <div class="text-6xl font-bold text-white mb-4" id="countdownNumber">3</div>
                <p class="text-gray-300">游戏即将自动开始...</p>
            </div>
        `;
        
        document.body.appendChild(countdownElement);
        
        // 倒计时动画
        let count = 3;
        const countdownNumber = document.getElementById('countdownNumber');
        
        const countdownInterval = setInterval(() => {
            count--;
            if (count > 0) {
                countdownNumber.textContent = count;
                anime({
                    targets: countdownNumber,
                    scale: [1.5, 1],
                    duration: 800,
                    easing: 'easeOutElastic(1, .8)'
                });
            } else {
                clearInterval(countdownInterval);
                setTimeout(() => {
                    if (document.body.contains(countdownElement)) {
                        document.body.removeChild(countdownElement);
                    }
                }, 500);
            }
        }, 1000);
    }
    
    startGame() {
        if (this.gameState === 'playing') return;
        
        this.gameState = 'playing';
        this.currentPhase = 'action';
        this.currentRound = 1;
        this.timeRemaining = this.phaseDuration;
        this.score = 0;
        this.combo = 0;
        this.maxCombo = 0;
        this.calories = 0;
        this.actionIndex = 0;
        
        // 重置统计
        Object.keys(this.actionStats).forEach(action => {
            this.actionStats[action] = { total: 0, correct: 0, accuracy: 0 };
        });
        
        this.updateGameMode();
        this.updateDisplay();
        this.showActionGuide();
        
        // 启用控制按钮
        document.getElementById('pauseBtn').disabled = false;
        document.getElementById('endBtn').disabled = false;
        document.getElementById('startBtn').disabled = true;
        
        // 开始游戏循环
        this.startGameLoop();
    }
    
    updateGameMode() {
        if (this.gameMode === 'modeA') {
            this.phaseDuration = 30;
            this.restDuration = 30;
            this.totalRounds = 5;
        } else if (this.gameMode === 'modeB') {
            this.phaseDuration = 45;
            this.restDuration = 30;
            this.totalRounds = 4;
        }
        
        document.getElementById('totalRounds').textContent = this.totalRounds;
    }
    
    startGameLoop() {
        this.gameInterval = setInterval(() => {
            this.updateTime();
        }, 1000);
    }
    
    updateTime() {
        this.timeRemaining--;
        
        if (this.timeRemaining <= 0) {
            this.switchPhase();
        }
        
        this.updateDisplay();
    }
    
    switchPhase() {
        if (this.currentPhase === 'action') {
            this.currentPhase = 'rest';
            this.timeRemaining = this.restDuration;
            this.hideActionGuide();
        } else if (this.currentPhase === 'rest') {
            this.currentRound++;
            
            if (this.currentRound > this.totalRounds) {
                this.endGame();
                return;
            }
            
            this.currentPhase = 'action';
            this.timeRemaining = this.phaseDuration;
            this.nextAction();
            this.showActionGuide();
        }
    }
    
    nextAction() {
        this.actionIndex = (this.actionIndex + 1) % this.actions.length;
        this.currentAction = this.actions[this.actionIndex];
    }
    
    showActionGuide() {
        const guide = document.getElementById('actionGuide');
        const icon = document.getElementById('currentActionIcon');
        const name = document.getElementById('currentActionName');
        const instruction = document.getElementById('actionInstruction');
        
        // 设置动作信息
        const actionInfo = this.getActionInfo(this.currentAction);
        icon.src = actionInfo.icon;
        name.textContent = actionInfo.name;
        instruction.textContent = actionInfo.instruction;
        
        guide.classList.remove('hidden');
        
        // 动画显示
        anime({
            targets: icon,
            opacity: [0, 1],
            scale: [0.5, 1],
            duration: 500,
            easing: 'easeOutElastic(1, .8)'
        });
        
        anime({
            targets: '#rhythmBar',
            opacity: [0, 1],
            duration: 500,
            delay: 200
        });
    }
    
    hideActionGuide() {
        const guide = document.getElementById('actionGuide');
        guide.classList.add('hidden');
    }
    
    getActionInfo(action) {
        const actionInfos = {
            squat: {
                name: '深蹲',
                icon: 'squat-icon.png',
                instruction: '下蹲至大腿与地面平行'
            },
            jumpingJacks: {
                name: '开合跳',
                icon: 'jumping-jack-icon.png',
                instruction: '手脚同时开合跳跃'
            },
            lunge: {
                name: '弓步',
                icon: 'lunge-icon.png',
                instruction: '前后腿交替弯曲下蹲'
            },
            highKnees: {
                name: '高抬腿',
                icon: 'high-knees-icon.png',
                instruction: '交替抬膝至腰部高度'
            },
            pushUps: {
                name: '俯卧撑',
                icon: 'pushup-icon.png',
                instruction: '身体保持直线上下运动'
            }
        };
        
        return actionInfos[action] || actionInfos.squat;
    }
    
    detectAction(landmarks) {
        const actionType = this.currentAction;
        const isCorrect = this.checkActionCorrectness(landmarks, actionType);
        
        this.actionStats[actionType].total++;
        
        if (isCorrect) {
            this.actionStats[actionType].correct++;
            this.onActionSuccess();
        } else {
            this.onActionMiss();
        }
        
        this.updateAccuracyDisplay();
    }
    
    checkActionCorrectness(landmarks, actionType) {
        // 简化的动作识别逻辑
        switch (actionType) {
            case 'squat':
                return this.checkSquat(landmarks);
            case 'jumpingJacks':
                return this.checkJumpingJacks(landmarks);
            case 'lunge':
                return this.checkLunge(landmarks);
            case 'highKnees':
                return this.checkHighKnees(landmarks);
            case 'pushUps':
                return this.checkPushUps(landmarks);
            default:
                return false;
        }
    }
    
    checkSquat(landmarks) {
        // 检查深蹲动作
        const leftHip = landmarks[23];
        const rightHip = landmarks[24];
        const leftKnee = landmarks[25];
        const rightKnee = landmarks[26];
        
        if (!leftHip || !rightHip || !leftKnee || !rightKnee) return false;
        
        // 计算膝盖和臀部的角度
        const leftAngle = this.calculateAngle(leftHip, leftKnee, landmarks[27]);
        const rightAngle = this.calculateAngle(rightHip, rightKnee, landmarks[28]);
        
        // 深蹲时膝盖角度应该小于120度
        return leftAngle < 120 && rightAngle < 120;
    }
    
    checkJumpingJacks(landmarks) {
        // 检查开合跳动作
        const leftWrist = landmarks[15];
        const rightWrist = landmarks[16];
        const leftAnkle = landmarks[27];
        const rightAnkle = landmarks[28];
        
        if (!leftWrist || !rightWrist || !leftAnkle || !rightAnkle) return false;
        
        // 检查手脚是否张开
        const armSpread = Math.abs(leftWrist.x - rightWrist.x);
        const legSpread = Math.abs(leftAnkle.x - rightAnkle.x);
        
        return armSpread > 0.3 && legSpread > 0.2;
    }
    
    checkLunge(landmarks) {
        // 检查弓步动作
        const leftKnee = landmarks[25];
        const rightKnee = landmarks[26];
        
        if (!leftKnee || !rightKnee) return false;
        
        // 检查一个膝盖弯曲，另一个相对伸直
        const kneeHeightDiff = Math.abs(leftKnee.y - rightKnee.y);
        return kneeHeightDiff > 0.1;
    }
    
    checkHighKnees(landmarks) {
        // 检查高抬腿动作
        const leftKnee = landmarks[25];
        const rightKnee = landmarks[26];
        const leftHip = landmarks[23];
        const rightHip = landmarks[24];
        
        if (!leftKnee || !rightKnee || !leftHip || !rightHip) return false;
        
        // 检查膝盖是否抬到腰部高度
        const leftHeight = Math.abs(leftKnee.y - leftHip.y);
        const rightHeight = Math.abs(rightKnee.y - rightHip.y);
        
        return leftHeight < 0.1 || rightHeight < 0.1;
    }
    
    checkPushUps(landmarks) {
        // 检查俯卧撑动作
        const leftShoulder = landmarks[11];
        const rightShoulder = landmarks[12];
        const leftElbow = landmarks[13];
        const rightElbow = landmarks[14];
        
        if (!leftShoulder || !rightShoulder || !leftElbow || !rightElbow) return false;
        
        // 检查肘部弯曲角度
        const leftAngle = this.calculateAngle(leftShoulder, leftElbow, landmarks[15]);
        const rightAngle = this.calculateAngle(rightShoulder, rightElbow, landmarks[16]);
        
        return leftAngle < 90 && rightAngle < 90;
    }
    
    calculateAngle(point1, point2, point3) {
        // 计算三点之间的角度
        const a = Math.sqrt(Math.pow(point1.x - point2.x, 2) + Math.pow(point1.y - point2.y, 2));
        const b = Math.sqrt(Math.pow(point2.x - point3.x, 2) + Math.pow(point2.y - point3.y, 2));
        const c = Math.sqrt(Math.pow(point1.x - point3.x, 2) + Math.pow(point1.y - point3.y, 2));
        
        const angle = Math.acos((a * a + b * b - c * c) / (2 * a * b));
        return angle * (180 / Math.PI);
    }
    
    isActionCorrect(landmarks) {
        if (!landmarks || !this.calibrationData) return false;
        
        // 简化的正确性检查
        return this.checkActionCorrectness(landmarks, this.currentAction);
    }
    
    onActionSuccess() {
        const baseScore = 100;
        const comboBonus = Math.floor(this.combo / 10) * 10;
        const totalScore = baseScore + comboBonus;
        
        this.score += totalScore;
        this.combo++;
        this.maxCombo = Math.max(this.maxCombo, this.combo);
        this.calories += 0.5; // 简单的卡路里计算
        
        this.showScorePopup(totalScore, 'perfect');
        this.updateDisplay();
    }
    
    onActionMiss() {
        this.combo = 0;
        this.updateDisplay();
    }
    
    showScorePopup(score, type) {
        const popup = document.createElement('div');
        popup.className = `score-popup ${type}`;
        popup.textContent = `+${score}`;
        popup.style.left = Math.random() * (this.canvas.width - 100) + 50 + 'px';
        popup.style.top = Math.random() * (this.canvas.height - 100) + 50 + 'px';
        
        document.body.appendChild(popup);
        
        anime({
            targets: popup,
            translateY: -50,
            opacity: [1, 0],
            duration: 1000,
            easing: 'easeOutQuad',
            complete: () => {
                if (document.body.contains(popup)) {
                    document.body.removeChild(popup);
                }
            }
        });
    }
    
    updateAccuracyDisplay() {
        Object.keys(this.actionStats).forEach(action => {
            const stats = this.actionStats[action];
            if (stats.total > 0) {
                stats.accuracy = Math.round((stats.correct / stats.total) * 100);
            }
        });
        
        document.getElementById('squatAccuracy').textContent = `${this.actionStats.squat.accuracy}%`;
        document.getElementById('jumpingJackAccuracy').textContent = `${this.actionStats.jumpingJacks.accuracy}%`;
        document.getElementById('lungeAccuracy').textContent = `${this.actionStats.lunge.accuracy}%`;
        document.getElementById('highKneesAccuracy').textContent = `${this.actionStats.highKnees.accuracy}%`;
        document.getElementById('pushUpAccuracy').textContent = `${this.actionStats.pushUps.accuracy}%`;
    }
    
    updateDisplay() {
        // 更新倒计时
        document.getElementById('countdownDisplay').textContent = this.timeRemaining;
        
        // 更新进度环
        const progress = ((this.phaseDuration - this.timeRemaining) / this.phaseDuration) * 283;
        document.getElementById('progressCircle').style.strokeDashoffset = 283 - progress;
        
        // 更新轮次
        document.getElementById('currentRound').textContent = this.currentRound;
        
        // 更新状态
        document.getElementById('currentPhase').textContent = 
            this.currentPhase === 'action' ? '训练中' : '休息中';
        
        // 更新分数
        document.getElementById('scoreDisplay').textContent = this.score;
        
        // 更新连击
        document.getElementById('comboCount').textContent = this.combo;
        document.getElementById('comboMultiplier').textContent = 
            (1 + Math.floor(this.combo / 10) * 0.1).toFixed(1) + 'x';
        
        // 更新卡路里
        document.getElementById('caloriesDisplay').textContent = Math.floor(this.calories);
        
        // 更新今日最高分
        const todayHighScore = this.getTodayHighScore();
        document.getElementById('todayHighScore').textContent = todayHighScore;
    }
    
    pauseGame() {
        if (this.gameState === 'playing') {
            this.gameState = 'paused';
            clearInterval(this.gameInterval);
            
            document.getElementById('startBtn').disabled = false;
            document.getElementById('pauseBtn').disabled = true;
        }
    }
    
    endGame() {
        this.gameState = 'completed';
        clearInterval(this.gameInterval);
        
        // 计算最终统计
        const totalActions = Object.values(this.actionStats).reduce((sum, stats) => sum + stats.total, 0);
        const correctActions = Object.values(this.actionStats).reduce((sum, stats) => sum + stats.correct, 0);
        const accuracy = totalActions > 0 ? Math.round((correctActions / totalActions) * 100) : 0;
        
        // 保存分数
        this.saveScore(this.score, this.maxCombo, this.calories, accuracy);
        
        // 显示结束界面
        this.showGameOverModal(accuracy);
        
        // 重置状态
        document.getElementById('startBtn').disabled = false;
        document.getElementById('pauseBtn').disabled = true;
        document.getElementById('endBtn').disabled = true;
    }
    
    showGameOverModal(accuracy) {
        document.getElementById('finalScore').textContent = this.score;
        document.getElementById('maxCombo').textContent = this.maxCombo;
        document.getElementById('totalCalories').textContent = Math.floor(this.calories);
        document.getElementById('accuracy').textContent = accuracy + '%';
        
        // 评估等级
        let evaluation = '需要改进';
        if (accuracy >= 90) evaluation = '完美';
        else if (accuracy >= 80) evaluation = '优秀';
        else if (accuracy >= 70) evaluation = '良好';
        else if (accuracy >= 60) evaluation = '及格';
        
        document.getElementById('actionEvaluation').textContent = evaluation;
        document.getElementById('gameOverModal').classList.remove('hidden');
    }
    
    resetGame() {
        this.gameState = 'ready';
        this.currentPhase = 'prepare';
        this.currentRound = 1;
        this.timeRemaining = this.phaseDuration;
        this.score = 0;
        this.combo = 0;
        this.maxCombo = 0;
        this.calories = 0;
        this.actionIndex = 0;
        
        // 重置统计
        Object.keys(this.actionStats).forEach(action => {
            this.actionStats[action] = { total: 0, correct: 0, accuracy: 0 };
        });
        
        this.updateDisplay();
        this.updateAccuracyDisplay();
        
        // 重置按钮状态
        document.getElementById('startBtn').disabled = false;
        document.getElementById('pauseBtn').disabled = true;
        document.getElementById('endBtn').disabled = true;
    }
    
    showError(message) {
        document.getElementById('errorMessage').textContent = message;
        document.getElementById('errorModal').classList.remove('hidden');
    }
    
    saveScore(score, maxCombo, calories, accuracy) {
        const scores = JSON.parse(localStorage.getItem('fitRhythmScores') || '[]');
        const newScore = {
            score: score,
            maxCombo: maxCombo,
            calories: calories,
            accuracy: accuracy,
            date: new Date().toISOString(),
            timestamp: Date.now()
        };
        
        scores.push(newScore);
        
        // 只保留最近100条记录
        if (scores.length > 100) {
            scores.sort((a, b) => b.timestamp - a.timestamp);
            scores.splice(100);
        }
        
        localStorage.setItem('fitRhythmScores', JSON.stringify(scores));
    }
    
    getTodayHighScore() {
        const scores = JSON.parse(localStorage.getItem('fitRhythmScores') || '[]');
        const today = new Date().toDateString();
        
        const todayScores = scores.filter(score => 
            new Date(score.date).toDateString() === today
        );
        
        return todayScores.length > 0 ? Math.max(...todayScores.map(s => s.score)) : 0;
    }
    
    loadGameData() {
        // 加载今日最高分
        const todayHighScore = this.getTodayHighScore();
        document.getElementById('todayHighScore').textContent = todayHighScore;
        
        // 生成排行榜数据
        this.generateLeaderboardData();
    }
    
    generateLeaderboardData() {
        const scores = JSON.parse(localStorage.getItem('fitRhythmScores') || '[]');
        
        // 今日排行榜
        const today = new Date().toDateString();
        const todayScores = scores
            .filter(score => new Date(score.date).toDateString() === today)
            .sort((a, b) => b.score - a.score)
            .slice(0, 10);
        
        const todayLeaderboard = document.getElementById('todayLeaderboard');
        todayLeaderboard.innerHTML = todayScores.map((score, index) => `
            <div class="flex justify-between items-center p-2 bg-gray-800 rounded">
                <span class="font-bold text-cyan-400">#${index + 1}</span>
                <span class="text-yellow-400">${score.score}</span>
                <span class="text-sm text-gray-400">${Math.floor(score.calories)}卡</span>
            </div>
        `).join('') || '<p class="text-gray-400 text-center">暂无记录</p>';
        
        // 历史排行榜
        const historyScores = scores
            .sort((a, b) => b.score - a.score)
            .slice(0, 10);
        
        const historyLeaderboard = document.getElementById('historyLeaderboard');
        historyLeaderboard.innerHTML = historyScores.map((score, index) => `
            <div class="flex justify-between items-center p-2 bg-gray-800 rounded">
                <span class="font-bold text-purple-400">#${index + 1}</span>
                <span class="text-yellow-400">${score.score}</span>
                <span class="text-sm text-gray-400">${new Date(score.date).toLocaleDateString()}</span>
            </div>
        `).join('') || '<p class="text-gray-400 text-center">暂无记录</p>';
    }
    
    showLeaderboard() {
        // 这里可以添加更详细的排行榜显示逻辑
        this.generateLeaderboardData();
    }
}

// 初始化游戏
document.addEventListener('DOMContentLoaded', () => {
    window.game = new FitRhythmCameraGameAuto();
});