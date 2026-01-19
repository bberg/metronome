# Feature Roadmap: Definitive Online Metronome

## Vision Statement
Create the world's best free, browser-based metronome that rivals paid apps in functionality while remaining accessible to everyone.

---

## Phase 1: Core Practice Tools (Current Sprint)

### 1.1 Tempo Trainer (Accelerando)
**Priority**: P0 - Critical
**Effort**: Medium

Gradually increase BPM during practice to build speed safely.

**Requirements**:
- Start BPM input
- Target BPM input
- Duration setting (minutes or bars)
- Visual progress indicator
- Option: increase per bar vs. per time interval
- Pause/resume capability
- Reach target notification

**Implementation Notes**:
- Add "Tempo Trainer" toggle/mode in controls
- Calculate increment: (targetBPM - startBPM) / duration
- Update BPM on schedule while playing
- Show progress bar with current vs. target

---

### 1.2 Practice Timer
**Priority**: P0 - Critical
**Effort**: Low

Track practice session duration with optional goals.

**Requirements**:
- Countdown timer mode (set duration)
- Stopwatch mode (count up)
- Visual timer display
- Session complete notification (audio/visual)
- Save session to localStorage history
- Display total practice time today/this week

**Implementation Notes**:
- Simple timer integrated with play state
- localStorage for persistence
- Minimal UI footprint

---

### 1.3 Setlist Mode (Song Saving)
**Priority**: P0 - Critical
**Effort**: Medium

Save multiple tempo/time signature combinations for quick recall.

**Requirements**:
- Save current settings with custom name
- Store: BPM, time signature, subdivision, sound, notes
- Quick load from dropdown/list
- Edit and delete saved songs
- Reorder songs
- localStorage persistence
- Export/import as JSON (backup)

**Implementation Notes**:
- Collapsible setlist panel
- Drag-and-drop reordering
- Up to 100 songs (localStorage limit consideration)

---

### 1.4 Fullscreen Mode
**Priority**: P0 - Critical
**Effort**: Low

Large display for music stands, gyms, classrooms.

**Requirements**:
- Single click to enter fullscreen
- Show only: BPM, beat indicator, play/stop
- Large, readable typography
- Exit with Escape or click
- Works on mobile devices
- Maintains all keyboard shortcuts

**Implementation Notes**:
- Use Fullscreen API
- Create simplified fullscreen view component
- Remember preference in localStorage

---

### 1.5 Enhanced Keyboard Shortcuts
**Priority**: P1 - High
**Effort**: Low

Power user efficiency.

**Current**:
- Space: Play/Stop
- Arrow Up/Down: BPM +/-1
- Shift+Arrow: BPM +/-10
- T: Tap tempo

**Add**:
- F: Fullscreen toggle
- R: Reset to default (120 BPM, 4/4)
- 1-9: Load setlist positions 1-9
- S: Save current to setlist (opens dialog)
- M: Mute beats toggle (Phase 2)

---

## Phase 2: Advanced Training Features

### 2.1 Muted Beats Training
**Priority**: P1 - High
**Effort**: Medium

Develop internal timing by periodically silencing the click.

**Modes**:
- **Scheduled**: Click X bars, silent Y bars, repeat
- **Random**: Each beat has Z% chance of silence
- **Progressive**: Start 100% audible, gradually increase silence

**Requirements**:
- Visual indicator continues during silence
- Configurable silence patterns
- Clear mode indication in UI

---

### 2.2 Custom Accent Patterns
**Priority**: P1 - High
**Effort**: Medium

Create custom emphasis patterns beyond "accent beat 1."

**Requirements**:
- Click individual beats to toggle accent
- Multiple accent levels (strong, medium, none)
- Save patterns with songs
- Preset patterns (backbeat, clave, etc.)

---

### 2.3 Basic Polyrhythm Support
**Priority**: P2 - Medium
**Effort**: High

Play two rhythms simultaneously.

**Phase 2a - Simple**:
- Presets: 2:3, 3:4, 4:3, 3:2
- Different sounds for each rhythm
- Visual representation of both patterns

**Phase 2b - Advanced (Later)**:
- Custom X:Y input
- Independent tempo for each (cross-tempo)

---

### 2.4 Swing/Shuffle Feel
**Priority**: P2 - Medium
**Effort**: Medium

Adjust the feel of eighth notes.

**Requirements**:
- Swing percentage slider (50% straight to 75% heavy swing)
- Presets: Straight, Light Swing, Medium Swing, Heavy Swing
- Visual representation of swing ratio

---

## Phase 3: Education & Engagement

### 3.1 Expanded Educational Content
**Priority**: P1 - High
**Effort**: Medium

Comprehensive guides integrated with the tool.

