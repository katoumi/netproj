// settings page - persist simple settings to localStorage
const accentSelect = document.getElementById('accentSelect');
const historyMode = document.getElementById('historyMode');
const maxHistory = document.getElementById('maxHistory');

const SETTINGS_KEY = 'netproj-settings';
const defaults = { accent: 'purple', historyMode: 'local', maxHistory: 500 };
const s = Object.assign({}, defaults, JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}'));

accentSelect.value = s.accent || defaults.accent;
historyMode.value = s.historyMode || defaults.historyMode;
maxHistory.value = s.maxHistory || defaults.maxHistory;

accentSelect.addEventListener('change', ()=>{ s.accent = accentSelect.value; applyAccent(); save(); });
historyMode.addEventListener('change', ()=>{ s.historyMode = historyMode.value; save(); });
maxHistory.addEventListener('change', ()=>{ s.maxHistory = Number(maxHistory.value); save(); });

function applyAccent(){ if(s.accent === 'purple'){ document.documentElement.style.setProperty('--accent','#7c5cff'); document.documentElement.style.setProperty('--accent-2','#a78bfa'); }
  if(s.accent === 'blue'){ document.documentElement.style.setProperty('--accent','#0b5fff'); document.documentElement.style.setProperty('--accent-2','#60a5fa'); }
  if(s.accent === 'green'){ document.documentElement.style.setProperty('--accent','#10b981'); document.documentElement.style.setProperty('--accent-2','#34d399'); } }

function save(){ localStorage.setItem(SETTINGS_KEY, JSON.stringify(s)); }
applyAccent(); save();
