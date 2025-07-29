// 몽글팜 게임 - 메인 JavaScript

class MongleFarm {
    constructor() {
        this.currentScreen = 'start';
        this.gameState = {
            points: 0,
            crops: [],
            selectedTool: 'plant',
            selectedSeed: 'carrot',
            currentTargets: [], // 현재 목표들
            failedPlots: [], // 실패한 구획들
            completedTargets: 0 // 완료된 목표 수
        };
        
        this.cropTypes = {
            carrot: { 
                name: '당근',
                image: 'mongle_farm_textures/carrot.png', 
                growTime: 3000, 
                points: 10,
                needsWater: true,
                waterTiming: 2000 // 심은 후 2초 후에 물 필요
            },
            apple: { 
                name: '사과',
                image: 'mongle_farm_textures/apple.png', 
                growTime: 5000, 
                points: 20,
                needsWater: true,
                waterTiming: 2500 // 심은 후 2.5초 후에 물 필요
            },
            flower: { 
                name: '비트',
                image: 'mongle_farm_textures/beatroot.png', 
                growTime: 2500, 
                points: 15,
                needsWater: false,
                waterTiming: 0 // 물 필요 없음
            }
        };

        // 새로운 퍼즐 시스템 설정
        this.puzzleSettings = {
            maxTargets: 2, // 동시에 최대 2개 목표
            baseFailureTime: 12000, // 기본 12초로 시작
            minFailureTime: 6000, // 최소 6초까지 줄어듦
            targetGenerationDelay: 1000, // 새 목표 생성 지연시간
            waterWindow: 4000, // 물주기 시간 4초로 설정
            minWaterWindow: 2000 // 최소 2초까지 줄어듦
        };
        
        this.isGameRunning = false;
        this.soundEnabled = true;
        
        this.init();
    }
    
    init() {
        this.bindEvents();
        this.createFarmPlots();
        this.startGameLoop();
        this.showNotification('몽글팜에 오신 걸 환영해요!');
    }
    
    bindEvents() {
        // 화면 전환 버튼들
        document.getElementById('start-btn').addEventListener('click', () => this.switchScreen('game'));
        document.getElementById('quit-btn').addEventListener('click', () => this.quitGame());
        document.getElementById('sound-btn').addEventListener('click', () => this.toggleSound());
        
        // 스와이프 기능 초기화
        this.initSwipeControls();
        
        // 게임 컨트롤 버튼들
        document.getElementById('pause-btn').addEventListener('click', () => this.pauseGame());
        document.getElementById('back-btn').addEventListener('click', () => this.switchScreen('start'));
        document.getElementById('resume-btn').addEventListener('click', () => this.resumeGame());
        document.getElementById('main-menu-btn').addEventListener('click', () => this.goToMainMenu());
        
        // 게임오버 화면 버튼들
        document.getElementById('game-over-main-btn').addEventListener('click', () => this.goToMainMenu());
        
        // 오버레이 클릭으로 팝업 닫기
        document.getElementById('pause-screen').addEventListener('click', (e) => {
            if (e.target.id === 'pause-screen') {
                this.resumeGame();
            }
        });
        
        document.getElementById('game-over-screen').addEventListener('click', (e) => {
            if (e.target.id === 'game-over-screen') {
                this.goToMainMenu();
            }
        });
        
        // 작물 선택
        document.querySelectorAll('.action-btn-img').forEach(btn => {
            btn.addEventListener('click', (e) => this.selectSeed(e.target.dataset.seed));
        });
        
        // 물주기 버튼
        document.querySelector('[data-tool="water"]').addEventListener('click', () => {
            this.selectTool('water');
        });
        
        // 아기곰 클릭
        document.getElementById('bear').addEventListener('click', () => this.bearInteraction());
    }
    
    switchScreen(screenName) {
        // 게임이 실행 중이었다면 정지
        if (this.isGameRunning && screenName !== 'game') {
            this.stopGame();
        }
        
        document.querySelectorAll('.screen').forEach(screen => {
            screen.classList.remove('active');
        });
        
        document.getElementById(`${screenName}-screen`).classList.add('active');
        this.currentScreen = screenName;
        
        if (screenName === 'game') {
            this.isGameRunning = true;
            this.showNotification('농장 일을 시작해볼까요?');
            this.startNewGame();
            // BGM 시작
            window.mongleAudio?.startBGM();
        }
    }
    
