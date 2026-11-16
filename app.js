/**
 * AUTENTIFUTURO — LUXURY SCROLL & VIDEO ENGINE
 * High-performance frame renderer with Apple-grade smooth scrollytelling
 */

const CHAPTERS = [
  { step: 0, title: "A sala está velha...", short: "Sala Velha", image: "1.jpeg" },
  { step: 1, title: "Entram as obras!", short: "Em Obras", image: "2.jpeg" },
  { step: 2, title: "A sala fica pronta!", short: "Sala Pronta", image: "3.jpeg" },
  { step: 3, title: "Vamos modernizar!", short: "Modernizar", image: "4.jpeg" },
  { step: 4, title: "De volta às obras...", short: "Obras Requinte", image: "5.jpeg" },
  { step: 5, title: "Vamos casar! 💍", short: "Vamos Casar!", image: "6.jpeg" },
  { step: 6, title: "O nosso lar de sonho. ❤️", short: "O Nosso Lar", image: "7.jpeg" }
];

// DOM references
const canvas = document.getElementById('video-canvas');
const ctx = canvas.getContext('2d');
const particlesCanvas = document.getElementById('particles-canvas');
const pCtx = particlesCanvas.getContext('2d');

const captionItems = Array.from(document.querySelectorAll('.caption-item'));
const storySegments = Array.from(document.querySelectorAll('.story-segments .segment'));
const storySegmentsBox = document.getElementById('story-segments');
const timelineDots = document.getElementById('timeline-dots');

const playerStatusTag = document.getElementById('player-status-tag');
const playerTimeText = document.getElementById('player-time-text');

const btnPlayPause = document.getElementById('btn-play-pause');
const iconPlayBtn = document.getElementById('icon-play-btn');
const iconPauseBtn = document.getElementById('icon-pause-btn');
const labelPlayText = document.getElementById('label-play-text');

const btnStepPrev = document.getElementById('btn-step-prev');
const btnStepNext = document.getElementById('btn-step-next');
const btnReplay = document.getElementById('btn-replay');

const btnSound = document.getElementById('btn-sound');
const iconSoundOff = document.getElementById('icon-sound-off');
const iconSoundOn = document.getElementById('icon-sound-on');

const btnCompare = document.getElementById('btn-compare');
const compareModal = document.getElementById('compare-modal');
const compareModalDim = document.getElementById('compare-modal-dim');
const btnCloseCompare = document.getElementById('btn-close-compare');
const compareFrame = document.getElementById('compare-frame');
const compareBeforeWrap = document.getElementById('compare-before-wrap');
const compareSplitter = document.getElementById('compare-splitter');

// Preloaded Image Cache
const imageElements = [];
let imagesLoaded = 0;

// State
let currentFloatStep = 0.0; // 0.0 to 6.0
let activeStepIndex = 0;
let isPlaying = false;
let playAnimFrameId = null;
let playSpeed = 0.007;
let isSoundOn = false;
let audioCtx = null;
let ambientGain = null;
let lastChimeStep = -1;

// Particles
let particles = [];
let particlesAnimId = null;

// ==========================================================================
// 1. Image Preloading & Canvas Resize
// ==========================================================================
function resizeCanvas() {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const w = window.innerWidth;
  const h = window.innerHeight;

  canvas.width = w * dpr;
  canvas.height = h * dpr;
  canvas.style.width = w + 'px';
  canvas.style.height = h + 'px';
  ctx.scale(dpr, dpr);

  particlesCanvas.width = w;
  particlesCanvas.height = h;

  renderFrame(currentFloatStep);
}

function loadAllImages() {
  CHAPTERS.forEach((ch, idx) => {
    const img = new Image();
    img.src = ch.image;
    img.onload = () => {
      imagesLoaded++;
      const currentBase = Math.floor(currentFloatStep);
      const currentNext = Math.min(currentBase + 1, CHAPTERS.length - 1);
      if (idx === currentBase || idx === currentNext) {
        renderFrame(currentFloatStep);
      }
    };
    imageElements[idx] = img;
    if (img.complete && img.naturalWidth > 0 && idx === 0) {
      renderFrame(0);
    }
  });
}