**Content Sections**:
- Tempo markings deep dive (with audio examples)
- Time signature theory and practice
- How to practice effectively with a metronome
- Polyrhythm introduction and exercises
- Famous songs at various BPMs
- Workout/exercise BPM guide
- Instrument-specific practice tips

---

### 3.2 Practice Statistics Dashboard
**Priority**: P2 - Medium
**Effort**: Medium

Visualize practice habits over time.

**Requirements**:
- Daily/weekly/monthly practice time charts
- Streak tracking (consecutive days)
- Goals and achievements
- Export practice log

---

### 3.3 Guided Practice Routines
**Priority**: P3 - Low
**Effort**: High

Pre-built practice session templates.

**Examples**:
- Beginner warm-up (5 min scales, tempo progression)
- Drummer rudiments routine
- Speed building exercise
- Rhythm accuracy test

---

## Phase 4: Integration & Advanced Features

### 4.1 Web MIDI Support
**Priority**: P3 - Low
**Effort**: High

Sync with hardware and DAWs.

**Requirements**:
- MIDI clock output
- Device selection
- Latency compensation

---

### 4.2 Audio Import (Tap to Find BPM)
**Priority**: P3 - Low
**Effort**: High

Analyze audio to detect BPM.

**Requirements**:
- Microphone input or file upload
- Beat detection algorithm
- Display detected BPM

---

### 4.3 Collaborative Practice (Future)
**Priority**: P4 - Future
**Effort**: Very High

Real-time sync between multiple users.

---

## Implementation Timeline

### Sprint 1 (Current)
- [x] Base metronome functionality
- [ ] Tempo trainer mode
- [ ] Practice timer
- [ ] Setlist/song saving
- [ ] Fullscreen mode
- [ ] Enhanced keyboard shortcuts
- [ ] Educational content expansion

### Sprint 2
- [ ] Muted beats training
- [ ] Custom accent patterns
- [ ] Basic polyrhythms (presets)

### Sprint 3
- [ ] Practice statistics
- [ ] Swing/shuffle feel
- [ ] Guided routines

### Future
- [ ] Web MIDI
- [ ] Audio BPM detection
- [ ] Collaborative features

---

## Success Metrics

### Engagement
- Average session duration > 10 minutes
- Return user rate > 40%
- Setlist feature adoption > 25%

### SEO/Growth
- Top 3 for "online metronome"
- Top 5 for "free metronome"
- Featured snippet for tempo-related queries

### User Satisfaction
- Collect feedback via optional survey
- Monitor feature usage via analytics
- Track fullscreen mode adoption (proxy for serious use)

---

## Technical Considerations

### Performance
- Web Audio API for precise timing (already implemented)
- RequestAnimationFrame for smooth visuals
- Minimize DOM manipulation during playback

### Compatibility
- Test on Chrome, Firefox, Safari, Edge
- Test on iOS Safari and Android Chrome
- Test on Chromebooks (education market)
- Ensure keyboard shortcuts don't conflict with browser

### Accessibility
- ARIA labels for screen readers
- High contrast mode consideration
- Keyboard-only navigation

### Data Persistence
- localStorage for settings and setlist
- Consider IndexedDB for larger data (practice history)
- Export/import for backup and device transfer

---

## Phase 2 Review Findings (January 2026)

### What's Working Well ✅
- Tempo markings (Largo, Adagio, Moderato, etc.)
- Time signatures (2/4, 3/4, 4/4, 5/4, 6/8, 7/8)
- Setlist save/export to JSON
- Multiple click sounds
- Subdivisions (quarter, eighth, triplet, sixteenth)
- Accent options
- Visual beat display
- Fullscreen mode
- Keyboard shortcuts (space, arrows, T for tap)

### Issues Found 🔧

#### P0 - Critical
- **Footer "Related Tools" incomplete**: Missing links to all network sites

#### P1 - High Priority
- Tap tempo button not prominent enough in UI
- Keyboard shortcuts not displayed/discoverable (no help modal)
- No visible shortcut hints on buttons

#### P2 - Medium Priority
- No tempo trainer/accelerando mode visible
- No practice timer display
- No muted beats training mode

---

## File Structure for Implementation

```
metronome/
├── static/
│   ├── css/
│   │   ├── style.css          # Main styles
│   │   └── fullscreen.css     # Fullscreen mode styles
│   ├── js/
│   │   ├── metronome.js       # Core metronome engine
│   │   ├── tempoTrainer.js    # Tempo trainer module
│   │   ├── practiceTimer.js   # Practice timer module
│   │   ├── setlist.js         # Setlist management
│   │   └── storage.js         # localStorage utilities
│   └── favicon.svg
├── templates/
│   └── index.html             # Main template
├── research/
│   ├── competitors.md
│   ├── differentiation.md
│   └── audience.md
└── plans/
    └── roadmap.md
```

Note: For simplicity, all new JavaScript will be integrated into the single metronome.js file rather than creating separate modules, to maintain the current architecture.
