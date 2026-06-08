requireAuth();

const params  = new URLSearchParams(window.location.search);
const alumnoId = params.get('id');
const hoy = new Date();
const mesKey  = getMesKey(hoy);
const periodoActual = getPeriodoKey(hoy);
const intensificaActivo = esSemanaIntensificacion(hoy);
const mesEsIntens       = esMesIntensificacion(hoy);

const PERIODOS = [
  { key: '04', label: 'Mayo'    },
  { key: '05', label: 'Junio'   },
  { key: '07', label: 'Agosto'  },
  { key: '09', label: 'Octubre' },
];

let alumnoData = null;

document.addEventListener('DOMContentLoaded', async () => {
  buildNav('');
  if (!alumnoId) { window.location.href = 'alumnos.html'; return; }
  await recargar();
});

async function recargar() {
  const doc = await db.collection('alumnos').doc(alumnoId).get();
  if (!doc.exists) { window.location.href = 'alumnos.html'; return; }
  alumnoData = { id: doc.id, ...doc.data() };
  renderPerfil(alumnoData);
}

function renderPerfil(a) {
  document.getElementById('perfil-nombre').textContent = a.nombre + ', ' + a.apellido;
  document.getElementById('perfil-anio').textContent   = a.anio + '° año · División ' + a.division;
  document.title = a.nombre + ' ' + a.apellido;
  renderAsistencia(a);
  renderNotas(a);
  renderRecursa(a);
  renderIntensificacion(a);
  document.getElementById('btn-editar').href = 'formulario.html?id=' + a.id;
}

function renderAsistencia(a) {
  const asist = a.asistencia?.[mesKey];
  const cont  = document.getElementById('asist-cont');
  if (!asist) { cont.innerHTML = '<p style="color:var(--text-muted);font-size:13px">Sin datos de asistencia este mes</p>'; return; }
  const pct = Math.round((asist.presentes / 20) * 100);
  const cls = pct >= 80 ? '' : pct >= 60 ? 'warn' : 'danger';
  cont.innerHTML = '<div class="asist-bar-wrap">'
    + '<div class="asist-bar-bg"><div class="asist-bar-fill ' + cls + '" style="width:' + pct + '%"></div></div>'
    + '<div class="asist-nums"><span>' + asist.presentes + ' presentes · ' + asist.ausentes + ' ausentes</span><span>' + pct + '%</span></div>'
    + '</div>';
}

function renderNotas(a) {
  const cont = document.getElementById('notas-cont');
  const materiasActuales = a.materias?.filter(m => !m.recursa) || [];
  if (!materiasActuales.length) { cont.innerHTML = '<p style="color:var(--text-muted);font-size:13px">Sin materias del año actual</p>'; return; }
  cont.innerHTML = tablaNotas(materiasActuales);
}

function renderRecursa(a) {
  const materiasRec = a.materias?.filter(m => m.recursa) || [];
  const section = document.getElementById('section-recursa');
  section.style.display = 'block';
  document.getElementById('recursa-cont').innerHTML = materiasRec.length
    ? tablaNotas(materiasRec, true) + '<p style="font-size:11px;color:var(--text-muted);margin-top:8px">📌 Materia del año anterior cursada en reemplazo del año actual</p>'
    : '<p style="color:var(--text-muted);font-size:13px">Sin materias recursadas</p>';
}

function tablaNotas(materias, mostrarAnio = false) {
  const filas = materias.map(m => {
    const idxReal = alumnoData.materias.indexOf(m);
    const celdas = ['inf1','nf1','inf2','nf2'].map(k => {
      const v = m[k];
      if (v === null || v === undefined || v === '') return '<td><span class="nota-empty">—</span></td>';
      const cls = colorCampo(k, v);
      return '<td><span class="nota-val ' + cls + '">' + v + '</span></td>';
    }).join('');
    return '<tr>'
      + '<td>' + m.nombre + '</td>'
      + (mostrarAnio ? '<td><span class="badge badge-warning">' + m.anio + '°</span></td>' : '')
      + celdas
      + '<td><button class="section-edit-btn" style="margin:0" title="Editar notas" onclick="editarMateria(' + idxReal + ')">'
      + '<img src="img/editar.png" style="width:13px;height:13px;object-fit:contain"></button></td>'
      + '</tr>';
  }).join('');

  return '<table class="notas-table"><thead><tr>'
    + '<th>Materia</th>'
    + (mostrarAnio ? '<th>Año</th>' : '')
    + '<th>Inf.1</th><th>NF1</th><th>Inf.2</th><th>NF2</th><th></th>'
    + '</tr></thead><tbody>' + filas + '</tbody></table>';
}

