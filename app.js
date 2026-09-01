const STORAGE_TEXT_KEY = 'simplersvp:lastText';
const STORAGE_PROGRESS_KEY = 'simplersvp:lastProgress';

const state = {
  words: [],
  wordOffsets: [],
  sourceText: '',
  index: 0,
  wpm: 350,
  playing: false,
  timerId: null,
};

const display = document.getElementById('display');
const statusCurrent = document.getElementById('statusCurrent');
const statusTotal = document.getElementById('statusTotal');
const progressBar = document.getElementById('progressBar');
const wpmRange = document.getElementById('wpmRange');
const wpmInput = document.getElementById('wpmInput');
const textInput = document.getElementById('textInput');
const fileInput = document.getElementById('fileInput');
const dropZone = document.getElementById('dropZone');
let textInputTimerId = null;
let textareaScrollMeasure = null;

const clampWpm = (value) => Math.min(1000, Math.max(200, Number(value) || 350));

const markdownToText = (text) =>
  text
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
    .replace(/\[[^\]]*\]\([^)]*\)/g, '$1')
    .replace(/^#{1,6}\s*/gm, '')
    .replace(/[>*_~\-]{1,3}/g, ' ');

const parseText = (text) => {
  const words = [];
  const wordOffsets = [];
  for (const match of text.matchAll(/\S+/g)) {
    words.push(match[0]);
    wordOffsets.push(match.index || 0);
  }
  return { words, wordOffsets };
};

const updateStatus = () => {
  statusCurrent.textContent = String(state.index);
  statusTotal.textContent = String(state.words.length);
  const progress = state.words.length ? (state.index / state.words.length) * 100 : 0;
  progressBar.style.width = `${Math.min(100, Math.max(0, progress))}%`;
  localStorage.setItem(STORAGE_PROGRESS_KEY, String(state.index));
};

const updateDisplay = () => {
  display.textContent = state.words[state.index] || 'Fertig';
};

const ensureTextareaScrollMeasure = () => {
  if (textareaScrollMeasure) return textareaScrollMeasure;

  const mirror = document.createElement('div');
  const marker = document.createElement('span');
  marker.textContent = '\u200b';

  mirror.style.position = 'absolute';
  mirror.style.left = '-9999px';
  mirror.style.top = '0';
  mirror.style.visibility = 'hidden';
  mirror.style.pointerEvents = 'none';
  mirror.style.whiteSpace = 'pre-wrap';
  mirror.style.overflowWrap = 'break-word';
  mirror.style.wordBreak = 'break-word';

  document.body.appendChild(mirror);
  mirror.appendChild(marker);

  textareaScrollMeasure = { mirror, marker };
  return textareaScrollMeasure;
};

const getWordTopOffsetInTextarea = (charOffset) => {
  const { mirror, marker } = ensureTextareaScrollMeasure();
  const computed = getComputedStyle(textInput);
  const paddingTop = Number.parseFloat(computed.paddingTop) || 0;
  const paddingRight = Number.parseFloat(computed.paddingRight) || 0;
  const paddingBottom = Number.parseFloat(computed.paddingBottom) || 0;
  const paddingLeft = Number.parseFloat(computed.paddingLeft) || 0;
  const contentWidth = Math.max(0, textInput.clientWidth - paddingLeft - paddingRight);

  mirror.style.width = `${contentWidth}px`;
  mirror.style.font = computed.font;
  mirror.style.lineHeight = computed.lineHeight;
  mirror.style.letterSpacing = computed.letterSpacing;
  mirror.style.padding = `${paddingTop}px ${paddingRight}px ${paddingBottom}px ${paddingLeft}px`;
  mirror.style.border = '0';
  mirror.style.boxSizing = 'content-box';
  mirror.style.tabSize = computed.tabSize;

  const safeOffset = Math.max(0, Math.min(charOffset, state.sourceText.length));
  const prefix = state.sourceText.slice(0, safeOffset);
  mirror.textContent = prefix;
  mirror.appendChild(marker);

  return marker.offsetTop;
};

const syncTextInputToCurrentWord = (wordIndex = state.index) => {
  if (!state.words.length) return;
  if (document.activeElement === textInput && !state.playing) return;

  const activeWordIndex = Math.min(Math.max(0, wordIndex), state.words.length - 1);
  const start = state.wordOffsets[activeWordIndex];
  const word = state.words[activeWordIndex];
  if (typeof start !== 'number' || !word) return;

  const end = start + word.length;
  textInput.setSelectionRange(start, end);
  const computedLineHeight = Number.parseFloat(getComputedStyle(textInput).lineHeight);
  const lineHeight = Number.isFinite(computedLineHeight) && computedLineHeight > 0 ? computedLineHeight : 24;

  const markerTop = getWordTopOffsetInTextarea(start);
  const targetTop = Math.max(0, markerTop - textInput.clientHeight / 2 + lineHeight / 2);
  const shouldUseSmooth = state.playing && 60000 / state.wpm >= 220;

  textInput.scrollTo({
    top: targetTop,
    behavior: shouldUseSmooth ? 'smooth' : 'auto',
  });
};

const clearTimer = () => {
  if (state.timerId) {
    clearTimeout(state.timerId);
    state.timerId = null;
  }
};

const stop = () => {
  state.playing = false;
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

  const currentWordIndex = state.index;
  updateDisplay();
  syncTextInputToCurrentWord(currentWordIndex);
  state.index += 1;
  updateStatus();

  const delay = Math.round(60000 / state.wpm);
  state.timerId = setTimeout(tick, delay);
};

const play = () => {
  if (!state.words.length) return;
  state.playing = true;
  clearTimer();
  tick();
};

const togglePlayback = () => {
  if (state.playing) {
    stop();
    return;
  }
  play();
};

const applyWpm = (value) => {
  state.wpm = clampWpm(value);
  wpmRange.value = String(state.wpm);
  wpmInput.value = String(state.wpm);
};

const loadText = (rawText) => {
  const parsedText = parseText(rawText);
  state.words = parsedText.words;
  state.wordOffsets = parsedText.wordOffsets;
  state.sourceText = rawText;
  state.index = 0;
  stop();
  updateDisplay();
  updateStatus();
  syncTextInputToCurrentWord();

  if (parsedText.words.length) {
    localStorage.setItem(STORAGE_TEXT_KEY, rawText);
  }
};

const jumpToProgressIndex = (targetReadWords) => {
  if (!state.words.length) return;
  const clamped = Math.min(state.words.length, Math.max(0, targetReadWords));
  const wasPlaying = state.playing;
  stop();
  state.index = clamped;
  updateDisplay();
  updateStatus();
  syncTextInputToCurrentWord();
  if (wasPlaying && state.index < state.words.length) {
    play();
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

display.addEventListener('click', togglePlayback);
display.addEventListener('keydown', (event) => {
  if (event.key === 'Enter') {
    event.preventDefault();
    togglePlayback();
  }
});

const isInteractiveInput = (target) =>
  target instanceof Element &&
  target.closest('input, textarea, select, button, a, [contenteditable="true"], #dropZone');

document.addEventListener('keydown', (event) => {
  if (event.defaultPrevented) return;
  if (event.key !== ' ') return;
  if (isInteractiveInput(event.target)) return;
  event.preventDefault();
  togglePlayback();
});

textInput.addEventListener('input', () => {
  if (textInputTimerId) {
    clearTimeout(textInputTimerId);
  }
  textInputTimerId = setTimeout(() => {
    loadText(textInput.value);
    textInputTimerId = null;
  }, 200);
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

statusCurrent.addEventListener('click', () => {
  if (!state.words.length) return;
  const value = window.prompt(
    `Zu welcher gelesenen Stelle springen? (0-${state.words.length})`,
    String(state.index)
  );
  if (value === null) return;
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed)) return;
  jumpToProgressIndex(parsed);
});

applyWpm(state.wpm);
const savedText = localStorage.getItem(STORAGE_TEXT_KEY) || '';
if (savedText) {
  const savedProgress = Number.parseInt(localStorage.getItem(STORAGE_PROGRESS_KEY) || '0', 10);
  textInput.value = savedText;
  loadText(savedText);
  if (Number.isFinite(savedProgress) && savedProgress > 0) {
    jumpToProgressIndex(savedProgress);
  }
} else {
  updateDisplay();
  updateStatus();
}

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(() => {});
  });
}
