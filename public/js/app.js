/**
 * MotoLean UI & Telemetry Controller
 * Manages display, calibration, peak hold, audio feedback, Wake Lock, and simulator.
 */

document.addEventListener('DOMContentLoaded', () => {
  // DOM References
  const angleNumberEl = document.getElementById('angleNumber');
  const angleSignEl = document.getElementById('angleSign');
  const directionBadgeEl = document.getElementById('directionBadge');
  const lateralGEl = document.getElementById('lateralG');
  
  const activeArcPath = document.getElementById('activeArcPath');
  const tiltingHorizonGroup = document.getElementById('tiltingHorizonGroup');
  
  const maxLeftValEl = document.getElementById('maxLeftVal');
  const maxRightValEl = document.getElementById('maxRightVal');
  const leftBarFillEl = document.getElementById('leftBarFill');
  const rightBarFillEl = document.getElementById('rightBarFill');
  const resetPeaksBtn = document.getElementById('resetPeaksBtn');
  
  const peakLeftMarker = document.getElementById('peakLeftMarker');
  const peakLeftLine = document.getElementById('peakLeftLine');
  const peakRightMarker = document.getElementById('peakRightMarker');
  const peakRightLine = document.getElementById('peakRightLine');
  
  const calibrateBtnLeft = document.getElementById('calibrateBtnLeft');
  const calibrateBtnRight = document.getElementById('calibrateBtnRight');
  const calibBanner = document.getElementById('calibBanner');
  const calibTitle = document.getElementById('calibTitle');
  const calibSub = document.getElementById('calibSub');
  const calibStatusIcon = document.getElementById('calibStatusIcon');
  const resetCalibBtn = document.getElementById('resetCalibBtn');
  
  const sensorStatusTag = document.getElementById('sensorStatusTag');
  const wakeLockBtn = document.getElementById('wakeLockBtn');
  const wakeLockLabel = document.getElementById('wakeLockLabel');
  const themeToggleBtn = document.getElementById('themeToggleBtn');
  const sunIcon = document.getElementById('sunIcon');
  const moonIcon = document.getElementById('moonIcon');
  const audioToggleBtn = document.getElementById('audioToggleBtn');
  const audioIconOn = document.getElementById('audioIconOn');
  const audioIconOff = document.getElementById('audioIconOff');
  
  // Settings & Simulation
  const settingsBtn = document.getElementById('settingsBtn');
  const settingsModal = document.getElementById('settingsModal');
  const closeSettingsBtn = document.getElementById('closeSettingsBtn');
  const testModeBtn = document.getElementById('testModeBtn');
  const simulatorDrawer = document.getElementById('simulatorDrawer');
  const closeSimBtn = document.getElementById('closeSimBtn');
  const simLeanSlider = document.getElementById('simLeanSlider');
  const sliderAngleDisplay = document.getElementById('sliderAngleDisplay');
  const autoRideBtn = document.getElementById('autoRideBtn');
  const autoRideLabel = document.getElementById('autoRideLabel');
  
  const iosPermissionModal = document.getElementById('iosPermissionModal');
  const grantPermissionBtn = document.getElementById('grantPermissionBtn');
  
  // App State
  let maxLeftAngle = 0;   // Negative values (e.g. -42.5)
  let maxRightAngle = 0;  // Positive values (e.g. +45.0)
  let precision = parseInt(localStorage.getItem('motolean_precision') || '1', 10);
  let audioEnabled = localStorage.getItem('motolean_audio') !== 'false';
  let voiceEnabled = localStorage.getItem('motolean_voice') === 'true';
  let beepEnabled = localStorage.getItem('motolean_beep') !== 'false';
  let wakeLock = null;
  let autoRideInterval = null;
  let autoRideTime = 0;
  let lastAnnouncedZone = 0;
  let lastBeepPeak = 0;
  
  // QR Modal Elements
  const qrModalBtn = document.getElementById('qrModalBtn');
  const qrModal = document.getElementById('qrModal');
  const closeQrBtn = document.getElementById('closeQrBtn');
  const qrContainer = document.getElementById('qrContainer');
  const phoneUrlText = document.getElementById('phoneUrlText');

  async function openQrModal() {
    let targetUrl = window.location.href;
    try {
      const res = await fetch('/api/info');
      if (res.ok) {
        const info = await res.json();
        if (info.ips && info.ips.length > 0) {
          targetUrl = `http://${info.ips[0]}:${info.port || 3000}`;
        }
      }
    } catch (e) {
      console.warn('Could not fetch server IP info', e);
    }

    const apkUrl = `${targetUrl.replace(/\/$/, '')}/MotoLean.apk`;
    const apkUrlText = document.getElementById('apkUrlText');
    if (apkUrlText) apkUrlText.textContent = apkUrl;
    if (phoneUrlText) phoneUrlText.textContent = targetUrl;
    if (typeof window.generateQRCodeSVG === 'function') {
      qrContainer.innerHTML = window.generateQRCodeSVG(apkUrl, 210);
    }
    qrModal.classList.remove('hidden');
  }

  if (qrModalBtn) {
    qrModalBtn.addEventListener('click', openQrModal);
  }
  if (closeQrBtn) {
    closeQrBtn.addEventListener('click', () => qrModal.classList.add('hidden'));
  }
  if (qrModal) {
    qrModal.querySelector('.modal-backdrop').addEventListener('click', () => qrModal.classList.add('hidden'));
  }

  // Audio Synthesizer using Web Audio API
  let audioCtx = null;
  function getAudioContext() {
    if (!audioCtx) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (AudioContext) {
        audioCtx = new AudioContext();
      }
    }
    if (audioCtx && audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
    return audioCtx;
  }
  
  function playTone(freq = 600, duration = 0.1, type = 'sine') {
    if (!audioEnabled || !beepEnabled) return;
    try {
      const ctx = getAudioContext();
      if (!ctx) return;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + duration);
    } catch (e) {
      // Audio might be blocked before user interaction
    }
  }
  
  function playCalibrationChime() {
    try {
      const ctx = getAudioContext();
      if (!ctx) return;
      const now = ctx.currentTime;
      // High-tech ascending futuristic chime
      [523.25, 659.25, 783.99, 1046.50].forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, now + i * 0.06);
        gain.gain.setValueAtTime(0.25, now + i * 0.06);
        gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.06 + 0.12);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + i * 0.06);
        osc.stop(now + i * 0.06 + 0.15);
      });
    } catch (e) {}
  }
  
  function speakLean(text) {
    if (!audioEnabled || !voiceEnabled || !('speechSynthesis' in window)) return;
    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1.3;
      utterance.volume = 0.9;
      window.speechSynthesis.speak(utterance);
    } catch (e) {}
  }
  
  // Haptic feedback helper
  function triggerHaptic(pattern = [40]) {
    if ('vibrate' in navigator) {
      try { navigator.vibrate(pattern); } catch (e) {}
    }
  }

  // Calculate SVG arc path for lean gauge
  // Center is (180, 180), Radius = 130
  function updateArcPath(angle) {
    const cx = 180;
    const cy = 180;
    const r = 130;
    
    // Clamp angle to -60° .. +60° for visualization arc
    const clamped = Math.max(-60, Math.min(60, angle));
    if (Math.abs(clamped) < 0.5) {
      // At zero, collapse arc
      activeArcPath.setAttribute('d', `M ${cx} ${cy - r} A ${r} ${r} 0 0 1 ${cx} ${cy - r}`);
      return;
    }
    
    // Start angle: 0° is straight UP (which is -90° in standard polar math)
    const startRad = -Math.PI / 2;
    // End angle: angle > 0 leans RIGHT (+), angle < 0 leans LEFT (-)
    const endRad = startRad + (clamped * Math.PI / 180);
    
    const startX = cx + r * Math.cos(startRad);
    const startY = cy + r * Math.sin(startRad);
    const endX = cx + r * Math.cos(endRad);
    const endY = cy + r * Math.sin(endRad);
    
    // SVG arc sweep flag: 1 for right (clockwise), 0 for left (counter-clockwise)
    const sweepFlag = clamped >= 0 ? 1 : 0;
    
    activeArcPath.setAttribute('d', `M ${startX} ${startY} A ${r} ${r} 0 0 ${sweepFlag} ${endX} ${endY}`);
    
    // Dynamic color gradient styling
    if (clamped > 0) {
      activeArcPath.style.stroke = clamped > 42 ? 'var(--neon-amber)' : 'var(--neon-cyan)';
    } else {
      activeArcPath.style.stroke = clamped < -42 ? 'var(--neon-amber)' : 'var(--neon-red)';
    }
  }
  
  // Calculate coordinate on arc for peak tick markers
  function updatePeakTick(lineEl, angle) {
    const cx = 180;
    const cy = 180;
    const rInner = 120;
    const rOuter = 138;
    const rad = -Math.PI / 2 + (angle * Math.PI / 180);
    
    const x1 = cx + rInner * Math.cos(rad);
    const y1 = cy + rInner * Math.sin(rad);
    const x2 = cx + rOuter * Math.cos(rad);
    const y2 = cy + rOuter * Math.sin(rad);
    
    lineEl.setAttribute('x1', x1.toFixed(1));
    lineEl.setAttribute('y1', y1.toFixed(1));
    lineEl.setAttribute('x2', x2.toFixed(1));
    lineEl.setAttribute('y2', y2.toFixed(1));
  }

  // Primary Telemetry Update Handler
  function onTelemetryUpdate(data) {
    const angle = Math.round(data.leanAngle);
    const absAngle = Math.abs(angle);
    
    // 1. Digital Lean Readout (Whole integers without decimal point):
    // Right side: +ve value
    // Left side: -ve value
    // Upright: 0°
    if (absAngle === 0) {
      angleSignEl.textContent = '';
      angleSignEl.className = 'sign-glyph neutral';
      angleNumberEl.textContent = '0';
      directionBadgeEl.textContent = 'UPRIGHT (0°)';
      directionBadgeEl.className = 'direction-badge';
    } else if (angle > 0) {
      // RIGHT LEAN (+ve)
      angleSignEl.textContent = '+';
      angleSignEl.className = 'sign-glyph';
      angleNumberEl.textContent = String(absAngle);
      directionBadgeEl.textContent = `RIGHT LEAN (+${absAngle}°)`;
      directionBadgeEl.className = 'direction-badge right';
    } else {
      // LEFT LEAN (-ve)
      angleSignEl.textContent = '-';
      angleSignEl.className = 'sign-glyph left';
      angleNumberEl.textContent = String(absAngle);
      directionBadgeEl.textContent = `LEFT LEAN (-${absAngle}°)`;
      directionBadgeEl.className = 'direction-badge left';
    }
    
    // 2. Estimated Lateral G-force
    const latG = Math.tan(absAngle * Math.PI / 180);
    lateralGEl.textContent = `${latG.toFixed(2)} G`;
    
    // 3. Tilting Motorcycle Silhouette & Gauge Arc
    tiltingHorizonGroup.setAttribute('transform', `translate(180, 180) rotate(${angle})`);
    updateArcPath(angle);
    
    // 4. Peak Hold (Track Max Left and Max Right - Whole numbers)
    if (angle > 0 && angle > maxRightAngle) {
      maxRightAngle = angle;
      maxRightValEl.textContent = `+${maxRightAngle}°`;
      const pct = Math.min(100, (maxRightAngle / 60) * 100);
      rightBarFillEl.style.width = `${pct}%`;
      
      peakRightMarker.classList.remove('hidden');
      updatePeakTick(peakRightLine, maxRightAngle);
      
      if (maxRightAngle > 35 && (maxRightAngle - lastBeepPeak > 4)) {
        playTone(880, 0.15);
        lastBeepPeak = maxRightAngle;
      }
    } else if (angle < 0 && angle < maxLeftAngle) {
      maxLeftAngle = angle; // Negative integer
      maxLeftValEl.textContent = `${maxLeftAngle}°`;
      const pct = Math.min(100, (Math.abs(maxLeftAngle) / 60) * 100);
      leftBarFillEl.style.width = `${pct}%`;
      
      peakLeftMarker.classList.remove('hidden');
      updatePeakTick(peakLeftLine, maxLeftAngle);
      
      if (Math.abs(maxLeftAngle) > 35 && (Math.abs(maxLeftAngle) - lastBeepPeak > 4)) {
        playTone(880, 0.15);
        lastBeepPeak = Math.abs(maxLeftAngle);
      }
    }
    
    // 5. Voice Callouts (if enabled)
    if (voiceEnabled) {
      const zone = Math.floor(absAngle / 10) * 10;
      if (zone >= 20 && zone !== lastAnnouncedZone) {
        lastAnnouncedZone = zone;
        const side = angle > 0 ? 'Right' : 'Left';
        speakLean(`${side} ${zone}`);
      } else if (absAngle < 10) {
        lastAnnouncedZone = 0;
      }
    }
    
    // 6. Status tag update
    if (data.isSimulated) {
      sensorStatusTag.textContent = 'SIMULATION';
      sensorStatusTag.style.color = 'var(--neon-cyan)';
    } else if (data.sensorSource === 'orientation') {
      sensorStatusTag.textContent = `ACTIVE (${data.hz}Hz)`;
      sensorStatusTag.style.color = 'var(--neon-green)';
    } else if (data.sensorSource === 'motion') {
      sensorStatusTag.textContent = `ACCEL (${data.hz}Hz)`;
      sensorStatusTag.style.color = 'var(--neon-amber)';
    }
  }
  
  // Subscribe to sensor engine
  window.sensorEngine.onUpdate(onTelemetryUpdate);
  
  // Update calibration banner UI
  function updateCalibUI() {
    if (window.sensorEngine.calibrated) {
      calibBanner.classList.add('calibrated');
      calibStatusIcon.textContent = '✓';
      calibTitle.textContent = 'CALIBRATED AT 0.0°';
      calibSub.textContent = `Reference set for ${window.sensorEngine.mountMode} mount. Tap again to re-zero.`;
    } else {
      calibBanner.classList.remove('calibrated');
      calibStatusIcon.textContent = '⌖';
      calibTitle.textContent = 'NOT CALIBRATED';
      calibSub.textContent = 'Mount bike upright & straight, then press Calibrate';
    }
  }
  updateCalibUI();

  // CALIBRATION ACTION FOR BOTH BUTTONS
  function triggerCalibration() {
    triggerHaptic([60, 40, 60]);
    playCalibrationChime();
    window.sensorEngine.calibrate();
    updateCalibUI();

    [calibrateBtnLeft, calibrateBtnRight].forEach(btn => {
      if (btn) {
        btn.style.borderColor = 'var(--neon-green)';
        btn.style.boxShadow = '0 0 25px var(--neon-green)';
        setTimeout(() => {
          btn.style.borderColor = '';
          btn.style.boxShadow = '';
        }, 350);
      }
    });
  }

  if (calibrateBtnLeft) calibrateBtnLeft.addEventListener('click', triggerCalibration);
  if (calibrateBtnRight) calibrateBtnRight.addEventListener('click', triggerCalibration);
  
  // Reset Calibration to default
  resetCalibBtn.addEventListener('click', () => {
    triggerHaptic([30]);
    window.sensorEngine.resetCalibration();
    updateCalibUI();
  });

  // Reset Peak Max Angles
  resetPeaksBtn.addEventListener('click', () => {
    triggerHaptic([30]);
    playTone(440, 0.08);
    maxLeftAngle = 0;
    maxRightAngle = 0;
    maxLeftValEl.textContent = '0.0°';
    maxRightValEl.textContent = '0.0°';
    leftBarFillEl.style.width = '0%';
    rightBarFillEl.style.width = '0%';
    peakLeftMarker.classList.add('hidden');
    peakRightMarker.classList.add('hidden');
    lastBeepPeak = 0;
  });

  // Screen Wake Lock API
  async function requestWakeLock() {
    if ('wakeLock' in navigator) {
      try {
        wakeLock = await navigator.wakeLock.request('screen');
        wakeLockBtn.classList.add('active');
        wakeLockLabel.textContent = 'AWAKE';
        wakeLock.addEventListener('release', () => {
          wakeLockBtn.classList.remove('active');
          wakeLockLabel.textContent = 'SLEEP';
        });
      } catch (err) {
        console.warn('Wake Lock request error:', err);
      }
    }
  }
  
  wakeLockBtn.addEventListener('click', () => {
    if (wakeLock !== null) {
      wakeLock.release();
      wakeLock = null;
    } else {
      requestWakeLock();
    }
  });

  // Re-acquire Wake Lock when tab regains focus/visibility
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      requestWakeLock();
    }
  });
  requestWakeLock();

  // Day / Night Theme Toggle
  themeToggleBtn.addEventListener('click', () => {
    const isLight = document.body.classList.toggle('theme-light');
    document.body.classList.toggle('theme-dark', !isLight);
    if (isLight) {
      sunIcon.classList.remove('hidden');
      moonIcon.classList.add('hidden');
      localStorage.setItem('motolean_theme', 'light');
    } else {
      sunIcon.classList.add('hidden');
      moonIcon.classList.remove('hidden');
      localStorage.setItem('motolean_theme', 'dark');
    }
  });
  
  if (localStorage.getItem('motolean_theme') === 'light') {
    document.body.classList.add('theme-light');
    document.body.classList.remove('theme-dark');
    sunIcon.classList.remove('hidden');
    moonIcon.classList.add('hidden');
  }

  // Audio Toggle
  audioToggleBtn.addEventListener('click', () => {
    audioEnabled = !audioEnabled;
    localStorage.setItem('motolean_audio', audioEnabled);
    if (audioEnabled) {
      audioIconOn.classList.remove('hidden');
      audioIconOff.classList.add('hidden');
      playTone(587, 0.1);
    } else {
      audioIconOn.classList.add('hidden');
      audioIconOff.classList.remove('hidden');
    }
  });
  
  if (!audioEnabled) {
    audioIconOn.classList.add('hidden');
    audioIconOff.classList.remove('hidden');
  }

  // iOS 13+ Sensor Permission
  function checkIOSPermission() {
    if (typeof DeviceOrientationEvent !== 'undefined' && typeof DeviceOrientationEvent.requestPermission === 'function') {
      // iOS device
      iosPermissionModal.classList.remove('hidden');
    }
  }
  
  grantPermissionBtn.addEventListener('click', () => {
    if (typeof DeviceOrientationEvent.requestPermission === 'function') {
      DeviceOrientationEvent.requestPermission()
        .then(response => {
          if (response === 'granted') {
            iosPermissionModal.classList.add('hidden');
            startSensorListeners();
          } else {
            alert('Motion sensor permission was denied. Please allow motion sensors in Safari settings.');
          }
        })
        .catch(err => {
          console.error(err);
          iosPermissionModal.classList.add('hidden');
        });
    }
  });

  // Start Hardware Sensors
  function startSensorListeners() {
    if (window.DeviceOrientationEvent) {
      window.addEventListener('deviceorientation', (e) => {
        if (e.beta !== null && e.gamma !== null) {
          window.sensorEngine.processSample(e.beta, e.gamma, e.alpha || 0, 'orientation');
        }
      }, true);
    }
    
    // Also listen to DeviceMotionEvent as fallback
    if (window.DeviceMotionEvent) {
      window.addEventListener('devicemotion', (e) => {
        if (window.sensorEngine.sensorSource === 'none' && e.accelerationIncludingGravity) {
          const acc = e.accelerationIncludingGravity;
          if (acc.x !== null && acc.y !== null && acc.z !== null) {
            window.sensorEngine.processAccelerometer(acc.x, acc.y, acc.z);
          }
        }
      }, true);
    }
  }

  checkIOSPermission();
  startSensorListeners();

  // Test / Simulator Drawer
  testModeBtn.addEventListener('click', () => {
    simulatorDrawer.classList.toggle('hidden');
  });
  closeSimBtn.addEventListener('click', () => {
    simulatorDrawer.classList.add('hidden');
  });

  simLeanSlider.addEventListener('input', (e) => {
    const val = parseFloat(e.target.value);
    sliderAngleDisplay.textContent = `${val > 0 ? '+' : ''}${val.toFixed(1)}°`;
    window.sensorEngine.setSimulatedAngle(val);
    
    // Highlight matching chip
    document.querySelectorAll('.sim-chip').forEach(chip => {
      chip.classList.toggle('active', parseFloat(chip.dataset.angle) === val);
    });
  });

  document.querySelectorAll('.sim-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      const angle = parseFloat(chip.dataset.angle);
      simLeanSlider.value = angle;
      sliderAngleDisplay.textContent = `${angle > 0 ? '+' : ''}${angle.toFixed(1)}°`;
      window.sensorEngine.setSimulatedAngle(angle);
      
      document.querySelectorAll('.sim-chip').forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
    });
  });

  // Twisty Road Ride Simulator Animation
  autoRideBtn.addEventListener('click', () => {
    if (autoRideInterval) {
      clearInterval(autoRideInterval);
      autoRideInterval = null;
      autoRideLabel.textContent = '▶ Play Twisty Road Ride';
      window.sensorEngine.setSimulatedAngle(0);
      simLeanSlider.value = 0;
      sliderAngleDisplay.textContent = '0°';
    } else {
      autoRideLabel.textContent = '⏹ Stop Twisty Road Ride';
      autoRideTime = 0;
      autoRideInterval = setInterval(() => {
        autoRideTime += 0.04;
        // Harmonic twisty canyon road simulation with sweeping lefts and rights
        const simAngle = Math.sin(autoRideTime * 0.8) * 44 + Math.sin(autoRideTime * 1.7) * 8;
        const rounded = Math.round(simAngle * 10) / 10;
        simLeanSlider.value = rounded;
        sliderAngleDisplay.textContent = `${rounded > 0 ? '+' : ''}${rounded.toFixed(1)}°`;
        window.sensorEngine.setSimulatedAngle(rounded);
      }, 35);
    }
  });

  // Settings Modal Controls
  settingsBtn.addEventListener('click', () => {
    settingsModal.classList.remove('hidden');
  });
  closeSettingsBtn.addEventListener('click', () => {
    settingsModal.classList.add('hidden');
  });
  document.querySelector('.modal-backdrop').addEventListener('click', () => {
    settingsModal.classList.add('hidden');
  });

  // Mount orientation selector
  document.querySelectorAll('.opt-btn').forEach(btn => {
    if (btn.dataset.mount === window.sensorEngine.mountMode) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
    btn.addEventListener('click', () => {
      document.querySelectorAll('.opt-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      window.sensorEngine.setMountMode(btn.dataset.mount);
      updateCalibUI();
    });
  });

  // Vibration damping selector
  document.querySelectorAll('[data-damping]').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.damping === window.sensorEngine.damping);
    btn.addEventListener('click', () => {
      document.querySelectorAll('[data-damping]').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      window.sensorEngine.setDamping(btn.dataset.damping);
    });
  });

  // Precision selector
  document.querySelectorAll('[data-precision]').forEach(btn => {
    btn.classList.toggle('active', parseInt(btn.dataset.precision, 10) === precision);
    btn.addEventListener('click', () => {
      document.querySelectorAll('[data-precision]').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      precision = parseInt(btn.dataset.precision, 10);
      localStorage.setItem('motolean_precision', precision);
    });
  });

  // Voice toggle
  const voiceAnnounceToggle = document.getElementById('voiceAnnounceToggle');
  voiceAnnounceToggle.checked = voiceEnabled;
  voiceAnnounceToggle.addEventListener('change', (e) => {
    voiceEnabled = e.target.checked;
    localStorage.setItem('motolean_voice', voiceEnabled);
    if (voiceEnabled) speakLean('Voice Lean telemetry activated');
  });

  // Beep toggle
  const audioBeepToggle = document.getElementById('audioBeepToggle');
  audioBeepToggle.checked = beepEnabled;
  audioBeepToggle.addEventListener('change', (e) => {
    beepEnabled = e.target.checked;
    localStorage.setItem('motolean_beep', beepEnabled);
  });
});
