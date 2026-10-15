/**
 * ELEVENLABS VOICE STUDIO — CLIENT ENGINE (NETLIFY SERVERLESS EDITION)
 *
 * Calls the secure Netlify serverless function at /api/generate-speech
 * (/.netlify/functions/generate-speech) without exposing any API keys in the browser.
 */

// --- Model Metadata & Descriptions ---
const MODEL_DETAILS = {
  eleven_multilingual_v2: {
    name: 'Eleven Multilingual v2',
    badge: 'Recommended',
    description: 'State-of-the-art model. Most lifelike and emotionally rich speech across 29 languages.'
  },
  eleven_flash_v2_5: {
    name: 'Eleven Flash v2.5',
    badge: '~75ms Latency',
    description: 'Ultra-low latency model engineered for real-time speech across 32 languages.'
  },
  eleven_turbo_v2_5: {
    name: 'Eleven Turbo v2.5',
    badge: 'High Speed',
    description: 'High quality & speed balance. Ideal for fast voiceovers in 32 languages.'
  },
  eleven_monolingual_v1: {
    name: 'Eleven English v1',
    badge: 'English Classic',
    description: 'Original English speech synthesis model with distinct character and cadence.'
  },
  eleven_multilingual_v1: {
    name: 'Eleven Multilingual v1',
    badge: 'Legacy',
    description: 'First generation multilingual model supporting 10 languages.'
  }
};

// --- Default Script & Sample Prompts ---
const DEFAULT_SCRIPT = `Space Exploration: Beyond Earth

Have you ever wondered what lies beyond our planet?

Space exploration helps us discover the mysteries of the universe. From exploring the Moon to sending robotic missions to Mars, scientists are constantly expanding our knowledge.

Satellites help us communicate, predict weather, and observe Earth. In the future, humans may even live on the Moon or travel to Mars.

Space exploration is not just about discovering new worlds. It is about innovation, curiosity, and pushing the limits of human knowledge.

The universe is full of mysteries, and our journey to explore them has only just begun!`;

const SAMPLES = {
  story: DEFAULT_SCRIPT,
  tech: "Artificial intelligence has reached a pivotal breakthrough. With real-time text-to-speech models operating at sub-100 millisecond latencies, interactive voice agents are indistinguishable from natural human dialogue.",
  dialogue: "Welcome back to Deep Space Chronicles. Before we initiate the hyperdrive sequence, remember this: the universe doesn't whisper its secrets to those who rush. Listen closely to the static between frequencies."
};

// --- Serverless API Endpoint ---
// Primary Netlify Serverless Function route
const API_ENDPOINT = (typeof CONFIG !== 'undefined' && CONFIG.API_ENDPOINT)
  ? CONFIG.API_ENDPOINT
  : '/.netlify/functions/generate-speech';

// --- Application State ---
const state = {
  backendConnected: false,
  activeEndpoint: API_ENDPOINT,
  currentAudioUrl: null,
  currentAudioBlob: null,
  isGenerating: false,
  isPlaying: false,
  audioContext: null,
  analyser: null,
  sourceNode: null,
  history: JSON.parse(localStorage.getItem('elevenlabs_history') || '[]')
};

