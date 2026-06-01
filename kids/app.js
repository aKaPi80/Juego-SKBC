const state = {
  kids: [],
  selectedIds: new Set(),
  history: [],
  currentClassText: '',
  modeBlocks: [],
  modeIndex: 0
};

const els = {
  status: document.getElementById('backendStatus'),
  refreshBtn: document.getElementById('refreshBtn'),
  form: document.getElementById('classForm'),
  promptBtn: document.getElementById('promptBtn'),
  generateBtn: document.getElementById('generateBtn'),
  date: document.getElementById('dateInput'),
  duration: document.getElementById('durationInput'),
  weather: document.getElementById('weatherInput'),
  energy: document.getElementById('energyInput'),
  groupState: document.getElementById('groupStateInput'),
  senseiStyle: document.getElementById('senseiStyleInput'),
  senseiEnergy: document.getElementById('senseiEnergyInput'),
  season: document.getElementById('seasonInput'),
  groupControl: document.getElementById('groupControlInput'),
  missionRoles: document.getElementById('missionRolesInput'),
  material: document.getElementById('materialInput'),
  space: document.getElementById('spaceInput'),
  goal: document.getElementById('goalInput'),
  studentSearch: document.getElementById('studentSearch'),
  studentsGrid: document.getElementById('studentsGrid'),
  selectedCount: document.getElementById('selectedCount'),
  emptyState: document.getElementById('emptyState'),
  classOutput: document.getElementById('classOutput'),
  historyList: document.getElementById('historyList'),
  modeTitle: document.getElementById('modeTitle'),
  modeCard: document.getElementById('modeCard'),
  prevBlockBtn: document.getElementById('prevBlockBtn'),
  nextBlockBtn: document.getElementById('nextBlockBtn'),
  toast: document.getElementById('toast')
};

init();

function init() {
  els.date.value = new Date().toISOString().slice(0, 10);
  bindEvents();
  loadInitialData();
}

function bindEvents() {
  els.refreshBtn.addEventListener('click', loadInitialData);
  els.studentSearch.addEventListener('input', renderStudents);
  els.form.addEventListener('submit', event => {
    event.preventDefault();
    generateClass(false);
  });
  els.promptBtn.addEventListener('click', () => generateClass(true));
  els.prevBlockBtn.addEventListener('click', () => changeModeBlock(-1));
  els.nextBlockBtn.addEventListener('click', () => changeModeBlock(1));

  document.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', () => activateTab(tab.dataset.tab));
  });
}

async function loadInitialData() {
  if (!getWebAppUrl()) {
    setStatus('Falta URL Web App', 'warn');
    renderStudents();
    renderHistory();
    toast('Pega la URL del Apps Script Web App en kids/config.js');
    return;
  }

  setStatus('Conectando...', '');
  try {
    const data = await apiGet({ action: 'bootstrap' });
    state.kids = data.kids || [];
    state.history = data.history || [];
    setStatus('Conectado', 'ok');
    renderStudents();
    renderHistory();
  } catch (error) {
    console.error(error);
    setStatus('Error de conexion', 'warn');
    toast('No se pudo conectar con Apps Script.');
  }
}

async function generateClass(promptOnly) {
  if (!getWebAppUrl()) {
    toast('Falta configurar WEB_APP_URL en kids/config.js');
    return;
  }
  if (!state.selectedIds.size) {
    toast('Selecciona al menos un alumno.');
    return;
  }

  const payload = collectClassData(promptOnly);
  els.generateBtn.disabled = true;
  els.promptBtn.disabled = true;
  els.generateBtn.textContent = promptOnly ? 'Creando prompt...' : 'Generando...';

  try {
    const data = await apiPost({ action: 'generateClass', payload });
    state.currentClassText = data.classText || data.prompt || '';
    state.modeBlocks = splitClassBlocks(state.currentClassText);
    state.modeIndex = 0;
    showClass(state.currentClassText, data.promptOnly);
    renderModeBlock();
    await loadInitialData();
    activateTab('class');
    toast(data.promptOnly ? 'Prompt guardado.' : 'Clase generada.');
  } catch (error) {
    console.error(error);
    toast(error.message || 'Error al generar la clase.');
  } finally {
    els.generateBtn.disabled = false;
    els.promptBtn.disabled = false;
    els.generateBtn.textContent = 'Generar clase';
  }
}

function collectClassData(promptOnly) {
  return {
    fecha: els.date.value,
    duracion: els.duration.value,
    clima: els.weather.value,
    energiaGrupo: els.energy.value,
    estadoGrupo: els.groupState.value,
    estiloSensei: els.senseiStyle.value,
    energiaSensei: els.senseiEnergy.value,
    temporada: els.season.value,
    controlGrupo: els.groupControl.value,
    rolesMision: els.missionRoles.value,
    material: els.material.value,
    espacio: els.space.value,
    objetivo: els.goal.value,
    promptOnly,
    asistentes: Array.from(state.selectedIds)
  };
}