// ==========================================================================
// 2. High-Performance Frame Renderer with Cross-fade & "Cover" Fit
// ==========================================================================
function drawCoverImage(img, alpha = 1.0, scale = 1.0) {
  if (!img || !img.complete || img.naturalWidth === 0) return;

  const w = window.innerWidth;
  const h = window.innerHeight;
  const imgW = img.naturalWidth;
  const imgH = img.naturalHeight;

  const canvasRatio = w / h;
  const imgRatio = imgW / imgH;

  let renderW, renderH, renderX, renderY;

  if (canvasRatio > imgRatio) {
    renderW = w * scale;
    renderH = (w / imgRatio) * scale;
  } else {
    renderH = h * scale;
    renderW = (h * imgRatio) * scale;
  }

  renderX = (w - renderW) / 2;
  renderY = (h - renderH) / 2;

  ctx.globalAlpha = Math.max(0, Math.min(1, alpha));
  ctx.drawImage(img, renderX, renderY, renderW, renderH);
}

function renderFrame(floatPos) {
  const maxStep = CHAPTERS.length - 1;
  const clampedPos = Math.max(0, Math.min(floatPos, maxStep));
  const baseIndex = Math.min(Math.floor(clampedPos), maxStep - 1);
  const nextIndex = Math.min(baseIndex + 1, maxStep);
  const progressBetween = clampedPos - baseIndex;

  ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);

  const imgBase = imageElements[baseIndex];
  const imgNext = imageElements[nextIndex];

  if (imgBase && imgBase.complete) {
    const scaleBase = 1.0 + (1 - progressBetween) * 0.02;
    drawCoverImage(imgBase, 1.0, scaleBase);
  }

  if (imgNext && imgNext.complete && progressBetween > 0.001) {
    const scaleNext = 1.0 + progressBetween * 0.02;
    drawCoverImage(imgNext, progressBetween, scaleNext);
  }

  ctx.globalAlpha = 1.0;
}

// ==========================================================================
// 3. UI Sync (Stories Segments, Captions, Header)
// ==========================================================================
function updateUI(floatPos) {
  const maxStep = CHAPTERS.length - 1;
  const clampedPos = Math.max(0, Math.min(floatPos, maxStep));
  const baseIndex = Math.min(Math.floor(clampedPos), maxStep - 1);
  const progressBetween = clampedPos - baseIndex;
  const discreteStep = Math.round(floatPos);

  // 1. Update 7-segment stories progress bar
  storySegments.forEach((seg, idx) => {
    const fill = seg.querySelector('.seg-fill');
    if (idx < baseIndex) {
      seg.className = 'segment completed';
      if (fill) fill.style.width = '100%';
    } else if (idx === baseIndex) {
      seg.className = 'segment active';
      if (fill) fill.style.width = (progressBetween * 100).toFixed(1) + '%';
    } else {
      seg.className = 'segment';
      if (fill) fill.style.width = '0%';
    }
  });

  // 2. Update phase indicator
  const currentChapter = CHAPTERS[discreteStep] || CHAPTERS[0];
  if (playerStatusTag) playerStatusTag.textContent = currentChapter.title;
  if (playerTimeText) playerTimeText.textContent = `0${discreteStep + 1} / 07`;

  // 3. Update Captions on discrete step change
  if (discreteStep !== activeStepIndex) {
    activeStepIndex = discreteStep;

    captionItems.forEach((item, idx) => {
      item.classList.toggle('active', idx === discreteStep);
    });

    // Update side dots (desktop)
    const dotItems = document.querySelectorAll('.side-dot-item');
    dotItems.forEach((dot, idx) => {
      dot.classList.toggle('active', idx === discreteStep);
      dot.classList.toggle('done', idx < discreteStep);
    });

    // Audio chime on milestone change
    if (discreteStep !== lastChimeStep) {
      lastChimeStep = discreteStep;
      playStepChime(discreteStep);
    }

    // Toggle romantic particles for casar & final home
    if (discreteStep >= 5) {
      particlesCanvas.classList.add('active');
    } else {
      particlesCanvas.classList.remove('active');
    }
  }
}

function setPosition(floatPos, syncScroll = true) {
  const maxStep = CHAPTERS.length - 1;
  currentFloatStep = Math.max(0, Math.min(floatPos, maxStep));
  renderFrame(currentFloatStep);
  updateUI(currentFloatStep);

  if (syncScroll) {
    const scrollMax = document.documentElement.scrollHeight - window.innerHeight;
    if (scrollMax > 0) {
      const targetScroll = (currentFloatStep / maxStep) * scrollMax;
      window.scrollTo({ top: targetScroll, behavior: 'auto' });
    }
  }
}

