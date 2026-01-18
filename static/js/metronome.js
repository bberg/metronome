/**
 * Metronome Online - Precision Metronome using Web Audio API
 * Uses schedule-ahead timing for rock-solid accuracy
 * Features: Tempo Trainer, Practice Timer, Setlist, Fullscreen, Muted Beats
 */

class Metronome {
    constructor() {
        // Audio context and nodes
        this.audioContext = null;
        this.gainNode = null;

        // Timing state
        this.isPlaying = false;
        this.bpm = 120;
        this.beatsPerMeasure = 4;
        this.noteValue = 4; // 4 = quarter note, 8 = eighth note
        this.subdivision = 1; // 1 = quarter, 2 = eighth, 3 = triplet, 4 = sixteenth
        this.accentFirstBeat = true;

        // Volume
        this.volume = 0.75;
        this.accentVolume = 1.3;

        // Sound type
        this.soundType = 'click'; // click, wood, drum

        // Scheduling constants - critical for precise timing
        this.lookahead = 25.0; // How frequently to call scheduling function (ms)
        this.scheduleAheadTime = 0.1; // How far ahead to schedule audio (sec)

        // Scheduling state
        this.currentBeat = 0;
        this.currentSubdivision = 0;
        this.nextNoteTime = 0.0;
        this.timerID = null;

        // Tap tempo
        this.tapTimes = [];
        this.tapTimeout = null;

        // Tempo Trainer
        this.tempoTrainerEnabled = false;
        this.tempoTrainerStartBPM = 80;
        this.tempoTrainerTargetBPM = 120;
        this.tempoTrainerDuration = 5; // minutes
        this.tempoTrainerStartTime = null;
        this.tempoTrainerInterval = null;

        // Practice Timer
        this.practiceTimerEnabled = false;
        this.practiceTimerDuration = 15; // minutes
        this.practiceTimerRemaining = 0;
        this.practiceTimerInterval = null;
        this.practiceTimerMode = 'countdown'; // countdown or stopwatch
        this.practiceTimerElapsed = 0;

        // Setlist
        this.setlist = [];
        this.currentSetlistIndex = -1;

        // Muted Beats
        this.mutedBeatsEnabled = false;
        this.mutedBeatsPlayBars = 4;
        this.mutedBeatsSilentBars = 2;
        this.mutedBeatsCurrentBar = 0;
        this.mutedBeatsIsSilent = false;

        // Fullscreen
        this.isFullscreen = false;

        // Statistics
        this.totalPracticeTime = 0;
        this.sessionsToday = 0;

        // DOM Elements
        this.elements = {};

        this.init();
    }

    init() {
        this.cacheElements();
        this.bindEvents();
        this.updateBeatIndicator();
        this.loadFromStorage();
        this.loadSetlist();
        this.updateSetlistUI();
        this.loadStatistics();
    }

    cacheElements() {
        this.elements = {
            playButton: document.getElementById('playButton'),
            tapButton: document.getElementById('tapButton'),
            bpmInput: document.getElementById('bpmInput'),
            bpmSlider: document.getElementById('bpmSlider'),
            bpmUp: document.getElementById('bpmUp'),
            bpmDown: document.getElementById('bpmDown'),
            statusBadge: document.getElementById('statusBadge'),
            beatIndicator: document.getElementById('beatIndicator'),
            volumeSlider: document.getElementById('volume'),
            volumeValue: document.getElementById('volumeValue'),
            accentVolumeSlider: document.getElementById('accentVolume'),
            accentVolumeValue: document.getElementById('accentVolumeValue'),
            accentToggle: document.getElementById('accentToggle'),
            tempoPresets: document.querySelectorAll('.tempo-preset'),
            timeSigBtns: document.querySelectorAll('.time-sig-btn'),
            soundBtns: document.querySelectorAll('.sound-btn'),
            subdivisionBtns: document.querySelectorAll('.subdivision-btn'),
            // Tempo Trainer
            tempoTrainerToggle: document.getElementById('tempoTrainerToggle'),
            tempoTrainerPanel: document.getElementById('tempoTrainerPanel'),
            trainerStartBPM: document.getElementById('trainerStartBPM'),
            trainerTargetBPM: document.getElementById('trainerTargetBPM'),
            trainerDuration: document.getElementById('trainerDuration'),
            trainerProgress: document.getElementById('trainerProgress'),
            trainerProgressFill: document.getElementById('trainerProgressFill'),
            trainerCurrentBPM: document.getElementById('trainerCurrentBPM'),
            // Practice Timer
            practiceTimerToggle: document.getElementById('practiceTimerToggle'),
            practiceTimerPanel: document.getElementById('practiceTimerPanel'),
            timerModeSelect: document.getElementById('timerModeSelect'),
            timerDuration: document.getElementById('timerDuration'),
            timerDisplay: document.getElementById('timerDisplay'),
            timerReset: document.getElementById('timerReset'),
            // Setlist
            setlistPanel: document.getElementById('setlistPanel'),
            setlistItems: document.getElementById('setlistItems'),
            saveToSetlistBtn: document.getElementById('saveToSetlistBtn'),
            songNameInput: document.getElementById('songNameInput'),
            clearSetlistBtn: document.getElementById('clearSetlistBtn'),
            exportSetlistBtn: document.getElementById('exportSetlistBtn'),
            importSetlistBtn: document.getElementById('importSetlistBtn'),
            importSetlistFile: document.getElementById('importSetlistFile'),
            // Fullscreen
            fullscreenBtn: document.getElementById('fullscreenBtn'),
            fullscreenOverlay: document.getElementById('fullscreenOverlay'),
            fullscreenBPM: document.getElementById('fullscreenBPM'),
            fullscreenBeats: document.getElementById('fullscreenBeats'),
            fullscreenStatus: document.getElementById('fullscreenStatus'),
            fullscreenPlay: document.getElementById('fullscreenPlay'),
            fullscreenExit: document.getElementById('fullscreenExit'),
            fullscreenTimer: document.getElementById('fullscreenTimer'),
            // Muted Beats
            mutedBeatsToggle: document.getElementById('mutedBeatsToggle'),
            mutedBeatsPanel: document.getElementById('mutedBeatsPanel'),
            mutedPlayBars: document.getElementById('mutedPlayBars'),
            mutedSilentBars: document.getElementById('mutedSilentBars'),
            mutedBeatsStatus: document.getElementById('mutedBeatsStatus'),
            // Statistics
            totalPracticeDisplay: document.getElementById('totalPracticeDisplay'),
            sessionsTodayDisplay: document.getElementById('sessionsTodayDisplay')
        };
    }

