// 摄像头稳定器 - 解决闪烁问题的终极方案
class CameraStabilizer {
    constructor(videoElement, canvasElement) {
        this.video = videoElement;
        this.canvas = canvasElement;
        this.ctx = canvasElement.getContext('2d');
        
        // 稳定器配置
        this.isStabilized = false;
        this.frameBuffer = [];
        this.bufferSize = 3;
        this.stabilizationThreshold = 0.8;
        
        // 性能监控
        this.frameCount = 0;
        this.lastFrameTime = 0;
        this.fps = 0;
        this.droppedFrames = 0;
        
        // 渲染优化
        this.renderQueue = [];
        this.isRendering = false;
        this.useWebGL = this.detectWebGLSupport();
        
        // 备用渲染方案
        this.fallbackMode = false;
        this.lastGoodFrame = null;
        
        this.init();
    }
    
    init() {
        this.setupCanvas();
        this.startStabilizationLoop();
        this.monitorPerformance();
    }
    
    setupCanvas() {
        // 优化Canvas设置
        this.ctx.imageSmoothingEnabled = false; // 关键：禁用图像平滑减少闪烁
        this.ctx.imageSmoothingQuality = 'low';
        
        // 设置像素对齐
        this.ctx.translate(0.5, 0.5);
        
        // 优化线条样式
        this.ctx.lineWidth = 2;
        this.ctx.lineCap = 'butt';
        this.ctx.lineJoin = 'miter';
    }
    
    detectWebGLSupport() {
        try {
            const canvas = document.createElement('canvas');
            return !!(window.WebGLRenderingContext && 
                     (canvas.getContext('webgl') || canvas.getContext('experimental-webgl')));
        } catch (e) {
            return false;
        }
    }
    
    startStabilizationLoop() {
        const stabilize = (currentTime) => {
            try {
                // 性能监控
                this.updateFPS(currentTime);
                
                // 帧稳定性检查
                if (this.shouldRenderFrame(currentTime)) {
                    this.processFrame();
                }
                
                // 自适应调整
                this.adaptToPerformance();
                
            } catch (error) {
                console.error('Stabilization error:', error);
                this.handleRenderError();
            }
            
            requestAnimationFrame(stabilize);
        };
        
        requestAnimationFrame(stabilize);
    }
    
    shouldRenderFrame(currentTime) {
        // 基础帧率控制
        const minFrameInterval = 1000 / 30; // 限制最大30fps
        if (currentTime - this.lastFrameTime < minFrameInterval) {
            return false;
        }
        
        // 视频帧可用性检查
        if (!this.video.videoWidth || this.video.readyState < 2) {
            return false;
        }
        
        // 性能降级检查
        if (this.fps < 20 && this.frameCount > 60) {
            this.enableFallbackMode();
            return false;
        }
        
        return true;
    }
    
    processFrame() {
        // 清空画布
        this.ctx.clearRect(-0.5, -0.5, this.canvas.width + 1, this.canvas.height + 1);
        
        // 绘制视频帧（如果启用）
        if (this.isStabilized && !this.fallbackMode) {
            this.drawVideoFrame();
        }
        
        // 标记为稳定状态
        this.isStabilized = true;
        this.lastFrameTime = performance.now();
    }
    
    drawVideoFrame() {
        try {
            // 直接绘制视频帧，避免复杂的图像处理
            this.ctx.drawImage(
                this.video, 
                0, 0, 
                this.video.videoWidth, this.video.videoHeight,
                0, 0, 
                this.canvas.width, this.canvas.height
            );
            
            this.lastGoodFrame = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
            
        } catch (error) {
            console.warn('Video frame draw error:', error);
            this.drawLastGoodFrame();
        }
    }
    
    drawLastGoodFrame() {
        if (this.lastGoodFrame) {
            this.ctx.putImageData(this.lastGoodFrame, 0, 0);
        } else {
            // 绘制备用背景
            this.ctx.fillStyle = '#1a1a2e';
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
            this.ctx.fillStyle = '#ffffff';
            this.ctx.font = '16px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.fillText('摄像头连接中...', this.canvas.width / 2, this.canvas.height / 2);
        }
    }
    
    adaptToPerformance() {
        // 动态调整渲染质量
        if (this.fps < 25) {
            this.reduceRenderQuality();
        } else if (this.fps > 35 && this.droppedFrames < 5) {
            this.increaseRenderQuality();
        }
    }
    
    reduceRenderQuality() {
        // 降低渲染质量以提高性能
        this.ctx.imageSmoothingEnabled = false;
        this.stabilizationThreshold = Math.min(this.stabilizationThreshold + 0.1, 0.95);
    }
    
