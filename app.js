const STORAGE_KEY = 'simplersvp:lastText';

const state = {
  words: [],
  index: 0,
  wpm: 350,
  playing: false,
  timerId: null,
};

const display = document.getElementById('display');
const status = document.getElementById('status');
const progressBar = document.getElementById('progressBar');
const wpmRange = document.getElementById('wpmRange');
const wpmInput = document.getElementById('wpmInput');
const playPause = document.getElementById('playPause');
const resetButton = document.getElementById('reset');
const textInput = document.getElementById('textInput');
const fileInput = document.getElementById('fileInput');
const loadTextButton = document.getElementById('loadText');
const dropZone = document.getElementById('dropZone');

const clampWpm = (value) => Math.min(1000, Math.max(200, Number(value) || 350));

const markdownToText = (text) =>
  text
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
    .replace(/\[[^\]]*\]\([^)]*\)/g, '$1')
    .replace(/^#{1,6}\s*/gm, '')
    .replace(/[>*_~\-]{1,3}/g, ' ');

const wordsFromText = (text) =>
  text
    .replace(/\s+/g, ' ')
    .trim()
    .split(' ')
    .filter(Boolean);

const updateStatus = () => {
  status.textContent = `${state.index} / ${state.words.length}`;
  const progress = state.words.length ? (state.index / state.words.length) * 100 : 0;
  progressBar.style.width = `${Math.min(100, Math.max(0, progress))}%`;
};

const updateDisplay = () => {
  display.textContent = state.words[state.index] || 'Fertig';
};

const clearTimer = () => {
  if (state.timerId) {
    clearTimeout(state.timerId);
    state.timerId = null;
  }
};

const stop = () => {
  state.playing = false;
  playPause.textContent = 'Play';
  clearTimer();
};

const tick = () => {
  if (!state.playing) return;

  if (state.index >= state.words.length) {
    stop();
    updateDisplay();
    updateStatus();
    return;
  }

  updateDisplay();
  state.index += 1;
  updateStatus();

  const delay = Math.round(60000 / state.wpm);
  state.timerId = setTimeout(tick, delay);
};

const play = () => {
  if (!state.words.length) return;
  state.playing = true;
  playPause.textContent = 'Pause';
  clearTimer();
  tick();
};

const applyWpm = (value) => {
  state.wpm = clampWpm(value);
  wpmRange.value = String(state.wpm);
  wpmInput.value = String(state.wpm);
};

const loadText = (rawText) => {
  const normalized = wordsFromText(rawText);
  state.words = normalized;
  state.index = 0;
  stop();
  updateDisplay();
  updateStatus();
  updateStatus();

  if (normalized.length) {
    localStorage.setItem(STORAGE_KEY, rawText);
  }
};

const readFile = async (file) => {
  if (!file) return;
  const fileName = file.name.toLowerCase();
  const content = await file.text();
  const parsed = fileName.endsWith('.md') ? markdownToText(content) : content;
  textInput.value = parsed;
  loadText(parsed);
};

wpmRange.addEventListener('input', (event) => applyWpm(event.target.value));
wpmInput.addEventListener('change', (event) => applyWpm(event.target.value));

playPause.addEventListener('click', () => {
  if (state.playing) {
    stop();
    return;
  }
  play();
});

resetButton.addEventListener('click', () => {
  state.index = 0;
  stop();
  updateDisplay();
});

loadTextButton.addEventListener('click', () => {
  if (textInput.value.trim()) {
    loadText(textInput.value);
  }
});

fileInput.addEventListener('change', (event) => {
  readFile(event.target.files?.[0]);
});

['dragenter', 'dragover'].forEach((eventName) => {
  dropZone.addEventListener(eventName, (event) => {
    event.preventDefault();
    dropZone.classList.add('active');
  });
});

['dragleave', 'drop'].forEach((eventName) => {
  dropZone.addEventListener(eventName, (event) => {
    event.preventDefault();
    dropZone.classList.remove('active');
  });
});

dropZone.addEventListener('drop', (event) => {
  const [file] = event.dataTransfer?.files || [];
  readFile(file);
});

dropZone.addEventListener('keydown', (event) => {
  if (event.key === 'Enter' || event.key === ' ') {
    fileInput.click();
  }
});

applyWpm(state.wpm);
const savedText = localStorage.getItem(STORAGE_KEY) || '';
if (savedText) {
  textInput.value = savedText;
  loadText(savedText);
} else {
  updateDisplay();
  updateStatus();
}

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(() => {});
  });
}