// --- DOM Element References ---
const elements = {
  // Backend Status drawer & controls
  backendStatusBtn: document.getElementById('backendStatusBtn'),
  backendStatusText: document.getElementById('backendStatusText'),
  backendStatusDot: document.getElementById('backendStatusDot'),
  backendStatusPanel: document.getElementById('backendStatusPanel'),
  closeBackendPanelBtn: document.getElementById('closeBackendPanelBtn'),
  testBackendBtn: document.getElementById('testBackendBtn'),
  backendValidationStatus: document.getElementById('backendValidationStatus'),

  // Inputs & Config
  textInput: document.getElementById('textInput'),
  clearTextBtn: document.getElementById('clearTextBtn'),
  charVal: document.getElementById('charVal'),
  wordVal: document.getElementById('wordVal'),
  timeVal: document.getElementById('timeVal'),
  limitWarning: document.getElementById('characterLimitWarning'),
  modelSelect: document.getElementById('modelSelect'),
  modelLatencyBadge: document.getElementById('modelLatencyBadge'),
  modelDescription: document.getElementById('modelDescription'),
  voiceSelect: document.getElementById('voiceSelect'),
  refreshVoicesBtn: document.getElementById('refreshVoicesBtn'),
  voiceDescription: document.getElementById('voiceDescription'),

  // Voice Settings Sliders
  stabilitySlider: document.getElementById('stabilitySlider'),
  stabilityVal: document.getElementById('stabilityVal'),
  similaritySlider: document.getElementById('similaritySlider'),
  similarityVal: document.getElementById('similarityVal'),
  styleSlider: document.getElementById('styleSlider'),
  styleVal: document.getElementById('styleVal'),
  speakerBoostCheckbox: document.getElementById('speakerBoostCheckbox'),

  // CTA & Action Buttons
  playNarrationBtn: document.getElementById('playNarrationBtn'),
  stopNarrationBtn: document.getElementById('stopNarrationBtn'),
  btnMainText: document.getElementById('btnMainText'),
  btnSubText: document.getElementById('btnSubText'),
  playIcon: document.getElementById('playIcon'),
  btnSpinner: document.getElementById('btnSpinner'),

  // Status Banner
  statusNotification: document.getElementById('statusNotification'),
  statusBannerIcon: document.getElementById('statusBannerIcon'),
  statusBannerMessage: document.getElementById('statusBannerMessage'),
  dismissStatusBtn: document.getElementById('dismissStatusBtn'),

  // Visualizer & Audio Player
  visualizerCanvas: document.getElementById('visualizerCanvas'),
  visualizerOverlay: document.getElementById('visualizerOverlay'),
  audioStatusBadge: document.getElementById('audioStatusBadge'),
  currentVoiceLabel: document.getElementById('currentVoiceLabel'),
  audioElement: document.getElementById('audioElement'),
  seekSlider: document.getElementById('seekSlider'),
  currentTimeDisplay: document.getElementById('currentTimeDisplay'),
  totalDurationDisplay: document.getElementById('totalDurationDisplay'),
  miniPlayPauseBtn: document.getElementById('miniPlayPauseBtn'),
  miniPlayIcon: document.getElementById('miniPlayIcon'),
  replayBtn: document.getElementById('replayBtn'),
  playbackSpeedSelect: document.getElementById('playbackSpeedSelect'),
  volumeSlider: document.getElementById('volumeSlider'),
  muteToggleBtn: document.getElementById('muteToggleBtn'),
  downloadAudioBtn: document.getElementById('downloadAudioBtn'),

  // History
  historyList: document.getElementById('historyList'),
  clearHistoryBtn: document.getElementById('clearHistoryBtn')
};

// ==========================================================================
// INITIALIZATION
// ==========================================================================

document.addEventListener('DOMContentLoaded', () => {
  initBackendUI();
  initModelUI();
  initVoiceUI();
  initSliders();
  initTextMetrics();
  initAudioPlayer();
  initCanvasVisualizer();
  renderHistory();
  setupEventListeners();

  // Populate default Space Exploration script on initial load if textarea is empty
  if (!elements.textInput.value.trim()) {
    elements.textInput.value = DEFAULT_SCRIPT;
  }
  // Update character, word, and estimated duration metrics
  updateTextMetrics();

  // Check backend serverless function connectivity on startup
  testBackendConnection(true);
});

// ==========================================================================
// NETLIFY SERVERLESS BACKEND STATUS & HEALTH CHECK
// ==========================================================================

function initBackendUI() {
  elements.backendStatusBtn.addEventListener('click', () => {
    elements.backendStatusPanel.classList.toggle('hidden');
  });

  elements.closeBackendPanelBtn.addEventListener('click', () => {
    elements.backendStatusPanel.classList.add('hidden');
  });

  elements.testBackendBtn.addEventListener('click', () => {
    testBackendConnection(false);
  });
}

/**
 * Executes a request against the Netlify serverless function.
 * Seamlessly resolves between:
 * 1. Primary route: /.netlify/functions/generate-speech
 * 2. Redirect alias: /api/generate-speech
 * 3. Local Netlify dev server: http://localhost:8888/.netlify/functions/generate-speech
 *    (in case the user opens index.html in a preview environment on port 5500, 3000, etc.)
 */