    increaseRenderQuality() {
        // 提高渲染质量
        this.ctx.imageSmoothingEnabled = true;
        this.stabilizationThreshold = Math.max(this.stabilizationThreshold - 0.05, 0.7);
    }
    
    enableFallbackMode() {
        if (!this.fallbackMode) {
            this.fallbackMode = true;
            console.warn('启用备用渲染模式');
            
            // 切换到更简单的渲染方案
            this.ctx.imageSmoothingEnabled = false;
            this.bufferSize = 2; // 减少缓冲区大小
        }
    }
    
    disableFallbackMode() {
        if (this.fallbackMode && this.fps > 30) {
            this.fallbackMode = false;
            console.log('禁用备用渲染模式');
            
            // 恢复正常渲染
            this.ctx.imageSmoothingEnabled = true;
            this.bufferSize = 3;
        }
    }
    
    updateFPS(currentTime) {
        this.frameCount++;
        
        if (currentTime - this.lastFrameTime >= 1000) {
            this.fps = this.frameCount;
            this.frameCount = 0;
            
            // 更新性能显示
            this.updatePerformanceDisplay();
            
            // 检查是否需要调整策略
            if (this.fps < 20) {
                this.handleLowPerformance();
            }
        }
    }
    
    updatePerformanceDisplay() {
        const fpsElement = document.getElementById('fpsDisplay');
        if (fpsElement) {
            fpsElement.textContent = `${this.fps} FPS`;
            fpsElement.style.color = this.fps >= 25 ? '#00ff88' : this.fps >= 20 ? '#ffaa00' : '#ff4757';
        }
    }
    
    handleLowPerformance() {
        console.warn('Low performance detected:', this.fps, 'FPS');
        
        // 触发性能警告
        if (this.fps < 15) {
            this.showPerformanceWarning();
        }
    }
    
    showPerformanceWarning() {
        const warning = document.createElement('div');
        warning.id = 'performanceWarning';
        warning.className = 'fixed top-4 right-4 bg-yellow-500 text-black px-4 py-2 rounded-lg z-50';
        warning.textContent = '性能较低，建议关闭其他应用';
        
        document.body.appendChild(warning);
        
        setTimeout(() => {
            if (document.body.contains(warning)) {
                document.body.removeChild(warning);
            }
        }, 3000);
    }
    
    handleRenderError() {
        console.error('Render error occurred');
        this.droppedFrames++;
        
        // 如果连续出错，启用备用模式
        if (this.droppedFrames > 10) {
            this.enableFallbackMode();
        }
    }
    
    monitorPerformance() {
        // 定期监控内存使用情况
        setInterval(() => {
            if (performance.memory) {
                const memoryInfo = performance.memory;
                
                // 如果内存使用过高，触发垃圾回收
                if (memoryInfo.usedJSHeapSize > memoryInfo.jsHeapSizeLimit * 0.9) {
                    this.triggerGarbageCollection();
                }
            }
        }, 5000);
    }
    
    triggerGarbageCollection() {
        // 强制触发垃圾回收
        if (window.gc) {
            window.gc();
        } else {
            // 通过创建和销毁大量对象来触发GC
            for (let i = 0; i < 1000; i++) {
                const temp = new Array(1000);
            }
        }
        
        console.log('Garbage collection triggered');
    }
    
    // 骨架绘制优化版本
    drawOptimizedSkeleton(landmarks, isCorrect = true, isResting = false) {
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
        
        this.ctx.strokeStyle = strokeColor;
        this.ctx.fillStyle = fillColor;
        
        // 预计算坐标
        const points = landmarks.map((landmark, index) => ({
            index,
            x: landmark.x * this.canvas.width,
            y: landmark.y * this.canvas.height,
            visibility: landmark.visibility
        })).filter(point => point.visibility > 0.5);
        
        // 定义连接关系
        const connections = [
            [11, 12], [11, 13], [13, 15], [12, 14], [14, 16], // 手臂
            [11, 23], [12, 24], [23, 24], [23, 25], [25, 27], // 腿部
            [24, 26], [26, 28]  // 腿部
        ];
        
        // 批量绘制连接线
        this.ctx.beginPath();
        connections.forEach(connection => {
            const [startIdx, endIdx] = connection;
            const start = points.find(p => p.index === startIdx);
            const end = points.find(p => p.index === endIdx);
            
            if (start && end) {
                this.ctx.moveTo(start.x, start.y);
                this.ctx.lineTo(end.x, end.y);
            }
        });
        this.ctx.stroke();
        
        // 批量绘制关键点
        this.ctx.beginPath();
        points.forEach(point => {
            this.ctx.moveTo(point.x + 3, point.y);
            this.ctx.arc(point.x, point.y, 3, 0, 2 * Math.PI);
        });
        this.ctx.fill();
    }
    
