// 몽글팜 오디오 시스템

class MongleAudio {
    constructor() {
        this.audioContext = null;
        this.backgroundMusic = null;
        this.bgmAudio = null;
        this.isPlaying = false;
        this.volume = 0.3;
        this.initAudio();
    }
    
    async initAudio() {
        try {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            this.createBackgroundMusic();
            this.initBGM();
        } catch (error) {
            console.log('Audio not supported');
        }
    }
    
    initBGM() {
        // 실제 BGM 파일 로드
        this.bgmAudio = new Audio('mongle_theme_long.wav');
        this.bgmAudio.loop = true;
        this.bgmAudio.volume = this.volume * 0.6; // BGM은 조금 더 작게
        this.bgmAudio.preload = 'auto';
        
        // 재생 준비 완료 이벤트
        this.bgmAudio.addEventListener('canplaythrough', () => {
            console.log('BGM 로드 완료!');
        });
        
        // 에러 핸들링
        this.bgmAudio.addEventListener('error', (e) => {
            console.log('BGM 로드 실패:', e);
        });
    }
    
    // 부드러운 백그라운드 음악 생성
    createBackgroundMusic() {
        if (!this.audioContext) return;
        
        // 옥타브별 음계
        const notes = [
            261.63, // C4
            293.66, // D4
            329.63, // E4
            349.23, // F4
            392.00, // G4
            440.00, // A4
            493.88, // B4
            523.25  // C5
        ];
        
        this.musicSequence = [0, 2, 4, 2, 0, 2, 4, 7, 5, 4, 2, 0];
        this.currentNoteIndex = 0;
        
        this.playBackgroundNote();
    }
    
    playBackgroundNote() {
        if (!this.audioContext || !window.mongleFarm?.soundEnabled) return;
        
        const note = this.musicSequence[this.currentNoteIndex];
        const frequency = [261.63, 293.66, 329.63, 349.23, 392.00, 440.00, 493.88, 523.25][note];
        
        // 오실레이터 생성
        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(this.audioContext.destination);
        
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(frequency, this.audioContext.currentTime);
        
        // 부드러운 볼륨 변화
        gainNode.gain.setValueAtTime(0, this.audioContext.currentTime);
        gainNode.gain.linearRampToValueAtTime(this.volume * 0.1, this.audioContext.currentTime + 0.5);
        gainNode.gain.linearRampToValueAtTime(0, this.audioContext.currentTime + 2.5);
        
        oscillator.start(this.audioContext.currentTime);
        oscillator.stop(this.audioContext.currentTime + 2.5);
        
        this.currentNoteIndex = (this.currentNoteIndex + 1) % this.musicSequence.length;
        
        // 다음 노트 예약
        setTimeout(() => {
            this.playBackgroundNote();
        }, 3000);
    }
    
    // 효과음 재생
    playEffect(type) {
        if (!this.audioContext || !window.mongleFarm?.soundEnabled) return;
        
        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(this.audioContext.destination);
        
        let frequency, duration, waveType;
        
        switch (type) {
            case 'plant':
                frequency = 440; // A4
                duration = 0.2;
                waveType = 'sine';
                break;
            case 'water':
                frequency = 523; // C5
                duration = 0.3;
                waveType = 'triangle';
                break;
            case 'harvest':
                frequency = 659; // E5
                duration = 0.5;
                waveType = 'square';
                break;
            case 'happy':
                frequency = 784; // G5
                duration = 0.4;
                waveType = 'sine';
                break;
            case 'notification':
                frequency = 349; // F4
                duration = 0.3;
                waveType = 'triangle';
                break;
            default:
                frequency = 440;
                duration = 0.2;
                waveType = 'sine';
        }
        
        oscillator.type = waveType;
        oscillator.frequency.setValueAtTime(frequency, this.audioContext.currentTime);
        
        // 효과음용 볼륨 설정
        gainNode.gain.setValueAtTime(0, this.audioContext.currentTime);
        gainNode.gain.linearRampToValueAtTime(this.volume * 0.3, this.audioContext.currentTime + 0.01);
        gainNode.gain.exponentialRampToValueAtTime(0.001, this.audioContext.currentTime + duration);
        
        oscillator.start(this.audioContext.currentTime);
        oscillator.stop(this.audioContext.currentTime + duration);
        
        // 특별한 효과음들
        if (type === 'harvest') {
            // 수확 시 연속음
            setTimeout(() => {
                this.playChime([659, 784, 880]);
            }, 100);
        } else if (type === 'happy') {
            // 행복할 때 상승음
            setTimeout(() => {
                this.playChime([523, 659, 784]);
            }, 50);
        }
    }
    