async function requestBackend(method = 'GET', body = null) {
  const isLocalhost = ['localhost', '127.0.0.1'].includes(window.location.hostname);

  const candidates = [
    state.activeEndpoint || '/.netlify/functions/generate-speech',
    '/.netlify/functions/generate-speech',
    '/api/generate-speech'
  ];

  // If viewing on localhost on a port other than 8888 (e.g. Live Server on 5500),
  // automatically include the Netlify dev server port (8888) as candidate fallback.
  if (isLocalhost && window.location.port !== '8888') {
    candidates.push('http://localhost:8888/.netlify/functions/generate-speech');
    candidates.push('http://127.0.0.1:8888/.netlify/functions/generate-speech');
    candidates.push('http://localhost:8888/api/generate-speech');
  }

  const uniqueCandidates = [...new Set(candidates)];
  let lastError = null;

  for (const endpoint of uniqueCandidates) {
    try {
      const options = {
        method,
        headers: body ? { 'Content-Type': 'application/json' } : {}
      };
      if (body) {
        options.body = JSON.stringify(body);
      }

      const response = await fetch(endpoint, options);

      // If this candidate returned 404 or 405 (e.g. static dev server rejecting POST or missing route)
      // and there are more candidates to try, keep searching
      if ((response.status === 404 || response.status === 405) && endpoint !== uniqueCandidates[uniqueCandidates.length - 1]) {
        continue;
      }

      // Responsive endpoint found! Cache it as activeEndpoint
      state.activeEndpoint = endpoint;
      return response;
    } catch (err) {
      lastError = err;
    }
  }

  if (lastError) {
    if (isLocalhost) {
      throw new Error(
        'Could not connect to Netlify Functions. Please start the local environment by running "npx netlify dev" in your project directory.'
      );
    }
    throw lastError;
  }

  throw new Error('No serverless endpoint available.');
}

/**
 * Tests connection to the Netlify serverless function
 */
async function testBackendConnection(isSilent = false) {
  if (!isSilent) {
    showBackendStatus('Pinging Netlify serverless function...', 'loading');
  }

  try {
    const response = await requestBackend('GET');

    if (response.ok) {
      const data = await response.json();
      state.backendConnected = true;
      elements.backendStatusText.textContent = 'Netlify Backend Active';
      elements.backendStatusDot.className = 'status-dot dot-green';

      if (!isSilent) {
        showBackendStatus('Connected! ElevenLabs serverless proxy is online and ready.', 'success');
        showStatus('Netlify serverless function is online!', 'success');
      }

      // If voices are returned, sync them into the dropdown
      if (data.voices && data.voices.length > 0) {
        populateVoiceDropdown(data.voices);
      }
    } else {
      let errMessage = 'Serverless function returned an error.';
      try {
        const errJson = await response.json();
        if (errJson.error) errMessage = errJson.error;
      } catch (_) {
        errMessage = response.statusText || errMessage;
      }

      state.backendConnected = false;
      elements.backendStatusDot.className = 'status-dot dot-amber';

      if (response.status === 500 && errMessage.includes('ELEVENLABS_API_KEY')) {
        elements.backendStatusText.textContent = 'Netlify Key Needed';
        if (!isSilent) {
          showBackendStatus('Missing ELEVENLABS_API_KEY in .env or Netlify Environment Variables.', 'error');
        }
      } else {
        elements.backendStatusText.textContent = 'Backend Notice';
        if (!isSilent) {
          showBackendStatus(`Notice (${response.status}): ${errMessage}`, 'error');
        }
      }
    }
  } catch (networkError) {
    state.backendConnected = false;
    elements.backendStatusDot.className = 'status-dot dot-amber';
    elements.backendStatusText.textContent = 'Netlify Dev Needed';

    if (!isSilent) {
      showBackendStatus(networkError.message, 'error');
    }
  }
}

function showBackendStatus(msg, type) {
  elements.backendValidationStatus.textContent = msg;
  elements.backendValidationStatus.className = `status-msg ${type}`;
}

// ==========================================================================
// MODELS & VOICES
// ==========================================================================

function initModelUI() {
  updateModelInfo();
  elements.modelSelect.addEventListener('change', updateModelInfo);
}

function updateModelInfo() {
  const modelId = elements.modelSelect.value;
  const info = MODEL_DETAILS[modelId] || {
    name: modelId,
    badge: 'Selected',
    description: 'Custom ElevenLabs speech synthesis model.'
  };

  elements.modelLatencyBadge.textContent = info.badge;
  elements.modelDescription.textContent = info.description;
  updateNowPlayingLabel();
}