// ==========================================================================
// 4. Scroll Driver (Native Scroll & Wheel)
// ==========================================================================
function onWindowScroll() {
  if (isPlaying) return;

  const scrollMax = document.documentElement.scrollHeight - window.innerHeight;
  if (scrollMax <= 0) return;

  const ratio = Math.max(0, Math.min(window.pageYOffset / scrollMax, 1));
  const targetFloat = ratio * (CHAPTERS.length - 1);
  currentFloatStep = targetFloat;
  renderFrame(currentFloatStep);
  updateUI(currentFloatStep);
}

// Wheel listener for desktop
window.addEventListener('wheel', (e) => {
  if (isPlaying) stopVideo();
  const delta = e.deltaY;
  const stepIncrement = (delta / 450);
  const newPos = Math.max(0, Math.min(currentFloatStep + stepIncrement, CHAPTERS.length - 1));
  setPosition(newPos, true);
}, { passive: true });

// Mobile Touch Gestures: Horizontal swipe to jump chapters
let touchStartX = 0;
let touchStartY = 0;
let touchMoved = false;

window.addEventListener('touchstart', (e) => {
  if (isPlaying) stopVideo();
  if (e.touches && e.touches[0]) {
    touchStartX = e.touches[0].clientX;
    touchStartY = e.touches[0].clientY;
    touchMoved = false;
  }
}, { passive: true });

window.addEventListener('touchmove', (e) => {
  touchMoved = true;
}, { passive: true });

window.addEventListener('touchend', (e) => {
  if (!touchMoved || !e.changedTouches || !e.changedTouches[0]) return;
  const deltaX = e.changedTouches[0].clientX - touchStartX;
  const deltaY = e.changedTouches[0].clientY - touchStartY;

  // Horizontal swipe detection
  if (Math.abs(deltaX) > 50 && Math.abs(deltaX) > Math.abs(deltaY) * 1.3) {
    if (deltaX < 0) {
      // Swiped Left -> Next Chapter
      const next = Math.min(CHAPTERS.length - 1, activeStepIndex + 1);
      setPosition(next, true);
    } else {
      // Swiped Right -> Previous Chapter
      const prev = Math.max(0, activeStepIndex - 1);
      setPosition(prev, true);
    }
  }
}, { passive: true });

window.addEventListener('scroll', onWindowScroll, { passive: true });

// Tap on progress bar segments
if (storySegmentsBox) {
  function handleSegmentTap(e) {
    const rect = storySegmentsBox.getBoundingClientRect();
    const clientX = e.clientX || (e.touches && e.touches[0].clientX) || 0;
    const ratio = Math.max(0, Math.min((clientX - rect.left) / rect.width, 1));
    setPosition(ratio * (CHAPTERS.length - 1), true);
  }

  storySegmentsBox.addEventListener('click', handleSegmentTap);
  storySegmentsBox.addEventListener('touchstart', (e) => {
    stopVideo();
    handleSegmentTap(e);
  }, { passive: true });
}

// ==========================================================================
// 5. Video Player Engine (Play / Pause)
// ==========================================================================
function startVideo() {
  isPlaying = true;
  btnPlayPause.classList.add('playing');
  iconPlayBtn.classList.add('hidden');
  iconPauseBtn.classList.remove('hidden');
  labelPlayText.textContent = 'Pausa';

  if (currentFloatStep >= (CHAPTERS.length - 1) - 0.05) {
    setPosition(0, true);
  }

  function playLoop() {
    if (!isPlaying) return;

    const maxStep = CHAPTERS.length - 1;
    let nextStep = currentFloatStep + playSpeed;

    if (nextStep >= maxStep) {
      setPosition(maxStep, true);
      stopVideo();
      return;
    }

    setPosition(nextStep, true);
    playAnimFrameId = requestAnimationFrame(playLoop);
  }

  playAnimFrameId = requestAnimationFrame(playLoop);
}