    stopGame() {
        this.isGameRunning = false;
        
        // BGM 정지
        window.mongleAudio?.stopBGM();
        
        // 모든 타이머 정리
        this.gameState.currentTargets.forEach(target => {
            target.isActive = false;
        });
        
        // 게임 상태 초기화
        this.gameState.currentTargets = [];
        this.gameState.crops = [];
        
        // 농장 플롯 정리
        for (let i = 0; i < 6; i++) {
            const plot = document.querySelector(`[data-plot-id="${i}"]`);
            if (plot) {
                plot.className = 'plot';
                plot.innerHTML = '';
            }
        }
    }
    
    createFarmPlots() {
        const farmPlotsContainer = document.getElementById('farm-plots');
        farmPlotsContainer.innerHTML = '';
        
        for (let i = 0; i < 6; i++) {
            const plot = document.createElement('div');
            plot.className = 'plot';
            plot.dataset.plotId = i;
            plot.addEventListener('click', () => this.handlePlotClick(i));
            farmPlotsContainer.appendChild(plot);
        }
    }
    
    handlePlotClick(plotId) {
        const plot = document.querySelector(`[data-plot-id="${plotId}"]`);
        const plotData = this.gameState.crops.find(crop => crop.plotId === plotId);
        
        // 이미 작물이 있으면 상태에 따라 처리
        if (plotData) {
            if (plotData.isReady) {
                // 다 자란 작물이면 자동 수확
                this.harvestCrop(plotId, plot);
            } else if (this.gameState.selectedTool === 'water') {
                // 물주기 도구 선택 시에만 물주기
                this.waterPlot(plotId, plot);
            }
        } else {
            // 빈 땅이면 심기
            if (this.gameState.selectedTool === 'plant') {
                this.plantSeed(plotId, plot);
            }
        }
    }
    
    plantSeed(plotId, plot) {
        // 이미 심어진 곳인지 확인
        if (this.gameState.crops.some(crop => crop.plotId === plotId)) {
            this.showNotification('이미 작물이 심어져 있어요!');
            return;
        }
        
        // 실패한 구획인지 확인
        if (this.gameState.failedPlots.includes(plotId)) {
            this.showNotification('사용할 수 없는 구획입니다!');
            return;
        }
        
        const seedType = this.gameState.selectedSeed;
        const cropType = this.cropTypes[seedType];
        
        // 올바른 목표인지 확인
        if (!this.checkCorrectPlanting(plotId, seedType)) {
            return;
        }
        
        // 새로운 작물 추가
        const newCrop = {
            plotId: plotId,
            type: seedType,
            plantedTime: Date.now(),
            growTime: cropType.growTime,
            isReady: false,
            watered: false,
            needsWater: cropType.needsWater,
            waterTiming: cropType.waterTiming,
            waterRequired: false,
            waterMissed: false
        };
        
        this.gameState.crops.push(newCrop);
        plot.classList.add('planted');
        
        // 목표 성공 처리
        this.handleTargetSuccess(plotId, seedType);
        
        // 즉시 작은 새싹 표시
        const sprout = document.createElement('div');
        sprout.className = 'crop';
        sprout.textContent = '🌱';
        plot.appendChild(sprout);
        
        this.showNotification(`${cropType.name} 씨앗을 심었어요!`);
        this.bearHappyAnimation();
        window.mongleAudio?.playEffect('plant');
        
        // 물주기 타이머 시작 (필요한 경우)
        if (newCrop.needsWater) {
            setTimeout(() => {
                this.triggerWaterNeeded(plotId);
            }, newCrop.waterTiming);
        }
        
        // 성장 타이머 시작
        setTimeout(() => {
            this.growCrop(plotId);
        }, cropType.growTime);
    }
    