function initVoiceUI() {
  elements.voiceSelect.addEventListener('change', () => {
    const selectedOpt = elements.voiceSelect.options[elements.voiceSelect.selectedIndex];
    elements.voiceDescription.textContent = `Selected voice: ${selectedOpt.text}`;
    updateNowPlayingLabel();
  });
}

function updateNowPlayingLabel() {
  const voiceName = elements.voiceSelect.options[elements.voiceSelect.selectedIndex]?.text.split('(')[0].trim() || 'Voice';
  const modelName = MODEL_DETAILS[elements.modelSelect.value]?.name || 'Model';
  elements.currentVoiceLabel.textContent = `${voiceName} • ${modelName}`;
}

/**
 * Sync voices through the Netlify serverless function without exposing API keys
 */
async function fetchUserVoices(isSilent = false) {
  elements.refreshVoicesBtn.classList.add('loading');
  try {
    const response = await requestBackend('GET');

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.error || response.statusText);
    }

    const data = await response.json();
    if (data.voices && data.voices.length > 0) {
      populateVoiceDropdown(data.voices);
      if (!isSilent) {
        showStatus(`Loaded ${data.voices.length} voices via Netlify serverless proxy!`, 'success');
      }
    }
  } catch (err) {
    if (!isSilent) {
      showStatus(`Voice sync notice: ${err.message}. Using built-in voice library.`, 'error');
    }
  } finally {
    elements.refreshVoicesBtn.classList.remove('loading');
  }
}

function populateVoiceDropdown(voices) {
  const currentVal = elements.voiceSelect.value;
  elements.voiceSelect.innerHTML = '';

  voices.forEach(v => {
    const opt = document.createElement('option');
    opt.value = v.voice_id;
    const category = v.category ? ` • ${v.category}` : '';
    const desc = v.labels?.accent || v.labels?.description ? ` (${v.labels?.accent || ''}${category})` : '';
    opt.textContent = `${v.name}${desc}`;
    elements.voiceSelect.appendChild(opt);
  });

  if (voices.some(v => v.voice_id === currentVal)) {
    elements.voiceSelect.value = currentVal;
  }
  updateNowPlayingLabel();
}

// ==========================================================================
// VOICE SETTINGS SLIDERS
// ==========================================================================

function initSliders() {
  elements.stabilitySlider.addEventListener('input', (e) => {
    elements.stabilityVal.textContent = `${Math.round(e.target.value * 100)}%`;
  });
  elements.similaritySlider.addEventListener('input', (e) => {
    elements.similarityVal.textContent = `${Math.round(e.target.value * 100)}%`;
  });
  elements.styleSlider.addEventListener('input', (e) => {
    elements.styleVal.textContent = `${Math.round(e.target.value * 100)}%`;
  });
}

// ==========================================================================
// TEXT METRICS & SAMPLES
// ==========================================================================

function initTextMetrics() {
  elements.textInput.addEventListener('input', updateTextMetrics);
}

function updateTextMetrics() {
  const text = elements.textInput.value;
  const chars = text.length;
  const words = text.trim() ? text.trim().split(/\s+/).length : 0;
  // Estimated audio duration at standard ~150 words per minute (2.5 words/sec)
  const estSeconds = Math.ceil(words / 2.5);

  elements.charVal.textContent = chars.toLocaleString();
  elements.wordVal.textContent = words.toLocaleString();

  if (estSeconds < 60) {
    elements.timeVal.textContent = `${estSeconds}s`;
  } else {
    const mins = Math.floor(estSeconds / 60);
    const secs = estSeconds % 60;
    elements.timeVal.textContent = `${mins}m ${secs}s`;
  }

  if (chars > 2500) {
    elements.limitWarning.classList.remove('hidden');
  } else {
    elements.limitWarning.classList.add('hidden');
  }
}

// ==========================================================================
// SECURE NARRATION GENERATION (VIA NETLIFY SERVERLESS FUNCTION)
// ==========================================================================