function renderIntensificacion(a) {
  const intens = a.intensifica || [];
  const section = document.getElementById('section-intens');
  section.style.display = 'block';
  const cont = document.getElementById('intens-cont');
  if (!intens.length) { cont.innerHTML = '<p style="color:var(--text-muted);font-size:13px">Sin materias de intensificación</p>'; return; }

  cont.innerHTML = intens.map((item, idx) => {
    const notasHtml = PERIODOS.map(p => {
      const nota = item.notas?.[p.key];
      const esCurrent = mesEsIntens && periodoActual === p.key;
      let notaHtml;
      if (nota !== undefined && nota !== null) {
        notaHtml = '<span class="nota-val ' + colorNota(nota) + '">' + nota + '</span>';
      } else if (esCurrent && intensificaActivo) {
        notaHtml = '<span class="badge badge-warning">En curso</span>';
      } else {
        notaHtml = '<span class="nota-empty">—</span>';
      }
      return '<div class="periodo-item ' + (esCurrent ? 'periodo-activo' : '') + '">'
        + '<span class="periodo-label">' + p.label + '</span>' + notaHtml + '</div>';
    }).join('');

    return '<div class="intens-item">'
      + '<div class="intens-item-header">'
      + '<span class="intens-materia">' + item.materia + '</span>'
      + '<div style="display:flex;align-items:center;gap:8px">'
      + '<span class="badge badge-warning">' + item.anio_origen + '° año</span>'
      + '<button class="section-edit-btn" title="Editar notas" onclick="editarIntensificacion(' + idx + ')">'
      + '<img src="img/editar.png" style="width:14px;height:14px;object-fit:contain"></button>'
      + '</div></div>'
      + '<div class="periodos-grid">' + notasHtml + '</div>'
      + '</div>';
  }).join('');
}

// ── EDICIÓN INLINE ──

function editarSeccion(seccion) {
  const a = alumnoData;
  let html = '';

  if (seccion === 'asistencia') {
    const ausentes = a.asistencia?.[mesKey]?.ausentes ?? '';
    html = '<div class="edit-modal-overlay" onclick="cerrarModal()">'
      + '<div class="edit-modal" onclick="event.stopPropagation()">'
      + '<div class="edit-modal-titulo"><img src="img/calendario.png" style="width:18px;height:18px;object-fit:contain"> Asistencia del mes</div>'
      + '<div class="form-group"><label>Inasistencias (sobre 20)</label>'
      + '<input type="number" id="edit-ausentes" value="' + ausentes + '" min="0" max="20" placeholder="Ej: 3"></div>'
      + '<div class="edit-modal-btns">'
      + '<button class="btn-primary" onclick="guardarAsistencia()">Guardar</button>'
      + '<button class="btn-secondary" onclick="cerrarModal()">Cancelar</button>'
      + '</div></div></div>';

  } else if (seccion === 'datos_personales') {
    const anioOpts = [1,2,3,4,5,6,7].map(n => '<option value="' + n + '" ' + (a.anio === n ? 'selected' : '') + '>' + n + '°</option>').join('');
    const divOpts  = [1,2,3].map(n => '<option value="' + n + '" ' + (a.division === n ? 'selected' : '') + '>' + n + '</option>').join('');
    html = '<div class="edit-modal-overlay" onclick="cerrarModal()">'
      + '<div class="edit-modal" onclick="event.stopPropagation()">'
      + '<div class="edit-modal-titulo"><img src="img/editar.png" style="width:18px;height:18px;object-fit:contain"> Datos personales</div>'
      + '<div class="form-row">'
      + '<div class="form-group"><label>Nombre</label><input type="text" id="edit-nombre" value="' + (a.nombre || '') + '"></div>'
      + '<div class="form-group"><label>Apellido</label><input type="text" id="edit-apellido" value="' + (a.apellido || '') + '"></div>'
      + '</div>'
      + '<div class="form-row">'
      + '<div class="form-group"><label>Año actual</label><select id="edit-anio">' + anioOpts + '</select></div>'
      + '<div class="form-group"><label>División</label><select id="edit-division">' + divOpts + '</select></div>'
      + '</div>'
      + '<div class="edit-modal-btns">'
      + '<button class="btn-primary" onclick="guardarDatosPersonales()">Guardar</button>'
      + '<button class="btn-secondary" onclick="cerrarModal()">Cancelar</button>'
      + '</div></div></div>';
  } else {
    return;
  }

  const overlay = document.createElement('div');
  overlay.id = 'edit-overlay-root';
  overlay.innerHTML = html;
  document.body.appendChild(overlay);
}