    waterPlot(plotId, plot) {
        const cropData = this.gameState.crops.find(crop => crop.plotId === plotId);
        
        if (!cropData) {
            this.showNotification('심어진 작물이 없어요!');
            return;
        }
        
        if (!cropData.waterRequired) {
            this.showNotification('아직 물이 필요하지 않아요!');
            return;
        }
        
        if (cropData.watered) {
            this.showNotification('이미 물을 줬어요!');
            return;
        }
        
        // 물주기 성공
        cropData.watered = true;
        cropData.waterRequired = false;
        
        // 물 요구 표시 제거
        const waterIndicator = plot.querySelector('.water-indicator');
        if (waterIndicator) waterIndicator.remove();
        
        plot.classList.remove('needs-water');
        
        // 물방울 효과
        const waterDrop = document.createElement('div');
        waterDrop.textContent = '💧';
        waterDrop.style.position = 'absolute';
        waterDrop.style.animation = 'waterDrop 1s ease-out';
        plot.appendChild(waterDrop);
        
        setTimeout(() => waterDrop.remove(), 1000);
        
        this.showNotification('시원한 물을 줬어요!');
        this.bearHappyAnimation();
        window.mongleAudio?.playEffect('water');
    }

    triggerWaterNeeded(plotId) {
        const cropData = this.gameState.crops.find(crop => crop.plotId === plotId);
        if (!cropData || cropData.watered || cropData.waterMissed) return;
        
        cropData.waterRequired = true;
        
        const plot = document.querySelector(`[data-plot-id="${plotId}"]`);
        plot.classList.add('needs-water');
        
        // 물 요구 표시
        const waterIndicator = document.createElement('div');
        waterIndicator.className = 'water-indicator';
        waterIndicator.textContent = '물!';
        waterIndicator.style.position = 'absolute';
        waterIndicator.style.top = '2px';
        waterIndicator.style.right = '2px';
        waterIndicator.style.fontSize = '0.6rem';
        waterIndicator.style.fontWeight = 'bold';
        waterIndicator.style.color = '#0066cc';
        waterIndicator.style.background = 'rgba(255, 255, 255, 0.9)';
        waterIndicator.style.padding = '2px 4px';
        waterIndicator.style.borderRadius = '6px';
        waterIndicator.style.animation = 'waterPulse 1s ease-in-out infinite';
        plot.appendChild(waterIndicator);
        
        this.showNotification(`${this.cropTypes[cropData.type].name}에 물이 필요해요!`);
        
        // 물주기 실패 타이머 (점진적으로 빨라짐)
        const currentWaterWindow = this.getCurrentWaterWindow();
        setTimeout(() => {
            if (!this.isGameRunning) return;
            this.handleWaterMissed(plotId);
        }, currentWaterWindow);
    }

    handleWaterMissed(plotId) {
        const cropData = this.gameState.crops.find(crop => crop.plotId === plotId);
        if (!cropData || cropData.watered) return;
        
        cropData.waterMissed = true;
        
        // 작물 실패 처리
        this.handleCropFailure(plotId);
    }

    handleCropFailure(plotId) {
        // 작물 제거
        this.gameState.crops = this.gameState.crops.filter(crop => crop.plotId !== plotId);
        
        // 구획을 실패 상태로 만들기
        if (!this.gameState.failedPlots.includes(plotId)) {
            this.gameState.failedPlots.push(plotId);
        }
        
        const plot = document.querySelector(`[data-plot-id="${plotId}"]`);
        plot.classList.remove('planted', 'needs-water');
        plot.classList.add('failed');
        plot.innerHTML = '';
        
        // 실패 표시
        const failedIndicator = document.createElement('div');
        failedIndicator.textContent = 'X';
        failedIndicator.style.fontSize = '1.7rem';
        failedIndicator.style.color = '#ff0000';
        failedIndicator.style.fontWeight = 'bold';
        plot.appendChild(failedIndicator);
        
        this.showNotification('물주기 실패! 이 구획은 더 이상 사용할 수 없어요!');
        
        // 게임오버 체크
        this.checkGameOver();
    }

    tryGenerateNewTarget() {
        if (!this.isGameRunning) return;
        
        const dynamicMaxTargets = this.getDynamicMaxTargets();
        if (this.gameState.currentTargets.length < dynamicMaxTargets) {
            this.generateNewTarget();
        }
    }

    generateInitialTargets() {
        const dynamicMaxTargets = this.getDynamicMaxTargets();
        for (let i = 0; i < dynamicMaxTargets; i++) {
            setTimeout(() => {
                if (!this.isGameRunning) return;
                this.generateNewTarget();
            }, i * 500);
        }
    }