async function generateAndPlayNarration() {
  const text = elements.textInput.value.trim();
  if (!text) {
    showStatus('Please enter or paste text to generate narration.', 'info');
    elements.textInput.focus();
    return;
  }

  const voiceId = elements.voiceSelect.value;
  const modelId = elements.modelSelect.value;

  setGenerationState(true);
  showStatus(`Synthesizing narration with ${MODEL_DETAILS[modelId]?.name || modelId} via Netlify function...`, 'info');

  try {
    const payload = {
      text: text,
      voiceId: voiceId,
      model_id: modelId,
      voice_settings: {
        stability: parseFloat(elements.stabilitySlider.value),
        similarity_boost: parseFloat(elements.similaritySlider.value),
        style: parseFloat(elements.styleSlider.value),
        use_speaker_boost: elements.speakerBoostCheckbox.checked
      }
    };

    const response = await requestBackend('POST', payload);

    if (!response.ok) {
      let errorMessage = `Serverless function error (${response.status})`;
      try {
        const errorData = await response.json();
        if (errorData.error) {
          errorMessage = errorData.error;
        }
      } catch (e) {
        errorMessage = response.statusText || errorMessage;
      }

      if (response.status === 500 && errorMessage.includes('ELEVENLABS_API_KEY')) {
        errorMessage = 'ELEVENLABS_API_KEY is not set in Netlify environment variables or local .env file.';
        elements.backendStatusPanel.classList.remove('hidden');
      }

      throw new Error(errorMessage);
    }

    // Binary audio/mpeg stream returned from the Netlify function
    const blob = await response.blob();

    loadAndPlayAudioBlob(blob, {
      text,
      voiceId,
      voiceName: elements.voiceSelect.options[elements.voiceSelect.selectedIndex]?.text.split('(')[0].trim(),
      modelId,
      modelName: MODEL_DETAILS[modelId]?.name || modelId
    });

    showStatus('Narration synthesized successfully! Playing now...', 'success');
  } catch (error) {
    console.error('Narration error:', error);
    showStatus(error.message, 'error');
  } finally {
    setGenerationState(false);
  }
}

function setGenerationState(isGenerating) {
  state.isGenerating = isGenerating;
  if (isGenerating) {
    elements.playNarrationBtn.disabled = true;
    elements.btnSpinner.classList.remove('hidden');
    elements.playIcon.classList.add('hidden');
    elements.btnMainText.textContent = 'Generating Voice...';
    elements.btnSubText.textContent = 'Synthesizing audio via Netlify Serverless Function';
    elements.audioStatusBadge.textContent = 'Synthesizing';
    elements.audioStatusBadge.className = 'pulse-badge generating';
  } else {
    elements.playNarrationBtn.disabled = false;
    elements.btnSpinner.classList.add('hidden');
    elements.playIcon.classList.remove('hidden');
    elements.btnMainText.textContent = 'Play Narration';
    elements.btnSubText.textContent = 'Generate audio with ElevenLabs AI (Ctrl + Enter)';
  }
}

function loadAndPlayAudioBlob(blob, meta) {
  if (state.currentAudioUrl) {
    URL.revokeObjectURL(state.currentAudioUrl);
  }

  state.currentAudioBlob = blob;
  state.currentAudioUrl = URL.createObjectURL(blob);
  elements.audioElement.src = state.currentAudioUrl;
  elements.audioElement.playbackRate = parseFloat(elements.playbackSpeedSelect.value);

  // Enable audio player controls
  elements.seekSlider.disabled = false;
  elements.miniPlayPauseBtn.disabled = false;
  elements.replayBtn.disabled = false;
  elements.playbackSpeedSelect.disabled = false;
  elements.downloadAudioBtn.disabled = false;
  elements.stopNarrationBtn.disabled = false;

  // Initialize Web Audio Context if needed
  initAudioContext();

  // Play audio
  elements.audioElement.play().catch(e => console.warn('Autoplay prevented:', e));

  // Add to Generation History
  addToHistory(meta, blob);
}

// ==========================================================================
// AUDIO PLAYER CONTROLS
// ==========================================================================

