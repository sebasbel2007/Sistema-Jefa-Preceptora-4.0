const params   = new URLSearchParams(window.location.search);
const anio     = parseInt(params.get('anio'));
const division = params.get('division') ? parseInt(params.get('division')) : null;
const esIntens = params.get('modo') === 'intensificacion';

const CAMPOS_NORMAL = [
  { key: 'inf1', label: 'Inf. 1' },
  { key: 'nf1',  label: 'NF 1'   },
  { key: 'inf2', label: 'Inf. 2' },
  { key: 'nf2',  label: 'NF 2'   },
];

const CAMPOS_INTENS = [
  { key: '04', label: 'Mayo'    },
  { key: '05', label: 'Junio'   },
  { key: '07', label: 'Agosto'  },
  { key: '09', label: 'Octubre' },
];

const campos = esIntens ? CAMPOS_INTENS : CAMPOS_NORMAL;

let alumnos    = [];
let snapshot   = {};
let pendientes = new Set();
let campoMovil = campos[0].key;
let materiaActual = '';

document.addEventListener('DOMContentLoaded', async () => {
  requireAuth();
  buildNav('notas');

  // Título
  const titulo = esIntens
    ? `${anio}° año · Intensificación`
    : `${anio}° año · División ${division}`;
  document.getElementById('curso-titulo').textContent = titulo;
  document.title = `Preceptora · ${titulo}`;

  // Cargar alumnos — sin orderBy para evitar índice compuesto
  let snap;
  if (esIntens) {
    snap = await db.collection('alumnos').where('anio', '==', anio).get();
  } else {
    snap = await db.collection('alumnos')
      .where('anio', '==', anio)
      .where('division', '==', division)
      .get();
  }

  alumnos = snap.docs
    .map(d => ({ id: d.id, ...d.data() }))
    .sort((a, b) => a.apellido.localeCompare(b.apellido));

  renderCampoTabs();

  document.getElementById('sel-materia').addEventListener('change', e => {
    const nueva = e.target.value;
    if (pendientes.size > 0) {
      mostrarAlertaCambioMateria(nueva, e);
    } else {
      cambiarMateria(nueva);
    }
  });

  document.getElementById('btn-guardar-todo').addEventListener('click', guardarTodo);
  document.getElementById('btn-cancelar-todo').addEventListener('click', cancelarTodo);

  document.getElementById('btn-back').addEventListener('click', () => {
    if (pendientes.size > 0) {
      mostrarAlertaSalida();
    } else {
      window.location.href = 'notas.html';
    }
  });

  window.addEventListener('beforeunload', e => {
    if (pendientes.size > 0) { e.preventDefault(); e.returnValue = ''; }
  });
});

function renderCampoTabs() {
  const cont = document.getElementById('campo-tabs');
  cont.innerHTML = campos.map(c => `
    <button class="campo-tab ${c.key === campoMovil ? 'active' : ''}"
            onclick="setCampoMovil('${c.key}')">${c.label}</button>
  `).join('');
}

function setCampoMovil(key) {
  campoMovil = key;
  renderCampoTabs();
  document.querySelectorAll('.col-nota').forEach(el => {
    el.classList.toggle('col-visible', el.dataset.campo === key);
  });
}

function cambiarMateria(materia) {
  materiaActual = materia;
  pendientes.clear();
  snapshot = {};
  actualizarBarra();

  if (!materia) {
    document.getElementById('tabla-cont').innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">📋</div>
        <p>Elegí una materia para comenzar</p>
      </div>`;
    document.getElementById('curso-subtitulo').textContent = '';
    return;
  }

  let lista = alumnos;
  if (esIntens) {
    lista = alumnos.filter(a =>
      a.intensifica?.some(i => i.materia === materia)
    );
  }

  document.getElementById('curso-subtitulo').textContent =
    `${materia} · ${lista.length} alumno${lista.length !== 1 ? 's' : ''}`;

  lista.forEach(a => {
    if (esIntens) {
      const item = a.intensifica.find(i => i.materia === materia);
      snapshot[a.id] = { ...(item.notas || {}) };
    } else {
      const mat = a.materias?.find(m => m.nombre === materia);
      snapshot[a.id] = mat
        ? { inf1: mat.inf1 ?? null, nf1: mat.nf1 ?? null, inf2: mat.inf2 ?? null, nf2: mat.nf2 ?? null }
        : { inf1: null, nf1: null, inf2: null, nf2: null };
    }
  });

  renderTabla(lista);
}

function renderTabla(lista) {
  const cont = document.getElementById('tabla-cont');

  if (!lista.length) {
    cont.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">👥</div>
        <p>No hay alumnos${esIntens ? ' con esta materia de intensificación' : ' en este curso'}</p>
      </div>`;
    return;
  }

  const thCampos = campos.map(c =>
    `<th class="col-nota ${c.key === campoMovil ? 'col-visible' : ''}" data-campo="${c.key}">${c.label}</th>`
  ).join('');

  cont.innerHTML = `
    <table class="notas-crud-table">
      <thead>
        <tr>
          <th>Alumno</th>
          ${thCampos}
          <th></th>
        </tr>
      </thead>
      <tbody>
        ${lista.map(a => filaHTML(a)).join('')}
      </tbody>
    </table>`;
}