    startNewGame() {
        // 게임 상태 초기화
        this.gameState.points = 0;
        this.gameState.crops = [];
        this.gameState.currentTargets = [];
        this.gameState.failedPlots = [];
        this.gameState.completedTargets = 0;
        this.gameState.selectedTool = 'plant';
        this.gameState.selectedSeed = 'carrot';
        
        // UI 초기화 - 당근 선택 상태로 시작
        document.querySelectorAll('.action-btn-img').forEach(btn => btn.classList.remove('active'));
        document.querySelector('[data-seed="carrot"]').classList.add('active');
        
        // 모든 구획 초기화
        for (let i = 0; i < 6; i++) {
            const plot = document.querySelector(`[data-plot-id="${i}"]`);
            plot.className = 'plot';
            plot.innerHTML = '';
        }
        
        // 초기 목표들 생성
        setTimeout(() => {
            this.generateInitialTargets();
            this.updatePuzzleUI();
        }, 1000);
        
        // 초기 UI 업데이트
        this.updatePuzzleUI();
    }
    
    harvestCrop(plotId, plot) {
        const cropIndex = this.gameState.crops.findIndex(crop => crop.plotId === plotId);
        
        if (cropIndex === -1) {
            this.showNotification('수확할 작물이 없어요!');
            return;
        }
        
        const cropData = this.gameState.crops[cropIndex];
        
        if (!cropData.isReady) {
            this.showNotification('아직 자라고 있어요!');
            return;
        }
        
        // 수확 처리
        const cropType = this.cropTypes[cropData.type];
        const points = cropType.points;
        
        this.gameState.points += points;
        
        // 수확 효과
        const harvestEffect = document.createElement('div');
        harvestEffect.textContent = '✨';
        harvestEffect.style.position = 'absolute';
        harvestEffect.style.animation = 'harvestSparkle 1s ease-out';
        plot.appendChild(harvestEffect);
        
        setTimeout(() => harvestEffect.remove(), 1000);
        
        // 작물 제거
        this.gameState.crops.splice(cropIndex, 1);
        plot.classList.remove('planted', 'needs-water');
        plot.innerHTML = '';
        plot.style.background = '';
        
        this.showNotification(`${cropType.name}를 수확했어요! (+${points} 포인트!)`);
        this.bearHappyAnimation();
        window.mongleAudio?.playEffect('harvest');
        
        // 퍼즐 UI 업데이트
        this.updatePuzzleUI();
    }
    


    // 🎯 새로운 목표 기반 퍼즐 시스템

    generateNewTarget() {
        // 게임이 실행 중이 아니면 목표 생성하지 않음
        if (!this.isGameRunning) return null;
        
        // 실패한 구획과 이미 사용중인 구획 제외
        const availablePlots = [];
        for (let i = 0; i < 6; i++) {
            if (!this.gameState.failedPlots.includes(i) && 
                !this.gameState.crops.find(crop => crop.plotId === i) &&
                !this.gameState.currentTargets.find(target => target.plotId === i)) {
                availablePlots.push(i);
            }
        }
        
        if (availablePlots.length === 0) {
            // 사용 가능한 플롯이 없으면 잠시 후 다시 시도
            setTimeout(() => {
                this.tryGenerateNewTarget();
            }, 2000);
            return null;
        }
        
        // 랜덤 위치와 작물 선택
        const plotId = availablePlots[Math.floor(Math.random() * availablePlots.length)];
        const cropTypes = ['carrot', 'apple', 'flower'];
        const cropType = cropTypes[Math.floor(Math.random() * cropTypes.length)];
        
        const newTarget = {
            plotId: plotId,
            requiredCrop: cropType,
            createdTime: Date.now(),
            isActive: true
        };
        
        this.gameState.currentTargets.push(newTarget);
        this.showTargetOnPlot(plotId, cropType);
        this.startTargetTimer(newTarget);
        
        return newTarget;
    }

