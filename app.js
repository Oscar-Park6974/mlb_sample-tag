const searchInput = document.getElementById('styleSearch');
const styleList = document.getElementById('styleList');
const loadBtn = document.getElementById('loadBtn');
const printBtn = document.getElementById('printBtn');

const fields = [...document.querySelectorAll('[data-field]')];

function setField(name, value) {
  const el = document.querySelector(`[data-field="${name}"]`);
  if (!el) return;
  if (el.type === 'checkbox') el.checked = Boolean(value);
  else el.value = value ?? '';
}

function applyTag(data) {
  Object.entries(data).forEach(([key, value]) => setField(key, value));
  const ePattern = data.e_pattern || 'YES';
  const radio = document.querySelector(`input[name="epattern"][value="${ePattern}"]`);
  if (radio) radio.checked = true;
}

async function refreshStyles(query = '') {
  const response = await fetch(`/api/styles?q=${encodeURIComponent(query)}`);
  if (!response.ok) return;
  const styles = await response.json();
  styleList.innerHTML = styles.map(s => `<option value="${s}"></option>`).join('');
}

async function loadStyle() {
  const style = searchInput.value.trim();
  if (!style) return;
  const response = await fetch(`/api/styles/${encodeURIComponent(style)}`);
  if (!response.ok) {
    alert('STYLE NO를 찾을 수 없습니다.');
    return;
  }
  applyTag(await response.json());
}

let debounceTimer;
searchInput.addEventListener('input', () => {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => refreshStyles(searchInput.value), 150);
});
searchInput.addEventListener('keydown', e => {
  if (e.key === 'Enter') loadStyle();
});
loadBtn.addEventListener('click', loadStyle);
printBtn.addEventListener('click', () => window.print());
refreshStyles();
