const seasonSelect = document.getElementById('seasonSelect');
const dataStatus = document.getElementById('dataStatus');
const searchInput = document.getElementById('styleSearch');
const styleList = document.getElementById('styleList');
const colorCodeSelect = document.getElementById('colorCodeSelect');
const loadBtn = document.getElementById('loadBtn');
const printBtn = document.getElementById('printBtn');
const adminToggle = document.getElementById('adminToggle');
const adminPanel = document.getElementById('adminPanel');
const adminSeason = document.getElementById('adminSeason');
const adminToken = document.getElementById('adminToken');
const rawDataFile = document.getElementById('rawDataFile');
const uploadBtn = document.getElementById('uploadBtn');
const uploadStatus = document.getElementById('uploadStatus');
const sampleTag = document.getElementById('sampleTag');
const a4PrintArea = document.getElementById('a4PrintArea');
const epatternText = document.getElementById('epatternText');

function allFields(name) { return [...document.querySelectorAll(`[data-field="${name}"]`)]; }
function setField(name, value) {
  allFields(name).forEach(el => { if (el.type === 'checkbox') el.checked = Boolean(value); else el.value = value ?? ''; });
  requestAnimationFrame(fitTagText);
}
function syncMatchingField(source) {
  const name = source.dataset.field; if (!name) return;
  allFields(name).forEach(el => { if (el === source) return; if (source.type === 'checkbox') el.checked = source.checked; else el.value = source.value; });
  requestAnimationFrame(fitTagText);
}
document.addEventListener('input', e => { if (e.target?.dataset?.field) syncMatchingField(e.target); });
document.addEventListener('change', e => { if (e.target?.dataset?.field) syncMatchingField(e.target); });

function setEPattern(value) {
  const v = value || 'YES';
  const editRadio = document.querySelector(`input[name="epattern"][value="${v}"]`);
  if (editRadio) editRadio.checked = true;
  if (epatternText) epatternText.textContent = v;
}
document.querySelectorAll('input[name="epattern"]').forEach(r => r.addEventListener('change', () => setEPattern(r.value)));

function fitOneLine(el) {
  let size = 7.0; const minPt = 4.2; el.style.fontSize = `${size}pt`;
  while (size > minPt && el.scrollWidth > el.clientWidth + 1) { size -= 0.2; el.style.fontSize = `${size}pt`; }
}
function fitTwoLines(el) {
  let size = 6.7; const minPt = 4.0; el.style.fontSize = `${size}pt`;
  while (size > minPt && (el.scrollHeight > el.clientHeight + 1 || el.scrollWidth > el.clientWidth + 1)) { size -= 0.2; el.style.fontSize = `${size}pt`; }
}
function fitTagText(root = sampleTag) {
  if (!root) return;
  root.querySelectorAll('.fit-one').forEach(fitOneLine);
  root.querySelectorAll('.fit-two').forEach(fitTwoLines);
}
function applyTag(data) {
  Object.entries(data).forEach(([key, value]) => setField(key, value));
  setField('receiving_date', ''); setField('fitting_date', ''); setField('confirm_date', '');
  setEPattern(data.e_pattern || 'YES'); requestAnimationFrame(fitTagText);
}

async function refreshSeasons(preferred = '') {
  const response = await fetch('/api/seasons');
  if (!response.ok) { dataStatus.textContent = 'Unable to load season list.'; return; }
  const seasons = await response.json();
  seasonSelect.innerHTML = seasons.length ? seasons.map(s => `<option value="${s}">${s}</option>`).join('') : '<option value="">NO RAW DATA</option>';
  if (preferred && seasons.includes(preferred)) seasonSelect.value = preferred; else if (seasons.length) seasonSelect.value = seasons[0];
  if (seasonSelect.value) {
    dataStatus.textContent = `${seasonSelect.value} RAW DATA ready`; adminSeason.value = seasonSelect.value; await refreshStyles();
  } else {
    dataStatus.textContent = 'Upload RAW DATA for a season to begin.'; styleList.innerHTML = '';
  }
}
async function refreshStyles(query = '') {
  const season = seasonSelect.value; if (!season) return;
  const response = await fetch(`/api/styles?season=${encodeURIComponent(season)}&q=${encodeURIComponent(query)}`);
  if (!response.ok) { styleList.innerHTML = ''; return; }
  const styles = await response.json(); styleList.innerHTML = styles.map(s => `<option value="${s}"></option>`).join('');
}
async function refreshColors(style) {
  const season = seasonSelect.value;
  colorCodeSelect.disabled = true;
  colorCodeSelect.innerHTML = '<option value="">Loading...</option>';
  const response = await fetch(`/api/styles/${encodeURIComponent(style)}/colors?season=${encodeURIComponent(season)}`);
  if (!response.ok) { colorCodeSelect.innerHTML = '<option value="">No color codes</option>'; return; }
  const colors = await response.json();
  if (!colors.length) { colorCodeSelect.innerHTML = '<option value="">No color codes</option>'; return; }
  colorCodeSelect.innerHTML = colors.map(c => `<option value="${c}">${c}</option>`).join('');
  colorCodeSelect.disabled = false;
}
async function loadSelectedVariant() {
  const style = searchInput.value.trim(); const season = seasonSelect.value; const color = colorCodeSelect.value;
  if (!style || !season) return;
  const params = new URLSearchParams({ season }); if (color) params.set('color_code', color);
  const response = await fetch(`/api/styles/${encodeURIComponent(style)}?${params.toString()}`);
  if (!response.ok) { alert('STYLE / COLOR CODE not found.'); return; }
  applyTag(await response.json());
}
async function loadStyle() {
  const style = searchInput.value.trim(); if (!style || !seasonSelect.value) return;
  await refreshColors(style);
  await loadSelectedVariant();
}