function initAudioPlayer() {
  const audio = elements.audioElement;

  audio.addEventListener('play', () => {
    state.isPlaying = true;
    elements.audioStatusBadge.textContent = 'Playing';
    elements.audioStatusBadge.className = 'pulse-badge playing';
    elements.visualizerOverlay.classList.add('hidden');
    elements.stopNarrationBtn.disabled = false;
    updateMiniPlayIcon(true);
    if (state.audioContext && state.audioContext.state === 'suspended') {
      state.audioContext.resume();
    }
  });

  audio.addEventListener('pause', () => {
    state.isPlaying = false;
    elements.audioStatusBadge.textContent = 'Paused';
    elements.audioStatusBadge.className = 'pulse-badge idle';
    updateMiniPlayIcon(false);
  });

  audio.addEventListener('ended', () => {
    state.isPlaying = false;
    elements.audioStatusBadge.textContent = 'Finished';
    elements.audioStatusBadge.className = 'pulse-badge idle';
    elements.stopNarrationBtn.disabled = true;
    updateMiniPlayIcon(false);
  });

  audio.addEventListener('timeupdate', () => {
    if (!isNaN(audio.duration) && audio.duration > 0) {
      const progress = (audio.currentTime / audio.duration) * 100;
      elements.seekSlider.value = progress;
      elements.currentTimeDisplay.textContent = formatTime(audio.currentTime);
      elements.totalDurationDisplay.textContent = formatTime(audio.duration);
    }
  });

  audio.addEventListener('loadedmetadata', () => {
    elements.totalDurationDisplay.textContent = formatTime(audio.duration);
    elements.currentTimeDisplay.textContent = '0:00';
  });

  // Seek bar scrub
  elements.seekSlider.addEventListener('input', (e) => {
    if (!isNaN(audio.duration) && audio.duration > 0) {
      const seekTime = (e.target.value / 100) * audio.duration;
      audio.currentTime = seekTime;
    }
  });

  // Mini Play/Pause button
  elements.miniPlayPauseBtn.addEventListener('click', () => {
    if (audio.paused) {
      audio.play();
    } else {
      audio.pause();
    }
  });

  // Stop button
  elements.stopNarrationBtn.addEventListener('click', stopAudioPlayback);

  // Replay
  elements.replayBtn.addEventListener('click', () => {
    audio.currentTime = 0;
    audio.play();
  });

  // Playback speed
  elements.playbackSpeedSelect.addEventListener('change', (e) => {
    audio.playbackRate = parseFloat(e.target.value);
  });

  // Volume slider & mute toggle
  elements.volumeSlider.addEventListener('input', (e) => {
    audio.volume = parseFloat(e.target.value);
    audio.muted = false;
    updateVolumeIcon(audio.volume);
  });

  elements.muteToggleBtn.addEventListener('click', () => {
    audio.muted = !audio.muted;
    if (audio.muted) {
      elements.volumeSlider.value = 0;
      updateVolumeIcon(0);
    } else {
      elements.volumeSlider.value = audio.volume || 1;
      updateVolumeIcon(audio.volume);
    }
  });

  // Download MP3
  elements.downloadAudioBtn.addEventListener('click', downloadCurrentAudio);
}

function stopAudioPlayback() {
  const audio = elements.audioElement;
  audio.pause();
  audio.currentTime = 0;
  state.isPlaying = false;
  elements.audioStatusBadge.textContent = 'Ready';
  elements.audioStatusBadge.className = 'pulse-badge idle';
  elements.stopNarrationBtn.disabled = true;
  updateMiniPlayIcon(false);
}

function updateMiniPlayIcon(isPlaying) {
  if (isPlaying) {
    elements.miniPlayIcon.innerHTML = '<rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/>';
  } else {
    elements.miniPlayIcon.innerHTML = '<polygon points="5 3 19 12 5 21 5 3"/>';
  }
}

function updateVolumeIcon(vol) {
  if (vol === 0) {
    elements.muteToggleBtn.innerHTML = `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
        <line x1="23" y1="9" x2="17" y2="15"/>
        <line x1="17" y1="9" x2="23" y2="15"/>
      </svg>`;
  } else {
    elements.muteToggleBtn.innerHTML = `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
        <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"/>
      </svg>`;
  }
}

function formatTime(seconds) {
  if (isNaN(seconds)) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
}

function downloadCurrentAudio() {
  if (!state.currentAudioBlob) return;
  const url = URL.createObjectURL(state.currentAudioBlob);
  const a = document.createElement('a');
  a.style.display = 'none';
  a.href = url;
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const voiceName = elements.voiceSelect.options[elements.voiceSelect.selectedIndex]?.text.split('(')[0].trim().toLowerCase() || 'elevenlabs';
  a.download = `elevenlabs-${voiceName}-${timestamp}.mp3`;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 100);
}

