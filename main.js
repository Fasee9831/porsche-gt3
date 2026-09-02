/**
 * PORSCHE 911 GT3 — GLOBAL PERSISTENT CINEMATIC MOTION ENGINE
 * Senior Creative Development & Motion Performance Engineering
 */

(function () {
  'use strict';

  // --- CONFIGURATION ---
  const CONFIG = {
    TOTAL_FRAMES: 240,
    VIDEO_DURATION: 10.0,
    FRAME_PATH_PREFIX: 'frames/frame_',
    FRAME_PATH_SUFFIX: '.jpg'
  };

  // --- STATE & GLOBAL VARIABLES ---
  const state = {
    progress: 0,
    targetProgress: 0,
    totalFrames: CONFIG.TOTAL_FRAMES,
    fps: 60,
    lastFrameTime: performance.now(),
    frameCount: 0,
    currentFps: 60,
    isReducedMotion: window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    isAudioPlaying: false,
    audioCtx: null,
    oscillator: null,
    gainNode: null,
    filterNode: null,
    speedMph: 160,
    wingAngle: 12,
    revRpm: 1000,
    isReving: false,
    activeSectionId: 'motion',
    driveMode: 'street',
    currentColor: '#FF1E27',
    exhaustMode: 'standard',
    firingIndex: 0
  };

  let lenis = null;

  // WebGL CFD Shader Engine State
  let gl = null;
  let webglProgram = null;
  let shaderUniforms = {};
  let mousePos = { x: 0, y: 0 };

  // Preloaded Frame Sequence (porsche.mp4 extracted frames)
  const loadedFrames = [];
  let loadedFramesCount = 0;

  function preloadFrameSequence() {
    for (let i = 1; i <= CONFIG.TOTAL_FRAMES; i++) {
      const img = new Image();
      const pad = String(i).padStart(3, '0');
      img.src = `${CONFIG.FRAME_PATH_PREFIX}${pad}${CONFIG.FRAME_PATH_SUFFIX}`;
      img.onload = () => { loadedFramesCount++; };
      loadedFrames.push(img);
    }
  }

  // --- DOM ELEMENTS ---
  const video = document.getElementById('hero-video');
  const canvas = document.getElementById('hero-canvas');
  const ctx = canvas ? canvas.getContext('2d', { alpha: false }) : null;
  const sections = document.querySelectorAll('.page-section');
  const navLinks = document.querySelectorAll('.nav-link, .mobile-nav-link, .brand-logo, .back-to-top');

  // Mobile Menu Elements
  const mobileMenuToggle = document.getElementById('mobile-menu-toggle');
  const mobileNavOverlay = document.getElementById('mobile-nav-overlay');

  // Telemetry HUD Elements
  const telemetryHudOverlay = document.querySelector('.telemetry-hud');
  const hudTimestamp = document.getElementById('hud-timestamp');
  const hudFrame = document.getElementById('hud-frame');
  const hudCamera = document.getElementById('hud-camera');
  const hudGaugeFill = document.getElementById('hud-gauge-fill');
  const hudSpeedVal = document.getElementById('hud-speed-val');
  const heroProgressFill = document.getElementById('hero-progress-fill');
  const fpsDisplay = document.getElementById('fps-display');

  // Airflow WebGL Canvas
  const airflowCanvas = document.getElementById('airflow-canvas');

  // Tachometer Canvas
  const tachoCanvas = document.getElementById('tacho-canvas');
  const tachoCtx = tachoCanvas ? tachoCanvas.getContext('2d') : null;
  const tachoRpmVal = document.getElementById('tacho-rpm-val');
  const revEngineBtn = document.getElementById('rev-engine-btn');

  // Hotspots Data & Elements (Factually Verified Porsche Specs)
  const hotspotBtns = document.querySelectorAll('.hotspot-btn');
  const spotTag = document.getElementById('spot-tag');
  const spotTitle = document.getElementById('spot-title');
  const spotDesc = document.getElementById('spot-desc');
  const spotM1 = document.getElementById('spot-m1');
  const spotL1 = document.getElementById('spot-l1');
  const spotM2 = document.getElementById('spot-m2');
  const spotL2 = document.getElementById('spot-l2');

  const hotspotData = {
    brakes: {
      tag: 'HIGH-PERFORMANCE BRAKING',
      title: 'Porsche Ceramic Composite Brakes (PCCB)',
      desc: '410 mm front carbon-ceramic disc rotors with 6-piston aluminum monobloc fixed calipers deliver fade-free stopping power while saving 50% weight over cast-iron rotors.',
      m1: '410 MM', l1: 'FRONT ROTOR SIZE',
      m2: '50% LIGHTER', l2: 'THAN STEEL BRAKES'
    },
    cockpit: {
      tag: 'DRIVER-CENTRIC COCKPIT',
      title: 'Carbon Fiber Bucket Seats & Race-Tex Grip',
      desc: 'Deeply bolstered carbon-fiber reinforced plastic (CFRP) bucket seats support your body through extreme lateral G-forces on track.',
      m1: 'CFRP', l1: 'SEAT FRAME STRUCTURE',
      m2: 'Race-Tex', l2: 'NON-SLIP STEERING WHEEL'
    },
    engine: {
      tag: 'ATMOSPHERIC POWER',
      title: '4.0-Liter High-Revving Flat-Six',
      desc: 'Derived directly from Porsche 911 GT3 Cup race cars, providing telepathic throttle response and a screaming 9,000 RPM redline.',
      m1: '502 HP', l1: 'MAXIMUM HORSEPOWER',
      m2: '9,000 RPM', l2: 'ENGINE REDLINE'
    },
    wing: {
      tag: 'AERODYNAMIC DOWNFORCE',
      title: 'Suspended Swan-Neck Rear Wing',
      desc: 'Derived from the 911 RSR race car. Hanging the wing from above keeps airflow underneath clean, generating up to 385 kg of downforce.',
      m1: '385 KG', l1: 'MAX DOWNFORCE AT 124 MPH',
      m2: '4 STAGES', l2: 'MANUAL TRACK ADJUSTMENT'
    }
  };

  // Audio Spectrum
  const audioCanvas = document.getElementById('audio-spectrum-canvas');
  const audioCtxCanvas = audioCanvas ? audioCanvas.getContext('2d') : null;
  const playSoundBtn = document.getElementById('play-sound-btn');
  const soundBtnText = document.getElementById('sound-btn-text');

  // Custom Cursor & Modals
  const cursor = document.getElementById('custom-cursor');
  const siteHeader = document.getElementById('site-header');
  const modalBackdrop = document.getElementById('config-modal');
  const modalCloseBtn = document.getElementById('modal-close-btn');
  const configForm = document.getElementById('config-form');
  const formSuccess = document.getElementById('form-success');
  const replayBtn = document.getElementById('replay-btn');

  // Keys Help Drawer Elements
  const keysHelpBtn = document.getElementById('keys-help-btn');
  const keysModal = document.getElementById('keys-modal');
  const keysModalClose = document.getElementById('keys-modal-close');

  // Piston Nodes (1-6-2-4-3-5)
  const pistonNodes = document.querySelectorAll('.piston-node');

  // ==========================================================================
  // 01. INITIALIZATION & LENIS SMOOTH SCROLL INTEGRATION
  // ==========================================================================
  function init() {
    preloadFrameSequence();
    resizeCanvas();
    setupLenisSmoothScroll(); // INITIALIZED FIRST BEFORE GSAP ANIMATIONS
    setupWebGLAirflowShader(); // WEBGL CFD FLUID SHADER ENGINE
    setupAeroControls();
    setupEventListeners();
    setupMobileMenu();
    setupSectionObserver();
    setupScrollRevealObserver();
    setupWordByWordTextReveal();
    setupNumberRevealAnimations(); // ANIMATED NUMERIC COUNT-UP & REVEAL ENGINE
    setupGSAPStaggeredCardReveals();
    setupHoverRepeatAnimations();
    setupFooterObserver();
    setupDriveModePicker();
    setupPaintColorPicker();
    setupHotspots();
    setupModal();
    setupGearboxTabs();
    setupNavClickHandlers();
    setupExhaustToggle();
    setupSectionVisibilityGating();
    setupWelcomeIntro(); // ISOLATED WELCOME INTRO OVERLAY ENGINE

    // Start RAF Engine
    requestAnimationFrame(renderLoop);
  }

  /**
   * INITIALIZE LENIS SMOOTH SCROLL WITH HEAVY LUXURY INERTIA
   * SYNCS RAF WITH GSAP TICKER AND ScrollTrigger.update
   */
  function setupLenisSmoothScroll() {
    if (typeof Lenis === 'undefined') return;

    // Heavy, luxury scroll inertia calibration
    lenis = new Lenis({
      duration: 1.4,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      orientation: 'vertical',
      gestureOrientation: 'vertical',
      smoothWheel: true,
      wheelMultiplier: 0.85,
      touchMultiplier: 1.5,
      infinite: false
    });

    // Bind lenis scroll event to ScrollTrigger.update so reveals fire cleanly
    lenis.on('scroll', (e) => {
      if (window.ScrollTrigger) {
        ScrollTrigger.update();
      }
      updateScrollTarget();
    });

    // Sync Lenis requestAnimationFrame with gsap.ticker
    if (window.gsap) {
      gsap.ticker.add((time) => {
        lenis.raf(time * 1000);
      });
      gsap.ticker.lagSmoothing(0);
    }
  }

  // ==========================================================================
  // REAL-TIME COMPUTATIONAL FLUID DYNAMICS (CFD) WEBGL SHADER ENGINE
  // ==========================================================================
  const vsSource = `
    attribute vec2 a_position;
    varying vec2 v_uv;
    void main() {
      v_uv = (a_position + 1.0) * 0.5;
      gl_Position = vec4(a_position, 0.0, 1.0);
    }
  `;

  const fsSource = `
    precision highp float;
    uniform vec2 u_resolution;
    uniform float u_time;
    uniform vec2 u_mouse;
    uniform float u_speed;
    uniform float u_wingAngle;
    varying vec2 v_uv;

    vec2 hash(vec2 p) {
        p = vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3)));
        return -1.0 + 2.0 * fract(sin(p) * 43758.5453123);
    }

    float noise(vec2 p) {
        vec2 i = floor(p);
        vec2 f = fract(p);
        vec2 u = f * f * (3.0 - 2.0 * f);
        return mix(mix(dot(hash(i + vec2(0.0, 0.0)), f - vec2(0.0, 0.0)),
                       dot(hash(i + vec2(1.0, 0.0)), f - vec2(1.0, 0.0)), u.x),
                   mix(dot(hash(i + vec2(0.0, 1.0)), f - vec2(0.0, 1.0)),
                       dot(hash(i + vec2(1.0, 1.0)), f - vec2(1.0, 1.0)), u.x), u.y);
    }

    float fbm(vec2 p) {
        float v = 0.0;
        float a = 0.5;
        vec2 shift = vec2(100.0);
        mat2 rot = mat2(cos(0.5), sin(0.5), -sin(0.5), cos(0.5));
        for (int i = 0; i < 4; ++i) {
            v += a * noise(p);
            p = rot * p * 2.0 + shift;
            a *= 0.5;
        }
        return v;
    }

    float carDistance(vec2 p) {
        vec2 pos = p - vec2(0.5, 0.50);
        pos.x *= 2.2;
        float body = length(max(abs(pos) - vec2(0.35, 0.08), 0.0));
        float roof = length(max(abs(pos - vec2(-0.05, -0.06)) - vec2(0.18, 0.07), 0.0));
        return min(body, roof) - 0.05;
    }

    void main() {
        vec2 st = gl_FragCoord.xy / u_resolution.xy;
        vec2 normMouse = u_mouse / u_resolution;
        normMouse.y = 1.0 - normMouse.y;
        
        float flowSpeed = u_speed * 0.008;
        vec2 flowUv = st;
        flowUv.x -= u_time * flowSpeed;
        
        vec2 mouseDiff = st - normMouse;
        float mouseDist = length(mouseDiff);
        float mouseInfluence = smoothstep(0.35, 0.0, mouseDist);
        
        vec2 q = vec2(0.0);
        q.x = fbm(flowUv * 3.0);
        q.y = fbm(flowUv * 3.0 + vec2(5.2, 1.3));

        vec2 r = vec2(0.0);
        r.x = fbm(flowUv * 4.0 + 4.0 * q + vec2(1.7, 9.2) + mouseDiff * mouseInfluence * 2.5);
        r.y = fbm(flowUv * 4.0 + 4.0 * q + vec2(8.3, 2.8) - mouseDiff * mouseInfluence * 2.5);

        float f = fbm(flowUv * 3.0 + 4.0 * r);

        float dist = carDistance(st);
        float streaks = sin((st.y + q.y * 0.15 + r.y * 0.1) * 50.0 + u_time * 2.5) * 0.5 + 0.5;
        streaks = pow(streaks, 3.0);
        
        float turbulence = (f * 0.65 + streaks * 0.35) * (1.0 + mouseInfluence * 1.8 + (u_wingAngle * 0.03));
        
        float carMask = smoothstep(0.02, 0.0, dist);
        
        vec3 colBg = vec3(0.03, 0.04, 0.06);
        vec3 colSmokeLow = vec3(0.10, 0.15, 0.22);
        vec3 colSmokeHigh = vec3(1.0, 0.12, 0.15);
        vec3 colCore = vec3(1.0, 0.96, 0.96);

        vec3 col = mix(colBg, colSmokeLow, clamp(turbulence, 0.0, 1.0));
        col = mix(col, colSmokeHigh, clamp(pow(turbulence, 2.0) * 1.3, 0.0, 1.0));
        col = mix(col, colCore, clamp(pow(turbulence, 4.0) * (mouseInfluence + 0.3), 0.0, 1.0));
        
        float grid = (step(0.97, fract(st.x * 25.0)) + step(0.97, fract(st.y * 15.0))) * 0.06;
        col += vec3(grid);
        
        col = mix(col, vec3(0.06, 0.08, 0.12), carMask);
        float carOutline = smoothstep(0.03, 0.0, abs(dist));
        col += vec3(1.0, 0.12, 0.15) * carOutline * 0.9;

        gl_FragColor = vec4(col, 1.0);
    }
  `;

  function setupWebGLAirflowShader() {
    if (!airflowCanvas) return;

    try {
      gl = airflowCanvas.getContext('webgl') || airflowCanvas.getContext('experimental-webgl');
    } catch (e) {
      gl = null;
    }

    if (!gl) return; // Fallback to 2D canvas if WebGL unavailable

    const vertexShader = createShader(gl, gl.VERTEX_SHADER, vsSource);
    const fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, fsSource);

    if (!vertexShader || !fragmentShader) return;

    webglProgram = gl.createProgram();
    gl.attachShader(webglProgram, vertexShader);
    gl.attachShader(webglProgram, fragmentShader);
    gl.linkProgram(webglProgram);

    if (!gl.getProgramParameter(webglProgram, gl.LINK_STATUS)) {
      gl = null;
      return;
    }

    const positionAttributeLocation = gl.getAttribLocation(webglProgram, 'a_position');
    shaderUniforms = {
      u_resolution: gl.getUniformLocation(webglProgram, 'u_resolution'),
      u_time: gl.getUniformLocation(webglProgram, 'u_time'),
      u_mouse: gl.getUniformLocation(webglProgram, 'u_mouse'),
      u_speed: gl.getUniformLocation(webglProgram, 'u_speed'),
      u_wingAngle: gl.getUniformLocation(webglProgram, 'u_wingAngle')
    };

    const positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    const positions = new Float32Array([
      -1, -1,
       1, -1,
      -1,  1,
      -1,  1,
       1, -1,
       1,  1,
    ]);
    gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);

    gl.useProgram(webglProgram);
    gl.enableVertexAttribArray(positionAttributeLocation);
    gl.vertexAttribPointer(positionAttributeLocation, 2, gl.FLOAT, false, 0, 0);

    airflowCanvas.addEventListener('mousemove', (e) => {
      const rect = airflowCanvas.getBoundingClientRect();
      mousePos.x = (e.clientX - rect.left) * (airflowCanvas.width / rect.width);
      mousePos.y = (e.clientY - rect.top) * (airflowCanvas.height / rect.height);
    });
  }

  function createShader(gl, type, source) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      gl.deleteShader(shader);
      return null;
    }
    return shader;
  }

  function setupAeroControls() {
    const speedToggleBtn = document.getElementById('speed-toggle-btn');
    const speedValDisplay = document.getElementById('speed-val-display');
    const wingAngleBtn = document.getElementById('wing-angle-btn');
    const wingAngleDisplay = document.getElementById('wing-angle-display');
    const metricDownforce = document.getElementById('metric-downforce');

    if (speedToggleBtn) {
      speedToggleBtn.addEventListener('click', () => {
        if (state.speedMph === 160) {
          state.speedMph = 180;
          if (speedValDisplay) speedValDisplay.textContent = '180 MPH';
          if (metricDownforce) metricDownforce.textContent = '290 KG';
        } else if (state.speedMph === 180) {
          state.speedMph = 198;
          if (speedValDisplay) speedValDisplay.textContent = '198 MPH';
          if (metricDownforce) metricDownforce.textContent = '385 KG';
        } else {
          state.speedMph = 160;
          if (speedValDisplay) speedValDisplay.textContent = '160 MPH';
          if (metricDownforce) metricDownforce.textContent = '220 KG';
        }
      });
    }

    if (wingAngleBtn) {
      wingAngleBtn.addEventListener('click', () => {
        if (state.wingAngle === 6) {
          state.wingAngle = 10;
          if (wingAngleDisplay) wingAngleDisplay.textContent = 'SPORT (+10°)';
        } else if (state.wingAngle === 10) {
          state.wingAngle = 14;
          if (wingAngleDisplay) wingAngleDisplay.textContent = 'TRACK MAX (+14°)';
        } else {
          state.wingAngle = 6;
          if (wingAngleDisplay) wingAngleDisplay.textContent = 'STREET (+6°)';
        }
      });
    }
  }

  function resizeCanvas() {
    if (!canvas) return;
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    if (airflowCanvas) {
      airflowCanvas.width = airflowCanvas.parentElement.clientWidth;
      airflowCanvas.height = airflowCanvas.parentElement.clientHeight;
    }
    if (audioCanvas) {
      audioCanvas.width = audioCanvas.parentElement.clientWidth;
      audioCanvas.height = 160;
    }
  }

  // ==========================================================================
  // 02. PASSIVE SCROLL & GLOBAL PROGRESS LERP ENGINE
  // ==========================================================================
  function updateScrollTarget() {
    const fullScrollableHeight = document.documentElement.scrollHeight - window.innerHeight;

    if (fullScrollableHeight > 0) {
      const scrollPos = lenis ? lenis.scroll : window.scrollY;
      state.targetProgress = Math.max(0, Math.min(1, scrollPos / fullScrollableHeight));
    }
  }

  let isAirflowVisible = false;
  let isTachoVisible = false;
  let isAudioSpectrumVisible = false;

  function setupSectionVisibilityGating() {
    const aeroSec = document.getElementById('aero');
    const engineSec = document.getElementById('engine');
    const acousticsSec = document.getElementById('acoustics');

    if (typeof IntersectionObserver !== 'undefined') {
      const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.target === aeroSec) isAirflowVisible = entry.isIntersecting;
          if (entry.target === engineSec) isTachoVisible = entry.isIntersecting;
          if (entry.target === acousticsSec) isAudioSpectrumVisible = entry.isIntersecting;
        });
      }, { threshold: 0.05 });

      if (aeroSec) observer.observe(aeroSec);
      if (engineSec) observer.observe(engineSec);
      if (acousticsSec) observer.observe(acousticsSec);
    } else {
      isAirflowVisible = true;
      isTachoVisible = true;
      isAudioSpectrumVisible = true;
    }
  }

  function renderLoop(timestamp) {
    const delta = timestamp - state.lastFrameTime;
    state.frameCount++;
    if (delta >= 1000) {
      state.currentFps = Math.round((state.frameCount * 1000) / delta);
      if (fpsDisplay) fpsDisplay.textContent = state.currentFps;
      state.frameCount = 0;
      state.lastFrameTime = timestamp;
    }

    if (!state.isReducedMotion) {
      state.progress += (state.targetProgress - state.progress) * 0.085;
      if (Math.abs(state.targetProgress - state.progress) < 0.0001) {
        state.progress = state.targetProgress;
      }
    } else {
      state.progress = state.targetProgress;
    }

    renderCanvasFrame();
    if (isAirflowVisible) renderAirflowCanvas();
    if (isTachoVisible) renderTachometer();
    if (isAudioSpectrumVisible) renderAudioSpectrum();

    requestAnimationFrame(renderLoop);
  }

  let lastRenderedFrame = -1;
  function renderCanvasFrame() {
    if (!canvas || !ctx) return;

    // Do not render main canvas frames while welcome intro loader is active
    const introOverlay = document.getElementById('gt3-intro-overlay');
    if (introOverlay && !introOverlay.classList.contains('gt3-intro-hidden')) {
      return;
    }

    const frameIndex = Math.min(
      CONFIG.TOTAL_FRAMES - 1,
      Math.max(0, Math.floor(state.progress * (CONFIG.TOTAL_FRAMES - 1)))
    );

    // Skip redundant canvas redraws when stationary to eliminate GPU/CPU lag
    if (frameIndex === lastRenderedFrame && Math.abs(state.targetProgress - state.progress) < 0.0001) {
      return;
    }
    lastRenderedFrame = frameIndex;

    const targetTime = state.progress * CONFIG.VIDEO_DURATION;
    const imgFrame = loadedFrames[frameIndex];

    const cWidth = canvas.width;
    const cHeight = canvas.height;

    ctx.clearRect(0, 0, cWidth, cHeight);

    if (imgFrame && imgFrame.complete && imgFrame.naturalWidth > 0) {
      drawScaledAsset(imgFrame, imgFrame.naturalWidth, imgFrame.naturalHeight, cWidth, cHeight);
    } else if (loadedFrames[0] && loadedFrames[0].complete && loadedFrames[0].naturalWidth > 0) {
      drawScaledAsset(loadedFrames[0], loadedFrames[0].naturalWidth, loadedFrames[0].naturalHeight, cWidth, cHeight);
    } else if (video && video.readyState >= 2) {
      if (Math.abs(video.currentTime - targetTime) > 0.01) {
        video.currentTime = targetTime;
      }
      drawScaledAsset(video, video.videoWidth || 1280, video.videoHeight || 720, cWidth, cHeight);
    }

    updateHUD(targetTime, frameIndex + 1);
  }

  function drawScaledAsset(drawable, vWidth, vHeight, cWidth, cHeight) {
    if (vWidth <= 0 || vHeight <= 0) return;
    const vRatio = vWidth / vHeight;
    const cRatio = cWidth / cHeight;
    let drawW, drawH, drawX, drawY;

    if (cRatio > vRatio) {
      drawW = cWidth;
      drawH = cWidth / vRatio;
      drawX = 0;
      drawY = (cHeight - drawH) / 2;
    } else {
      drawH = cHeight;
      drawW = cHeight * vRatio;
      drawX = (cWidth - drawW) / 2;
      drawY = 0;
    }

    ctx.drawImage(drawable, drawX, drawY, drawW, drawH);
  }

  function updateHUD(currentTime, frameNum) {
    const seconds = Math.floor(currentTime);
    const millis = Math.floor((currentTime % 1) * 100);

    const timeString = `TIMECODE ${seconds < 10 ? '0' : ''}${seconds}:${millis < 10 ? '0' : ''}${millis}`;
    const frameString = `SCROLL STEP ${frameNum < 100 ? (frameNum < 10 ? '00' : '0') : ''}${frameNum} / ${CONFIG.TOTAL_FRAMES}`;
    const percentVal = (state.progress * 100).toFixed(1);

    if (hudTimestamp) hudTimestamp.textContent = timeString;
    if (hudFrame) hudFrame.textContent = frameString;
    if (hudGaugeFill) hudGaugeFill.style.width = `${percentVal}%`;
    if (hudSpeedVal) hudSpeedVal.textContent = `${percentVal} %`;
    if (heroProgressFill) heroProgressFill.style.width = `${percentVal}%`;

    if (hudCamera) {
      if (state.progress < 0.25) {
        hudCamera.textContent = 'CAMERA: FRONT TRACK VIEW';
      } else if (state.progress < 0.55) {
        hudCamera.textContent = 'CAMERA: SIDE PROFILE SPEED';
      } else if (state.progress < 0.80) {
        hudCamera.textContent = 'CAMERA: REAR QUARTER VIEW';
      } else {
        hudCamera.textContent = 'CAMERA: REAR WING EXTREME';
      }
    }
  }

  // ==========================================================================
  // 03. SPLIT-SIDE REVEAL MOTION ENGINE & HERO BADGE STAGGER
  // ==========================================================================
  function setupGSAPStaggeredCardReveals() {
    if (window.gsap && window.ScrollTrigger) {
      gsap.registerPlugin(ScrollTrigger);

      // Hero Pill Badges Sequential Stagger Reveal
      const heroBadges = document.querySelectorAll('.hero-badge-group .pill-badge');
      if (heroBadges.length > 0) {
        gsap.fromTo(heroBadges,
          { opacity: 0, y: -20, scale: 0.85 },
          {
            scrollTrigger: {
              trigger: '.hero-badge-group',
              start: 'top 92%',
              end: 'bottom 8%',
              toggleActions: 'play reverse play reverse'
            },
            opacity: 1,
            y: 0,
            scale: 1,
            duration: 0.65,
            stagger: 0.12,
            ease: 'back.out(1.6)'
          }
        );
      }

      const textHeadings = document.querySelectorAll('.type-headline, .type-display, .type-eyebrow, .section-heading-editorial .type-body');
      textHeadings.forEach(heading => {
        gsap.fromTo(heading,
          { opacity: 0, y: 35 },
          {
            scrollTrigger: {
              trigger: heading,
              start: 'top 88%',
              end: 'bottom 12%',
              toggleActions: 'play reverse play reverse'
            },
            opacity: 1,
            y: 0,
            duration: 0.70,
            ease: 'power2.out'
          }
        );
      });

      gsap.fromTo('#hero-card', 
        { opacity: 0, y: 50 },
        {
          scrollTrigger: { trigger: '#hero-card', start: 'top 88%', end: 'bottom 12%', toggleActions: 'play reverse play reverse' },
          opacity: 1, y: 0, duration: 0.80, ease: 'power2.out'
        }
      );

      const aeroMainCard = document.querySelector('.aero-card-main');
      const aeroSecondaryCards = document.querySelectorAll('.aero-card-secondary');

      if (aeroMainCard) {
        gsap.fromTo(aeroMainCard,
          { opacity: 0, x: -60 },
          {
            scrollTrigger: {
              trigger: '.asymmetric-grid-aero',
              start: 'top 88%',
              end: 'bottom 12%',
              toggleActions: 'play reverse play reverse'
            },
            opacity: 1,
            x: 0,
            duration: 0.85,
            ease: 'power2.out'
          }
        );
      }

      if (aeroSecondaryCards.length > 0) {
        gsap.fromTo(aeroSecondaryCards,
          { opacity: 0, x: 60 },
          {
            scrollTrigger: {
              trigger: '.asymmetric-grid-aero',
              start: 'top 88%',
              end: 'bottom 12%',
              toggleActions: 'play reverse play reverse'
            },
            opacity: 1,
            x: 0,
            duration: 0.85,
            stagger: 0.20,
            ease: 'power2.out'
          }
        );
      }

      const tachoCol = document.querySelector('.tachometer-column');
      const engineStatCards = document.querySelectorAll('.stat-item-card');

      if (tachoCol) {
        gsap.fromTo(tachoCol,
          { opacity: 0, x: -60 },
          {
            scrollTrigger: {
              trigger: '.engine-editorial-grid',
              start: 'top 88%',
              end: 'bottom 12%',
              toggleActions: 'play reverse play reverse'
            },
            opacity: 1,
            x: 0,
            duration: 0.80,
            ease: 'power2.out'
          }
        );
      }

      if (engineStatCards.length > 0) {
        gsap.fromTo(engineStatCards,
          { opacity: 0, x: 60 },
          {
            scrollTrigger: {
              trigger: '.editorial-stat-blocks',
              start: 'top 88%',
              end: 'bottom 12%',
              toggleActions: 'play reverse play reverse'
            },
            opacity: 1,
            x: 0,
            duration: 0.75,
            stagger: 0.18,
            ease: 'power2.out'
          }
        );
      }

      const timelinePanels = document.querySelectorAll('.experience-panels-grid .timeline-panel');
      if (timelinePanels.length > 0) {
        gsap.fromTo(timelinePanels,
          { opacity: 0, y: 50 },
          {
            scrollTrigger: {
              trigger: '.experience-panels-grid',
              start: 'top 88%',
              end: 'bottom 12%',
              toggleActions: 'play reverse play reverse'
            },
            opacity: 1,
            y: 0,
            duration: 0.75,
            stagger: 0.20,
            ease: 'power2.out'
          }
        );
      }

      const hotspotStage = document.querySelector('.hotspot-diagram-wrapper');
      const hotspotCard = document.querySelector('.hotspot-info-card');

      if (hotspotStage) {
        gsap.fromTo(hotspotStage,
          { opacity: 0, x: -60 },
          {
            scrollTrigger: {
              trigger: '.hotspot-stage',
              start: 'top 88%',
              end: 'bottom 12%',
              toggleActions: 'play reverse play reverse'
            },
            opacity: 1,
            x: 0,
            duration: 0.80,
            ease: 'power2.out'
          }
        );
      }

      if (hotspotCard) {
        gsap.fromTo(hotspotCard,
          { opacity: 0, x: 60 },
          {
            scrollTrigger: {
              trigger: '.hotspot-stage',
              start: 'top 88%',
              end: 'bottom 12%',
              toggleActions: 'play reverse play reverse'
            },
            opacity: 1,
            x: 0,
            duration: 0.80,
            ease: 'power2.out'
          }
        );
      }

      gsap.fromTo('.audio-stage',
        { opacity: 0, y: 50 },
        {
          scrollTrigger: { trigger: '.audio-stage', start: 'top 88%', end: 'bottom 12%', toggleActions: 'play reverse play reverse' },
          opacity: 1, y: 0, duration: 0.80, ease: 'power2.out'
        }
      );

      gsap.fromTo('.cta-editorial-card',
        { opacity: 0, y: 50 },
        {
          scrollTrigger: { trigger: '.cta-editorial-card', start: 'top 88%', end: 'bottom 12%', toggleActions: 'play reverse play reverse' },
          opacity: 1, y: 0, duration: 0.80, ease: 'power2.out'
        }
      );
    }
  }

  // ==========================================================================
  // HOVER RE-TRIGGER ENGINE & INTERACTIVE PILL BADGE SPRINGS
  // ==========================================================================
  function setupHoverRepeatAnimations() {
    const hoverCards = document.querySelectorAll(
      '.glass-panel, .stat-item-card, .timeline-panel, .aero-card-main, .aero-card-secondary, .hotspot-info-card, .gearbox-selector-card, .xai-optimizer-panel, .xai-result-card'
    );

    hoverCards.forEach(card => {
      card.addEventListener('mouseenter', () => {
        if (window.gsap) {
          gsap.to(card, {
            y: -6,
            borderColor: 'rgba(255, 30, 39, 0.75)',
            boxShadow: '0 24px 60px rgba(0, 0, 0, 0.85), 0 0 30px rgba(255, 30, 39, 0.45)',
            duration: 0.3,
            ease: 'power2.out',
            overwrite: 'auto'
          });

          const statNums = card.querySelectorAll('.huge-stat-num, .stat-num-sm, .metric-num-lg, .stat-number-hero, .res-val, .res-val-lg');
          if (statNums.length > 0) {
            gsap.fromTo(statNums,
              { color: '#FF1E27' },
              { color: '#FFFFFF', duration: 0.35, stagger: 0.04, ease: 'power2.out', overwrite: 'auto' }
            );
          }
        }
      });

      card.addEventListener('mouseleave', () => {
        if (window.gsap) {
          gsap.to(card, {
            y: 0,
            borderColor: 'rgba(255, 255, 255, 0.18)',
            boxShadow: '0 20px 50px rgba(0, 0, 0, 0.55), inset 0 1px 1px rgba(255, 255, 255, 0.25)',
            duration: 0.3,
            ease: 'power2.out',
            overwrite: 'auto'
          });
        }
      });
    });

    const pillBadges = document.querySelectorAll('.pill-badge');
    pillBadges.forEach(badge => {
      badge.addEventListener('mouseenter', () => {
        if (window.gsap) {
          gsap.to(badge, {
            scale: 1.08,
            y: -3,
            borderColor: '#FF1E27',
            boxShadow: '0 0 20px rgba(255, 30, 39, 0.6)',
            duration: 0.25,
            ease: 'back.out(1.8)',
            overwrite: 'auto'
          });
        }
      });

      badge.addEventListener('mouseleave', () => {
        if (window.gsap) {
          gsap.to(badge, {
            scale: 1.0,
            y: 0,
            borderColor: 'rgba(255, 255, 255, 0.25)',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.2)',
            duration: 0.3,
            ease: 'power2.out',
            overwrite: 'auto'
          });
        }
      });
    });
  }

  // ==========================================================================
  // WORD-BY-WORD MASKED TEXT REVEAL SYSTEM & STAGGERED BULLET REVEALS
  // ==========================================================================
  function triggerWordRevealAnimation(targetParagraph, baseDelay = 0) {
    if (!targetParagraph) return;

    const redBullet = targetParagraph.querySelector('.red-bullet');
    const bulletHtml = redBullet ? redBullet.outerHTML + ' ' : '';

    const clone = targetParagraph.cloneNode(true);
    const bulletInClone = clone.querySelector('.red-bullet');
    if (bulletInClone) bulletInClone.remove();

    const rawText = clone.textContent.trim();
    if (!rawText) return;

    const words = rawText.split(/\s+/);
    const wordsHtml = words.map((word, index) => {
      const isHeaderWord = index <= 4 && (word.includes(':') || word.includes('PDK') || word.includes('7-Speed') || word.includes('6-Speed') || word.includes('Manual') || word.includes('Dual-Clutch'));
      const extraStyle = isHeaderWord ? 'font-weight: 700; color: #FFFFFF;' : '';
      const calcDelay = baseDelay + (index * 35);
      return `<span class="reveal-word-wrapper"><span class="reveal-word" style="transition-delay: ${calcDelay}ms; ${extraStyle}">${word}</span></span>`;
    }).join(' ');

    targetParagraph.innerHTML = bulletHtml + wordsHtml;

    setTimeout(() => {
      const wordWrappers = targetParagraph.querySelectorAll('.reveal-word-wrapper');
      wordWrappers.forEach(wrapper => wrapper.classList.add('is-revealed'));
    }, 20);
  }

  function setupWordByWordTextReveal() {
    const targetParagraphs = document.querySelectorAll(
      '#aero-reveal-paragraph, #cta-reveal-paragraph, #gearbox-reveal-paragraph, #hood-vents-reveal-paragraph, #spot-desc, .timeline-panel p, .stat-num-sm.reveal-words-target, .stat-lbl-sm.reveal-words-target, .reveal-words-target:not(li)'
    );

    targetParagraphs.forEach(targetParagraph => {
      const isTimelinePanel = targetParagraph.closest('.timeline-panel');
      let baseDelay = 0;
      if (isTimelinePanel) {
        const panels = Array.from(document.querySelectorAll('.timeline-panel'));
        const panelIdx = panels.indexOf(isTimelinePanel);
        const isStatNum = targetParagraph.classList.contains('stat-num-sm');
        const isStatLbl = targetParagraph.classList.contains('stat-lbl-sm');
        const subOffset = isStatLbl ? 200 : isStatNum ? 120 : 0;
        if (panelIdx >= 0) baseDelay = (panelIdx * 160) + subOffset;
      }

      triggerWordRevealAnimation(targetParagraph, baseDelay);

      const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            const wordWrappers = entry.target.querySelectorAll('.reveal-word-wrapper');
            wordWrappers.forEach(wrapper => wrapper.classList.add('is-revealed'));
          } else {
            const wordWrappers = entry.target.querySelectorAll('.reveal-word-wrapper');
            wordWrappers.forEach(wrapper => wrapper.classList.remove('is-revealed'));
          }
        });
      }, { threshold: 0.2 });

      observer.observe(targetParagraph);
    });

    // SEQUENTIAL STAGGERED REVEAL FOR SPEC BULLET POINTS
    const specBullets = document.querySelectorAll('.spec-check-list li');
    specBullets.forEach((bullet, bulletIdx) => {
      const bulletBaseDelay = bulletIdx * 180; // 180ms staggered offset between bullets
      triggerWordRevealAnimation(bullet, bulletBaseDelay);

      const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            const wordWrappers = entry.target.querySelectorAll('.reveal-word-wrapper');
            wordWrappers.forEach(wrapper => wrapper.classList.add('is-revealed'));
          } else {
            const wordWrappers = entry.target.querySelectorAll('.reveal-word-wrapper');
            wordWrappers.forEach(wrapper => wrapper.classList.remove('is-revealed'));
          }
        });
      }, { threshold: 0.2 });

      observer.observe(bullet);
    });
  }

  function setupScrollRevealObserver() {
    const revealElements = document.querySelectorAll(
      '.glass-panel, .stat-item-card, .timeline-panel, .aero-card-main, .aero-card-secondary, .hotspot-info-card, .audio-stage, .cta-editorial-card, .reveal-text-left, .reveal-text-top, .reveal-card-left, .reveal-card-right, .reveal-card-up, .reveal-card-top, .xai-optimizer-panel'
    );

    const revealObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-revealed');
        } else {
          entry.target.classList.remove('is-revealed');
        }
      });
    }, {
      root: null,
      threshold: 0.08
    });

    revealElements.forEach(el => revealObserver.observe(el));
  }

  // ==========================================================================
  // ANIMATED NUMERIC COUNT-UP & REVEAL ENGINE
  // ==========================================================================
  function setupNumberRevealAnimations() {
    const numElements = document.querySelectorAll(
      '.huge-stat-num, .stat-number-hero, .tacho-rpm, .stat-num-sm'
    );

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('number-revealed');
          animateSingleNumberCountUp(entry.target);
        } else {
          entry.target.classList.remove('number-revealed');
        }
      });
    }, { threshold: 0.15 });

    numElements.forEach(el => observer.observe(el));
  }

  function animateSingleNumberCountUp(el) {
    if (el.dataset.animating === 'true') return;
    el.dataset.animating = 'true';

    const originalText = el.getAttribute('data-original-val') || el.textContent.trim();
    if (!el.getAttribute('data-original-val')) {
      el.setAttribute('data-original-val', originalText);
    }

    const match = originalText.match(/([-+]?\d*[\.,]?\d+)/);
    if (!match) {
      el.dataset.animating = 'false';
      return;
    }

    const rawNumStr = match[0].replace(',', '');
    const targetVal = parseFloat(rawNumStr);
    const isFloat = rawNumStr.includes('.');
    const decimals = isFloat ? (rawNumStr.split('.')[1] || '').length : 0;
    const prefix = originalText.substring(0, match.index);
    const suffix = originalText.substring(match.index + match[0].length);

    const duration = 1200;
    const startTime = performance.now();

    function updateCount(currentTime) {
      const elapsed = currentTime - startTime;
      const progress = Math.min(1, elapsed / duration);
      const easedProgress = 1 - Math.pow(1 - progress, 3);
      const currentVal = targetVal * easedProgress;

      let formattedVal = isFloat
        ? currentVal.toFixed(decimals)
        : Math.round(currentVal).toLocaleString('en-US');

      el.textContent = `${prefix}${formattedVal}${suffix}`;

      if (progress < 1) {
        requestAnimationFrame(updateCount);
      } else {
        el.textContent = originalText;
        el.dataset.animating = 'false';
      }
    }

    requestAnimationFrame(updateCount);
  }

  function setupMobileMenu() {
    if (mobileMenuToggle && mobileNavOverlay) {
      mobileMenuToggle.addEventListener('click', () => {
        const isOpen = mobileNavOverlay.classList.contains('open');
        if (isOpen) {
          mobileNavOverlay.classList.remove('open');
          mobileMenuToggle.setAttribute('aria-expanded', 'false');
        } else {
          mobileNavOverlay.classList.add('open');
          mobileMenuToggle.setAttribute('aria-expanded', 'true');
        }
      });
    }
  }

  function setupSectionObserver() {
    const observerOptions = {
      root: null,
      rootMargin: '-20% 0px -40% 0px',
      threshold: 0
    };

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const id = entry.target.getAttribute('id');
          state.activeSectionId = id;
          updateActiveNavLink(id);
        }
      });
    }, observerOptions);

    sections.forEach(section => observer.observe(section));
  }

  function setupFooterObserver() {
    const footer = document.querySelector('.site-footer');
    if (!footer) return;

    const observerOptions = {
      root: null,
      threshold: 0.05
    };

    const footerObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          if (telemetryHudOverlay) telemetryHudOverlay.classList.add('hide-hud');
        }
      });
    }, observerOptions);

    footerObserver.observe(footer);
  }

  function playModeSwitchSFX(mode) {
    // Sound disabled for drive mode buttons (STREET, SPORT, TRACK) per user request
    return;
  }

  function setupDriveModePicker() {
    const modeBtns = document.querySelectorAll('.mode-btn');
    const heroHpVal = document.getElementById('hero-hp-val');
    const heroRpmVal = document.getElementById('hero-rpm-val');
    const heroAccVal = document.getElementById('hero-acc-val');
    const inlineModeIcon = document.getElementById('inline-mode-icon');
    const inlineModeText = document.getElementById('inline-mode-text');
    const inlineModeBadge = document.getElementById('inline-mode-badge');
    const heroCard = document.getElementById('hero-card');

    modeBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        modeBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        const mode = btn.getAttribute('data-mode');
        state.driveMode = mode;

        // Sound disabled for drive mode buttons (STREET, SPORT, TRACK) per user request

        if (mode === 'street') {
          if (heroHpVal) heroHpVal.textContent = '502 HP';
          if (heroRpmVal) heroRpmVal.textContent = '9,000';
          if (heroAccVal) heroAccVal.textContent = '3.2s';
          if (inlineModeText) inlineModeText.textContent = 'PASM COMFORT • 160 MPH';
          if (inlineModeIcon) {
            inlineModeIcon.innerHTML = `
              <circle cx="12" cy="12" r="9" stroke="#E2E8F0"/>
              <path d="M12 12L12 3M12 12L5 16M12 12L19 16" stroke="#FF1E27"/>
            `;
          }
          if (inlineModeBadge) {
            inlineModeBadge.style.borderColor = 'rgba(255, 255, 255, 0.25)';
            inlineModeBadge.style.boxShadow = '0 4px 16px rgba(0, 0, 0, 0.4)';
          }
          state.speedMph = 160;
          state.wingAngle = 6;

          if (heroCard && window.gsap) {
            gsap.to(heroCard, {
              boxShadow: '0 20px 50px rgba(0, 0, 0, 0.55), inset 0 1px 1px rgba(255, 255, 255, 0.25)',
              borderColor: 'rgba(255, 255, 255, 0.18)',
              duration: 0.5
            });
          }
        } else if (mode === 'sport') {
          if (heroHpVal) heroHpVal.textContent = '502 HP';
          if (heroRpmVal) heroRpmVal.textContent = '9,000';
          if (heroAccVal) heroAccVal.textContent = '3.2s';
          if (inlineModeText) inlineModeText.textContent = 'SPORT SUSPENSION • 180 MPH';
          if (inlineModeIcon) {
            inlineModeIcon.innerHTML = `
              <path d="M12 3V21M7 7L17 17M17 7L7 17" stroke="#FF1E27" stroke-width="2"/>
            `;
          }
          if (inlineModeBadge) {
            inlineModeBadge.style.borderColor = 'rgba(255, 30, 39, 0.6)';
            inlineModeBadge.style.boxShadow = '0 0 14px rgba(255, 30, 39, 0.4)';
          }
          state.speedMph = 180;
          state.wingAngle = 10;

          if (heroCard && window.gsap) {
            gsap.to(heroCard, {
              boxShadow: '0 28px 70px rgba(0, 0, 0, 0.75), 0 0 35px rgba(255, 30, 39, 0.35)',
              borderColor: 'rgba(255, 30, 39, 0.55)',
              duration: 0.5
            });
          }
        } else if (mode === 'track') {
          if (heroHpVal) heroHpVal.textContent = '502 HP';
          if (heroRpmVal) heroRpmVal.textContent = '9,000';
          if (heroAccVal) heroAccVal.textContent = '3.2s';
          if (inlineModeText) inlineModeText.textContent = '385KG DOWNFORCE • 198 MPH';
          if (inlineModeIcon) {
            inlineModeIcon.innerHTML = `
              <path d="M3 17L12 5L21 17H3Z" fill="#FF1E27" stroke="#FF1E27"/>
            `;
          }
          if (inlineModeBadge) {
            inlineModeBadge.style.borderColor = '#FF1E27';
            inlineModeBadge.style.boxShadow = '0 0 20px rgba(255, 30, 39, 0.75)';
          }
          state.speedMph = 198;
          state.wingAngle = 14;

          if (heroCard && window.gsap) {
            gsap.to(heroCard, {
              boxShadow: '0 32px 90px rgba(0, 0, 0, 0.9), 0 0 50px rgba(255, 30, 39, 0.75)',
              borderColor: '#FF1E27',
              duration: 0.5
            });
          }
        }

        const stats = document.querySelectorAll('.stat-number-hero');
        if (window.gsap && stats.length > 0) {
          gsap.fromTo(stats, 
            { color: '#FF1E27' }, 
            { color: '#FFFFFF', duration: 0.4, stagger: 0.08, ease: 'power2.out' }
          );
        }

        if (window.gsap && inlineModeBadge) {
          gsap.fromTo(inlineModeBadge,
            { opacity: 0.5 },
            { opacity: 1.0, duration: 0.35, ease: 'power2.out' }
          );
        }
      });
    });
  }

  function setupPaintColorPicker() {
    const swatchBtns = document.querySelectorAll('.swatch-btn');
    const heroColorAccent = document.getElementById('hero-color-accent');
    const extColorSelect = document.getElementById('exterior-color');
    const eyebrows = document.querySelectorAll('.type-eyebrow, .nav-num');
    const heroProgressFill = document.querySelector('.hero-progress-fill');

    swatchBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        swatchBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        const colorHex = btn.getAttribute('data-color');
        const colorName = btn.getAttribute('data-name');
        state.currentColor = colorHex;

        // 1. Update Hero Headline Accent Font Color ("UNFILTERED ADRENALINE")
        if (heroColorAccent) {
          if (window.gsap) {
            gsap.to(heroColorAccent, {
              color: colorHex,
              textShadow: `0 0 35px ${colorHex}CC, 0 2px 14px rgba(0, 0, 0, 0.95)`,
              duration: 0.5,
              ease: 'power2.out'
            });
          } else {
            heroColorAccent.style.color = colorHex;
            heroColorAccent.style.textShadow = `0 0 35px ${colorHex}CC, 0 2px 14px rgba(0, 0, 0, 0.95)`;
          }
        }

        // 2. Update Section Eyebrow Headings & Nav Numbers Font Colors
        eyebrows.forEach(el => {
          if (window.gsap) {
            gsap.to(el, { color: colorHex, duration: 0.5, ease: 'power2.out' });
          } else {
            el.style.color = colorHex;
          }
        });

        // 3. Update Primary CTA Button & Mode Button Accent Colors
        const primaryBtns = document.querySelectorAll('.btn-primary');
        primaryBtns.forEach(pBtn => {
          if (window.gsap) {
            gsap.to(pBtn, { backgroundColor: colorHex, borderColor: colorHex, duration: 0.4 });
          } else {
            pBtn.style.backgroundColor = colorHex;
            pBtn.style.borderColor = colorHex;
          }
        });

        if (heroProgressFill) {
          heroProgressFill.style.backgroundColor = colorHex;
          heroProgressFill.style.boxShadow = `0 0 10px ${colorHex}`;
        }

        if (extColorSelect) {
          for (let option of extColorSelect.options) {
            if (option.value.includes(colorName)) {
              extColorSelect.value = option.value;
              break;
            }
          }
        }
      });
    });
  }



  function updateActiveNavLink(activeId) {
    navLinks.forEach(link => {
      const href = link.getAttribute('href');
      if (href === `#${activeId}`) {
        link.classList.add('active');
      } else if (href && href.startsWith('#')) {
        link.classList.remove('active');
      }
    });
  }

  function setupNavClickHandlers() {
    navLinks.forEach(link => {
      link.addEventListener('click', (e) => {
        const href = link.getAttribute('href');
        if (href && href.startsWith('#')) {
          e.preventDefault();
          if (mobileNavOverlay) mobileNavOverlay.classList.remove('open');
          const targetSection = document.querySelector(href);
          if (targetSection) {
            if (lenis) {
              lenis.scrollTo(targetSection, { offset: -60, duration: 1.5 });
            } else {
              const offset = 60;
              const targetTop = targetSection.getBoundingClientRect().top + window.scrollY - offset;
              window.scrollTo({
                top: targetTop,
                behavior: 'smooth'
              });
            }
          }
        }
      });
    });

    if (replayBtn) {
      replayBtn.addEventListener('click', () => {
        if (lenis) lenis.scrollTo(0, { duration: 1.8 });
        else window.scrollTo({ top: 0, behavior: 'smooth' });
      });
    }
  }

  function setupExhaustToggle() {
    const exBtns = document.querySelectorAll('.exhaust-mode-btn');
    exBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        exBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        state.exhaustMode = btn.getAttribute('data-exhaust');

        if (state.exhaustMode === 'track') {
          playBackfirePopSFX();
        }
      });
    });
  }

  function playBackfirePopSFX() {
    initAudio();
    if (!state.audioCtx) return;
    if (state.audioCtx.state === 'suspended') state.audioCtx.resume();

    [0, 0.10].forEach(delay => {
      const osc = state.audioCtx.createOscillator();
      const gain = state.audioCtx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(140, state.audioCtx.currentTime + delay);
      osc.frequency.exponentialRampToValueAtTime(35, state.audioCtx.currentTime + delay + 0.08);

      gain.gain.setValueAtTime(0.4, state.audioCtx.currentTime + delay);
      gain.gain.exponentialRampToValueAtTime(0.001, state.audioCtx.currentTime + delay + 0.09);

      osc.connect(gain);
      gain.connect(state.audioCtx.destination);

      osc.start(state.audioCtx.currentTime + delay);
      osc.stop(state.audioCtx.currentTime + delay + 0.1);
    });
  }

  // ==========================================================================
  // RENDER AIRFLOW CANVAS ENGINE (WEBGL CFD SHADER WITH 2D CANVAS FALLBACK)
  // ==========================================================================
  let particleOffset = 0;
  function renderAirflowCanvas() {
    if (!airflowCanvas || state.activeSectionId !== 'aero') return;

    if (gl && webglProgram) {
      gl.viewport(0, 0, airflowCanvas.width, airflowCanvas.height);
      gl.useProgram(webglProgram);

      gl.uniform2f(shaderUniforms.u_resolution, airflowCanvas.width, airflowCanvas.height);
      gl.uniform1f(shaderUniforms.u_time, performance.now() * 0.001);
      gl.uniform2f(shaderUniforms.u_mouse, mousePos.x, mousePos.y);
      gl.uniform1f(shaderUniforms.u_speed, state.speedMph);
      gl.uniform1f(shaderUniforms.u_wingAngle, state.wingAngle);

      gl.drawArrays(gl.TRIANGLES, 0, 6);
    } else if (airflowCtx) {
      // Clean 2D Fallback
      const w = airflowCanvas.width;
      const h = airflowCanvas.height;

      airflowCtx.clearRect(0, 0, w, h);

      airflowCtx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
      airflowCtx.lineWidth = 1;
      for (let x = 0; x < w; x += 40) {
        airflowCtx.beginPath();
        airflowCtx.moveTo(x, 0);
        airflowCtx.lineTo(x, h);
        airflowCtx.stroke();
      }

      particleOffset += state.speedMph * 0.05;
      if (particleOffset > 100) particleOffset = 0;

      const numLines = 8;
      for (let i = 0; i < numLines; i++) {
        const yBase = (h / (numLines + 1)) * (i + 1);
        airflowCtx.beginPath();
        airflowCtx.strokeStyle = i % 2 === 0 ? 'rgba(255, 30, 39, 0.65)' : 'rgba(255, 255, 255, 0.3)';
        airflowCtx.lineWidth = 2;

        for (let x = -50; x < w + 50; x += 20) {
          let yOffset = 0;
          if (x > w * 0.3 && x < w * 0.7) {
            const factor = Math.sin(((x - w * 0.3) / (w * 0.4)) * Math.PI);
            yOffset = -Math.sin(factor) * (40 + state.wingAngle * 2);
          }

          const px = x + (particleOffset % 20);
          const py = yBase + yOffset;

          if (x === -50) airflowCtx.moveTo(px, py);
          else airflowCtx.lineTo(px, py);
        }
        airflowCtx.stroke();
      }
    }
  }

  // ==========================================================================
  // TACHOMETER & FLAT-SIX PISTON FIRING ANIMATION
  // ==========================================================================
  function renderTachometer() {
    if (!tachoCanvas || !tachoCtx || (!isTachoVisible && state.activeSectionId !== 'engine')) return;
    const w = tachoCanvas.width;
    const h = tachoCanvas.height;
    const cx = w / 2;
    const cy = h / 2;
    const radius = 110;

    tachoCtx.clearRect(0, 0, w, h);

    if (!state.isReving) {
      state.revRpm += (1000 - state.revRpm) * 0.05;
    } else {
      state.revRpm += (9000 - state.revRpm) * 0.12;

      // Animate Flat-Six Cylinder Firing Nodes (1-6-2-4-3-5) when revving
      if (pistonNodes.length > 0 && Math.random() < (state.revRpm / 9000)) {
        state.firingIndex = (state.firingIndex + 1) % pistonNodes.length;
        pistonNodes.forEach((node, idx) => {
          if (idx === state.firingIndex) {
            node.classList.add('active');
          } else {
            node.classList.remove('active');
          }
        });
      }
    }

    if (tachoRpmVal) {
      tachoRpmVal.textContent = Math.round(state.revRpm).toLocaleString();
    }

    const startAngle = 0.75 * Math.PI;
    const endAngle = 2.25 * Math.PI;

    tachoCtx.beginPath();
    tachoCtx.arc(cx, cy, radius, startAngle, endAngle);
    tachoCtx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
    tachoCtx.lineWidth = 8;
    tachoCtx.stroke();

    const redlineStart = startAngle + (8000 / 9000) * 1.5 * Math.PI;
    tachoCtx.beginPath();
    tachoCtx.arc(cx, cy, radius, redlineStart, endAngle);
    tachoCtx.strokeStyle = 'rgba(255, 30, 39, 0.85)';
    tachoCtx.lineWidth = 10;
    tachoCtx.stroke();

    const rpmAngle = startAngle + (state.revRpm / 9000) * 1.5 * Math.PI;
    tachoCtx.beginPath();
    tachoCtx.arc(cx, cy, radius, startAngle, rpmAngle);
    tachoCtx.strokeStyle = state.revRpm > 8000 ? '#FF1E27' : '#FFFFFF';
    tachoCtx.lineWidth = 6;
    tachoCtx.stroke();

    for (let rpm = 0; rpm <= 9000; rpm += 1000) {
      const angle = startAngle + (rpm / 9000) * 1.5 * Math.PI;
      const x1 = cx + Math.cos(angle) * (radius - 12);
      const y1 = cy + Math.sin(angle) * (radius - 12);
      const x2 = cx + Math.cos(angle) * (radius - 4);
      const y2 = cy + Math.sin(angle) * (radius - 4);

      tachoCtx.beginPath();
      tachoCtx.moveTo(x1, y1);
      tachoCtx.lineTo(x2, y2);
      tachoCtx.strokeStyle = rpm >= 8000 ? '#FF1E27' : '#8b949e';
      tachoCtx.lineWidth = 2;
      tachoCtx.stroke();
    }

    tachoCtx.beginPath();
    tachoCtx.moveTo(cx, cy);
    const needleX = cx + Math.cos(rpmAngle) * (radius - 20);
    const needleY = cy + Math.sin(rpmAngle) * (radius - 20);
    tachoCtx.lineTo(needleX, needleY);
    tachoCtx.strokeStyle = '#FF1E27';
    tachoCtx.lineWidth = 3;
    tachoCtx.stroke();

    tachoCtx.beginPath();
    tachoCtx.arc(cx, cy, 10, 0, Math.PI * 2);
    tachoCtx.fillStyle = '#0d1117';
    tachoCtx.fill();
    tachoCtx.strokeStyle = '#FF1E27';
    tachoCtx.lineWidth = 2;
    tachoCtx.stroke();
  }

  // ==========================================================================
  // ACOUSTIC ENGINE SOUND SYNTHESIZER
  // ==========================================================================
  function initAudio() {
    if (!state.audioCtx) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      state.audioCtx = new AudioContext();
    }
  }

  function startAudioSynth() {
    initAudio();
    if (state.audioCtx.state === 'suspended') {
      state.audioCtx.resume();
    }

    if (state.isAudioPlaying) {
      stopAudioSynth();
      return;
    }

    state.oscillator = state.audioCtx.createOscillator();
    state.gainNode = state.audioCtx.createGain();
    state.filterNode = state.audioCtx.createBiquadFilter();

    state.oscillator.type = state.exhaustMode === 'track' ? 'sawtooth' : 'triangle';
    state.oscillator.frequency.setValueAtTime(150, state.audioCtx.currentTime);

    state.filterNode.type = 'lowpass';
    state.filterNode.frequency.setValueAtTime(state.exhaustMode === 'track' ? 1400 : 800, state.audioCtx.currentTime);

    state.gainNode.gain.setValueAtTime(0.2, state.audioCtx.currentTime);

    state.oscillator.connect(state.filterNode);
    state.filterNode.connect(state.gainNode);
    state.gainNode.connect(state.audioCtx.destination);

    state.oscillator.start();
    state.isAudioPlaying = true;

    if (soundBtnText) soundBtnText.textContent = 'STOP ENGINE SOUND';
    if (playSoundBtn) playSoundBtn.classList.add('active');
  }

  function stopAudioSynth() {
    if (state.oscillator) {
      state.oscillator.stop();
      state.oscillator.disconnect();
      state.oscillator = null;
    }
    state.isAudioPlaying = false;
    if (soundBtnText) soundBtnText.textContent = 'LISTEN TO ENGINE SOUND';
    if (playSoundBtn) playSoundBtn.classList.remove('active');
  }

  function renderAudioSpectrum() {
    if (!audioCanvas || !audioCtxCanvas || state.activeSectionId !== 'acoustics') return;
    const w = audioCanvas.width;
    const h = audioCanvas.height;

    audioCtxCanvas.clearRect(0, 0, w, h);

    const barWidth = 6;
    const gap = 4;
    const count = Math.floor(w / (barWidth + gap));

    for (let i = 0; i < count; i++) {
      let barHeight = 10;
      if (state.isAudioPlaying) {
        barHeight = Math.random() * (h - 20) + 10;
      } else {
        barHeight = Math.sin(i * 0.2 + performance.now() * 0.003) * 15 + 20;
      }

      const x = i * (barWidth + gap);
      const y = h - barHeight;

      audioCtxCanvas.fillStyle = i % 3 === 0 ? '#FF1E27' : 'rgba(255, 255, 255, 0.4)';
      audioCtxCanvas.fillRect(x, y, barWidth, barHeight);
    }

    const freqVal = document.getElementById('freq-val');
    if (freqVal && state.isAudioPlaying) {
      freqVal.textContent = `${Math.round(300 + Math.random() * 200)} Hz`;
    }
  }

  function setupHotspots() {
    hotspotBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        hotspotBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        const key = btn.getAttribute('data-spot');
        const data = hotspotData[key];

        if (data) {
          if (spotTag) spotTag.textContent = data.tag;
          if (spotTitle) spotTitle.textContent = data.title;
          if (spotDesc) {
            spotDesc.textContent = data.desc;
            triggerWordRevealAnimation(spotDesc, 0);
          }
          if (spotM1) spotM1.textContent = data.m1;
          if (spotL1) spotL1.textContent = data.l1;
          if (spotM2) spotM2.textContent = data.m2;
          if (spotL2) spotL2.textContent = data.l2;
        }
      });
    });
  }

  function setupModal() {
    const triggerBtns = document.querySelectorAll('[data-modal="config-modal"]');
    let isModalAnimating = false;
    let modalOpenTl = null;
    let modalCloseTl = null;

    function openModalAnimation() {
      if (!modalBackdrop || isModalAnimating) return;
      isModalAnimating = true;

      if (modalCloseTl) modalCloseTl.kill();
      if (modalOpenTl) modalOpenTl.kill();

      modalBackdrop.classList.add('open');

      const modalContainer = modalBackdrop.querySelector('.modal-container');
      const innerElements = modalBackdrop.querySelectorAll('.modal-header, .form-group, .btn-block');

      if (typeof gsap !== 'undefined') {
        modalOpenTl = gsap.timeline({
          onComplete: () => { isModalAnimating = false; }
        });

        // 1. Foundation: Backdrop Blur & Opacity Fade
        modalOpenTl.fromTo(modalBackdrop,
          { opacity: 0, backdropFilter: 'blur(0px)' },
          { opacity: 1, backdropFilter: 'blur(28px)', duration: 0.5, ease: 'power2.out' }
        );

        // Spring container reveal into place
        modalOpenTl.fromTo(modalContainer,
          { scale: 0.92, y: 30, filter: 'blur(15px)', opacity: 0 },
          { scale: 1.0, y: 0, filter: 'blur(0px)', opacity: 1, duration: 0.6, ease: 'back.out(1.4)' },
          '<=0.1'
        );

        // 2. Staggered Form Elements Reveal
        if (innerElements.length > 0) {
          modalOpenTl.fromTo(innerElements,
            { y: 20, opacity: 0 },
            { y: 0, opacity: 1, duration: 0.5, stagger: 0.08, ease: 'power3.out' },
            '-=0.3'
          );
        }
      } else {
        isModalAnimating = false;
      }
    }

    function closeModalAnimation(onCompleteCallback) {
      if (!modalBackdrop || !modalBackdrop.classList.contains('open') || isModalAnimating) return;
      isModalAnimating = true;

      if (modalOpenTl) modalOpenTl.kill();
      if (modalCloseTl) modalCloseTl.kill();

      const modalContainer = modalBackdrop.querySelector('.modal-container');

      if (typeof gsap !== 'undefined') {
        modalCloseTl = gsap.timeline({
          onComplete: () => {
            modalBackdrop.classList.remove('open');
            gsap.set([modalBackdrop, modalContainer], { clearProps: 'all' });
            isModalAnimating = false;
            if (onCompleteCallback) onCompleteCallback();
          }
        });

        // 3. Smooth Snappy Exit Transition
        modalCloseTl.to(modalContainer, {
          scale: 0.94,
          y: 20,
          filter: 'blur(10px)',
          opacity: 0,
          duration: 0.35,
          ease: 'power2.in'
        });

        modalCloseTl.to(modalBackdrop, {
          opacity: 0,
          backdropFilter: 'blur(0px)',
          duration: 0.35,
          ease: 'power2.in'
        }, '<=0.05');
      } else {
        modalBackdrop.classList.remove('open');
        isModalAnimating = false;
        if (onCompleteCallback) onCompleteCallback();
      }
    }

    triggerBtns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        openModalAnimation();
      });
    });

    if (modalCloseBtn) {
      modalCloseBtn.addEventListener('click', (e) => {
        e.preventDefault();
        closeModalAnimation();
      });
    }

    if (modalBackdrop) {
      modalBackdrop.addEventListener('click', (e) => {
        if (e.target === modalBackdrop) {
          closeModalAnimation();
        }
      });
    }

    if (configForm) {
      configForm.addEventListener('submit', (e) => {
        e.preventDefault();

        const paintSelect = document.getElementById('exterior-color');
        const transSelect = document.getElementById('transmission-choice');
        const pkgSelect = document.getElementById('package-choice');

        const paintVal = paintSelect ? paintSelect.value : 'Guards Red';
        const transVal = transSelect ? transSelect.value : '7-Speed PDK';
        const pkgVal = pkgSelect ? pkgSelect.value : 'Weissach Package';

        const summaryPaint = document.getElementById('summary-paint-val');
        const summaryTrans = document.getElementById('summary-trans-val');
        const summaryPkg = document.getElementById('summary-pkg-val');
        const summaryAlloc = document.getElementById('summary-alloc-id');

        if (summaryPaint) summaryPaint.textContent = paintVal;
        if (summaryTrans) summaryTrans.textContent = transVal;
        if (summaryPkg) summaryPkg.textContent = pkgVal;
        if (summaryAlloc) summaryAlloc.textContent = `#GT3-IN-2026-${Math.floor(1000 + Math.random() * 9000)}`;

        configForm.style.display = 'none';
        if (formSuccess) {
          formSuccess.style.display = 'flex';
          if (typeof gsap !== 'undefined') {
            gsap.fromTo(formSuccess, 
              { scale: 0.88, opacity: 0, y: 15 },
              { scale: 1.0, opacity: 1, y: 0, duration: 0.5, ease: 'back.out(1.4)' }
            );
          }
        }
      });
    }

    const doneBtn = document.getElementById('success-done-btn');
    if (doneBtn && modalBackdrop) {
      doneBtn.addEventListener('click', () => {
        closeModalAnimation(() => {
          if (configForm) configForm.style.display = 'block';
          if (formSuccess) formSuccess.style.display = 'none';
        });
      });
    }
  }

  function setupGearboxTabs() {
    const tabPdk = document.getElementById('tab-pdk');
    const tabManual = document.getElementById('tab-manual');
    const gearboxDesc = document.getElementById('gearbox-desc');

    if (tabPdk && tabManual) {
      tabPdk.addEventListener('click', () => {
        tabPdk.classList.add('active');
        tabManual.classList.remove('active');
        if (gearboxDesc) {
          gearboxDesc.innerHTML = `<p id="gearbox-reveal-paragraph" class="type-body gearbox-desc-p">7-Speed PDK Automatic Dual-Clutch: Shifts gears automatically in milliseconds with zero interruption in acceleration. Enables 0–60 mph acceleration in 3.2 seconds.</p>`;
          const p = document.getElementById('gearbox-reveal-paragraph');
          triggerWordRevealAnimation(p);
        }
      });

      tabManual.addEventListener('click', () => {
        tabManual.classList.add('active');
        tabPdk.classList.remove('active');
        if (gearboxDesc) {
          gearboxDesc.innerHTML = `<p id="gearbox-reveal-paragraph" class="type-body gearbox-desc-p">6-Speed GT Sport Manual: Pure mechanical driving engagement with short, crisp manual gear shifts and automatic rev-matching on downshifts.</p>`;
          const p = document.getElementById('gearbox-reveal-paragraph');
          triggerWordRevealAnimation(p);
        }
      });
    }
  }

  function setupNavClickHandlers() {
    navLinks.forEach(link => {
      link.addEventListener('click', (e) => {
        const href = link.getAttribute('href');
        if (!href || !href.startsWith('#')) return;

        e.preventDefault();
        const targetSection = document.querySelector(href);
        if (targetSection) {
          if (lenis) {
            lenis.scrollTo(targetSection, {
              duration: 1.2,
              easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
              offset: -40
            });
          } else {
            targetSection.scrollIntoView({ behavior: 'smooth' });
          }

          if (mobileNavOverlay && mobileNavOverlay.classList.contains('active')) {
            mobileNavOverlay.classList.remove('active');
            if (mobileMenuToggle) mobileMenuToggle.classList.remove('active');
          }
        }
      });
    });
  }

  function setupEventListeners() {
    window.addEventListener('scroll', () => {
      updateScrollTarget();
      updateHeaderStyle();
    }, { passive: true });

    window.addEventListener('resize', () => {
      resizeCanvas();
      updateScrollTarget();
    }, { passive: true });

    window.addEventListener('mousemove', (e) => {
      if (cursor) {
        cursor.style.left = `${e.clientX}px`;
        cursor.style.top = `${e.clientY}px`;
      }
    }, { passive: true });

    const magneticBtns = document.querySelectorAll('.magnetic-btn, .btn, a, button');
    magneticBtns.forEach(btn => {
      btn.addEventListener('mouseenter', () => document.body.classList.add('cursor-hover'));
      btn.addEventListener('mouseleave', () => document.body.classList.remove('cursor-hover'));
    });

    if (revEngineBtn) {
      revEngineBtn.addEventListener('mousedown', () => { state.isReving = true; });
      revEngineBtn.addEventListener('mouseup', () => { state.isReving = false; });
      revEngineBtn.addEventListener('mouseleave', () => { state.isReving = false; });
      revEngineBtn.addEventListener('touchstart', () => { state.isReving = true; });
      revEngineBtn.addEventListener('touchend', () => { state.isReving = false; });
    }

    if (playSoundBtn) {
      playSoundBtn.addEventListener('click', startAudioSynth);
    }

    setupReplayCinematicButton();
  }

  function setupReplayCinematicButton() {
    const replayBtns = document.querySelectorAll('#replay-btn, #replay-cinematic-btn, .replay-drive-btn');
    if (!replayBtns || replayBtns.length === 0) return;

    replayBtns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();

        // 1. Smooth scroll back to top hero section (#motion)
        if (lenis) {
          lenis.scrollTo(0, { duration: 1.4 });
        } else {
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }

        // 2. Reset motion sequence progress to frame 0
        state.targetProgress = 0;
        state.progress = 0;

        if (video) {
          try {
            video.currentTime = 0;
            video.play().catch(() => {});
          } catch (err) {}
        }

        // 3. Re-trigger entrance GSAP animations on Hero Card
        if (typeof gsap !== 'undefined') {
          gsap.fromTo('#hero-card', 
            { y: 50, opacity: 0, scale: 0.95 },
            { y: 0, opacity: 1, scale: 1.0, duration: 1.2, ease: 'power3.out' }
          );
          gsap.fromTo('.hero-main-title',
            { y: 30, opacity: 0 },
            { y: 0, opacity: 1, duration: 1.0, delay: 0.2, ease: 'power3.out' }
          );
        }
      });
    });
  }

  function updateHeaderStyle() {
    if (!siteHeader) return;
    const scrollPos = lenis ? lenis.scroll : window.scrollY;
    if (scrollPos > 100) {
      siteHeader.classList.add('scrolled');
      if (telemetryHudOverlay) telemetryHudOverlay.classList.add('hide-hud');
    } else {
    }
  }

  // ==========================================================================
  // ULTRA-PREMIUM PORSCHE 911 GT3 GERMAN AUTOMOTIVE LAUNCH EXPERIENCE
  // ==========================================================================
  function setupWelcomeIntro() {
    const introOverlay = document.getElementById('gt3-intro-overlay');
    const skipBtn = document.getElementById('gt3-intro-skip');
    const enterBtn = document.getElementById('gt3-intro-enter-btn');
    const canvas = document.getElementById('gt3-intro-canvas');

    if (!introOverlay) return;

    // Check if returning to home page or intro already seen in session
    const urlParams = new URLSearchParams(window.location.search);
    const skipIntroParam = urlParams.get('skipIntro');
    const hasSeenIntro = sessionStorage.getItem('porsche_gt3_intro_seen');

    if (hasSeenIntro === 'true' || skipIntroParam === '1' || skipIntroParam === 'true') {
      document.body.classList.add('intro-done');
      if (introOverlay.parentNode) {
        introOverlay.parentNode.removeChild(introOverlay);
      }
      return;
    }

    document.body.classList.remove('intro-done');

    // Force programmatic autoplay on intro background video element
    const introVideo = introOverlay.querySelector('.gt3-intro-bg-video');
    if (introVideo) {
      introVideo.muted = true;
      introVideo.playsInline = true;
      const playPromise = introVideo.play();
      if (playPromise !== undefined) {
        playPromise.catch(() => {
          // Autoplay handled by CSS background-image fallback
        });
      }
    }

    let isFinished = false;
    let animFrameId = null;

    // 1. Sparse Illuminated Dust Particles Canvas
    if (canvas) {
      const ctx = canvas.getContext('2d');
      let width = (canvas.width = window.innerWidth);
      let height = (canvas.height = window.innerHeight);

      window.addEventListener('resize', () => {
        if (!isFinished && canvas) {
          width = canvas.width = window.innerWidth;
          height = canvas.height = window.innerHeight;
        }
      });

      const particles = [];
      const particleCount = 30; // Sparse, elegant atmosphere
      for (let i = 0; i < particleCount; i++) {
        particles.push({
          x: Math.random() * width,
          y: Math.random() * height,
          radius: Math.random() * 1.2 + 0.4,
          color: Math.random() > 0.4 ? '#A7ABB0' : '#D5001C',
          alpha: Math.random() * 0.4 + 0.1,
          speedY: -(Math.random() * 0.3 + 0.1),
          speedX: (Math.random() - 0.5) * 0.2
        });
      }

      function renderParticles() {
        if (isFinished) return;
        ctx.clearRect(0, 0, width, height);

        particles.forEach((p) => {
          p.y += p.speedY;
          p.x += p.speedX;
          if (p.y < -10) {
            p.y = height + 10;
            p.x = Math.random() * width;
          }

          ctx.beginPath();
          ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
          ctx.fillStyle = p.color;
          ctx.globalAlpha = p.alpha;
          ctx.shadowBlur = 6;
          ctx.shadowColor = p.color;
          ctx.fill();
        });

        animFrameId = requestAnimationFrame(renderParticles);
      }
      renderParticles();
    }

    // Automatic 0% to 100% Loading & Specification Count-Up Loop
    function startAutoLoader() {
      const pPower = document.getElementById('spec-val-power');
      const pRpm = document.getElementById('spec-val-rpm');
      const pDisp = document.getElementById('spec-val-disp');
      const pWeight = document.getElementById('spec-val-weight');
      const loaderBar = document.getElementById('gt3-auto-loader-bar');
      const loaderPct = document.getElementById('gt3-auto-loader-pct');
      const loaderMsg = document.getElementById('gt3-auto-loader-msg');

      let start = null;
      const duration = 1200; // 1.2s fast loading duration

      function step(timestamp) {
        if (isFinished) return;
        if (!start) start = timestamp;
        const progress = Math.min((timestamp - start) / duration, 1.0);
        const eased = 1 - Math.pow(1 - progress, 3);
        const currentPct = Math.floor(eased * 100);

        if (pPower) pPower.textContent = `${Math.floor(eased * 510)} PS`;
        if (pRpm) pRpm.textContent = `${Math.floor(eased * 9000).toLocaleString('en-US')} RPM`;
        if (pDisp) pDisp.textContent = `${(eased * 4.0).toFixed(1)}L`;
        if (pWeight) pWeight.textContent = `${Math.floor(eased * 1418).toLocaleString('en-US')} KG`;

        if (loaderBar) loaderBar.style.width = `${currentPct}%`;
        if (loaderPct) loaderPct.textContent = `${currentPct}%`;

        if (loaderMsg) {
          if (currentPct < 35) {
            loaderMsg.textContent = 'CALIBRATING 9,000 RPM FLAT-SIX...';
          } else if (currentPct < 75) {
            loaderMsg.textContent = 'PREPARING AERODYNAMIC DOWNFORCE...';
          } else {
            loaderMsg.textContent = 'SYSTEM READY • UNLOCKING APEX';
          }
        }

        if (progress < 1.0) {
          requestAnimationFrame(step);
        } else {
          // Automatically trigger transition to top page when 100% loaded
          setTimeout(() => finishIntro(false), 250);
        }
      }
      requestAnimationFrame(step);
    }

    // 2. GSAP Cinematic Entrance Sequence with "911 GT3" Character Stagger Reveal
    if (typeof gsap !== 'undefined') {
      const tl = gsap.timeline();
      tl.to('.gt3-atmos-red-glow', { opacity: 1, duration: 1.2, ease: 'power2.out' })
        .fromTo('.gt3-intro-crest-wrap', 
          { opacity: 0, scale: 1.35, filter: 'blur(16px)' }, 
          { opacity: 1, scale: 1.0, filter: 'blur(0px)', duration: 1.2, ease: 'back.out(1.2)' }, '-=0.8')
        .fromTo('.gt3-crest-ring-rotator',
          { opacity: 0, scale: 0.7 },
          { opacity: 1, scale: 1.0, duration: 1.0, ease: 'power2.out' }, '-=0.9')
        .fromTo('.gt3-intro-micro-label', { opacity: 0, y: -10 }, { opacity: 1, y: 0, duration: 0.8, ease: 'power2.out' }, '-=0.7')
        .fromTo('.gt3-intro-hero-eyebrow', { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.7, ease: 'power2.out' }, '-=0.5')
        .fromTo('.gt3-char', 
          { opacity: 0, y: 35, scale: 0.8, filter: 'blur(12px)' }, 
          { opacity: 1, y: 0, scale: 1.0, filter: 'blur(0px)', duration: 0.8, stagger: 0.08, ease: 'back.out(1.5)' }, '-=0.4')
        .to('.gt3-title-laser-line', { width: '80%', duration: 0.8, ease: 'power3.out' }, '-=0.4')
        .fromTo('.gt3-stmt-word',
          { opacity: 0, y: '110%', filter: 'blur(8px)' },
          { opacity: 1, y: '0%', filter: 'blur(0px)', duration: 0.85, stagger: 0.14, ease: 'power3.out' },
          '-=0.4'
        )
        .fromTo('.gt3-intro-spec-strip', { opacity: 0, y: 15 }, { opacity: 1, y: 0, duration: 0.8, ease: 'power3.out' }, '-=0.5')
        .fromTo('.gt3-auto-loader-wrap', { opacity: 0, y: 15 }, { opacity: 1, y: 0, duration: 0.8, ease: 'power3.out', onStart: startAutoLoader }, '-=0.4')
        .fromTo('#gt3-intro-skip', { opacity: 0 }, { opacity: 1, duration: 0.6 }, '-=0.6');
    } else {
      setTimeout(startAutoLoader, 800);
    }

    // Interactive Subtle Cursor Parallax Effect
    introOverlay.addEventListener('mousemove', (e) => {
      if (isFinished) return;
      const xPct = (e.clientX / window.innerWidth - 0.5) * 2;
      const yPct = (e.clientY / window.innerHeight - 0.5) * 2;

      const crest = document.querySelector('.gt3-intro-crest-wrap');
      const stage = document.querySelector('.gt3-intro-launch-stage');

      if (crest) crest.style.transform = `translate(${xPct * 8}px, ${yPct * 8}px)`;
      if (stage) stage.style.transform = `translate(${xPct * 4}px, ${yPct * 4}px)`;
    });

    // 3. Exit Transition Handler (Seamless Transition to Top Page)
    function finishIntro(openModal = false) {
      if (isFinished) return;
      isFinished = true;

      // Save flag so returning to home page skips intro
      try {
        sessionStorage.setItem('porsche_gt3_intro_seen', 'true');
      } catch (e) {}

      if (animFrameId) cancelAnimationFrame(animFrameId);
      introOverlay.classList.add('gt3-intro-hidden');
      document.body.classList.add('intro-done');

      // Scroll window to top section cleanly
      window.scrollTo({ top: 0, behavior: 'instant' });

      // Trigger high-end entrance transition for top page elements
      if (typeof gsap !== 'undefined') {
        gsap.fromTo('#site-header', 
          { y: -30, opacity: 0 }, 
          { y: 0, opacity: 1, duration: 1.0, delay: 0.15, ease: 'power3.out' }
        );
        gsap.fromTo('#hero-card', 
          { y: 40, opacity: 0, scale: 0.97 }, 
          { y: 0, opacity: 1, scale: 1.0, duration: 1.1, delay: 0.25, ease: 'power3.out' }
        );
        gsap.fromTo('.telemetry-hud', 
          { opacity: 0 }, 
          { opacity: 1, duration: 0.8, delay: 0.45, ease: 'power2.out' }
        );
      }

      setTimeout(() => {
        if (introOverlay && introOverlay.parentNode) {
          introOverlay.parentNode.removeChild(introOverlay);
        }
        if (openModal) {
          const configModal = document.getElementById('config-modal');
          if (configModal) {
            configModal.classList.add('open');
          }
        }
      }, 950);
    }

    if (skipBtn) skipBtn.addEventListener('click', () => finishIntro(false));
    if (enterBtn) enterBtn.addEventListener('click', () => finishIntro(false));
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