function stopVideo() {
  if (!isPlaying) return;
  isPlaying = false;
  if (playAnimFrameId) cancelAnimationFrame(playAnimFrameId);
  btnPlayPause.classList.remove('playing');
  iconPlayBtn.classList.remove('hidden');
  iconPauseBtn.classList.add('hidden');
  labelPlayText.textContent = 'Ver Vídeo';
}

btnPlayPause.addEventListener('click', () => {
  if (isPlaying) stopVideo(); else startVideo();
});

if (btnReplay) {
  btnReplay.addEventListener('click', () => {
    stopVideo();
    setPosition(0, true);
    setTimeout(startVideo, 300);
  });
}

btnStepPrev.addEventListener('click', () => {
  stopVideo();
  const prev = Math.max(0, activeStepIndex - 1);
  setPosition(prev, true);
});

btnStepNext.addEventListener('click', () => {
  stopVideo();
  const next = Math.min(CHAPTERS.length - 1, activeStepIndex + 1);
  setPosition(next, true);
});

// ==========================================================================
// 6. Side Nav Timeline (Desktop)
// ==========================================================================
function buildSideTimeline() {
  if (!timelineDots) return;
  timelineDots.innerHTML = '';
  CHAPTERS.forEach((ch, idx) => {
    const li = document.createElement('li');
    const btn = document.createElement('button');
    btn.className = 'side-dot-item' + (idx === 0 ? ' active' : '');
    btn.dataset.step = idx;
    btn.setAttribute('aria-label', ch.title);

    btn.innerHTML = `
      <span class="side-dot-name">${ch.short}</span>
      <span class="side-dot-pip"></span>
    `;

    btn.addEventListener('click', () => {
      stopVideo();
      setPosition(idx, true);
    });

    li.appendChild(btn);
    timelineDots.appendChild(li);
  });
}

// Keyboard navigation
window.addEventListener('keydown', (e) => {
  if (e.key === ' ' || e.key === 'Spacebar') {
    e.preventDefault();
    if (isPlaying) stopVideo(); else startVideo();
  } else if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
    e.preventDefault();
    stopVideo();
    setPosition(Math.min(CHAPTERS.length - 1, activeStepIndex + 1), true);
  } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
    e.preventDefault();
    stopVideo();
    setPosition(Math.max(0, activeStepIndex - 1), true);
  }
});

// ==========================================================================
// 7. Direct Before vs After Modal
// ==========================================================================
function openCompare() {
  stopVideo();
  compareModal.classList.add('open');
  compareModal.setAttribute('aria-hidden', 'false');
  updateCompareWipe(50);
}

function closeCompare() {
  compareModal.classList.remove('open');
  compareModal.setAttribute('aria-hidden', 'true');
}

btnCompare.addEventListener('click', openCompare);
btnCloseCompare.addEventListener('click', closeCompare);
compareModalDim.addEventListener('click', closeCompare);

window.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && compareModal.classList.contains('open')) {
    closeCompare();
  }
});

function updateCompareWipe(percent) {
  const p = Math.max(0, Math.min(percent, 100));
  compareBeforeWrap.style.width = p + '%';
  compareSplitter.style.left = p + '%';
}

let isSlidingWipe = false;
function handleWipe(e) {
  const rect = compareFrame.getBoundingClientRect();
  const clientX = e.clientX || (e.touches && e.touches[0].clientX) || 0;
  const p = ((clientX - rect.left) / rect.width) * 100;
  updateCompareWipe(p);
}

compareFrame.addEventListener('mousedown', (e) => {
  isSlidingWipe = true;
  handleWipe(e);
});
window.addEventListener('mousemove', (e) => {
  if (isSlidingWipe) handleWipe(e);
});
window.addEventListener('mouseup', () => {
  isSlidingWipe = false;
});

compareFrame.addEventListener('touchstart', (e) => {
  isSlidingWipe = true;
  handleWipe(e);
}, { passive: true });
window.addEventListener('touchmove', (e) => {
  if (isSlidingWipe) handleWipe(e);
}, { passive: true });
window.addEventListener('touchend', () => {
  isSlidingWipe = false;
});