    showTargetOnPlot(plotId, cropType) {
        const plot = document.querySelector(`[data-plot-id="${plotId}"]`);
        plot.classList.add('target');
        
        // 목표 작물 표시
        const targetIndicator = document.createElement('div');
        targetIndicator.className = 'target-indicator';
        targetIndicator.textContent = this.cropTypes[cropType].name;
        targetIndicator.style.position = 'absolute';
        targetIndicator.style.top = '2px';
        targetIndicator.style.left = '2px';
        targetIndicator.style.fontSize = '0.6rem';
        targetIndicator.style.fontWeight = 'bold';
        targetIndicator.style.color = '#ff6b35';
        targetIndicator.style.background = 'rgba(255, 255, 255, 0.9)';
        targetIndicator.style.padding = '2px 4px';
        targetIndicator.style.borderRadius = '6px';
        plot.appendChild(targetIndicator);
    }

    startTargetTimer(target) {
        const currentFailureTime = this.getCurrentFailureTime();
        setTimeout(() => {
            if (!this.isGameRunning) return;
            if (target.isActive && this.gameState.currentTargets.includes(target)) {
                this.handleTargetFailure(target.plotId);
            }
        }, currentFailureTime);
    }

    getAvailablePlots() {
        // 사용 가능한 플롯 수 계산
        return 6 - this.gameState.failedPlots.length;
    }

    getCurrentFailureTime() {
        const completed = this.gameState.completedTargets;
        const availablePlots = this.getAvailablePlots();
        
        // 기본 난이도 증가 (완료한 목표 수에 따라)
        const completedReduction = Math.min(completed * 500, this.puzzleSettings.baseFailureTime - this.puzzleSettings.minFailureTime);
        
        // 사용 가능한 플롯이 적을수록 더 빠르게 (추가 난이도)
        const plotPenalty = (6 - availablePlots) * 1000; // 플롯 1개 잃을 때마다 1초 단축
        
        const totalReduction = completedReduction + plotPenalty;
        return Math.max(this.puzzleSettings.baseFailureTime - totalReduction, this.puzzleSettings.minFailureTime);
    }

    getCurrentWaterWindow() {
        const completed = this.gameState.completedTargets;
        const availablePlots = this.getAvailablePlots();
        
        // 기본 난이도 증가
        const completedReduction = Math.min(completed * 200, this.puzzleSettings.waterWindow - this.puzzleSettings.minWaterWindow);
        
        // 사용 가능한 플롯이 적을수록 더 빠르게
        const plotPenalty = (6 - availablePlots) * 400; // 플롯 1개 잃을 때마다 0.4초 단축
        
        const totalReduction = completedReduction + plotPenalty;
        return Math.max(this.puzzleSettings.waterWindow - totalReduction, this.puzzleSettings.minWaterWindow);
    }

    getDynamicMaxTargets() {
        const availablePlots = this.getAvailablePlots();
        
        // 사용 가능한 플롯이 적을수록 더 많은 동시 목표
        if (availablePlots <= 3) {
            return Math.min(availablePlots, 3); // 최대 3개까지
        } else if (availablePlots <= 4) {
            return 2;
        } else {
            return 2; // 기본 2개
        }
    }

    getDynamicTargetDelay() {
        const availablePlots = this.getAvailablePlots();
        
        // 사용 가능한 플롯이 적을수록 더 빠른 목표 생성
        if (availablePlots <= 3) {
            return 500; // 0.5초
        } else if (availablePlots <= 4) {
            return 750; // 0.75초
        } else {
            return 1000; // 기본 1초
        }
    }

    checkCorrectPlanting(plotId, seedType) {
        // 목표가 있는 구획인지 확인
        const target = this.gameState.currentTargets.find(t => t.plotId === plotId);
        if (!target) {
            this.showNotification('목표가 표시된 구획에만 심을 수 있어요!');
            return false;
        }
        
        // 올바른 작물인지 확인
        if (target.requiredCrop !== seedType) {
            this.showNotification(`이 구역에는 ${this.cropTypes[target.requiredCrop].name}를 심어야 해요!`);
            return false;
        }
        
        return true;
    }