// ==========================================================================
// REAL-TIME CANVAS AUDIO VISUALIZER
// ==========================================================================

function initAudioContext() {
  if (!state.audioContext) {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    state.audioContext = new AudioContext();
    state.analyser = state.audioContext.createAnalyser();
    state.analyser.fftSize = 256;
    state.sourceNode = state.audioContext.createMediaElementSource(elements.audioElement);
    state.sourceNode.connect(state.analyser);
    state.analyser.connect(state.audioContext.destination);
  }
}

function initCanvasVisualizer() {
  const canvas = elements.visualizerCanvas;
  const ctx = canvas.getContext('2d');

  function resizeCanvas() {
    canvas.width = canvas.parentElement.clientWidth * window.devicePixelRatio;
    canvas.height = canvas.parentElement.clientHeight * window.devicePixelRatio;
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
  }

  window.addEventListener('resize', resizeCanvas);
  resizeCanvas();

  let phase = 0;

  function renderFrame() {
    requestAnimationFrame(renderFrame);
    const width = canvas.width / window.devicePixelRatio;
    const height = canvas.height / window.devicePixelRatio;

    ctx.clearRect(0, 0, width, height);

    if (state.isPlaying && state.analyser) {
      // Live Audio Frequency Bar Visualization
      const bufferLength = state.analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);
      state.analyser.getByteFrequencyData(dataArray);

      const barCount = 48;
      const barWidth = (width / barCount) - 3;

      for (let i = 0; i < barCount; i++) {
        const dataIndex = Math.floor(i * (bufferLength / barCount));
        const barHeight = (dataArray[dataIndex] / 255) * (height * 0.85);

        const x = i * (barWidth + 3) + 2;
        const y = height - barHeight;

        const gradient = ctx.createLinearGradient(0, height, 0, y);
        gradient.addColorStop(0, 'rgba(99, 102, 241, 0.2)');
        gradient.addColorStop(0.5, 'rgba(139, 92, 246, 0.8)');
        gradient.addColorStop(1, 'rgba(236, 72, 153, 1)');

        ctx.fillStyle = gradient;
        ctx.shadowColor = 'rgba(139, 92, 246, 0.4)';
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.roundRect(x, y, barWidth, Math.max(barHeight, 4), [4, 4, 0, 0]);
        ctx.fill();
        ctx.shadowBlur = 0;
      }
    } else {
      // Gentle Idle Wave Motion
      phase += 0.03;
      ctx.beginPath();
      ctx.moveTo(0, height / 2);

      const waveGrad = ctx.createLinearGradient(0, 0, width, 0);
      waveGrad.addColorStop(0, 'rgba(99, 102, 241, 0.3)');
      waveGrad.addColorStop(0.5, 'rgba(139, 92, 246, 0.6)');
      waveGrad.addColorStop(1, 'rgba(6, 182, 212, 0.3)');

      ctx.strokeStyle = waveGrad;
      ctx.lineWidth = 2.5;

      for (let x = 0; x < width; x += 3) {
        const y = (height / 2) + Math.sin(x * 0.015 + phase) * 8 + Math.cos(x * 0.03 - phase) * 5;
        ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
  }

  renderFrame();
}

// ==========================================================================
// HISTORY MANAGEMENT
// ==========================================================================

function addToHistory(meta, blob) {
  const reader = new FileReader();
  reader.readAsDataURL(blob);
  reader.onloadend = () => {
    const base64Audio = reader.result;
    const historyItem = {
      id: Date.now(),
      text: meta.text,
      voiceName: meta.voiceName,
      modelName: meta.modelName,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      audioData: base64Audio
    };

    state.history.unshift(historyItem);
    if (state.history.length > 10) {
      state.history.pop();
    }

    try {
      localStorage.setItem('elevenlabs_history', JSON.stringify(state.history));
    } catch (e) {
      console.warn('Storage quota exceeded, storing in memory only');
    }
    renderHistory();
  };
}

function renderHistory() {
  const list = elements.historyList;
  if (!state.history || state.history.length === 0) {
    list.innerHTML = `
      <div class="history-empty">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <circle cx="12" cy="12" r="10"/>
          <polyline points="12 6 12 12 14 14"/>
        </svg>
        <p>Generated audio recordings will appear here for instant replay and download.</p>
      </div>`;
    return;
  }

  list.innerHTML = '';
  state.history.forEach(item => {
    const el = document.createElement('div');
    el.className = 'history-item';
    el.innerHTML = `
      <div class="history-meta">
        <div class="history-text" title="${escapeHtml(item.text)}">"${escapeHtml(item.text)}"</div>
        <div class="history-details">
          <span>${escapeHtml(item.voiceName)}</span>
          <span>•</span>
          <span>${escapeHtml(item.modelName)}</span>
          <span>•</span>
          <span>${item.timestamp}</span>
        </div>
      </div>
      <div class="history-actions">
        <button class="history-action-btn play-history" title="Play recording" data-id="${item.id}">
          <svg viewBox="0 0 24 24" fill="currentColor">
            <polygon points="5 3 19 12 5 21 5 3"/>
          </svg>
        </button>
        <button class="history-action-btn download-history" title="Download MP3" data-id="${item.id}">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="7 10 12 15 17 10"/>
            <line x1="12" y1="15" x2="12" y2="3"/>
          </svg>
        </button>
      </div>
    `;

    // History Play Click
    el.querySelector('.play-history').addEventListener('click', () => {
      elements.audioElement.src = item.audioData;
      elements.audioElement.playbackRate = parseFloat(elements.playbackSpeedSelect.value);
      elements.seekSlider.disabled = false;
      elements.miniPlayPauseBtn.disabled = false;
      elements.replayBtn.disabled = false;
      elements.downloadAudioBtn.disabled = false;
      elements.stopNarrationBtn.disabled = false;
      initAudioContext();
      elements.audioElement.play();
      showStatus(`Playing recording: ${item.voiceName} (${item.modelName})`, 'info');
    });

    // History Download Click
    el.querySelector('.download-history').addEventListener('click', () => {
      const a = document.createElement('a');
      a.href = item.audioData;
      a.download = `elevenlabs-${item.voiceName.toLowerCase()}-${item.id}.mp3`;
      a.click();
    });

    list.appendChild(el);
  });
}

function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// ==========================================================================
// EVENT LISTENERS & SHORTCUTS
// ==========================================================================

function setupEventListeners() {
  // Prompt Sample Pills
  document.querySelectorAll('.pill-chip[data-sample]').forEach(btn => {
    btn.addEventListener('click', () => {
      const sampleKey = btn.getAttribute('data-sample');
      if (SAMPLES[sampleKey]) {
        elements.textInput.value = SAMPLES[sampleKey];
        updateTextMetrics();
        elements.textInput.focus();
      }
    });
  });

  elements.clearTextBtn.addEventListener('click', () => {
    elements.textInput.value = '';
    updateTextMetrics();
    elements.textInput.focus();
  });

  // Refresh Voices Button (Syncs via Netlify serverless function)
  elements.refreshVoicesBtn.addEventListener('click', () => {
    fetchUserVoices(false);
  });

  // Hero Play Narration CTA Button
  elements.playNarrationBtn.addEventListener('click', generateAndPlayNarration);

  // Clear History Button
  elements.clearHistoryBtn.addEventListener('click', () => {
    state.history = [];
    localStorage.removeItem('elevenlabs_history');
    renderHistory();
  });

  // Status Notification Dismiss
  elements.dismissStatusBtn.addEventListener('click', () => {
    elements.statusNotification.classList.add('hidden');
  });

  // Keyboard shortcut: Ctrl+Enter or Cmd+Enter to narrate
  document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      generateAndPlayNarration();
    }
  });
}

// ==========================================================================
// STATUS BANNER UTILITY
// ==========================================================================

function showStatus(message, type = 'info') {
  elements.statusBannerMessage.textContent = message;
  elements.statusNotification.className = `status-banner ${type}`;
  elements.statusNotification.classList.remove('hidden');

  const icons = {
    info: 'ℹ️',
    success: '✨',
    error: '⚠️'
  };
  elements.statusBannerIcon.textContent = icons[type] || 'ℹ️';

  if (type === 'success') {
    setTimeout(() => {
      elements.statusNotification.classList.add('hidden');
    }, 6000);
  }
}