    // 연속음 재생
    playChime(frequencies) {
        if (!this.audioContext || !window.mongleFarm?.soundEnabled) return;
        
        frequencies.forEach((freq, index) => {
            setTimeout(() => {
                const oscillator = this.audioContext.createOscillator();
                const gainNode = this.audioContext.createGain();
                
                oscillator.connect(gainNode);
                gainNode.connect(this.audioContext.destination);
                
                oscillator.type = 'sine';
                oscillator.frequency.setValueAtTime(freq, this.audioContext.currentTime);
                
                gainNode.gain.setValueAtTime(0, this.audioContext.currentTime);
                gainNode.gain.linearRampToValueAtTime(this.volume * 0.2, this.audioContext.currentTime + 0.01);
                gainNode.gain.exponentialRampToValueAtTime(0.001, this.audioContext.currentTime + 0.3);
                
                oscillator.start(this.audioContext.currentTime);
                oscillator.stop(this.audioContext.currentTime + 0.3);
            }, index * 100);
        });
    }
    
    // 자연 소리 효과 (새소리, 바람소리 등)
    playNatureSound() {
        if (!this.audioContext || !window.mongleFarm?.soundEnabled) return;
        
        // 새소리 시뮬레이션
        const birdFrequencies = [880, 1175, 1397, 1760];
        
        birdFrequencies.forEach((freq, index) => {
            setTimeout(() => {
                const oscillator = this.audioContext.createOscillator();
                const gainNode = this.audioContext.createGain();
                
                oscillator.connect(gainNode);
                gainNode.connect(this.audioContext.destination);
                
                oscillator.type = 'sine';
                oscillator.frequency.setValueAtTime(freq, this.audioContext.currentTime);
                oscillator.frequency.linearRampToValueAtTime(freq * 1.2, this.audioContext.currentTime + 0.1);
                oscillator.frequency.linearRampToValueAtTime(freq, this.audioContext.currentTime + 0.2);
                
                gainNode.gain.setValueAtTime(0, this.audioContext.currentTime);
                gainNode.gain.linearRampToValueAtTime(this.volume * 0.1, this.audioContext.currentTime + 0.05);
                gainNode.gain.linearRampToValueAtTime(0, this.audioContext.currentTime + 0.2);
                
                oscillator.start(this.audioContext.currentTime);
                oscillator.stop(this.audioContext.currentTime + 0.2);
            }, index * 50 + Math.random() * 200);
        });
    }
    
    // 볼륨 조절
    // BGM 재생 시작
    startBGM() {
        if (this.bgmAudio && window.mongleFarm?.soundEnabled) {
            this.bgmAudio.currentTime = 0;
            this.bgmAudio.play().catch(e => console.log('BGM 재생 실패:', e));
        }
    }
    
    // BGM 일시정지
    pauseBGM() {
        if (this.bgmAudio) {
            this.bgmAudio.pause();
        }
    }
    
    // BGM 재개
    resumeBGM() {
        if (this.bgmAudio && window.mongleFarm?.soundEnabled) {
            this.bgmAudio.play().catch(e => console.log('BGM 재개 실패:', e));
        }
    }
    
    // BGM 정지
    stopBGM() {
        if (this.bgmAudio) {
            this.bgmAudio.pause();
            this.bgmAudio.currentTime = 0;
        }
    }
    
    setVolume(volume) {
        this.volume = Math.max(0, Math.min(1, volume));
        if (this.bgmAudio) {
            this.bgmAudio.volume = this.volume * 0.6;
        }
    }
    
    // 오디오 컨텍스트 재개 (사용자 상호작용 후)
    resume() {
        if (this.audioContext && this.audioContext.state === 'suspended') {
            this.audioContext.resume();
        }
    }
}

// 글로벌 오디오 인스턴스
window.mongleAudio = new MongleAudio();

// 첫 클릭 후 오디오 활성화
document.addEventListener('click', () => {
    if (window.mongleAudio) {
        window.mongleAudio.resume();
    }
}, { once: true });

// 자연 소리 랜덤 재생
setInterval(() => {
    if (window.mongleFarm?.currentScreen === 'game' && Math.random() < 0.3) {
        window.mongleAudio?.playNatureSound();
    }
}, 15000); // 15초마다 30% 확률로 새소리 