function abrirEditarRecursa() {
  const a = alumnoData;
  const filas = MATERIAS.map((mat, i) => {
    const m = a.materias?.find(x => x.nombre === mat);
    const recursa = m?.recursa || false;
    const anioOpts = Array.from({ length: a.anio }, (_, k) => k + 1)
      .map(n => '<option value="' + n + '" ' + (m?.anio === n ? 'selected' : (!recursa && n === a.anio ? 'selected' : '')) + '>' + n + '°</option>').join('');
    return '<div style="display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid var(--border)">'
      + '<span style="flex:1;font-size:13px;font-weight:600">' + mat + '</span>'
      + '<select id="rec-anio-' + i + '" style="width:70px;padding:5px 6px;border:1.5px solid var(--border);border-radius:8px;font-size:12px">' + anioOpts + '</select>'
      + '<label style="display:flex;align-items:center;gap:6px;font-size:12px;cursor:pointer">'
      + '<input type="checkbox" id="rec-check-' + i + '" ' + (recursa ? 'checked' : '') + ' onchange="toggleAnioRecursa(' + i + ', ' + a.anio + ')"> Recursa</label>'
      + '</div>';
  }).join('');

  const overlay = document.createElement('div');
  overlay.id = 'edit-overlay-root';
  overlay.innerHTML = '<div class="edit-modal-overlay" onclick="cerrarModal()">'
    + '<div class="edit-modal edit-modal-wide" onclick="event.stopPropagation()">'
    + '<div class="edit-modal-titulo"><img src="img/ciclo.png" style="width:18px;height:18px;object-fit:contain"> Materias recursadas</div>'
    + filas
    + '<div class="edit-modal-btns" style="margin-top:16px">'
    + '<button class="btn-primary" onclick="guardarRecursa()">Guardar</button>'
    + '<button class="btn-secondary" onclick="cerrarModal()">Cancelar</button>'
    + '</div></div></div>';
  document.body.appendChild(overlay);
}

function toggleAnioRecursa(i, anioAlumno) {
  const check = document.getElementById('rec-check-' + i);
  const sel   = document.getElementById('rec-anio-' + i);
  if (!check.checked) sel.value = String(anioAlumno);
}

async function guardarRecursa() {
  const a = alumnoData;
  const materias = MATERIAS.map((mat, i) => {
    const orig = a.materias?.find(x => x.nombre === mat) || { nombre: mat, inf1: null, nf1: null, inf2: null, nf2: null };
    const recursa = document.getElementById('rec-check-' + i).checked;
    const anio    = parseInt(document.getElementById('rec-anio-' + i).value);
    return { ...orig, nombre: mat, anio: recursa ? anio : a.anio, recursa };
  });
  showSaving();
  await db.collection('alumnos').doc(alumnoId).update({ materias });
  hideSaving();
  showToast('Materias guardadas');
  cerrarModal();
  await recargar();
}

function abrirEditarIntensificacion() {
  const a = alumnoData;
  let items = JSON.parse(JSON.stringify(a.intensifica || []));
  renderModalIntens(items);
}

function renderModalIntens(items) {
  document.getElementById('edit-overlay-root')?.remove();
  const a = alumnoData;

  const filas = items.map((item, idx) => {
    const matOpts = MATERIAS.map(m => '<option value="' + m + '" ' + (item.materia === m ? 'selected' : '') + '>' + m + '</option>').join('');
    const maxAnio = Math.max(1, a.anio - 1);
    const anioOpts = Array.from({ length: maxAnio }, (_, k) => k + 1)
      .map(n => '<option value="' + n + '" ' + (item.anio_origen === n ? 'selected' : '') + '>' + n + '°</option>').join('');
    return '<div style="display:flex;align-items:center;gap:8px;padding:8px 0;border-bottom:1px solid var(--border)">'
      + '<select id="ei-mat-' + idx + '" style="flex:1;padding:6px 8px;border:1.5px solid var(--border);border-radius:8px;font-size:13px">' + matOpts + '</select>'
      + '<select id="ei-anio-' + idx + '" style="width:70px;padding:6px 8px;border:1.5px solid var(--border);border-radius:8px;font-size:13px">' + anioOpts + '</select>'
      + '<button onclick="quitarItemIntens(' + idx + ')" style="background:#fee2e2;border:none;border-radius:8px;padding:6px 10px;cursor:pointer;font-size:14px;color:var(--danger)">✕</button>'
      + '</div>';
  }).join('');

  const overlay = document.createElement('div');
  overlay.id = 'edit-overlay-root';
  overlay.innerHTML = '<div class="edit-modal-overlay" onclick="cerrarModal()">'
    + '<div class="edit-modal edit-modal-wide" onclick="event.stopPropagation()">'
    + '<div class="edit-modal-titulo"><img src="img/multitud.png" style="width:18px;height:18px;object-fit:contain"> Intensificación</div>'
    + '<div id="intens-modal-filas">' + (filas || '<p style="font-size:13px;color:var(--text-muted)">Sin materias de intensificación</p>') + '</div>'
    + '<button class="btn-secondary" style="margin-top:12px" onclick="agregarItemIntens()">+ Agregar materia</button>'
    + '<div class="edit-modal-btns" style="margin-top:12px">'
    + '<button class="btn-primary" onclick="guardarIntensificacion()">Guardar</button>'
    + '<button class="btn-secondary" onclick="cerrarModal()">Cancelar</button>'
    + '</div></div></div>';
  document.body.appendChild(overlay);
}

