const searchInput = document.getElementById('styleSearch');
const styleList = document.getElementById('styleList');
const loadBtn = document.getElementById('loadBtn');
const printBtn = document.getElementById('printBtn');
const adminToggle = document.getElementById('adminToggle');
const adminPanel = document.getElementById('adminPanel');
const adminToken = document.getElementById('adminToken');
const rawDataFile = document.getElementById('rawDataFile');
const uploadBtn = document.getElementById('uploadBtn');
const uploadStatus = document.getElementById('uploadStatus');

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

async function uploadRawData() {
  const file = rawDataFile.files[0];
  if (!file) { uploadStatus.textContent = '업로드할 RAW DATA Excel 파일을 선택하세요.'; return; }
  if (!file.name.toLowerCase().endsWith('.xlsx')) { uploadStatus.textContent = '.xlsx 파일만 업로드할 수 있습니다.'; return; }
  uploadBtn.disabled = true;
  uploadStatus.textContent = '업로드 및 RAW DATA 검증 중...';
  const form = new FormData();
  form.append('file', file);
  try {
    const response = await fetch('/api/admin/raw-data', {
      method: 'POST',
      headers: { 'X-Admin-Token': adminToken.value },
      body: form
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.detail || '업로드 실패');
    uploadStatus.textContent = `완료: ${result.filename} / ${result.style_count} styles`;
    rawDataFile.value = '';
    searchInput.value = '';
    await refreshStyles();
  } catch (error) {
    uploadStatus.textContent = `오류: ${error.message}`;
  } finally {
    uploadBtn.disabled = false;
  }
}

adminToggle.addEventListener('click', () => adminPanel.classList.toggle('hidden'));
uploadBtn.addEventListener('click', uploadRawData);
let debounceTimer;
searchInput.addEventListener('input', () => {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => refreshStyles(searchInput.value), 150);
});
searchInput.addEventListener('keydown', e => { if (e.key === 'Enter') loadStyle(); });
loadBtn.addEventListener('click', loadStyle);
printBtn.addEventListener('click', () => window.print());
refreshStyles();