function renderStudents() {
  const query = normalize(els.studentSearch.value);
  const kids = state.kids.filter(k => {
    const text = normalize(`${k.nombre || ''} ${k.apellidos || ''} ${k.grado || ''}`);
    return !query || text.includes(query);
  });

  if (!kids.length) {
    els.studentsGrid.innerHTML = '<div class="empty-mini">No hay alumnos cargados.</div>';
    updateSelectedCount();
    return;
  }

  els.studentsGrid.innerHTML = kids.map(k => {
    const id = escapeHtml(k.id);
    const selected = state.selectedIds.has(String(k.id));
    return `
      <button class="student-card" type="button" data-id="${id}" aria-pressed="${selected}">
        <strong>${escapeHtml(k.nombreCompleto || k.nombre || 'Alumno')}</strong>
        <span>${escapeHtml(k.grado || 'Sin grado')}</span>
        <span>${escapeHtml(k.perfilResumen || '')}</span>
      </button>
    `;
  }).join('');

  els.studentsGrid.querySelectorAll('.student-card').forEach(card => {
    card.addEventListener('click', () => {
      const id = String(card.dataset.id);
      if (state.selectedIds.has(id)) state.selectedIds.delete(id);
      else state.selectedIds.add(id);
      renderStudents();
    });
  });

  updateSelectedCount();
}

function updateSelectedCount() {
  const total = state.selectedIds.size;
  els.selectedCount.textContent = `${total} seleccionado${total === 1 ? '' : 's'}`;
}

function showClass(text, promptOnly) {
  els.emptyState.classList.add('hidden');
  els.classOutput.classList.remove('hidden');
  const label = promptOnly ? 'Prompt para ChatGPT' : 'Clase generada';
  els.classOutput.innerHTML = `<h2>${label}</h2>${renderClassMarkup(text || 'Sin contenido.')}`;
}

function renderModeBlock() {
  if (!state.modeBlocks.length) {
    els.modeTitle.textContent = 'Sin clase cargada';
    els.modeCard.textContent = 'Genera una clase para activar esta vista.';
    return;
  }
  const block = state.modeBlocks[state.modeIndex];
  els.modeTitle.textContent = `${state.modeIndex + 1}/${state.modeBlocks.length}`;
  els.modeCard.innerHTML = renderClassMarkup(block);
}

function changeModeBlock(delta) {
  if (!state.modeBlocks.length) return;
  state.modeIndex = Math.max(0, Math.min(state.modeBlocks.length - 1, state.modeIndex + delta));
  renderModeBlock();
}

function splitClassBlocks(text) {
  const clean = String(text || '').trim();
  if (!clean) return [];
  const parts = clean.split(/\n(?=(?:A\.|B\.|C\.|D\.|E\.|F\.|G\.|H\.|I\.|\d+\.))/g)
    .map(s => s.trim())
    .filter(Boolean);
  return parts.length > 1 ? parts : [clean];
}

function renderHistory() {
  if (!state.history.length) {
    els.historyList.innerHTML = '<div class="history-item"><strong>Sin clases guardadas</strong><span>Cuando generes una clase aparecerá aqui.</span></div>';
    return;
  }
  els.historyList.innerHTML = state.history.map(item => `
    <button class="history-item" type="button" data-id="${escapeHtml(item.idClase)}">
      <strong>${escapeHtml(item.fecha || 'Sin fecha')} · ${escapeHtml(item.objetivo || 'Clase infantil')}</strong>
      <span>${escapeHtml(item.asistentes || '')}</span>
    </button>
  `).join('');
}

function activateTab(name) {
  document.querySelectorAll('.tab').forEach(tab => tab.classList.toggle('active', tab.dataset.tab === name));
  document.querySelectorAll('.tab-panel').forEach(panel => panel.classList.remove('active'));
  document.getElementById(`${name}Tab`).classList.add('active');
}

async function apiGet(params) {
  const url = new URL(getWebAppUrl());
  Object.entries(params).forEach(([key, value]) => url.searchParams.set(key, value));
  const response = await fetch(url.toString(), { method: 'GET' });
  return parseApiResponse(response);
}

async function apiPost(body) {
  if (body.action === 'generateClass') {
    const url = new URL(getWebAppUrl());
    url.searchParams.set('action', 'generateClass');
    url.searchParams.set('payload', JSON.stringify(body.payload || {}));
    const response = await fetch(url.toString(), { method: 'GET' });
    return parseApiResponse(response);
  }

  const response = await fetch(getWebAppUrl(), {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify(body)
  });
  return parseApiResponse(response);
}