function leerItemsIntensModal() {
  const a = alumnoData;
  const items = [];
  let idx = 0;
  while (document.getElementById('ei-mat-' + idx)) {
    items.push({
      materia:     document.getElementById('ei-mat-' + idx).value,
      anio_origen: parseInt(document.getElementById('ei-anio-' + idx).value),
      notas: a.intensifica?.find(i => i.materia === document.getElementById('ei-mat-' + idx).value && i.anio_origen === parseInt(document.getElementById('ei-anio-' + idx).value))?.notas || {}
    });
    idx++;
  }
  return items;
}

function agregarItemIntens() {
  const items = leerItemsIntensModal();
  if (items.length >= 4) { showToast('Máximo 4 materias'); return; }
  const a = alumnoData;
  items.push({ materia: MATERIAS[0], anio_origen: Math.max(1, a.anio - 1), notas: {} });
  renderModalIntens(items);
}

function quitarItemIntens(idx) {
  const items = leerItemsIntensModal();
  items.splice(idx, 1);
  renderModalIntens(items);
}

async function guardarIntensificacion() {
  const items = leerItemsIntensModal();
  const keys = items.map(i => i.materia + '-' + i.anio_origen);
  const hasDup = keys.some((k, i) => keys.indexOf(k) !== i);
  if (hasDup) { showToast('Hay materias duplicadas con el mismo año'); return; }
  showSaving();
  await db.collection('alumnos').doc(alumnoId).update({ intensifica: items });
  hideSaving();
  showToast('Intensificación guardada');
  cerrarModal();
  await recargar();
}

function cerrarModal() {
  document.getElementById('edit-overlay-root')?.remove();
}

function editarMateria(idx) {
  const m = alumnoData.materias[idx];
  const icono = m.recursa ? 'ciclo.png' : 'materias.png';
  const overlay = document.createElement('div');
  overlay.id = 'edit-overlay-root';

  overlay.innerHTML = '<div class="edit-modal-overlay" onclick="cerrarModal()">'
    + '<div class="edit-modal" onclick="event.stopPropagation()">'
    + '<div class="edit-modal-titulo">'
    + '<img src="img/' + icono + '" style="width:18px;height:18px;object-fit:contain"> '
    + m.nombre + (m.recursa ? ' <span class="badge badge-warning">' + m.anio + '°</span>' : '')
    + '</div>'
    + '<div class="materia-notas-grid">'
    + '<div class="form-group" style="margin:0"><label>Informe 1</label>' + selectInforme('em-inf1', m.inf1) + '</div>'
    + '<div class="form-group" style="margin:0"><label>Nota Final 1</label>' + selectNota('em-nf1', m.nf1) + '</div>'
    + '<div class="form-group" style="margin:0"><label>Informe 2</label>' + selectInforme('em-inf2', m.inf2) + '</div>'
    + '<div class="form-group" style="margin:0"><label>Nota Final 2</label>' + selectNota('em-nf2', m.nf2) + '</div>'
    + '</div>'
    + '<div class="edit-modal-btns">'
    + '<button class="btn-primary" onclick="guardarMateria(' + idx + ')">Guardar</button>'
    + '<button class="btn-secondary" onclick="cerrarModal()">Cancelar</button>'
    + '</div></div></div>';

  document.body.appendChild(overlay);
  aplicarColoresSelects(overlay);
  overlay.querySelectorAll('.nota-select').forEach(s => s.addEventListener('change', () => aplicarColoresSelects(overlay)));
}

