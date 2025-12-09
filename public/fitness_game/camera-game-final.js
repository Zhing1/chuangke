// 最终版本 - 包含自定义训练计划、动作库扩展与交互优化
class FitRhythmCameraGameFinal {
    constructor() {
        // 游戏状态
        this.gameState = 'ready';
        this.currentPhase = 'prepare';
        this.currentRound = 1;
        this.totalRounds = 5;
        this.timeRemaining = 300; // Default 5 min
        this.totalDuration = 300;
        this.phaseTimeRemaining = 0;
        
        // 游戏数据
        this.score = 0;
        this.combo = 0;
        this.maxCombo = 0;
        this.calories = 0;
        this.weight = 60;
        
        // 性能优化
        this.targetFPS = 25;
        this.frameInterval = 1000 / this.targetFPS;
        this.lastFrameTime = 0;
        this.detectionInterval = 150;
        this.lastDetectionTime = 0;
        
        // 动作识别
        this.currentAction = null;
        this.landmarks = null;
        this.lastLandmarks = null; // For motion detection
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
        
        // 动作库 (20种动作)
        this.actionLibrary = [
            // Lower Body
            { id: 'squat', name: '深蹲', category: 'lower', met: 5.0, icon: 'squat-icon.png', instruction: '下蹲至大腿接近平行后站起', detectionType: 'precise', key: 'squat' },
            { id: 'lunge', name: '弓步', category: 'lower', met: 6.0, icon: 'lunge-icon.png', instruction: '一脚前跨双膝约90°后返回', detectionType: 'precise', key: 'lunge' },
            { id: 'highKnees', name: '高抬腿', category: 'lower', met: 7.0, icon: 'high-knees-icon.png', instruction: '交替抬膝至髋部高度', detectionType: 'precise', key: 'highKnees' },
            { id: 'sideLunge', name: '侧弓步', category: 'lower', met: 5.5, icon: 'lunge-icon.png', instruction: '向侧面跨步并下蹲', detectionType: 'precise', key: 'lunge' }, // Reusing lunge logic
            { id: 'jumpSquat', name: '深蹲跳', category: 'lower', met: 9.0, icon: 'squat-icon.png', instruction: '深蹲后用力向上跳起', detectionType: 'precise', key: 'squat' },
            { id: 'calfRaise', name: '提踵', category: 'lower', met: 3.0, icon: 'squat-icon.png', instruction: '站立踮起脚尖再落下', detectionType: 'motion' },
            { id: 'wallSit', name: '靠墙蹲', category: 'lower', met: 3.5, icon: 'squat-icon.png', instruction: '背靠墙大腿与地面平行保持', detectionType: 'timer' },
            
            // Upper Body
            { id: 'pushup', name: '俯卧撑', category: 'upper', met: 8.0, icon: 'pushup-icon.png', instruction: '身体平直，屈臂下压再撑起', detectionType: 'motion' },
            { id: 'tricepDip', name: '臂屈伸', category: 'upper', met: 5.0, icon: 'pushup-icon.png', instruction: '背手支撑，屈臂下沉再撑起', detectionType: 'motion' },
            { id: 'armCircles', name: '手臂画圈', category: 'upper', met: 3.0, icon: 'jumping-jack-icon.png', instruction: '双臂侧平举，画圆圈', detectionType: 'motion' },
            { id: 'shadowBox', name: '拳击', category: 'upper', met: 7.0, icon: 'pushup-icon.png', instruction: '快速出拳，保持步伐移动', detectionType: 'motion' },
            { id: 'shoulderPress', name: '推举模拟', category: 'upper', met: 4.0, icon: 'jumping-jack-icon.png', instruction: '双臂上推至头顶', detectionType: 'precise', key: 'jumpingJack' }, // Reuse JJ arms
            
            // Core
            { id: 'plank', name: '平板支撑', category: 'core', met: 3.5, icon: 'pushup-icon.png', instruction: '前臂撑地，身体呈直线保持静止', detectionType: 'timer' },
            { id: 'situp', name: '仰卧起坐', category: 'core', met: 4.0, icon: 'pushup-icon.png', instruction: '仰卧屈膝，利用腹肌坐起', detectionType: 'motion' },
            { id: 'crunch', name: '卷腹', category: 'core', met: 3.5, icon: 'pushup-icon.png', instruction: '仰卧，仅肩部抬离地面', detectionType: 'motion' },
            { id: 'legRaise', name: '腿部升降', category: 'core', met: 4.0, icon: 'high-knees-icon.png', instruction: '仰卧，双腿并拢抬起至90度', detectionType: 'motion' },
            { id: 'russianTwist', name: '俄罗斯转体', category: 'core', met: 5.0, icon: 'high-knees-icon.png', instruction: '坐姿抬腿，左右转体', detectionType: 'motion' },
            { id: 'bicycleCrunch', name: '空中脚踏车', category: 'core', met: 6.0, icon: 'high-knees-icon.png', instruction: '仰卧交替肘触膝', detectionType: 'motion' },
            
            // Whole Body
            { id: 'jumpingJack', name: '开合跳', category: 'whole', met: 8.0, icon: 'jumping-jack-icon.png', instruction: '双臂上举同时双腿分开再合拢', detectionType: 'precise', key: 'jumpingJack' },
            { id: 'burpee', name: '波比跳', category: 'whole', met: 10.0, icon: 'pushup-icon.png', instruction: '深蹲+俯卧撑+跳跃组合', detectionType: 'motion' },
            { id: 'mountainClimber', name: '登山者', category: 'whole', met: 8.0, icon: 'high-knees-icon.png', instruction: '俯卧撑位，交替收腿', detectionType: 'motion' }
        ];
        
        // Default Config
        this.selectedActionIds = ['squat', 'jumpingJack', 'lunge', 'highKnees'];
        this.customDuration = 300;
        
        this.keyToResultKey = { squat: 'isSquatting', jumpingJack: 'isJumpingJack', lunge: 'isLunging', highKnees: 'isHighKnee' };
        
        this.init();
    }
    