    // 公共接口
    getFPS() {
        return this.fps;
    }
    
    isStable() {
        return this.isStabilized && this.fps >= 20;
    }
    
    enableStabilization() {
        this.isStabilized = true;
    }
    
    disableStabilization() {
        this.isStabilized = false;
    }
    
    destroy() {
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
        }
        
        this.frameBuffer = [];
        this.renderQueue = [];
        this.lastGoodFrame = null;
    }
}

// 备用渲染方案 - 使用WebGL
class WebGLRenderer {
    constructor(canvas) {
        this.canvas = canvas;
        this.gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
        
        if (!this.gl) {
            throw new Error('WebGL not supported');
        }
        
        this.initShaders();
        this.initBuffers();
    }
    
    initShaders() {
        const vertexShaderSource = `
            attribute vec2 a_position;
            attribute vec3 a_color;
            uniform vec2 u_resolution;
            varying vec3 v_color;
            
            void main() {
                vec2 clipSpace = ((a_position / u_resolution) * 2.0) - 1.0;
                gl_Position = vec4(clipSpace * vec2(1, -1), 0, 1);
                v_color = a_color;
            }
        `;
        
        const fragmentShaderSource = `
            precision mediump float;
            varying vec3 v_color;
            
            void main() {
                gl_FragColor = vec4(v_color, 1.0);
            }
        `;
        
        // 编译着色器
        this.program = this.createProgram(vertexShaderSource, fragmentShaderSource);
        this.gl.useProgram(this.program);
        
        // 获取属性和uniform位置
        this.positionLocation = this.gl.getAttribLocation(this.program, 'a_position');
        this.colorLocation = this.gl.getAttribLocation(this.program, 'a_color');
        this.resolutionLocation = this.gl.getUniformLocation(this.program, 'u_resolution');
    }
    
    createProgram(vertexSource, fragmentSource) {
        const vertexShader = this.createShader(this.gl.VERTEX_SHADER, vertexSource);
        const fragmentShader = this.createShader(this.gl.FRAGMENT_SHADER, fragmentSource);
        
        const program = this.gl.createProgram();
        this.gl.attachShader(program, vertexShader);
        this.gl.attachShader(program, fragmentShader);
        this.gl.linkProgram(program);
        
        if (!this.gl.getProgramParameter(program, this.gl.LINK_STATUS)) {
            throw new Error('Program linking failed: ' + this.gl.getProgramInfoLog(program));
        }
        
        return program;
    }
    
    createShader(type, source) {
        const shader = this.gl.createShader(type);
        this.gl.shaderSource(shader, source);
        this.gl.compileShader(shader);
        
        if (!this.gl.getShaderParameter(shader, this.gl.COMPILE_STATUS)) {
            throw new Error('Shader compilation failed: ' + this.gl.getShaderInfoLog(shader));
        }
        
        return shader;
    }
    
    drawSkeleton(landmarks, isCorrect = true, isResting = false) {
        // 设置视口
        this.gl.viewport(0, 0, this.canvas.width, this.canvas.height);
        this.gl.uniform2f(this.resolutionLocation, this.canvas.width, this.canvas.height);
        
        // 设置颜色
        let color;
        if (isResting) {
            color = [0.0, 0.83, 1.0]; // #00d4ff
        } else if (isCorrect) {
            color = [0.0, 1.0, 0.53]; // #00ff88
        } else {
            color = [1.0, 0.28, 0.34]; // #ff4757
        }
        
        // 转换landmarks到WebGL坐标
        const positions = [];
        const colors = [];
        
        landmarks.forEach(landmark => {
            if (landmark.visibility > 0.5) {
                positions.push(landmark.x * this.canvas.width, landmark.y * this.canvas.height);
                colors.push(...color);
            }
        });
        
        // 创建和绑定缓冲区
        const positionBuffer = this.gl.createBuffer();
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, positionBuffer);
        this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array(positions), this.gl.STATIC_DRAW);
        this.gl.enableVertexAttribArray(this.positionLocation);
        this.gl.vertexAttribPointer(this.positionLocation, 2, this.gl.FLOAT, false, 0, 0);
        
        const colorBuffer = this.gl.createBuffer();
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, colorBuffer);
        this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array(colors), this.gl.STATIC_DRAW);
        this.gl.enableVertexAttribArray(this.colorLocation);
        this.gl.vertexAttribPointer(this.colorLocation, 3, this.gl.FLOAT, false, 0, 0);
        
        // 绘制点
        this.gl.drawArrays(this.gl.POINTS, 0, positions.length / 2);
    }
}

// 导出类
window.CameraStabilizer = CameraStabilizer;
window.WebGLRenderer = WebGLRenderer;