async function guardarMateria(idx) {
  showSaving();
  const materias = [...alumnoData.materias];
  const inf1 = document.getElementById('em-inf1').value || null;
  const nf1  = document.getElementById('em-nf1').value  ? parseFloat(document.getElementById('em-nf1').value)  : null;
  const inf2 = document.getElementById('em-inf2').value || null;
  const nf2  = document.getElementById('em-nf2').value  ? parseFloat(document.getElementById('em-nf2').value)  : null;
  materias[idx] = { ...materias[idx], inf1, nf1, inf2, nf2 };
  await db.collection('alumnos').doc(alumnoId).update({ materias });
  hideSaving();
  showToast('Notas guardadas');
  cerrarModal();
  await recargar();
}

function editarIntensificacion(idx) {
  const item = alumnoData.intensifica[idx];
  const overlay = document.createElement('div');
  overlay.id = 'edit-overlay-root';

  const campos = PERIODOS.map(p =>
    '<div class="form-group" style="margin:0"><label>' + p.label + '</label>'
    + selectNota('ei-' + p.key, item.notas?.[p.key])
    + '</div>'
  ).join('');

  overlay.innerHTML = '<div class="edit-modal-overlay" onclick="cerrarModal()">'
    + '<div class="edit-modal" onclick="event.stopPropagation()">'
    + '<div class="edit-modal-titulo">'
    + '<img src="img/multitud.png" style="width:18px;height:18px;object-fit:contain"> '
    + item.materia + ' <span class="badge badge-warning">' + item.anio_origen + '°</span>'
    + '</div>'
    + '<div class="materia-notas-grid">' + campos + '</div>'
    + '<div class="edit-modal-btns">'
    + '<button class="btn-primary" onclick="guardarUnaIntensificacion(' + idx + ')">Guardar</button>'
    + '<button class="btn-secondary" onclick="cerrarModal()">Cancelar</button>'
    + '</div></div></div>';

  document.body.appendChild(overlay);
  aplicarColoresSelects(overlay);
  overlay.querySelectorAll('.nota-select').forEach(s => s.addEventListener('change', () => aplicarColoresSelects(overlay)));
}

async function guardarUnaIntensificacion(idx) {
  showSaving();
  const intens = [...alumnoData.intensifica];
  const notas = {};
  PERIODOS.forEach(p => {
    const v = parseFloat(document.getElementById('ei-' + p.key)?.value);
    if (!isNaN(v)) notas[p.key] = v;
  });
  intens[idx] = { ...intens[idx], notas };
  await db.collection('alumnos').doc(alumnoId).update({ intensifica: intens });
  hideSaving();
  showToast('Notas guardadas');
  cerrarModal();
  await recargar();
}

async function guardarDatosPersonales() {
  const nombre   = document.getElementById('edit-nombre').value.trim();
  const apellido = document.getElementById('edit-apellido').value.trim();
  const anio     = parseInt(document.getElementById('edit-anio').value);
  const division = parseInt(document.getElementById('edit-division').value);
  if (!nombre || !apellido) { showToast('Completá nombre y apellido'); return; }
  showSaving();
  await db.collection('alumnos').doc(alumnoId).update({ nombre, apellido, anio, division });
  hideSaving();
  showToast('Datos guardados');
  cerrarModal();
  await recargar();
}

async function guardarAsistencia() {
  const ausentes = parseInt(document.getElementById('edit-ausentes').value);
  if (isNaN(ausentes) || ausentes < 0 || ausentes > 20) { showToast('Ingresá un valor entre 0 y 20'); return; }
  showSaving();
  await db.collection('alumnos').doc(alumnoId).update({
    ['asistencia.' + mesKey]: { presentes: 20 - ausentes, ausentes }
  });
  hideSaving();
  showToast('Asistencia guardada');
  cerrarModal();
  await recargar();
}

async function eliminarAlumno() {
  showConfirm('¿Eliminás este alumno? Esta acción no se puede deshacer.', async () => {
    await db.collection('alumnos').doc(alumnoId).delete();
    showToast('Alumno eliminado');
    setTimeout(() => window.location.href = 'alumnos.html', 1200);
  });
}

// Aplica clases de color a todos los selects dentro de un contenedor
function aplicarColoresSelects(contenedor) {
  contenedor.querySelectorAll('.nota-select').forEach(sel => {
    sel.classList.remove('sel-baja', 'sel-media', 'sel-alta');
    const v = sel.value;
    if (!v) return;
    const tipo = sel.dataset.tipo;
    const cls = tipo === 'inf' ? colorInforme(v) : colorNota(parseFloat(v));
    if (cls === 'baja')  sel.classList.add('sel-baja');
    if (cls === 'media') sel.classList.add('sel-media');
    if (cls === 'alta')  sel.classList.add('sel-alta');
  });
}