    handleTargetFailure(plotId) {
        // 목표 제거
        this.gameState.currentTargets = this.gameState.currentTargets.filter(t => t.plotId !== plotId);
        
        // 구획을 실패 상태로 만들기
        this.gameState.failedPlots.push(plotId);
        
        const plot = document.querySelector(`[data-plot-id="${plotId}"]`);
        plot.classList.remove('target');
        plot.classList.add('failed');
        plot.innerHTML = '';
        
        // 실패 표시
        const failedIndicator = document.createElement('div');
        failedIndicator.textContent = 'X';
        failedIndicator.style.fontSize = '1.7rem';
        failedIndicator.style.color = '#ff0000';
        failedIndicator.style.fontWeight = 'bold';
        plot.appendChild(failedIndicator);
        
        this.showNotification('시간 초과! 이 구획은 더 이상 사용할 수 없어요!');
        
        // 게임오버 체크
        this.checkGameOver();
        
        // 새 목표 생성 (동적 지연시간)
        setTimeout(() => {
            this.tryGenerateNewTarget();
        }, this.getDynamicTargetDelay());
    }

    handleTargetSuccess(plotId, cropType) {
        // 목표 완료
        const target = this.gameState.currentTargets.find(t => t.plotId === plotId);
        if (target) {
            target.isActive = false;
            this.gameState.currentTargets = this.gameState.currentTargets.filter(t => t.plotId !== plotId);
        }
        
        const plot = document.querySelector(`[data-plot-id="${plotId}"]`);
        plot.classList.remove('target');
        
        // 목표 인디케이터 제거
        const indicator = plot.querySelector('.target-indicator');
        if (indicator) indicator.remove();
        
        // 포인트 획득
        const points = this.cropTypes[cropType].points;
        this.gameState.points += points;
        this.gameState.completedTargets++;
        
        this.showNotification(`목표 달성! +${points} 포인트!`);
        this.updatePuzzleUI();
        
        // 새 목표 생성 (동적 지연시간)
        setTimeout(() => {
            this.tryGenerateNewTarget();
        }, this.getDynamicTargetDelay());
    }



    updatePuzzleUI() {
        // 상단 UI에 게임 진행 상황 표시
        const progressInfo = document.querySelector('.puzzle-progress');
        if (progressInfo) {
            const availablePlots = this.getAvailablePlots();
            const activeTargets = this.gameState.currentTargets.length;
            const maxTargets = this.getDynamicMaxTargets();
            const currentTime = Math.round(this.getCurrentFailureTime() / 1000);
            const currentWater = Math.round(this.getCurrentWaterWindow() / 1000);
            
            progressInfo.textContent = `포인트: ${this.gameState.points} | 완료: ${this.gameState.completedTargets} | 사용가능: ${availablePlots}칸 | 목표: ${activeTargets}/${maxTargets} | 제한: ${currentTime}s/${currentWater}s`;
        }
    }
    
    growCrop(plotId) {
        const cropData = this.gameState.crops.find(crop => crop.plotId === plotId);
        if (!cropData) return;
        
        cropData.isReady = true;
        const plot = document.querySelector(`[data-plot-id="${plotId}"]`);
        const cropElement = plot.querySelector('.crop');
        
        if (cropElement) {
            const cropType = this.cropTypes[cropData.type];
            
            // 이미지로 교체
            const cropImg = document.createElement('img');
            cropImg.src = cropType.image;
            cropImg.alt = cropType.name;
            cropImg.className = 'crop-img';
            cropImg.style.animation = 'cropGrow 1s ease-out';
                    cropImg.style.width = '35px';
        cropImg.style.height = 'auto';
            
            cropElement.replaceWith(cropImg);
        }
        
        this.showNotification(`작물이 다 자랐어요! 수확해보세요!`);
    }
    
    selectTool(tool) {
        // 모든 버튼의 active 클래스 제거
        document.querySelectorAll('.action-btn-img').forEach(btn => btn.classList.remove('active'));
        
        if (tool === 'water') {
            // 물주기 버튼 활성화
            document.querySelector('[data-tool="water"]').classList.add('active');
            this.gameState.selectedTool = 'water';
            this.showNotification('물주기 모드!');
        } else if (tool === 'plant') {
            // 심기 모드는 작물 선택으로 자동 전환
            this.gameState.selectedTool = 'plant';
            // 현재 선택된 작물 버튼 활성화
            document.querySelector(`[data-seed="${this.gameState.selectedSeed}"]`).classList.add('active');
        }
    }
    