function colorClsSelect(campo, v) {
  if (v === null || v === undefined || v === '') return '';
  const cls = colorCampo(campo, v);
  if (cls === 'baja')  return 'sel-baja';
  if (cls === 'media') return 'sel-media';
  if (cls === 'alta')  return 'sel-alta';
  return '';
}

function filaHTML(a) {
  const vals = snapshot[a.id] || {};
  const info = esIntens ? (a.anio + '°-' + a.division) : '';

  const tdCampos = campos.map(c => {
    const v = vals[c.key];
    const selHtml = selectCampo('sel-' + a.id + '-' + c.key, c.key, v);
    return '<td class="col-nota ' + (c.key === campoMovil ? 'col-visible' : '') + '" data-campo="' + c.key + '">'
      + selHtml.replace('class="nota-select', 'class="nota-select ' + colorClsSelect(c.key, v))
        .replace('>', ' data-id="' + a.id + '" data-campo="' + c.key + '" onchange="onSelectChange(\'' + a.id + '\')">')
      + '</td>';
  }).join('');

  return '<tr id="fila-' + a.id + '">'
    + '<td>'
    + '<div style="font-weight:700;font-size:13px">' + a.apellido + ', ' + a.nombre + '</div>'
    + (info ? '<div class="alumno-sub-small">' + info + '</div>' : '')
    + '</td>'
    + tdCampos
    + '<td><div class="acciones-fila">'
    + '<button class="btn-fila btn-ok" id="ok-' + a.id + '" disabled onclick="guardarFila(\'' + a.id + '\')">✓</button>'
    + '<button class="btn-fila btn-cancel" id="cancel-' + a.id + '" disabled onclick="cancelarFila(\'' + a.id + '\')">✕</button>'
    + '</div></td></tr>';
}

function onSelectChange(id) {
  pendientes.add(id);
  document.getElementById('fila-' + id)?.classList.add('fila-pendiente');
  document.getElementById('ok-' + id).disabled     = false;
  document.getElementById('cancel-' + id).disabled = false;

  document.querySelectorAll('.nota-select[data-id="' + id + '"]').forEach(sel => {
    sel.classList.remove('sel-baja', 'sel-media', 'sel-alta', 'modificado');
    const v = sel.value;
    if (v) {
      const tipo = sel.dataset.tipo;
      const cls = tipo === 'inf' ? colorInforme(v) : colorNota(parseFloat(v));
      if (cls === 'baja')  sel.classList.add('sel-baja');
      if (cls === 'media') sel.classList.add('sel-media');
      if (cls === 'alta')  sel.classList.add('sel-alta');
    }
    const orig = snapshot[id]?.[sel.dataset.campo];
    const cur  = v === '' ? null : (sel.dataset.tipo === 'inf' ? v : parseFloat(v));
    const distinto = String(cur) !== String(orig) && !(cur === null && (orig === null || orig === undefined));
    if (distinto) sel.classList.add('modificado');
  });

  actualizarBarra();
}

function actualizarBarra() {
  const barra = document.getElementById('barra-batch');
  const badge = document.getElementById('badge-pendientes');
  barra.style.display = pendientes.size > 0 ? 'flex' : 'none';
  badge.textContent = pendientes.size;
}

async function guardarFila(id) {
  const update = buildUpdate(id);
  try {
    await db.collection('alumnos').doc(id).update(update);
    document.querySelectorAll('.nota-select[data-id="' + id + '"]').forEach(sel => {
      const v = sel.value === '' ? null : (sel.dataset.tipo === 'inf' ? sel.value : parseFloat(sel.value));
      snapshot[id][sel.dataset.campo] = v;
      sel.classList.remove('modificado');
    });
    limpiarFila(id);
    showToast('Nota guardada');
  } catch (e) {
    showToast('Error al guardar');
  }
}

function cancelarFila(id) {
  const orig = snapshot[id] || {};
  document.querySelectorAll('.nota-select[data-id="' + id + '"]').forEach(sel => {
    const v = orig[sel.dataset.campo];
    sel.value = (v !== null && v !== undefined) ? String(v) : '';
    sel.classList.remove('modificado', 'sel-baja', 'sel-media', 'sel-alta');
    if (v !== null && v !== undefined && v !== '') {
      const tipo = sel.dataset.tipo;
      const cls = tipo === 'inf' ? colorInforme(v) : colorNota(parseFloat(v));
      if (cls === 'baja')  sel.classList.add('sel-baja');
      if (cls === 'media') sel.classList.add('sel-media');
      if (cls === 'alta')  sel.classList.add('sel-alta');
    }
  });
  limpiarFila(id);
}