    bindEvents() {
        // Play/Stop
        this.elements.playButton.addEventListener('click', () => this.toggle());

        // Tap tempo
        this.elements.tapButton.addEventListener('click', () => this.tap());

        // BPM controls
        this.elements.bpmInput.addEventListener('change', (e) => this.setBPM(parseInt(e.target.value)));
        this.elements.bpmInput.addEventListener('input', (e) => {
            this.elements.bpmSlider.value = e.target.value;
        });
        this.elements.bpmSlider.addEventListener('input', (e) => {
            this.setBPM(parseInt(e.target.value));
            this.elements.bpmInput.value = e.target.value;
        });
        this.elements.bpmUp.addEventListener('click', () => this.adjustBPM(1));
        this.elements.bpmDown.addEventListener('click', () => this.adjustBPM(-1));

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.target.tagName === 'INPUT' && e.target.type !== 'checkbox') return;

            if (e.key === ' ' || e.key === 'Spacebar') {
                e.preventDefault();
                this.toggle();
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                this.adjustBPM(e.shiftKey ? 10 : 1);
            } else if (e.key === 'ArrowDown') {
                e.preventDefault();
                this.adjustBPM(e.shiftKey ? -10 : -1);
            } else if (e.key === 't' || e.key === 'T') {
                this.tap();
            } else if (e.key === 'f' || e.key === 'F') {
                e.preventDefault();
                this.toggleFullscreen();
            } else if (e.key === 'Escape') {
                if (this.isFullscreen) {
                    this.exitFullscreen();
                }
            } else if (e.key === 'r' || e.key === 'R') {
                if (!e.ctrlKey && !e.metaKey) {
                    e.preventDefault();
                    this.resetToDefaults();
                }
            } else if (e.key >= '1' && e.key <= '9') {
                const index = parseInt(e.key) - 1;
                if (this.setlist[index]) {
                    this.loadSetlistItem(index);
                }
            }
        });

        // Volume controls
        this.elements.volumeSlider.addEventListener('input', (e) => {
            this.volume = parseInt(e.target.value) / 100;
            this.elements.volumeValue.textContent = e.target.value + '%';
        });

        this.elements.accentVolumeSlider.addEventListener('input', (e) => {
            this.accentVolume = parseInt(e.target.value) / 100;
            this.elements.accentVolumeValue.textContent = e.target.value + '%';
        });

        // Accent toggle
        this.elements.accentToggle.addEventListener('change', (e) => {
            this.accentFirstBeat = e.target.checked;
        });

        // Tempo presets
        this.elements.tempoPresets.forEach(btn => {
            btn.addEventListener('click', () => {
                const bpm = parseInt(btn.dataset.bpm);
                this.setBPM(bpm);
                this.elements.bpmInput.value = bpm;
                this.elements.bpmSlider.value = bpm;
                this.elements.tempoPresets.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
            });
        });

        // Time signature buttons
        this.elements.timeSigBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                this.beatsPerMeasure = parseInt(btn.dataset.beats);
                this.noteValue = parseInt(btn.dataset.note);
                this.updateBeatIndicator();
                this.elements.timeSigBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                if (this.isPlaying) {
                    this.currentBeat = 0;
                    this.currentSubdivision = 0;
                }
            });
        });

        // Sound type buttons
        this.elements.soundBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                this.soundType = btn.dataset.sound;
                this.elements.soundBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
            });
        });

        // Subdivision buttons
        this.elements.subdivisionBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                this.subdivision = parseInt(btn.dataset.subdivision);
                this.elements.subdivisionBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
            });
        });

        // Tempo Trainer
        if (this.elements.tempoTrainerToggle) {
            this.elements.tempoTrainerToggle.addEventListener('change', (e) => {
                this.tempoTrainerEnabled = e.target.checked;
                this.elements.tempoTrainerPanel.classList.toggle('active', e.target.checked);
                if (e.target.checked) {
                    this.initTempoTrainer();
                } else {
                    this.stopTempoTrainer();
                }
            });

            this.elements.trainerStartBPM.addEventListener('change', (e) => {
                this.tempoTrainerStartBPM = parseInt(e.target.value);
            });
            this.elements.trainerTargetBPM.addEventListener('change', (e) => {
                this.tempoTrainerTargetBPM = parseInt(e.target.value);
            });
            this.elements.trainerDuration.addEventListener('change', (e) => {
                this.tempoTrainerDuration = parseInt(e.target.value);
            });
        }

        // Practice Timer
        if (this.elements.practiceTimerToggle) {
            this.elements.practiceTimerToggle.addEventListener('change', (e) => {
                this.practiceTimerEnabled = e.target.checked;
                this.elements.practiceTimerPanel.classList.toggle('active', e.target.checked);
                if (!e.target.checked) {
                    this.stopPracticeTimer();
                }
            });

            this.elements.timerModeSelect.addEventListener('change', (e) => {
                this.practiceTimerMode = e.target.value;
                this.elements.timerDuration.style.display = e.target.value === 'countdown' ? 'block' : 'none';
                this.resetPracticeTimer();
            });

            this.elements.timerDuration.addEventListener('change', (e) => {
                this.practiceTimerDuration = parseInt(e.target.value);
                this.resetPracticeTimer();
            });

            this.elements.timerReset.addEventListener('click', () => this.resetPracticeTimer());
        }

        // Setlist
        if (this.elements.saveToSetlistBtn) {
            this.elements.saveToSetlistBtn.addEventListener('click', () => this.saveToSetlist());
            this.elements.clearSetlistBtn.addEventListener('click', () => this.clearSetlist());
            this.elements.exportSetlistBtn.addEventListener('click', () => this.exportSetlist());
            this.elements.importSetlistBtn.addEventListener('click', () => this.elements.importSetlistFile.click());
            this.elements.importSetlistFile.addEventListener('change', (e) => this.importSetlist(e));
        }

        // Fullscreen
        if (this.elements.fullscreenBtn) {
            this.elements.fullscreenBtn.addEventListener('click', () => this.toggleFullscreen());
            this.elements.fullscreenPlay.addEventListener('click', () => this.toggle());
            this.elements.fullscreenExit.addEventListener('click', () => this.exitFullscreen());
        }

        // Muted Beats
        if (this.elements.mutedBeatsToggle) {
            this.elements.mutedBeatsToggle.addEventListener('change', (e) => {
                this.mutedBeatsEnabled = e.target.checked;
                this.elements.mutedBeatsPanel.classList.toggle('active', e.target.checked);
                this.mutedBeatsCurrentBar = 0;
                this.mutedBeatsIsSilent = false;
                this.updateMutedBeatsStatus();
            });

            this.elements.mutedPlayBars.addEventListener('change', (e) => {
                this.mutedBeatsPlayBars = parseInt(e.target.value);
            });
            this.elements.mutedSilentBars.addEventListener('change', (e) => {
                this.mutedBeatsSilentBars = parseInt(e.target.value);
            });
        }

        // Fullscreen change detection
        document.addEventListener('fullscreenchange', () => {
            if (!document.fullscreenElement) {
                this.isFullscreen = false;
                this.elements.fullscreenOverlay.classList.remove('active');
            }
        });
    }

    initAudioContext() {
        if (this.audioContext) return;

        this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        this.gainNode = this.audioContext.createGain();
        this.gainNode.connect(this.audioContext.destination);
    }

    toggle() {
        if (this.isPlaying) {
            this.stop();
        } else {
            this.start();
        }
    }

    start() {
        this.initAudioContext();

        if (this.audioContext.state === 'suspended') {
            this.audioContext.resume();
        }

        this.isPlaying = true;
        this.currentBeat = 0;
        this.currentSubdivision = 0;
        this.nextNoteTime = this.audioContext.currentTime;

        // Start tempo trainer if enabled
        if (this.tempoTrainerEnabled) {
            this.startTempoTrainer();
        }

        // Start practice timer if enabled
        if (this.practiceTimerEnabled) {
            this.startPracticeTimer();
        }

        // Reset muted beats
        this.mutedBeatsCurrentBar = 0;
        this.mutedBeatsIsSilent = false;

        this.scheduler();
        this.updateUI('playing');
    }

    stop() {
        this.isPlaying = false;

        if (this.timerID) {
            clearTimeout(this.timerID);
            this.timerID = null;
        }

        // Stop tempo trainer
        if (this.tempoTrainerInterval) {
            clearInterval(this.tempoTrainerInterval);
            this.tempoTrainerInterval = null;
        }

        // Pause practice timer (don't stop completely)
        if (this.practiceTimerInterval) {
            clearInterval(this.practiceTimerInterval);
            this.practiceTimerInterval = null;
            this.recordPracticeSession();
        }

        this.resetBeatIndicators();
        this.updateUI('ready');
    }

    updateUI(state) {
        const isPlaying = state === 'playing';

        this.elements.playButton.classList.toggle('playing', isPlaying);
        this.elements.playButton.innerHTML = isPlaying
            ? '<i class="ri-stop-fill"></i><span>Stop</span>'
            : '<i class="ri-play-fill"></i><span>Start</span>';

        this.elements.statusBadge.classList.toggle('ready', !isPlaying);
        this.elements.statusBadge.classList.toggle('playing', isPlaying);
        this.elements.statusBadge.querySelector('.status-text').textContent = isPlaying ? 'Playing' : 'Ready';

        // Update fullscreen UI
        if (this.elements.fullscreenPlay) {
            this.elements.fullscreenPlay.innerHTML = isPlaying
                ? '<i class="ri-stop-fill"></i> Stop'
                : '<i class="ri-play-fill"></i> Start';
            this.elements.fullscreenStatus.textContent = isPlaying ? 'Playing' : 'Ready';
            this.elements.fullscreenStatus.className = 'fullscreen-status ' + (isPlaying ? 'playing' : '');
        }
    }

    scheduler() {
        while (this.nextNoteTime < this.audioContext.currentTime + this.scheduleAheadTime) {
            this.scheduleNote(this.currentBeat, this.currentSubdivision, this.nextNoteTime);
            this.advanceNote();
        }

        this.timerID = setTimeout(() => this.scheduler(), this.lookahead);
    }

    scheduleNote(beat, subdivision, time) {
        const isAccent = beat === 0 && subdivision === 0 && this.accentFirstBeat;
        const isMainBeat = subdivision === 0;

        // Check muted beats
        let shouldPlay = true;
        if (this.mutedBeatsEnabled && this.mutedBeatsIsSilent) {
            shouldPlay = false;
        }

        let noteVolume = this.volume;
        if (isAccent) {
            noteVolume *= this.accentVolume;
        } else if (!isMainBeat) {
            noteVolume *= 0.6;
        }

        if (shouldPlay) {
            this.playClick(time, noteVolume, isAccent, isMainBeat);
        }

        const visualDelay = (time - this.audioContext.currentTime) * 1000;
        if (isMainBeat && visualDelay >= 0) {
            setTimeout(() => this.updateVisualBeat(beat), visualDelay);
        }
    }

    advanceNote() {
        const secondsPerBeat = 60.0 / this.bpm;
        const secondsPerSubdivision = secondsPerBeat / this.subdivision;

        this.currentSubdivision++;

        if (this.currentSubdivision >= this.subdivision) {
            this.currentSubdivision = 0;
            this.currentBeat++;

            if (this.currentBeat >= this.beatsPerMeasure) {
                this.currentBeat = 0;

                // Handle muted beats bar tracking
                if (this.mutedBeatsEnabled) {
                    this.mutedBeatsCurrentBar++;
                    if (!this.mutedBeatsIsSilent && this.mutedBeatsCurrentBar >= this.mutedBeatsPlayBars) {
                        this.mutedBeatsIsSilent = true;
                        this.mutedBeatsCurrentBar = 0;
                    } else if (this.mutedBeatsIsSilent && this.mutedBeatsCurrentBar >= this.mutedBeatsSilentBars) {
                        this.mutedBeatsIsSilent = false;
                        this.mutedBeatsCurrentBar = 0;
                    }
                    this.updateMutedBeatsStatus();
                }
            }
        }

        this.nextNoteTime += secondsPerSubdivision;
    }

    playClick(time, volume, isAccent, isMainBeat) {
        const osc = this.audioContext.createOscillator();
        const envelope = this.audioContext.createGain();

        osc.connect(envelope);
        envelope.connect(this.gainNode);

        let frequency, duration, waveType;

        switch (this.soundType) {
            case 'wood':
                frequency = isAccent ? 1200 : (isMainBeat ? 900 : 700);
                duration = 0.03;
                waveType = 'sine';
                break;
            case 'drum':
                frequency = isAccent ? 200 : (isMainBeat ? 150 : 120);
                duration = 0.05;
                waveType = 'triangle';
                break;
            case 'click':
            default:
                frequency = isAccent ? 1500 : (isMainBeat ? 1000 : 800);
                duration = 0.02;
                waveType = 'square';
                break;
        }

        osc.type = waveType;
        osc.frequency.setValueAtTime(frequency, time);

        envelope.gain.setValueAtTime(0, time);
        envelope.gain.linearRampToValueAtTime(volume, time + 0.001);
        envelope.gain.exponentialRampToValueAtTime(0.001, time + duration);

        osc.start(time);
        osc.stop(time + duration);
    }

    updateVisualBeat(beat) {
        const dots = this.elements.beatIndicator.querySelectorAll('.beat-dot');
        dots.forEach(dot => dot.classList.remove('active'));
        if (dots[beat]) {
            dots[beat].classList.add('active');
        }

        // Update fullscreen beats
        if (this.isFullscreen && this.elements.fullscreenBeats) {
            const fsDots = this.elements.fullscreenBeats.querySelectorAll('.fullscreen-beat-dot');
            fsDots.forEach(dot => dot.classList.remove('active'));
            if (fsDots[beat]) {
                fsDots[beat].classList.add('active');
            }
        }
    }

    resetBeatIndicators() {
        const dots = this.elements.beatIndicator.querySelectorAll('.beat-dot');
        dots.forEach(dot => dot.classList.remove('active'));

        if (this.elements.fullscreenBeats) {
            const fsDots = this.elements.fullscreenBeats.querySelectorAll('.fullscreen-beat-dot');
            fsDots.forEach(dot => dot.classList.remove('active'));
        }
    }

    updateBeatIndicator() {
        const container = this.elements.beatIndicator;
        container.innerHTML = '';

        for (let i = 0; i < this.beatsPerMeasure; i++) {
            const dot = document.createElement('div');
            dot.className = 'beat-dot';
            if (i === 0) {
                dot.classList.add('accent');
            }
            dot.dataset.beat = i + 1;
            container.appendChild(dot);
        }

        // Update fullscreen beats
        this.updateFullscreenBeats();
    }

    updateFullscreenBeats() {
        if (!this.elements.fullscreenBeats) return;

        this.elements.fullscreenBeats.innerHTML = '';
        for (let i = 0; i < this.beatsPerMeasure; i++) {
            const dot = document.createElement('div');
            dot.className = 'fullscreen-beat-dot';
            if (i === 0) {
                dot.classList.add('accent');
            }
            this.elements.fullscreenBeats.appendChild(dot);
        }
    }

    setBPM(bpm) {
        this.bpm = Math.max(20, Math.min(300, bpm));
        this.elements.bpmInput.value = this.bpm;
        this.elements.bpmSlider.value = this.bpm;

        // Update fullscreen BPM
        if (this.elements.fullscreenBPM) {
            this.elements.fullscreenBPM.textContent = this.bpm;
        }

        // Update tempo preset highlighting
        this.elements.tempoPresets.forEach(btn => {
            const presetBpm = parseInt(btn.dataset.bpm);
            if (Math.abs(this.bpm - presetBpm) <= 10) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });

        this.saveToStorage();
    }

    adjustBPM(delta) {
        this.setBPM(this.bpm + delta);
    }

    tap() {
        const now = Date.now();

        if (this.tapTimeout) {
            clearTimeout(this.tapTimeout);
        }
        this.tapTimeout = setTimeout(() => {
            this.tapTimes = [];
        }, 2000);

        this.tapTimes.push(now);

        if (this.tapTimes.length > 8) {
            this.tapTimes.shift();
        }

        if (this.tapTimes.length < 2) {
            return;
        }

        let totalInterval = 0;
        for (let i = 1; i < this.tapTimes.length; i++) {
            totalInterval += this.tapTimes[i] - this.tapTimes[i - 1];
        }
        const avgInterval = totalInterval / (this.tapTimes.length - 1);
        const bpm = Math.round(60000 / avgInterval);

        if (bpm >= 20 && bpm <= 300) {
            this.setBPM(bpm);
        }
    }

    resetToDefaults() {
        this.setBPM(120);
        this.beatsPerMeasure = 4;
        this.noteValue = 4;
        this.subdivision = 1;
        this.soundType = 'click';
        this.updateBeatIndicator();

        // Reset UI
        this.elements.timeSigBtns.forEach(b => b.classList.remove('active'));
        document.querySelector('.time-sig-btn[data-beats="4"][data-note="4"]').classList.add('active');

        this.elements.subdivisionBtns.forEach(b => b.classList.remove('active'));
        document.querySelector('.subdivision-btn[data-subdivision="1"]').classList.add('active');

        this.elements.soundBtns.forEach(b => b.classList.remove('active'));
        document.querySelector('.sound-btn[data-sound="click"]').classList.add('active');
    }

    // ==================== TEMPO TRAINER ====================

    initTempoTrainer() {
        this.setBPM(this.tempoTrainerStartBPM);
        this.updateTempoTrainerUI();
    }

    startTempoTrainer() {
        this.tempoTrainerStartTime = Date.now();
        const totalDurationMs = this.tempoTrainerDuration * 60 * 1000;
        const bpmRange = this.tempoTrainerTargetBPM - this.tempoTrainerStartBPM;

        this.tempoTrainerInterval = setInterval(() => {
            const elapsed = Date.now() - this.tempoTrainerStartTime;
            const progress = Math.min(elapsed / totalDurationMs, 1);
            const currentBPM = Math.round(this.tempoTrainerStartBPM + (bpmRange * progress));

            this.setBPM(currentBPM);
            this.updateTempoTrainerUI(progress);

            if (progress >= 1) {
                clearInterval(this.tempoTrainerInterval);
                this.tempoTrainerInterval = null;
                this.showTempoTrainerComplete();
            }
        }, 1000);
    }

    stopTempoTrainer() {
        if (this.tempoTrainerInterval) {
            clearInterval(this.tempoTrainerInterval);
            this.tempoTrainerInterval = null;
        }
    }

    updateTempoTrainerUI(progress = 0) {
        if (this.elements.trainerProgressFill) {
            this.elements.trainerProgressFill.style.width = (progress * 100) + '%';
        }
        if (this.elements.trainerCurrentBPM) {
            this.elements.trainerCurrentBPM.textContent = `Current: ${this.bpm} BPM`;
        }
    }

    showTempoTrainerComplete() {
        if (this.elements.trainerCurrentBPM) {
            this.elements.trainerCurrentBPM.textContent = `Complete! Reached ${this.bpm} BPM`;
        }
    }

    // ==================== PRACTICE TIMER ====================

    startPracticeTimer() {
        if (this.practiceTimerMode === 'countdown') {
            if (this.practiceTimerRemaining === 0) {
                this.practiceTimerRemaining = this.practiceTimerDuration * 60;
            }
            this.practiceTimerInterval = setInterval(() => {
                this.practiceTimerRemaining--;
                this.updateTimerDisplay();

                if (this.practiceTimerRemaining <= 0) {
                    this.stop();
                    this.showTimerComplete();
                }
            }, 1000);
        } else {
            this.practiceTimerInterval = setInterval(() => {
                this.practiceTimerElapsed++;
                this.updateTimerDisplay();
            }, 1000);
        }
    }

    stopPracticeTimer() {
        if (this.practiceTimerInterval) {
            clearInterval(this.practiceTimerInterval);
            this.practiceTimerInterval = null;
        }
    }

    resetPracticeTimer() {
        this.stopPracticeTimer();
        if (this.practiceTimerMode === 'countdown') {
            this.practiceTimerRemaining = this.practiceTimerDuration * 60;
        } else {
            this.practiceTimerElapsed = 0;
        }
        this.updateTimerDisplay();
    }

    updateTimerDisplay() {
        const seconds = this.practiceTimerMode === 'countdown'
            ? this.practiceTimerRemaining
            : this.practiceTimerElapsed;

        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        const display = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;

        if (this.elements.timerDisplay) {
            this.elements.timerDisplay.textContent = display;
        }
        if (this.elements.fullscreenTimer) {
            this.elements.fullscreenTimer.textContent = display;
        }
    }

    showTimerComplete() {
        if (this.elements.timerDisplay) {
            this.elements.timerDisplay.textContent = 'Complete!';
            this.elements.timerDisplay.classList.add('complete');
            setTimeout(() => {
                this.elements.timerDisplay.classList.remove('complete');
            }, 3000);
        }
        // Play completion sound
        this.playCompletionSound();
    }

    playCompletionSound() {
        if (!this.audioContext) return;

        const osc = this.audioContext.createOscillator();
        const gain = this.audioContext.createGain();
        osc.connect(gain);
        gain.connect(this.audioContext.destination);

        osc.frequency.setValueAtTime(880, this.audioContext.currentTime);
        osc.type = 'sine';
        gain.gain.setValueAtTime(0.3, this.audioContext.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.5);

        osc.start();
        osc.stop(this.audioContext.currentTime + 0.5);
    }

    recordPracticeSession() {
        const elapsed = this.practiceTimerMode === 'countdown'
            ? (this.practiceTimerDuration * 60) - this.practiceTimerRemaining
            : this.practiceTimerElapsed;

        if (elapsed > 0) {
            this.totalPracticeTime += elapsed;
            this.sessionsToday++;
            this.saveStatistics();
            this.updateStatisticsDisplay();
        }
    }

    // ==================== SETLIST ====================

    saveToSetlist() {
        const name = this.elements.songNameInput.value.trim() || `Song ${this.setlist.length + 1}`;

        const song = {
            id: Date.now(),
            name: name,
            bpm: this.bpm,
            beatsPerMeasure: this.beatsPerMeasure,
            noteValue: this.noteValue,
            subdivision: this.subdivision,
            soundType: this.soundType,
            accentFirstBeat: this.accentFirstBeat
        };

        this.setlist.push(song);
        this.saveSetlist();
        this.updateSetlistUI();
        this.elements.songNameInput.value = '';
    }

    loadSetlistItem(index) {
        const song = this.setlist[index];
        if (!song) return;

        this.currentSetlistIndex = index;
        this.setBPM(song.bpm);
        this.beatsPerMeasure = song.beatsPerMeasure;
        this.noteValue = song.noteValue;
        this.subdivision = song.subdivision;
        this.soundType = song.soundType;
        this.accentFirstBeat = song.accentFirstBeat;

        this.updateBeatIndicator();

        // Update UI to reflect loaded settings
        this.elements.timeSigBtns.forEach(b => {
            b.classList.toggle('active',
                parseInt(b.dataset.beats) === this.beatsPerMeasure &&
                parseInt(b.dataset.note) === this.noteValue);
        });

        this.elements.subdivisionBtns.forEach(b => {
            b.classList.toggle('active', parseInt(b.dataset.subdivision) === this.subdivision);
        });

        this.elements.soundBtns.forEach(b => {
            b.classList.toggle('active', b.dataset.sound === this.soundType);
        });

        this.elements.accentToggle.checked = this.accentFirstBeat;
        this.updateSetlistUI();
    }

    deleteSetlistItem(index) {
        this.setlist.splice(index, 1);
        if (this.currentSetlistIndex === index) {
            this.currentSetlistIndex = -1;
        } else if (this.currentSetlistIndex > index) {
            this.currentSetlistIndex--;
        }
        this.saveSetlist();
        this.updateSetlistUI();
    }

    clearSetlist() {
        if (confirm('Clear all songs from setlist?')) {
            this.setlist = [];
            this.currentSetlistIndex = -1;
            this.saveSetlist();
            this.updateSetlistUI();
        }
    }

    updateSetlistUI() {
        if (!this.elements.setlistItems) return;

        this.elements.setlistItems.innerHTML = '';

        if (this.setlist.length === 0) {
            this.elements.setlistItems.innerHTML = '<div class="setlist-empty">No songs saved. Add your first song above.</div>';
            return;
        }

        this.setlist.forEach((song, index) => {
            const item = document.createElement('div');
            item.className = 'setlist-item' + (index === this.currentSetlistIndex ? ' active' : '');
            item.innerHTML = `
                <div class="setlist-item-info" data-index="${index}">
                    <span class="setlist-number">${index + 1}</span>
                    <span class="setlist-name">${song.name}</span>
                    <span class="setlist-details">${song.bpm} BPM | ${song.beatsPerMeasure}/${song.noteValue}</span>
                </div>
                <button class="setlist-delete" data-index="${index}" title="Delete">
                    <i class="ri-delete-bin-line"></i>
                </button>
            `;

            item.querySelector('.setlist-item-info').addEventListener('click', () => this.loadSetlistItem(index));
            item.querySelector('.setlist-delete').addEventListener('click', (e) => {
                e.stopPropagation();
                this.deleteSetlistItem(index);
            });

            this.elements.setlistItems.appendChild(item);
        });
    }

    saveSetlist() {
        localStorage.setItem('metronome_setlist', JSON.stringify(this.setlist));
    }

    loadSetlist() {
        const saved = localStorage.getItem('metronome_setlist');
        if (saved) {
            try {
                this.setlist = JSON.parse(saved);
            } catch (e) {
                this.setlist = [];
            }
        }
    }

    exportSetlist() {
        const data = JSON.stringify(this.setlist, null, 2);
        const blob = new Blob([data], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'metronome-setlist.json';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    importSetlist(event) {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const imported = JSON.parse(e.target.result);
                if (Array.isArray(imported)) {
                    this.setlist = [...this.setlist, ...imported];
                    this.saveSetlist();
                    this.updateSetlistUI();
                }
            } catch (err) {
                alert('Invalid setlist file');
            }
        };
        reader.readAsText(file);
        event.target.value = '';
    }

    // ==================== FULLSCREEN ====================

    toggleFullscreen() {
        if (this.isFullscreen) {
            this.exitFullscreen();
        } else {
            this.enterFullscreen();
        }
    }

    enterFullscreen() {
        this.isFullscreen = true;
        this.elements.fullscreenOverlay.classList.add('active');
        this.elements.fullscreenBPM.textContent = this.bpm;
        this.updateFullscreenBeats();
        this.updateUI(this.isPlaying ? 'playing' : 'ready');

        // Try to request actual fullscreen
        if (document.documentElement.requestFullscreen) {
            document.documentElement.requestFullscreen().catch(() => {});
        }
    }

    exitFullscreen() {
        this.isFullscreen = false;
        this.elements.fullscreenOverlay.classList.remove('active');

        if (document.exitFullscreen && document.fullscreenElement) {
            document.exitFullscreen().catch(() => {});
        }
    }

    // ==================== MUTED BEATS ====================

    updateMutedBeatsStatus() {
        if (!this.elements.mutedBeatsStatus) return;

        if (this.mutedBeatsIsSilent) {
            this.elements.mutedBeatsStatus.textContent = `Silent (bar ${this.mutedBeatsCurrentBar + 1}/${this.mutedBeatsSilentBars})`;
            this.elements.mutedBeatsStatus.classList.add('silent');
        } else {
            this.elements.mutedBeatsStatus.textContent = `Playing (bar ${this.mutedBeatsCurrentBar + 1}/${this.mutedBeatsPlayBars})`;
            this.elements.mutedBeatsStatus.classList.remove('silent');
        }
    }

    // ==================== STORAGE ====================

    saveToStorage() {
        const settings = {
            bpm: this.bpm,
            beatsPerMeasure: this.beatsPerMeasure,
            noteValue: this.noteValue,
            subdivision: this.subdivision,
            soundType: this.soundType,
            volume: this.volume,
            accentVolume: this.accentVolume,
            accentFirstBeat: this.accentFirstBeat
        };
        localStorage.setItem('metronome_settings', JSON.stringify(settings));
    }

    loadFromStorage() {
        const saved = localStorage.getItem('metronome_settings');
        if (saved) {
            try {
                const settings = JSON.parse(saved);
                this.bpm = settings.bpm || 120;
                this.beatsPerMeasure = settings.beatsPerMeasure || 4;
                this.noteValue = settings.noteValue || 4;
                this.subdivision = settings.subdivision || 1;
                this.soundType = settings.soundType || 'click';
                this.volume = settings.volume || 0.75;
                this.accentVolume = settings.accentVolume || 1.3;
                this.accentFirstBeat = settings.accentFirstBeat !== false;

                // Update UI
                this.elements.bpmInput.value = this.bpm;
                this.elements.bpmSlider.value = this.bpm;
                this.elements.volumeSlider.value = this.volume * 100;
                this.elements.volumeValue.textContent = Math.round(this.volume * 100) + '%';
                this.elements.accentVolumeSlider.value = this.accentVolume * 100;
                this.elements.accentVolumeValue.textContent = Math.round(this.accentVolume * 100) + '%';
                this.elements.accentToggle.checked = this.accentFirstBeat;

                // Update button states
                this.elements.timeSigBtns.forEach(b => {
                    b.classList.toggle('active',
                        parseInt(b.dataset.beats) === this.beatsPerMeasure &&
                        parseInt(b.dataset.note) === this.noteValue);
                });
                this.elements.subdivisionBtns.forEach(b => {
                    b.classList.toggle('active', parseInt(b.dataset.subdivision) === this.subdivision);
                });
                this.elements.soundBtns.forEach(b => {
                    b.classList.toggle('active', b.dataset.sound === this.soundType);
                });
            } catch (e) {
                console.error('Failed to load settings:', e);
            }
        }
    }

    // ==================== STATISTICS ====================

    saveStatistics() {
        const stats = {
            totalPracticeTime: this.totalPracticeTime,
            sessionsToday: this.sessionsToday,
            lastDate: new Date().toDateString()
        };
        localStorage.setItem('metronome_stats', JSON.stringify(stats));
    }

    loadStatistics() {
        const saved = localStorage.getItem('metronome_stats');
        if (saved) {
            try {
                const stats = JSON.parse(saved);
                const today = new Date().toDateString();

                this.totalPracticeTime = stats.totalPracticeTime || 0;

                // Reset daily sessions if it's a new day
                if (stats.lastDate === today) {
                    this.sessionsToday = stats.sessionsToday || 0;
                } else {
                    this.sessionsToday = 0;
                }

                this.updateStatisticsDisplay();
            } catch (e) {
                console.error('Failed to load statistics:', e);
            }
        }
    }

    updateStatisticsDisplay() {
        if (this.elements.totalPracticeDisplay) {
            const hours = Math.floor(this.totalPracticeTime / 3600);
            const mins = Math.floor((this.totalPracticeTime % 3600) / 60);
            this.elements.totalPracticeDisplay.textContent = hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
        }
        if (this.elements.sessionsTodayDisplay) {
            this.elements.sessionsTodayDisplay.textContent = this.sessionsToday;
        }
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.metronome = new Metronome();
});