    init() {
        this.setupEventListeners();
        this.setupWizard();
        this.loadLeaderboards();
        this.updateDisplay();
        this.initMediaPipe();
        this.setupCanvas();
        this.startStableRenderLoop();
    }
    
    // --- Wizard Logic ---
    setupWizard() {
        const modal = document.getElementById('setupWizardModal');
        const openBtn = document.getElementById('openSetupWizardBtn');
        const closeBtn = document.getElementById('closeWizardBtn');
        const nextBtn = document.getElementById('wizardNextBtn');
        const prevBtn = document.getElementById('wizardPrevBtn');
        const progressBar = document.getElementById('wizardProgressBar');
        
        let currentStep = 1;
        
        // Open/Close
        if(openBtn) openBtn.addEventListener('click', () => {
            modal.classList.remove('d-none');
            this.renderActionSelection();
            currentStep = 1;
            updateStepUI();
        });
        if(closeBtn) closeBtn.addEventListener('click', () => modal.classList.add('d-none'));
        
        // Step Navigation
        const updateStepUI = () => {
            document.querySelectorAll('.wizard-step').forEach(el => el.classList.add('d-none'));
            document.getElementById(`step${currentStep}`).classList.remove('d-none');
            
            document.querySelectorAll('.wizard-step-btn').forEach(btn => {
                const s = parseInt(btn.dataset.step);
                if (s === currentStep) btn.classList.add('btn-primary', 'active');
                else if (s < currentStep) btn.classList.replace('btn-secondary', 'btn-primary');
                else btn.classList.remove('btn-primary', 'active');
            });
            
            progressBar.style.width = `${(currentStep - 1) * 50}%`;
            
            prevBtn.disabled = currentStep === 1;
            nextBtn.textContent = currentStep === 3 ? '开始训练' : '下一步';
            
            if (currentStep === 3) this.updatePreview();
        };
        
        nextBtn.addEventListener('click', () => {
            if (currentStep < 3) {
                currentStep++;
                updateStepUI();
            } else {
                // Start Game
                modal.classList.add('d-none');
                this.applyConfig();
                this.startCalibration();
            }
        });
        
        prevBtn.addEventListener('click', () => {
            if (currentStep > 1) {
                currentStep--;
                updateStepUI();
            }
        });
        
        // Step 1: Time Selection
        document.querySelectorAll('.time-preset').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.time-preset').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.customDuration = parseInt(btn.dataset.time);
                this.updateTimeDisplay();
            });
        });
        
        document.getElementById('applyCustomTimeBtn').addEventListener('click', () => {
            const val = parseInt(document.getElementById('customTimeInput').value);
            if (val && val >= 60) {
                this.customDuration = val;
                document.querySelectorAll('.time-preset').forEach(b => b.classList.remove('active'));
                this.updateTimeDisplay();
            }
        });
        
        // Step 2: Action Categories
        document.querySelectorAll('#actionCategoryTabs .nav-link').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                document.querySelectorAll('#actionCategoryTabs .nav-link').forEach(l => l.classList.remove('active'));
                link.classList.add('active');
                this.renderActionSelection(link.dataset.cat);
            });
        });
    }
    
    updateTimeDisplay() {
        const m = Math.floor(this.customDuration / 60);
        const s = this.customDuration % 60;
        document.getElementById('selectedTimeDisplay').textContent = `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
        
        // Est Calories (Avg MET 6 * weight 60 * time / 3600)
        const est = Math.floor(6 * 60 * (this.customDuration / 3600));
        document.getElementById('estCalories').textContent = est;
    }
    
    renderActionSelection(category = 'all') {
        const grid = document.getElementById('actionSelectionGrid');
        grid.innerHTML = '';
        
        const filtered = category === 'all' ? this.actionLibrary : this.actionLibrary.filter(a => a.category === category);
        
        filtered.forEach(action => {
            const isSelected = this.selectedActionIds.includes(action.id);
            const col = document.createElement('div');
            col.className = 'col-6 col-md-4';
            col.innerHTML = `
                <div class="card action-card h-100 p-2 ${isSelected ? 'selected' : ''}" data-id="${action.id}">
                    <div class="d-flex align-items-center">
                        <img src="/fitness_game/${action.icon}" class="me-2" style="width:32px;height:32px;object-fit:contain;" onerror="this.src='https://via.placeholder.com/32'">
                        <div class="small fw-bold text-truncate">${action.name}</div>
                    </div>
                    <i class="fas fa-check-circle text-primary position-absolute top-0 end-0 m-1 check-icon" style="display:none;"></i>
                </div>
            `;
            
            col.querySelector('.action-card').addEventListener('click', (e) => {
                const card = e.currentTarget;
                const id = card.dataset.id;
                
                if (this.selectedActionIds.includes(id)) {
                    if (this.selectedActionIds.length > 1) { // Prevent empty list
                        this.selectedActionIds = this.selectedActionIds.filter(i => i !== id);
                        card.classList.remove('selected');
                    }
                } else {
                    this.selectedActionIds.push(id);
                    card.classList.add('selected');
                }
                this.updateSelectedTags();
            });
            
            grid.appendChild(col);
        });
        this.updateSelectedTags();
    }
    
    updateSelectedTags() {
        document.getElementById('selectedActionCount').textContent = this.selectedActionIds.length;
        const container = document.getElementById('selectedActionTags');
        container.innerHTML = this.selectedActionIds.map(id => {
            const a = this.actionLibrary.find(x => x.id === id);
            return `<span class="badge bg-primary">${a.name}</span>`;
        }).join('');
    }
    
    updatePreview() {
        const m = Math.floor(this.customDuration / 60);
        const s = this.customDuration % 60;
        document.getElementById('finalTimeDisplay').textContent = `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
        document.getElementById('finalActionCount').textContent = this.selectedActionIds.length;
    }
    
    applyConfig() {
        this.totalDuration = this.customDuration;
        this.timeRemaining = this.totalDuration;
        
        // Update Summary on Main Page
        const m = Math.floor(this.totalDuration / 60);
        document.getElementById('currentPlanSummary').textContent = `自定义: ${m}分钟 / ${this.selectedActionIds.length}个动作`;
    }
    
    // --- Existing Setup & Game Logic ---
    
    setupCanvas() {
        const ctx = this.skeletonCanvas.getContext('2d');
        ctx.imageSmoothingEnabled = false; 
        ctx.imageSmoothingQuality = 'low';
        ctx.translate(0.5, 0.5);
        ctx.lineWidth = 2;
        ctx.lineCap = 'butt';
        ctx.lineJoin = 'miter';
    }
    
    setupEventListeners() {
        document.getElementById('connectCameraBtn').addEventListener('click', () => this.connectCamera());
        document.getElementById('switchCameraBtn').addEventListener('click', () => this.switchCamera());
        document.getElementById('startBtn').addEventListener('click', () => this.startCalibration());
        document.getElementById('pauseBtn').addEventListener('click', () => this.pauseGame());
        document.getElementById('endBtn').addEventListener('click', () => this.endGame());
        document.getElementById('completeCalibrationBtn').addEventListener('click', () => this.completeCalibration());
        
        const weightSlider = document.getElementById('weightSlider');
        if(weightSlider) weightSlider.addEventListener('input', (e) => {
            this.weight = parseInt(e.target.value);
            document.getElementById('weightDisplay').textContent = this.weight;
        });
        
        window.addEventListener('resize', () => this.handleResize());
        
        this.videoElement.addEventListener('error', (e) => this.handleVideoError());

        const playAgainBtn = document.getElementById('playAgainBtn');
        if (playAgainBtn) playAgainBtn.addEventListener('click', () => {
            document.getElementById('gameOverModal').classList.add('d-none');
            this.resetGame();
            this.startGame();
        });
        
        const viewRankBtn = document.getElementById('viewRankBtn');
        if (viewRankBtn) viewRankBtn.addEventListener('click', () => {
            document.getElementById('gameOverModal').classList.add('d-none');
            const el = document.getElementById('historyLeaderboard');
            if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        });
        
        const consultGameAiBtn = document.getElementById('consultGameAiBtn');
        if (consultGameAiBtn) consultGameAiBtn.addEventListener('click', () => {
            document.getElementById('gameOverModal').classList.add('d-none');
            const prompt = `我刚刚完成了健身训练，得分 ${this.score}，消耗 ${Math.floor(this.calories)} 卡路里，最高连击 ${this.maxCombo}。请评价我的表现并给出运动后的恢复建议。`;
            if (navigator.clipboard) navigator.clipboard.writeText(prompt);
            else alert('请发送：' + prompt);
            if (window.cozeClient && window.cozeClient.showChatBot) window.cozeClient.showChatBot();
        });
        
        const closeErrorBtn = document.getElementById('closeErrorBtn');
        if (closeErrorBtn) closeErrorBtn.addEventListener('click', () => document.getElementById('errorModal').classList.add('d-none'));
    }
    
    async initMediaPipe() {
        try {
            this.pose = new Pose({
                locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/pose@0.5.1675469404/${file}`
            });
            this.pose.setOptions({
                modelComplexity: 0,
                smoothLandmarks: true,
                enableSegmentation: false,
                smoothSegmentation: false,
                minDetectionConfidence: 0.5,
                minTrackingConfidence: 0.3
            });
            this.pose.onResults((results) => this.onPoseResults(results));
        } catch (error) {
            console.error('MediaPipe initialization failed:', error);
            this.showError('MediaPipe初始化失败，请刷新页面重试');
        }
    }
    
    async connectCamera() {
        if (this.isCameraConnected) return;
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            this.showError('浏览器不支持摄像头访问');
            return;
        }
        try {
            this.updateCameraStatus('loading', '摄像头连接中...');
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: this.currentCamera },
                audio: false
            });
            this.videoElement.srcObject = stream;
            await new Promise(r => this.videoElement.onloadedmetadata = r);
            this.handleCameraConnected();
        } catch (error) {
            this.updateCameraStatus('disconnected', '连接失败');
            this.showError('无法访问摄像头，请检查权限');
            console.error(error);
        }
    }
    
    handleCameraConnected() {
        this.isCameraConnected = true;
        this.updateCameraStatus('connected', '摄像头已连接');
        document.getElementById('startBtn').disabled = false;
        document.getElementById('switchCameraBtn').disabled = false;
        this.videoElement.style.transform = 'scaleX(-1)';
        this.updateCanvasSize();
        this.startMediaPipe();
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
                width: 640, height: 480
            });
            this.camera.start();
        }
    }
    
    updateCanvasSize() {
        if (!this.videoElement.videoWidth) return;
        this.skeletonCanvas.width = this.videoElement.getBoundingClientRect().width;
        this.skeletonCanvas.height = this.videoElement.getBoundingClientRect().height;
        this.setupCanvas();
    }
    
    handleResize() {
        clearTimeout(this.resizeTimeout);
        this.resizeTimeout = setTimeout(() => this.updateCanvasSize(), 300);
    }
    
    startStableRenderLoop() {
        const render = (currentTime) => {
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
        ctx.clearRect(-0.5, -0.5, this.skeletonCanvas.width + 1, this.skeletonCanvas.height + 1);
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
        this.lastLandmarks = this.landmarks;
        this.landmarks = results.poseLandmarks;
        
        if (this.gameState === 'playing' && this.currentPhase === 'exercise' && this.currentAction) {
            this.detectCurrentAction();
        }
    }
    
    detectCurrentAction() {
        if (!this.landmarks || !this.currentAction) return;
        
        let inTargetPos = false;
        let confidence = 0;
        const key = this.currentAction.key || this.currentAction.id;
        
        // --- 21 Action Strict Detection Logic ---
        // Grouped by biomechanical similarity
        
        // 1. Squat Group (Squat, JumpSquat, WallSit)
        if (key === 'squat' || key === 'jumpSquat' || key === 'wallSit') {
             const res = this.detectSquat(this.landmarks);
             inTargetPos = res.isSquatting; confidence = res.confidence;
        } 
        // 2. Lunge Group (Lunge, SideLunge)
        else if (key === 'lunge' || key === 'sideLunge') {
             const res = this.detectLunge(this.landmarks);
             inTargetPos = res.isLunging; confidence = res.confidence;
        } 
        // 3. Jumping Jack Group (JumpingJack, ShoulderPress)
        else if (key === 'jumpingJack' || key === 'shoulderPress') {
             const res = this.detectJumpingJack(this.landmarks);
             inTargetPos = res.isJumpingJack; confidence = res.confidence;
        } 
        // 4. Leg Raise Group (HighKnees, LegRaise, MountainClimber)
        else if (key === 'highKnees' || key === 'legRaise' || key === 'mountainClimber') {
             const res = this.detectHighKnees(this.landmarks);
             inTargetPos = res.isHighKnee; confidence = res.confidence;
        } 
        // 5. Pushup Group (Pushup, TricepDip, Burpee)
        else if (key === 'pushup' || key === 'tricepDip' || key === 'burpee') {
             const res = this.detectPushup(this.landmarks);
             inTargetPos = res.isDown; confidence = res.confidence;
        } 
        // 6. Plank Group (Plank)
        else if (key === 'plank') {
             const res = this.detectPlank(this.landmarks);
             inTargetPos = res.isPlank; confidence = res.confidence;
        } 
        // 7. Situp Group (Situp, Crunch, BicycleCrunch, RussianTwist)
        else if (key === 'situp' || key === 'crunch' || key === 'bicycleCrunch' || key === 'russianTwist') {
             const res = this.detectSitup(this.landmarks);
             inTargetPos = res.isUp; confidence = res.confidence;
        } 
        // 8. Standing Motion Group (CalfRaise, ArmCircles, ShadowBox)
        else if (key === 'calfRaise' || key === 'armCircles' || key === 'shadowBox') {
            const isStanding = this.detectStanding(this.landmarks);
            const motion = this.detectMotion(this.landmarks, key);
            inTargetPos = isStanding && motion; 
            confidence = 0.8;
        }
        else {
            // Fallback
            inTargetPos = this.detectMotion(this.landmarks, 'general');
            confidence = 0.5;
        }
        
        // Stabilize Result
        if (inTargetPos && confidence > 0.4) {
            this.addToBuffer(true);
        } else {
            this.addToBuffer(false);
        }
        
        this.isActionCorrect = this.getStableResult();
    }
    
    calculateMotionDiff(curr, prev) {
        let totalDiff = 0;
        const points = [11,12,23,24,15,16,27,28]; // Major joints
        let count = 0;
        points.forEach(i => {
            if(curr[i] && prev[i] && curr[i].visibility > 0.5) {
                totalDiff += Math.sqrt(Math.pow(curr[i].x - prev[i].x, 2) + Math.pow(curr[i].y - prev[i].y, 2));
                count++;
            }
        });
        return count > 0 ? totalDiff / count : 0;
    }
    
    // --- Detailed Detection Logic ---
    
    detectSquat(lm) {
        const lAngle = this.calculateAngleOptimized(lm[23], lm[25], lm[27]);
        const rAngle = this.calculateAngleOptimized(lm[24], lm[26], lm[28]);
        // Strict: < 130 degrees (Squat)
        const isSquatting = (lAngle < 130 && lAngle > 40) || (rAngle < 130 && rAngle > 40);
        return { isSquatting, confidence: Math.max(lm[25].visibility, lm[26].visibility) };
    }
    
    detectJumpingJack(lm) {
        const handsUp = lm[15].y < lm[11].y || lm[16].y < lm[12].y; // Hands above shoulders
        const ankleDist = Math.abs(lm[27].x - lm[28].x);
        const shoulderDist = Math.abs(lm[11].x - lm[12].x);
        const legsWide = ankleDist > shoulderDist * 1.4; // Strict width
        return { isJumpingJack: handsUp && legsWide, confidence: Math.min(lm[11].visibility, lm[27].visibility) };
    }
    
    detectLunge(lm) {
        const lAngle = this.calculateAngleOptimized(lm[23], lm[25], lm[27]);
        const rAngle = this.calculateAngleOptimized(lm[24], lm[26], lm[28]);
        // One leg bent significantly (<110), other maybe less bent
        const isLunging = (lAngle < 110 || rAngle < 110);
        return { isLunging, confidence: Math.max(lm[25].visibility, lm[26].visibility) };
    }
    
    detectHighKnees(lm) {
        // Knee Y higher than Hip Y (remember Y increases downwards)
        // Actually Y is 0 top, 1 bottom. So Knee Y < Hip Y means knee is higher.
        const lUp = lm[25].y < lm[23].y; 
        const rUp = lm[26].y < lm[24].y;
        return { isHighKnee: lUp || rUp, confidence: Math.max(lm[25].visibility, lm[26].visibility) };
    }
    
    detectPushup(lm) {
        const lArm = this.calculateAngleOptimized(lm[11], lm[13], lm[15]);
        const rArm = this.calculateAngleOptimized(lm[12], lm[14], lm[16]);
        const isDown = lArm < 100 || rArm < 100;
        return { isDown, confidence: Math.max(lm[13].visibility, lm[14].visibility) };
    }
    
    detectPlank(lm) {
        const lBody = this.calculateAngleOptimized(lm[11], lm[23], lm[27]);
        // Straight body > 160 AND Horizontal-ish (Shoulder Y approx Ankle Y)
        // Allow some diagonal (e.g. camera angle), so check if Shoulder Y is not significantly higher than Ankle Y
        // Actually, in plank, shoulder and ankle Y are close. In standing, shoulder Y < Ankle Y.
        const isStraight = lBody > 160;
        const isHorizontal = Math.abs(lm[11].y - lm[27].y) < 0.3; 
        return { isPlank: isStraight && isHorizontal, confidence: lm[23].visibility };
    }
    
    detectSitup(lm) {
        // Shoulder to Knee distance checks
        const dist = Math.abs(lm[11].y - lm[25].y);
        const legLen = Math.abs(lm[23].y - lm[25].y) || 0.2;
        // Up phase: Shoulder close to Knee
        const isUp = dist < legLen * 0.7; 
        return { isUp, confidence: lm[11].visibility };
    }

    detectStanding(lm) {
        const lAngle = this.calculateAngleOptimized(lm[23], lm[25], lm[27]);
        const rAngle = this.calculateAngleOptimized(lm[24], lm[26], lm[28]);
        return lAngle > 150 && rAngle > 150;
    }

    detectMotion(lm, type) {
        if (!this.lastLandmarks) return false;
        
        let pointsToCheck = [11,12,23,24,15,16,27,28];
        if (type === 'armCircles' || type === 'shadowBox') {
            pointsToCheck = [15, 16]; // Wrists
        } else if (type === 'calfRaise') {
            pointsToCheck = [11, 12]; // Shoulders moving up/down
        }
        
        let diff = 0;
        let count = 0;
        pointsToCheck.forEach(i => {
            if(lm[i] && this.lastLandmarks[i]) {
                const d = Math.sqrt(Math.pow(lm[i].x - this.lastLandmarks[i].x, 2) + Math.pow(lm[i].y - this.lastLandmarks[i].y, 2));
                diff += d;
                count++;
            }
        });
        
        const avgDiff = count > 0 ? diff / count : 0;
        return avgDiff > 0.02; // Threshold
    }

    calculateAngleOptimized(a, b, c) {
        if(!a || !b || !c) return 180;
        const ab = Math.sqrt(Math.pow(b.x-a.x,2)+Math.pow(b.y-a.y,2));
        const bc = Math.sqrt(Math.pow(b.x-c.x,2)+Math.pow(b.y-c.y,2));
        const ac = Math.sqrt(Math.pow(c.x-a.x,2)+Math.pow(c.y-a.y,2));
        return Math.acos((ab*ab + bc*bc - ac*ac)/(2*ab*bc)) * 180 / Math.PI;
    }
    
    addToBuffer(result) {
        this.detectionBuffer.push(result);
        if (this.detectionBuffer.length > this.bufferSize) this.detectionBuffer.shift();
    }
    getStableResult() {
        return this.detectionBuffer.filter(r => r).length >= this.detectionBuffer.length * 0.6;
    }
    
    // --- Game Control ---
    startCalibration() {
        if (!this.isCameraConnected) { this.showError('请先连接摄像头'); return; }
        this.gameState = 'calibrating';
        document.getElementById('calibrationOverlay').classList.remove('hidden');
        this.speak('请站在摄像头前，确保全身入镜');
    }
    completeCalibration() {
        if (this.landmarks && this.landmarks[28] && this.landmarks[28].visibility > 0.5) {
            this.gameState = 'ready';
            document.getElementById('calibrationOverlay').classList.add('hidden');
            this.startGame();
        } else {
            this.showError('未检测到全身，请后退一点');
            this.speak('未检测到全身，请后退一点');
        }
    }
    
    startGame() {
        this.gameState = 'playing';
        this.currentPhase = 'exercise';
        this.currentRound = 1;
        this.timeRemaining = this.totalDuration;
        this.score = 0;
        this.combo = 0;
        this.calories = 0;
        
        // Calculate dynamic rounds based on duration (30s work + 10s transition approx)
        // Actually, let's just cycle through selected actions
        this.actionQueue = [...this.selectedActionIds];
        this.currentActionIndex = 0;
        this.phaseTimeRemaining = 30; // Fixed 30s per action for now
        
        document.getElementById('startBtn').disabled = true;
        document.getElementById('pauseBtn').disabled = false;
        document.getElementById('endBtn').disabled = false;
        
        this.scheduleNextAction();
        this.startGameLoop();
        this.speak('训练开始，加油！');
    }
    
    scheduleNextAction() {
        if (this.gameState !== 'playing') return;
        
        // Pick next action from selected list (cycle)
        const actionId = this.selectedActionIds[this.currentRound % this.selectedActionIds.length];
        this.currentAction = this.actionLibrary.find(a => a.id === actionId);
        
        this.actionState = 'neutral';
        
        this.showCurrentAction();
        this.speak(`下一个动作：${this.currentAction.name}`);
        this.vibrate([200, 100, 200]);
    }
    
    updateTimer() {
        this.timeRemaining -= 0.05;
        this.phaseTimeRemaining -= 0.05;
        
        if (this.timeRemaining <= 0) {
            this.endGame();
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
            this.phaseTimeRemaining = 10; // 10s rest
            this.hideCurrentAction();
            this.showRestOverlay();
            this.speak('休息一下');
        } else {
            this.currentPhase = 'exercise';
            this.phaseTimeRemaining = 30;
            this.currentRound++;
            this.scheduleNextAction();
        }
    }
    
    startGameLoop() {
        if (this.gameLoop) clearInterval(this.gameLoop);
        this.gameLoop = setInterval(() => {
            if (this.gameState === 'playing') {
                this.updateTimer();
                this.checkActionTiming();
            }
        }, 50);
    }
    
    checkActionTiming() {
        if (this.currentPhase !== 'exercise') return;

        const type = this.currentAction.detectionType || 'precise';

        if (type === 'precise' || type === 'rep') {
            // Repetition Logic: Neutral -> Target -> Neutral
            if (!this.actionState) this.actionState = 'neutral';
            
            if (this.actionState === 'neutral') {
                if (this.isActionCorrect) {
                    // Entered target position
                    this.actionState = 'holding';
                    this.holdStartTime = Date.now();
                }
            } else if (this.actionState === 'holding') {
                if (!this.isActionCorrect) {
                    // Exited target position -> Rep complete
                    // Check duration to filter noise (e.g. > 200ms)
                    const duration = Date.now() - this.holdStartTime;
                    if (duration > 200) {
                        this.registerPerfect(); // Count Rep
                    }
                    this.actionState = 'neutral';
                }
            }
        } else if (type === 'timer') {
             // Continuous holding (Plank, Wall Sit)
             if (this.isActionCorrect) {
                 if (!this.lastPointTime || Date.now() - this.lastPointTime > 1000) {
                     this.registerPerfect(); // 1 point per second
                     this.lastPointTime = Date.now();
                 }
             }
        } else if (type === 'motion') {
            // High movement (Burpee, Boxing)
            if (this.isActionCorrect) { // Motion detected
                 if (!this.lastPointTime || Date.now() - this.lastPointTime > 600) {
                     this.registerPerfect(); // Limit point rate
                     this.lastPointTime = Date.now();
                 }
            }
        }
    }
    
    registerPerfect() {
        this.combo++;
        this.maxCombo = Math.max(this.maxCombo, this.combo);
        const score = 100 * (1 + this.combo * 0.1);
        this.score += Math.floor(score);
        this.addCalories(this.currentAction.met);
        this.showScorePopup(Math.floor(score), 'perfect');
        this.vibrate(50);
    }
    
    // ... Display & Helpers ...
    updateDisplay() {
        const m = Math.floor(this.timeRemaining / 60);
        const s = Math.floor(this.timeRemaining % 60);
        document.getElementById('countdownDisplay').textContent = `${m}:${String(s).padStart(2,'0')}`;
        
        // Update Progress Ring
        const progress = (this.totalDuration - this.timeRemaining) / this.totalDuration;
        const offset = (2 * Math.PI * 35) * (1 - progress);
        document.getElementById('progressCircle').style.strokeDashoffset = offset;
        
        document.getElementById('currentRound').textContent = this.currentRound;
        document.getElementById('scoreDisplay').textContent = this.score;
        document.getElementById('comboCount').textContent = this.combo;
        document.getElementById('caloriesDisplay').textContent = Math.floor(this.calories);
    }
    
    showCurrentAction() {
        const icon = document.getElementById('currentActionIcon');
        const name = document.getElementById('currentActionName');
        const inst = document.getElementById('actionInstruction');
        document.getElementById('actionGuide').classList.remove('hidden');
        
        icon.src = `/fitness_game/${this.currentAction.icon}`;
        name.textContent = this.currentAction.name;
        inst.textContent = this.currentAction.instruction;
        icon.style.opacity = 1;
    }
    
    hideCurrentAction() {
        document.getElementById('currentActionIcon').style.opacity = 0;
    }
    
    showRestOverlay() {
        document.getElementById('actionGuide').classList.remove('hidden');
        document.getElementById('currentActionName').textContent = '休息';
        document.getElementById('actionInstruction').textContent = '调整呼吸';
    }
    
    endGame() {
        clearInterval(this.gameLoop);
        this.gameState = 'ended';
        this.speak('训练完成，你真棒');
        this.showGameOver();
    }
    
    // ... Save/Load Logic ...
    showGameOver() {
        document.getElementById('finalScore').textContent = this.score;
        document.getElementById('maxCombo').textContent = this.maxCombo;
        document.getElementById('totalCalories').textContent = Math.floor(this.calories);
        document.getElementById('gameOverModal').classList.remove('d-none');
        this.saveToLeaderboard();
        
        // Auto Check-in
        const today = new Date().toISOString().split('T')[0];
        let checkins = JSON.parse(localStorage.getItem('fitnessCheckins') || '[]');
        if(!checkins.includes(today)) {
            checkins.push(today);
            localStorage.setItem('fitnessCheckins', JSON.stringify(checkins));
        }
    }
    
    saveToLeaderboard() {
        const data = {
            score: this.score,
            calories: Math.floor(this.calories),
            date: new Date().toISOString(),
            duration: this.totalDuration,
            actions: this.selectedActionIds.length
        };
        let history = JSON.parse(localStorage.getItem('fitRhythmCameraHistory') || '[]');
        history.push(data);
        localStorage.setItem('fitRhythmCameraHistory', JSON.stringify(history));
        this.loadLeaderboards();
    }
    
    loadLeaderboards() {
        const history = JSON.parse(localStorage.getItem('fitRhythmCameraHistory') || '[]');
        const list = document.getElementById('historyLeaderboard');
        list.innerHTML = history.sort((a,b)=> new Date(b.date) - new Date(a.date)).slice(0,10).map((s,i) => `
            <div class="d-flex justify-content-between p-2 border-bottom">
                <span>${new Date(s.date).toLocaleDateString()}</span>
                <span class="fw-bold">${s.score}分</span>
            </div>
        `).join('');
    }
    
    // Helpers
    addCalories(met) { this.calories += met * this.weight * (1/3600) * 1.05; }
    
    showScorePopup(score, type) {
        const popup = document.createElement('div');
        popup.className = `score-popup ${type}`;
        popup.textContent = type === 'miss' ? 'MISS' : `+${score}`;
        
        const x = Math.random() * (window.innerWidth - 200) + 100;
        const y = Math.random() * (window.innerHeight - 200) + 100;
        
        popup.style.left = `${x}px`;
        popup.style.top = `${y}px`;
        popup.style.position = 'fixed';
        popup.style.color = '#ffc107';
        popup.style.fontWeight = 'bold';
        popup.style.fontSize = '24px';
        popup.style.zIndex = '1000';
        popup.style.pointerEvents = 'none';
        
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

    updateCameraStatus(s, m) { 
        document.getElementById('cameraStatus').className = `camera-status camera-${s}`;
        document.getElementById('cameraStatus').textContent = m;
        
        const indicator = document.getElementById('cameraStatusIndicator');
        if (indicator) {
            indicator.className = `camera-status camera-${s}`;
            indicator.textContent = m;
            // Hide indicator if connected to avoid blocking video
            if (s === 'connected') {
                indicator.classList.add('d-none');
                indicator.style.display = 'none'; // Double assurance
            } else {
                indicator.classList.remove('d-none');
                indicator.style.display = 'block';
            }
        }
    }
    showError(m) { 
        document.getElementById('errorMessage').textContent = m; 
        document.getElementById('errorModal').classList.remove('d-none'); 
    }
    
    // Draw Skeleton
    drawUltraStableSkeleton(ctx, landmarks, isCorrect, isResting) {
        ctx.strokeStyle = isResting ? '#00d4ff' : (isCorrect ? '#00ff88' : '#ff4757');
        ctx.fillStyle = ctx.strokeStyle;
        
        const points = landmarks.map((l, i) => ({
            x: l.x * this.skeletonCanvas.width,
            y: l.y * this.skeletonCanvas.height,
            v: l.visibility
        }));
        
        const connections = [[11,12],[11,13],[13,15],[12,14],[14,16],[11,23],[12,24],[23,24],[23,25],[25,27],[24,26],[26,28]];
        ctx.beginPath();
        connections.forEach(([i, j]) => {
            if(points[i] && points[j] && points[i].v > 0.5 && points[j].v > 0.5) {
                ctx.moveTo(points[i].x, points[i].y);
                ctx.lineTo(points[j].x, points[j].y);
            }
        });
        ctx.stroke();
        points.forEach(p => {
            if(p.v > 0.5) { ctx.beginPath(); ctx.arc(p.x, p.y, 3, 0, 2*Math.PI); ctx.fill(); }
        });
    }
    
    // TTS
    speak(text) {
        if ('speechSynthesis' in window) {
            const u = new SpeechSynthesisUtterance(text);
            u.lang = 'zh-CN';
            window.speechSynthesis.speak(u);
        }
    }
    vibrate(pattern) {
        if (navigator.vibrate) navigator.vibrate(pattern);
    }
    
    pauseGame() {
        if(this.gameState === 'playing') {
            this.gameState = 'paused';
            document.getElementById('pauseBtn').textContent = '继续';
        } else if(this.gameState === 'paused') {
            this.gameState = 'playing';
            document.getElementById('pauseBtn').textContent = '暂停';
        }
    }
    
    handleVideoError() { setTimeout(() => this.connectCamera(), 2000); }
    
    resetGame() {
        this.gameState = 'ready';
        this.score = 0;
        this.updateDisplay();
        document.getElementById('actionGuide').classList.add('hidden');
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new FitRhythmCameraGameFinal();
    anime({ targets: '.card', translateY: [20, 0], opacity: [0, 1], delay: anime.stagger(100) });
});