    selectSeed(seed) {
        // 모든 버튼의 active 클래스 제거
        document.querySelectorAll('.action-btn-img').forEach(btn => btn.classList.remove('active'));
        // 선택된 작물 버튼 활성화
        document.querySelector(`[data-seed="${seed}"]`).classList.add('active');
        
        this.gameState.selectedSeed = seed;
        this.gameState.selectedTool = 'plant'; // 자동으로 심기 모드로 전환
        
        const seedNames = {
            carrot: '당근',
            apple: '사과',
            flower: '비트'
        };
        
        this.showNotification(`${seedNames[seed]} 선택! 타일을 클릭해서 심어보세요!`);
    }
    
    bearInteraction() {
        const bear = document.getElementById('bear');
        const messages = [
            '안녕! 오늘도 좋은 하루야!',
            '농장 일이 재밌어!',
            '같이 작물을 키워보자!',
            '이 언덕이 정말 평화로워!',
            '너와 함께라서 행복해!'
        ];
        
        const randomMessage = messages[Math.floor(Math.random() * messages.length)];
        this.showNotification(randomMessage);
        window.mongleAudio?.playEffect('happy');
        
        bear.style.animation = 'none';
        setTimeout(() => {
            bear.style.animation = 'bearBreathe 3s ease-in-out infinite';
        }, 100);
    }
    
    bearHappyAnimation() {
        const bear = document.getElementById('bear');
        bear.style.transform = 'scale(1.2)';
        setTimeout(() => {
            bear.style.transform = 'scale(1)';
        }, 300);
    }
    
    startGameLoop() {
        // 간단한 게임 루프 - 필요시 추가 기능 구현
    }
    
    pauseGame() {
        this.isGameRunning = false;
        this.switchScreen('pause');
        // BGM 일시정지
        window.mongleAudio?.pauseBGM();
    }
    
    resumeGame() {
        this.isGameRunning = true;
        
        // 화면만 전환하고 게임 초기화는 하지 않음
        document.querySelectorAll('.screen').forEach(screen => {
            screen.classList.remove('active');
        });
        
        document.getElementById('game-screen').classList.add('active');
        this.currentScreen = 'game';
        
        this.showNotification('게임을 계속해요!');
        // BGM 재개
        window.mongleAudio?.resumeBGM();
    }
    
    saveGame() {
        localStorage.setItem('mongleFarmSave', JSON.stringify(this.gameState));
        this.showNotification('게임이 저장되었어요!');
    }
    
    loadGame() {
        const saveData = localStorage.getItem('mongleFarmSave');
        if (saveData) {
            this.gameState = JSON.parse(saveData);
            this.showNotification('게임을 불러왔어요!');
        }
    }
    
    goToMainMenu() {
        this.isGameRunning = false;
        this.switchScreen('start');
        // BGM 정지
        window.mongleAudio?.stopBGM();
    }
    
    toggleSound() {
        this.soundEnabled = !this.soundEnabled;
        const soundBtn = document.getElementById('sound-btn');
        soundBtn.textContent = this.soundEnabled ? '🔊 SOUND' : '🔇 SOUND';
        this.showNotification(this.soundEnabled ? '소리가 켜졌어요!' : '소리가 꺼졌어요!');
    }
    
    quitGame() {
        if (confirm('정말 게임을 종료하시겠어요?')) {
            this.showNotification('안녕히 가세요! 다시 놀러와요!');
            setTimeout(() => {
                window.close();
            }, 2000);
        }
    }