async function uploadRawData() {
  const season = adminSeason.value.trim().toUpperCase(); const file = rawDataFile.files[0];
  if (!/^[0-9]{2}(SS|FW)$/.test(season)) { uploadStatus.textContent = 'Enter season as 27SS or 27FW.'; return; }
  if (!file) { uploadStatus.textContent = 'Select a RAW DATA Excel file.'; return; }
  if (!file.name.toLowerCase().endsWith('.xlsx')) { uploadStatus.textContent = 'Only .xlsx files are supported.'; return; }
  uploadBtn.disabled = true; uploadStatus.textContent = 'Uploading and validating RAW DATA...';
  const form = new FormData(); form.append('season', season); form.append('file', file);
  try {
    const response = await fetch('/api/admin/raw-data', { method: 'POST', headers: { 'X-Admin-Token': adminToken.value }, body: form });
    const result = await response.json(); if (!response.ok) throw new Error(result.detail || 'Upload failed');
    uploadStatus.textContent = `Completed: ${season} / ${result.style_count} styles / ${result.filename}`;
    rawDataFile.value = ''; searchInput.value = ''; colorCodeSelect.innerHTML = '<option value="">Select style first</option>'; colorCodeSelect.disabled = true;
    await refreshSeasons(season);
  } catch (error) { uploadStatus.textContent = `Error: ${error.message}`; } finally { uploadBtn.disabled = false; }
}

function syncCloneValues(source, clone) {
  const srcFields = source.querySelectorAll('input, textarea'); const cloneFields = clone.querySelectorAll('input, textarea');
  srcFields.forEach((src, i) => { const dst = cloneFields[i]; if (!dst) return; if (src.type === 'checkbox' || src.type === 'radio') dst.checked = src.checked; else { dst.value = src.value; dst.style.fontSize = src.style.fontSize; } });
  const srcEP = source.querySelector('.epattern-value span'); const dstEP = clone.querySelector('.epattern-value span'); if (srcEP && dstEP) dstEP.textContent = srcEP.textContent;
}
function buildA4Copies() {
  a4PrintArea.innerHTML = '';
  for (let i = 0; i < 6; i += 1) { const clone = sampleTag.cloneNode(true); clone.removeAttribute('id'); clone.classList.add('a4-tag'); syncCloneValues(sampleTag, clone); a4PrintArea.appendChild(clone); }
}
function printCurrent() {
  fitTagText(); const mode = document.querySelector('input[name="printMode"]:checked')?.value || 'label'; document.body.dataset.printMode = mode;
  if (mode === 'a4') buildA4Copies(); window.print(); setTimeout(() => { delete document.body.dataset.printMode; }, 300);
}

adminToggle.addEventListener('click', () => adminPanel.classList.toggle('hidden'));
uploadBtn.addEventListener('click', uploadRawData);
seasonSelect.addEventListener('change', async () => {
  searchInput.value = ''; colorCodeSelect.innerHTML = '<option value="">Select style first</option>'; colorCodeSelect.disabled = true;
  adminSeason.value = seasonSelect.value; dataStatus.textContent = `${seasonSelect.value} RAW DATA ready`; await refreshStyles();
});
colorCodeSelect.addEventListener('change', loadSelectedVariant);
let debounceTimer;
searchInput.addEventListener('input', () => { clearTimeout(debounceTimer); colorCodeSelect.disabled = true; colorCodeSelect.innerHTML = '<option value="">Select style first</option>'; debounceTimer = setTimeout(() => refreshStyles(searchInput.value), 150); });
searchInput.addEventListener('keydown', e => { if (e.key === 'Enter') loadStyle(); });
loadBtn.addEventListener('click', loadStyle);
printBtn.addEventListener('click', printCurrent);
window.addEventListener('resize', () => requestAnimationFrame(fitTagText));
refreshSeasons(); requestAnimationFrame(fitTagText);
