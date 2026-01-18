/**
 * Metronome Online - Precision Metronome using Web Audio API
 * Uses schedule-ahead timing for rock-solid accuracy
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

        // DOM Elements
        this.elements = {};

        this.init();
    }

    init() {
        this.cacheElements();
        this.bindEvents();
        this.updateBeatIndicator();
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
            subdivisionBtns: document.querySelectorAll('.subdivision-btn')
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
            // Update slider while typing
            this.elements.bpmSlider.value = e.target.value;
        });
        this.elements.bpmSlider.addEventListener('input', (e) => {
            this.setBPM(parseInt(e.target.value));
            this.elements.bpmInput.value = e.target.value;
        });
        this.elements.bpmUp.addEventListener('click', () => this.adjustBPM(1));
        this.elements.bpmDown.addEventListener('click', () => this.adjustBPM(-1));

        // Keyboard shortcuts for BPM adjustment
        document.addEventListener('keydown', (e) => {
            if (e.target.tagName === 'INPUT') return;

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

                // Update active state
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

                // Update active state
                this.elements.timeSigBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');

                // Reset beat counter if playing
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

                // Update active state
                this.elements.soundBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
            });
        });

        // Subdivision buttons
        this.elements.subdivisionBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                this.subdivision = parseInt(btn.dataset.subdivision);

                // Update active state
                this.elements.subdivisionBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
            });
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

        // Resume audio context if suspended (required by browsers)
        if (this.audioContext.state === 'suspended') {
            this.audioContext.resume();
        }

        this.isPlaying = true;
        this.currentBeat = 0;
        this.currentSubdivision = 0;
        this.nextNoteTime = this.audioContext.currentTime;

        this.scheduler();

        // Update UI
        this.elements.playButton.classList.add('playing');
        this.elements.playButton.innerHTML = '<i class="ri-stop-fill"></i><span>Stop</span>';
        this.elements.statusBadge.classList.remove('ready');
        this.elements.statusBadge.classList.add('playing');
        this.elements.statusBadge.querySelector('.status-text').textContent = 'Playing';
    }

    stop() {
        this.isPlaying = false;

        if (this.timerID) {
            clearTimeout(this.timerID);
            this.timerID = null;
        }

        // Reset beat indicators
        this.resetBeatIndicators();

        // Update UI
        this.elements.playButton.classList.remove('playing');
        this.elements.playButton.innerHTML = '<i class="ri-play-fill"></i><span>Start</span>';
        this.elements.statusBadge.classList.remove('playing');
        this.elements.statusBadge.classList.add('ready');
        this.elements.statusBadge.querySelector('.status-text').textContent = 'Ready';
    }

    /**
     * The scheduler - runs ahead of time to schedule audio events
     * This is the key to precise timing
     */
    scheduler() {
        // Schedule all notes that need to play before the next interval
        while (this.nextNoteTime < this.audioContext.currentTime + this.scheduleAheadTime) {
            this.scheduleNote(this.currentBeat, this.currentSubdivision, this.nextNoteTime);
            this.advanceNote();
        }

        // Set up the next call
        this.timerID = setTimeout(() => this.scheduler(), this.lookahead);
    }

    /**
     * Schedule a single note to play at a specific time
     */
    scheduleNote(beat, subdivision, time) {
        // Determine if this is an accented beat
        const isAccent = beat === 0 && subdivision === 0 && this.accentFirstBeat;
        const isMainBeat = subdivision === 0;

        // Calculate volume
        let noteVolume = this.volume;
        if (isAccent) {
            noteVolume *= this.accentVolume;
        } else if (!isMainBeat) {
            noteVolume *= 0.6; // Subdivision clicks are quieter
        }

        // Create and schedule the sound
        this.playClick(time, noteVolume, isAccent, isMainBeat);

        // Schedule visual update (using setTimeout since it's UI, not audio-critical)
        const visualDelay = (time - this.audioContext.currentTime) * 1000;
        if (isMainBeat && visualDelay >= 0) {
            setTimeout(() => this.updateVisualBeat(beat), visualDelay);
        }
    }

    /**
     * Advance to the next note
     */
    advanceNote() {
        // Calculate seconds per beat based on BPM and note value
        const secondsPerBeat = 60.0 / this.bpm;
        const secondsPerSubdivision = secondsPerBeat / this.subdivision;

        // Advance subdivision
        this.currentSubdivision++;

        if (this.currentSubdivision >= this.subdivision) {
            this.currentSubdivision = 0;
            this.currentBeat++;

            if (this.currentBeat >= this.beatsPerMeasure) {
                this.currentBeat = 0;
            }
        }

        this.nextNoteTime += secondsPerSubdivision;
    }

    /**
     * Create and play a click sound using oscillators
     */
    playClick(time, volume, isAccent, isMainBeat) {
        const osc = this.audioContext.createOscillator();
        const envelope = this.audioContext.createGain();

        osc.connect(envelope);
        envelope.connect(this.gainNode);

        // Set sound parameters based on type
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

        // Quick attack, quick decay envelope for a sharp click
        envelope.gain.setValueAtTime(0, time);
        envelope.gain.linearRampToValueAtTime(volume, time + 0.001);
        envelope.gain.exponentialRampToValueAtTime(0.001, time + duration);

        osc.start(time);
        osc.stop(time + duration);
    }

    /**
     * Update visual beat indicator
     */
    updateVisualBeat(beat) {
        const dots = this.elements.beatIndicator.querySelectorAll('.beat-dot');

        // Remove active class from all dots
        dots.forEach(dot => dot.classList.remove('active'));

        // Add active class to current beat
        if (dots[beat]) {
            dots[beat].classList.add('active');
        }
    }

    /**
     * Reset all beat indicators
     */
    resetBeatIndicators() {
        const dots = this.elements.beatIndicator.querySelectorAll('.beat-dot');
        dots.forEach(dot => dot.classList.remove('active'));
    }

    /**
     * Update beat indicator dots based on time signature
     */
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
    }

    /**
     * Set BPM with validation
     */
    setBPM(bpm) {
        this.bpm = Math.max(20, Math.min(300, bpm));
        this.elements.bpmInput.value = this.bpm;
        this.elements.bpmSlider.value = this.bpm;

        // Update tempo preset highlighting
        this.elements.tempoPresets.forEach(btn => {
            const presetBpm = parseInt(btn.dataset.bpm);
            // Highlight if within 10 BPM of preset
            if (Math.abs(this.bpm - presetBpm) <= 10) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });
    }

    /**
     * Adjust BPM by delta
     */
    adjustBPM(delta) {
        this.setBPM(this.bpm + delta);
    }

    /**
     * Tap tempo - calculate BPM from tap intervals
     */
    tap() {
        const now = Date.now();

        // Clear old taps after 2 seconds of no activity
        if (this.tapTimeout) {
            clearTimeout(this.tapTimeout);
        }
        this.tapTimeout = setTimeout(() => {
            this.tapTimes = [];
        }, 2000);

        // Add this tap
        this.tapTimes.push(now);

        // Keep only last 8 taps
        if (this.tapTimes.length > 8) {
            this.tapTimes.shift();
        }

        // Need at least 2 taps to calculate
        if (this.tapTimes.length < 2) {
            return;
        }

        // Calculate average interval
        let totalInterval = 0;
        for (let i = 1; i < this.tapTimes.length; i++) {
            totalInterval += this.tapTimes[i] - this.tapTimes[i - 1];
        }
        const avgInterval = totalInterval / (this.tapTimes.length - 1);

        // Convert to BPM
        const bpm = Math.round(60000 / avgInterval);

        // Set BPM if reasonable
        if (bpm >= 20 && bpm <= 300) {
            this.setBPM(bpm);
        }
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.metronome = new Metronome();
});