async function parseApiResponse(response) {
  const text = await response.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch (error) {
    throw new Error(`Respuesta no JSON: ${text.slice(0, 120)}`);
  }
  if (!response.ok || json.ok === false) throw new Error(json.error || 'Error de servidor');
  return json.data || json;
}

function getWebAppUrl() {
  return (window.SKBC_KIDS_CONFIG && window.SKBC_KIDS_CONFIG.WEB_APP_URL || '').trim();
}

function setStatus(text, mode) {
  els.status.textContent = text;
  els.status.className = `status-pill ${mode || ''}`.trim();
}

function toast(message) {
  els.toast.textContent = message;
  els.toast.classList.add('show');
  clearTimeout(toast._timer);
  toast._timer = setTimeout(() => els.toast.classList.remove('show'), 2800);
}

function markdownLite(text) {
  const escaped = escapeHtml(text);
  return escaped
    .replace(/^### (.*)$/gm, '<h3>$1</h3>')
    .replace(/^## (.*)$/gm, '<h2>$1</h2>')
    .replace(/^\* (.*)$/gm, '<p>• $1</p>')
    .replace(/^\- (.*)$/gm, '<p>• $1</p>')
    .replace(/\n{2,}/g, '</p><p>')
    .replace(/\n/g, '<br>')
    .replace(/^/, '<p>')
    .replace(/$/, '</p>');
}

function renderClassMarkup(text) {
  const lines = String(text || '').split(/\r?\n/);
  const labelPattern = /^(Nombre|Duracion|Objetivo real|Objetivo tecnico|Objetivo pedagogico|Material|Preparacion|Que digo|Reglas|Senales|Ejemplo de ronda|Como lo dirijo|Variantes rapidas|Correccion tecnica escondida|Adaptaciones|Inicio|Parada|Reagrupacion|Mas facil|Mas dificil|Si hay caos|Pequenos 5-8|Mayores 9-13|Necesitan estructura|Muy impulsivos|Timidos|Sensibilidad sensorial|Alumno|Que observar hoy|Accion concreta del sensei|Riesgos y precauciones|Objetivos ocultos para el sensei|Roles de mision del dia)$/i;
  let html = '';
  let listOpen = false;

  const closeList = () => {
    if (listOpen) {
      html += '</ul>';
      listOpen = false;
    }
  };

  lines.forEach(rawLine => {
    const line = rawLine.trim();
    if (!line) {
      closeList();
      return;
    }

    const cleanHeading = line.replace(/^#+\s*/, '');
    const sectionMatch = cleanHeading.match(/^([A-J])\.\s+(.+)/);
    if (sectionMatch) {
      closeList();
      html += `<section class="activity-card"><div class="activity-letter">${escapeHtml(sectionMatch[1])}</div><div><h3>${escapeHtml(sectionMatch[2])}</h3></div></section>`;
      return;
    }

    if (/^\d+\.\s+/.test(line)) {
      if (!listOpen) {
        html += '<ul class="step-list">';
        listOpen = true;
      }
      html += `<li>${escapeHtml(line.replace(/^\d+\.\s+/, ''))}</li>`;
      return;
    }

    if (/^[-*]\s+/.test(line)) {
      if (!listOpen) {
        html += '<ul class="step-list">';
        listOpen = true;
      }
      html += `<li>${escapeHtml(line.replace(/^[-*]\s+/, ''))}</li>`;
      return;
    }

    const colonIndex = line.indexOf(':');
    if (colonIndex > 0) {
      const key = line.slice(0, colonIndex).trim();
      const value = line.slice(colonIndex + 1).trim();
      if (labelPattern.test(key)) {
        closeList();
        html += `<div class="info-row"><strong>${escapeHtml(key)}</strong><span>${escapeHtml(value)}</span></div>`;
        return;
      }
    }

    if (/^["“]/.test(line)) {
      closeList();
      html += `<blockquote>${escapeHtml(line)}</blockquote>`;
      return;
    }

    if (/^[A-ZÁÉÍÓÚÑ0-9\s]{5,}$/.test(line) && line.length < 70) {
      closeList();
      html += `<h3>${escapeHtml(line)}</h3>`;
      return;
    }

    closeList();
    html += `<p>${escapeHtml(line)}</p>`;
  });

  closeList();
  return html || '<p>Sin contenido.</p>';
}

function normalize(value) {
  return String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

function escapeHtml(value) {
  return String(value == null ? '' : value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