    initSwipeControls() {
        let startX = 0;
        let startY = 0;
        let endX = 0;
        let endY = 0;
        
        const gameScreen = document.getElementById('game-screen');
        
        gameScreen.addEventListener('touchstart', (e) => {
            if (this.currentScreen !== 'game') return;
            startX = e.touches[0].clientX;
            startY = e.touches[0].clientY;
        }, { passive: true });
        
        gameScreen.addEventListener('touchend', (e) => {
            if (this.currentScreen !== 'game') return;
            endX = e.changedTouches[0].clientX;
            endY = e.changedTouches[0].clientY;
            
            const deltaX = endX - startX;
            const deltaY = endY - startY;
            const minSwipeDistance = 50;
            
            // 수직 스와이프가 더 큰 경우 (물주기 모드)
            if (Math.abs(deltaY) > Math.abs(deltaX) && Math.abs(deltaY) > minSwipeDistance) {
                if (deltaY > 0) {
                    // 아래로 스와이프 - 물주기
                    this.selectTool('water');
                }
            }
            // 수평 스와이프가 더 큰 경우 (작물 변경)
            else if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > minSwipeDistance) {
                const seeds = ['carrot', 'apple', 'flower'];
                const currentIndex = seeds.indexOf(this.gameState.selectedSeed);
                
                if (deltaX < 0) {
                    // 왼쪽으로 스와이프 - 이전 작물
                    const newIndex = (currentIndex - 1 + seeds.length) % seeds.length;
                    this.selectSeed(seeds[newIndex]);
                } else {
                    // 오른쪽으로 스와이프 - 다음 작물
                    const newIndex = (currentIndex + 1) % seeds.length;
                    this.selectSeed(seeds[newIndex]);
                }
            }
        }, { passive: true });
    }
    
    showNotification(message) {
        const notification = document.getElementById('notification');
        const notificationText = document.getElementById('notification-text');
        
        notificationText.textContent = message;
        notification.classList.remove('hidden');
        window.mongleAudio?.playEffect('notification');
        
        setTimeout(() => {
            notification.classList.add('hidden');
        }, 2000);
    }

    checkGameOver() {
        // 실패한 플롯이 3개 이상이면 게임오버 (6칸 중 3칸 실패 = 사용 가능 칸 3개)
        if (this.gameState.failedPlots.length >= 3) {
            setTimeout(() => {
                this.showGameOver();
            }, 1500); // 알림이 보인 후 게임오버
        }
    }

    showGameOver() {
        this.isGameRunning = false;
        
        // BGM 정지
        window.mongleAudio?.stopBGM();
        
        // 최종 점수와 목표 수 업데이트
        document.getElementById('final-score').textContent = this.gameState.points;
        document.getElementById('final-targets').textContent = this.gameState.completedTargets;
        
        // 게임오버 화면으로 전환
        this.switchScreen('game-over');
        
        this.showNotification('농장에 더 이상 심을 곳이 없어요!');
    }

    restartGame() {
        this.showNotification('새로운 농장을 시작해요!');
        this.switchScreen('game');
    }
}

// 추가 CSS 애니메이션 동적 추가
const additionalStyles = `
    @keyframes waterDrop {
        0% { transform: translateY(-20px); opacity: 1; }
        100% { transform: translateY(20px); opacity: 0; }
    }
    
    @keyframes harvestSparkle {
        0% { transform: scale(0) rotate(0deg); opacity: 1; }
        100% { transform: scale(2) rotate(360deg); opacity: 0; }
    }
    
    .decoration {
        animation: decorationFloat 2s ease-in-out infinite;
    }
    
    @keyframes decorationFloat {
        0%, 100% { transform: translateY(0px); }
        50% { transform: translateY(-5px); }
    }
`;

// 스타일 시트에 추가 애니메이션 삽입
const styleSheet = document.createElement('style');
styleSheet.textContent = additionalStyles;
document.head.appendChild(styleSheet);

// 게임 시작
document.addEventListener('DOMContentLoaded', () => {
    window.mongleFarm = new MongleFarm();
});

// 키보드 단축키
document.addEventListener('keydown', (e) => {
    if (!window.mongleFarm) return;
    
    switch(e.key) {
        case '1': // 1키로 당근 선택
            window.mongleFarm.selectSeed('carrot');
            break;
        case '2': // 2키로 사과 선택
            window.mongleFarm.selectSeed('apple');
            break;
        case '3': // 3키로 비트 선택
            window.mongleFarm.selectSeed('flower');
            break;
        case '4': // 4키로 물주기
            window.mongleFarm.selectTool('water');
            break;
        case 'Escape':
            if (window.mongleFarm.currentScreen === 'game') {
                window.mongleFarm.pauseGame();
            } else if (window.mongleFarm.currentScreen === 'pause') {
                window.mongleFarm.resumeGame();
            } else if (window.mongleFarm.currentScreen === 'game-over') {
                window.mongleFarm.goToMainMenu();
            }
            break;
        case ' ': // 스페이스바로 일시정지
            e.preventDefault();
            if (window.mongleFarm.currentScreen === 'game') {
                window.mongleFarm.pauseGame();
            }
            break;
    }
}); 