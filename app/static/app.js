const seasonSelect = document.getElementById('seasonSelect');
const dataStatus = document.getElementById('dataStatus');
const searchInput = document.getElementById('styleSearch');
const styleList = document.getElementById('styleList');
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

function allFields(name) {
  return [...document.querySelectorAll(`[data-field="${name}"]`)];
}

function setField(name, value) {
  allFields(name).forEach(el => {
    if (el.type === 'checkbox') el.checked = Boolean(value);
    else el.value = value ?? '';
  });
}

function syncMatchingField(source) {
  const name = source.dataset.field;
  if (!name) return;
  allFields(name).forEach(el => {
    if (el === source) return;
    if (source.type === 'checkbox') el.checked = source.checked;
    else el.value = source.value;
  });
}

document.addEventListener('input', e => {
  if (e.target?.dataset?.field) syncMatchingField(e.target);
});
document.addEventListener('change', e => {
  if (e.target?.dataset?.field) syncMatchingField(e.target);
});

function setEPattern(value) {
  const v = value || 'YES';
  const editRadio = document.querySelector(`input[name="epattern"][value="${v}"]`);
  const previewRadio = document.querySelector(`input[name="epattern_preview"][value="${v}"]`);
  if (editRadio) editRadio.checked = true;
  if (previewRadio) previewRadio.checked = true;
}

document.querySelectorAll('input[name="epattern"]').forEach(r => {
  r.addEventListener('change', () => setEPattern(r.value));
});

function applyTag(data) {
  Object.entries(data).forEach(([key, value]) => setField(key, value));
  setField('receiving_date', '');
  setField('fitting_date', '');
  setField('confirm_date', '');
  setEPattern(data.e_pattern || 'YES');
}

async function refreshSeasons(preferred = '') {
  const response = await fetch('/api/seasons');
  if (!response.ok) {
    dataStatus.textContent = 'Unable to load season list.';
    return;
  }
  const seasons = await response.json();
  seasonSelect.innerHTML = seasons.length
    ? seasons.map(s => `<option value="${s}">${s}</option>`).join('')
    : '<option value="">NO RAW DATA</option>';

  if (preferred && seasons.includes(preferred)) seasonSelect.value = preferred;
  else if (seasons.length) seasonSelect.value = seasons[0];

  if (seasonSelect.value) {
    dataStatus.textContent = `${seasonSelect.value} RAW DATA ready`;
    adminSeason.value = seasonSelect.value;
    await refreshStyles();
  } else {
    dataStatus.textContent = 'Upload RAW DATA for a season to begin.';
    styleList.innerHTML = '';
  }
}

async function refreshStyles(query = '') {
  const season = seasonSelect.value;
  if (!season) return;
  const response = await fetch(`/api/styles?season=${encodeURIComponent(season)}&q=${encodeURIComponent(query)}`);
  if (!response.ok) {
    styleList.innerHTML = '';
    return;
  }
  const styles = await response.json();
  styleList.innerHTML = styles.map(s => `<option value="${s}"></option>`).join('');
}

async function loadStyle() {
  const style = searchInput.value.trim();
  const season = seasonSelect.value;
  if (!style || !season) return;
  const response = await fetch(`/api/styles/${encodeURIComponent(style)}?season=${encodeURIComponent(season)}`);
  if (!response.ok) {
    alert('STYLE NO. not found in the selected season.');
    return;
  }
  applyTag(await response.json());
}

async function uploadRawData() {
  const season = adminSeason.value.trim().toUpperCase();
  const file = rawDataFile.files[0];
  if (!/^[0-9]{2}(SS|FW)$/.test(season)) {
    uploadStatus.textContent = 'Enter season as 27SS or 27FW.';
    return;
  }
  if (!file) {
    uploadStatus.textContent = 'Select a RAW DATA Excel file.';
    return;
  }
  if (!file.name.toLowerCase().endsWith('.xlsx')) {
    uploadStatus.textContent = 'Only .xlsx files are supported.';
    return;
  }

  uploadBtn.disabled = true;
  uploadStatus.textContent = 'Uploading and validating RAW DATA...';
  const form = new FormData();
  form.append('season', season);
  form.append('file', file);
  try {
    const response = await fetch('/api/admin/raw-data', {
      method: 'POST',
      headers: { 'X-Admin-Token': adminToken.value },
      body: form
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.detail || 'Upload failed');
    uploadStatus.textContent = `Completed: ${season} / ${result.style_count} styles / ${result.filename}`;
    rawDataFile.value = '';
    searchInput.value = '';
    await refreshSeasons(season);
  } catch (error) {
    uploadStatus.textContent = `Error: ${error.message}`;
  } finally {
    uploadBtn.disabled = false;
  }
}

function syncCloneValues(source, clone) {
  const srcFields = source.querySelectorAll('input, textarea');
  const cloneFields = clone.querySelectorAll('input, textarea');
  srcFields.forEach((src, i) => {
    const dst = cloneFields[i];
    if (!dst) return;
    if (src.type === 'checkbox' || src.type === 'radio') dst.checked = src.checked;
    else dst.value = src.value;
  });
}

function buildA4Copies() {
  a4PrintArea.innerHTML = '';
  for (let i = 0; i < 6; i += 1) {
    const clone = sampleTag.cloneNode(true);
    clone.removeAttribute('id');
    clone.classList.add('a4-tag');
    syncCloneValues(sampleTag, clone);
    a4PrintArea.appendChild(clone);
  }
}

function printCurrent() {
  const mode = document.querySelector('input[name="printMode"]:checked')?.value || 'label';
  document.body.dataset.printMode = mode;
  if (mode === 'a4') buildA4Copies();
  window.print();
  setTimeout(() => { delete document.body.dataset.printMode; }, 300);
}

adminToggle.addEventListener('click', () => adminPanel.classList.toggle('hidden'));
uploadBtn.addEventListener('click', uploadRawData);
seasonSelect.addEventListener('change', async () => {
  searchInput.value = '';
  adminSeason.value = seasonSelect.value;
  dataStatus.textContent = `${seasonSelect.value} RAW DATA ready`;
  await refreshStyles();
});

let debounceTimer;
searchInput.addEventListener('input', () => {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => refreshStyles(searchInput.value), 150);
});
searchInput.addEventListener('keydown', e => { if (e.key === 'Enter') loadStyle(); });
loadBtn.addEventListener('click', loadStyle);
printBtn.addEventListener('click', printCurrent);
refreshSeasons();