function limpiarFila(id) {
  pendientes.delete(id);
  document.getElementById(`fila-${id}`)?.classList.remove('fila-pendiente');
  document.getElementById(`ok-${id}`).disabled     = true;
  document.getElementById(`cancel-${id}`).disabled = true;
  actualizarBarra();
}

async function guardarTodo() {
  if (!pendientes.size) return;
  const ids = [...pendientes];
  const batch = db.batch();
  ids.forEach(id => {
    batch.update(db.collection('alumnos').doc(id), buildUpdate(id));
  });
  try {
    await batch.commit();
    ids.forEach(id => {
      document.querySelectorAll('.nota-select[data-id="' + id + '"]').forEach(sel => {
        const v = sel.value === '' ? null : (sel.dataset.tipo === 'inf' ? sel.value : parseFloat(sel.value));
        snapshot[id][sel.dataset.campo] = v;
        sel.classList.remove('modificado');
      });
      limpiarFila(id);
    });
    showToast('Todos los cambios guardados');
  } catch (e) {
    showToast('Error al guardar');
  }
}

function cancelarTodo() {
  [...pendientes].forEach(id => cancelarFila(id));
}

function buildUpdate(id) {
  const a = alumnos.find(x => x.id === id);
  if (esIntens) {
    const intens = (a.intensifica || []).map(item => {
      if (item.materia !== materiaActual) return item;
      const notas = { ...(item.notas || {}) };
      campos.forEach(c => {
        const sel = document.querySelector('.nota-select[data-id="' + id + '"][data-campo="' + c.key + '"]');
        if (!sel) return;
        const v = parseFloat(sel.value);
        if (!isNaN(v)) notas[c.key] = v;
        else delete notas[c.key];
      });
      return { ...item, notas };
    });
    return { intensifica: intens };
  } else {
    const materias = (a.materias || []).map(m => {
      if (m.nombre !== materiaActual) return m;
      const updated = { ...m };
      campos.forEach(c => {
        const sel = document.querySelector('.nota-select[data-id="' + id + '"][data-campo="' + c.key + '"]');
        if (!sel) return;
        if (c.key === 'inf1' || c.key === 'inf2') {
          updated[c.key] = sel.value || null;
        } else {
          const v = parseFloat(sel.value);
          updated[c.key] = isNaN(v) ? null : v;
        }
      });
      return updated;
    });
    return { materias };
  }
}

function mostrarAlertaCambioMateria(nueva, evento) {
  const overlay = document.createElement('div');
  overlay.id = 'alerta-overlay';
  overlay.innerHTML = `
    <div class="edit-modal-overlay">
      <div class="edit-modal" onclick="event.stopPropagation()" style="max-width:340px">
        <div style="font-size:15px;font-weight:700;margin-bottom:8px">Cambios sin guardar</div>
        <div style="font-size:14px;color:var(--text-muted);margin-bottom:20px">
          Tenés ${pendientes.size} fila${pendientes.size !== 1 ? 's' : ''} con cambios sin guardar.
        </div>
        <div class="edit-modal-btns" style="flex-direction:column;gap:8px">
          <button class="btn-primary" onclick="
            document.getElementById('alerta-overlay').remove();
            guardarTodo().then(() => cambiarMateria('${nueva}'));
          ">Guardar todo y cambiar</button>
          <button class="btn-secondary" onclick="
            document.getElementById('alerta-overlay').remove();
            cancelarTodo();
            cambiarMateria('${nueva}');
          ">Descartar y cambiar</button>
          <button class="btn-secondary" onclick="
            document.getElementById('sel-materia').value = '${materiaActual}';
            document.getElementById('alerta-overlay').remove();
          ">Volver y seguir editando</button>
        </div>
      </div>
    </div>`;
  document.body.appendChild(overlay);
}

function mostrarAlertaSalida() {
  const overlay = document.createElement('div');
  overlay.id = 'salida-overlay';
  overlay.innerHTML = `
    <div class="edit-modal-overlay">
      <div class="edit-modal" onclick="event.stopPropagation()" style="max-width:340px">
        <div style="font-size:15px;font-weight:700;margin-bottom:8px">Cambios sin guardar</div>
        <div style="font-size:14px;color:var(--text-muted);margin-bottom:20px">
          Tenés ${pendientes.size} fila${pendientes.size !== 1 ? 's' : ''} con cambios sin guardar.
        </div>
        <div class="edit-modal-btns" style="flex-direction:column;gap:8px">
          <button class="btn-primary" onclick="
            guardarTodo().then(() => { window.location.href = 'notas.html'; });
          ">Guardar todo y salir</button>
          <button class="btn-secondary" onclick="document.getElementById('salida-overlay').remove()">
            Volver y seguir editando
          </button>
        </div>
      </div>
    </div>`;
  document.body.appendChild(overlay);
}