// ==========================================================================
// 8. Web Audio Atmosphere & Chimes
// ==========================================================================
function getAudioContext() {
  if (!audioCtx) {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    audioCtx = new AudioContext();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

btnSound.addEventListener('click', () => {
  if (!isSoundOn) {
    const ctx = getAudioContext();
    startSoundtrack();
    isSoundOn = true;
    iconSoundOff.classList.add('hidden');
    iconSoundOn.classList.remove('hidden');
  } else {
    stopSoundtrack();
    isSoundOn = false;
    iconSoundOff.classList.remove('hidden');
    iconSoundOn.classList.add('hidden');
  }
});

function startSoundtrack() {
  if (!audioCtx) return;
  try {
    ambientGain = audioCtx.createGain();
    ambientGain.gain.setValueAtTime(0.001, audioCtx.currentTime);
    ambientGain.gain.exponentialRampToValueAtTime(0.07, audioCtx.currentTime + 3);

    const filter = audioCtx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(350, audioCtx.currentTime);

    const osc1 = audioCtx.createOscillator();
    osc1.type = 'triangle';
    osc1.frequency.setValueAtTime(130.81, audioCtx.currentTime);

    const osc2 = audioCtx.createOscillator();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(196.00, audioCtx.currentTime);

    osc1.connect(filter);
    osc2.connect(filter);
    filter.connect(ambientGain);
    ambientGain.connect(audioCtx.destination);

    osc1.start();
    osc2.start();
  } catch (err) {}
}

function stopSoundtrack() {
  if (ambientGain && audioCtx) {
    ambientGain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 0.8);
  }
}

function playStepChime(step) {
  if (!isSoundOn || !audioCtx) return;
  try {
    const now = audioCtx.currentTime;
    const notes = [261.63, 293.66, 329.63, 392.00, 440.00, 523.25, 659.25];
    const freq = notes[step % notes.length];

    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, now);

    gain.gain.setValueAtTime(0.001, now);
    gain.gain.exponentialRampToValueAtTime(0.09, now + 0.05);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 1.2);

    osc.connect(gain);
    gain.connect(audioCtx.destination);

    osc.start(now);
    osc.stop(now + 1.2);
  } catch (e) {}
}

// ==========================================================================
// 9. Floating Hearts & Particles
// ==========================================================================
function initParticles() {
  const count = 30;
  particles = [];

  for (let i = 0; i < count; i++) {
    particles.push({
      x: Math.random() * window.innerWidth,
      y: Math.random() * window.innerHeight,
      size: Math.random() * 10 + 5,
      speedY: Math.random() * 0.7 + 0.3,
      speedX: (Math.random() - 0.5) * 0.4,
      opacity: Math.random() * 0.5 + 0.2,
      isHeart: Math.random() > 0.4
    });
  }

  function drawHeart(x, y, size, opacity) {
    pCtx.save();
    pCtx.translate(x, y);
    pCtx.scale(size / 15, size / 15);
    pCtx.fillStyle = `rgba(236, 72, 153, ${opacity})`;
    pCtx.beginPath();
    pCtx.moveTo(0, 0);
    pCtx.bezierCurveTo(-5, -7, -10, -5, -10, 0);
    pCtx.bezierCurveTo(-10, 5, -5, 10, 0, 15);
    pCtx.bezierCurveTo(5, 10, 10, 5, 10, 0);
    pCtx.bezierCurveTo(10, -5, 5, -7, 0, 0);
    pCtx.fill();
    pCtx.restore();
  }

  function loop() {
    pCtx.clearRect(0, 0, particlesCanvas.width, particlesCanvas.height);

    if (activeStepIndex >= 5) {
      particles.forEach((p) => {
        p.y -= p.speedY;
        p.x += p.speedX;

        if (p.isHeart) {
          drawHeart(p.x, p.y, p.size, p.opacity);
        } else {
          pCtx.beginPath();
          pCtx.arc(p.x, p.y, p.size * 0.3, 0, Math.PI * 2);
          pCtx.fillStyle = `rgba(212, 175, 55, ${p.opacity})`;
          pCtx.fill();
        }

        if (p.y < -20) {
          p.y = window.innerHeight + 10;
          p.x = Math.random() * window.innerWidth;
        }
      });
    }

    particlesAnimId = requestAnimationFrame(loop);
  }

  loop();
}

// ==========================================================================
// 10. Startup
// ==========================================================================
window.addEventListener('DOMContentLoaded', () => {
  buildSideTimeline();
  resizeCanvas();
  loadAllImages();
  initParticles();
  setPosition(0, false);
});

window.addEventListener('resize', resizeCanvas);
