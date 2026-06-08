requireAuth();

const params   = new URLSearchParams(window.location.search);
const editId   = params.get('id');
const esEditar = !!editId;
const hoy      = new Date();
const mesKey   = getMesKey(hoy);

const PERIODOS = [
  { key: '04', label: 'Mayo'    },
  { key: '05', label: 'Junio'   },
  { key: '07', label: 'Agosto'  },
  { key: '09', label: 'Octubre' },
];

let intensItems = [];

document.addEventListener('DOMContentLoaded', async () => {
  buildNav(esEditar ? '' : 'agregar');
  document.getElementById('form-titulo').innerHTML = esEditar
    ? '<img src="img/editar.png" alt="" style="width:18px;height:18px;object-fit:contain;vertical-align:middle;margin-right:6px"> Editar alumno'
    : '<img src="img/agregar.png" alt="" style="width:18px;height:18px;object-fit:contain;vertical-align:middle;margin-right:6px"> Nuevo alumno';
  document.getElementById('btn-guardar').textContent = esEditar ? 'GUARDAR CAMBIOS' : 'GUARDAR ALUMNO';

  document.getElementById('f-anio').addEventListener('change', () => {
    renderMaterias();
    renderIntens();
  });

  if (esEditar) {
    document.getElementById('btn-eliminar').style.display = 'block';
    await cargarDatosEditar();
  } else {
    renderMaterias();
    renderIntens();
  }

  document.getElementById('btn-guardar').addEventListener('click', guardar);
  document.getElementById('btn-eliminar').addEventListener('click', eliminar);
  document.getElementById('btn-add-intens').addEventListener('click', agregarIntens);
});

function getAnioAlumno() {
  return parseInt(document.getElementById('f-anio').value) || 0;
}

function aplicarColoresForm() {
  document.querySelectorAll('.nota-select').forEach(sel => {
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

function bindColores() {
  document.querySelectorAll('.nota-select').forEach(sel => {
    sel.removeEventListener('change', aplicarColoresForm);
    sel.addEventListener('change', aplicarColoresForm);
  });
  aplicarColoresForm();
}

// ── MATERIAS ──
function renderMaterias(materiasData = []) {
  const anio = getAnioAlumno();
  const cont = document.getElementById('materias-cont');
  if (!anio) { cont.innerHTML = '<p style="font-size:13px;color:var(--text-muted)">Seleccioná el año primero</p>'; return; }

  cont.innerHTML = MATERIAS.map((mat, i) => {
    const m = materiasData[i] || {};
    const anioMat = m.anio || anio;
    const recursa = m.recursa || false;

    if (esEditar) {
      const opts = Array.from({ length: anio }, (_, k) => k + 1)
        .map(a => '<option value="' + a + '" ' + (anioMat === a ? 'selected' : '') + '>' + a + '°</option>')
        .join('');
      return '<div class="materia-block">'
        + '<div class="materia-block-header">'
        + '<div class="materia-block-title"><img src="img/materias.png" alt="" style="width:35px;height:35px;object-fit:contain;vertical-align:middle;margin-right:6px"> ' + mat + '</div>'
        + '<div class="form-group" style="margin:0;min-width:80px"><label>Año</label>'
        + '<select id="m' + i + '-anio" class="materia-anio-sel">' + opts + '</select></div>'
        + '</div>'
        + '<div class="materia-notas-grid">'
        + '<div class="form-group"><label>Informe 1</label>' + selectInforme('m' + i + '-inf1', m.inf1) + '</div>'
        + '<div class="form-group"><label>Nota Final 1</label>' + selectNota('m' + i + '-nf1', m.nf1) + '</div>'
        + '<div class="form-group"><label>Informe 2</label>' + selectInforme('m' + i + '-inf2', m.inf2) + '</div>'
        + '<div class="form-group"><label>Nota Final 2</label>' + selectNota('m' + i + '-nf2', m.nf2) + '</div>'
        + '</div></div>';
    } else {
      return '<div class="materia-block materia-block-simple">'
        + '<div style="display:flex;align-items:center;justify-content:space-between">'
        + '<div style="display:flex;align-items:center;gap:10px">'
        + '<img src="img/materias.png" alt="" style="width:28px;height:28px;object-fit:contain">'
        + '<span style="font-weight:700;font-size:14px">' + mat + '</span>'
        + '</div>'
        + '<label class="toggle-recursa">'
        + '<input type="checkbox" id="m' + i + '-recursa" ' + (recursa ? 'checked' : '') + '>'
        + '<span class="toggle-track"></span>'
        + '<span class="toggle-label">Recursa</span>'
        + '</label></div></div>';
    }
  }).join('');

  bindColores();
}

// ── INTENSIFICACIÓN ──
function renderIntens(data = null) {
  if (data) intensItems = data;
  const cont = document.getElementById('intens-cont');
  if (intensItems.length === 0) {
    cont.innerHTML = '<p style="font-size:13px;color:var(--text-muted);margin-bottom:8px">Sin materias de intensificación</p>';
    return;
  }
  const anioAlumno = getAnioAlumno();
  cont.innerHTML = intensItems.map((item, idx) => {
    const matOpts = MATERIAS.map(m => '<option value="' + m + '" ' + (item.materia === m ? 'selected' : '') + '>' + m + '</option>').join('');
    const maxAnio = anioAlumno > 1 ? anioAlumno - 1 : 1;
    const anioOpts = Array.from({ length: maxAnio }, (_, k) => k + 1)
      .map(a => '<option value="' + a + '" ' + (item.anio_origen === a ? 'selected' : '') + '>' + a + '°</option>')
      .join('');

    const notasHtml = esEditar ? PERIODOS.map(p =>
      '<div class="form-group"><label>' + p.label + '</label>'
      + selectNota('intens' + idx + '-' + p.key, item.notas?.[p.key])
      + '</div>'
    ).join('') : '';

    return '<div class="materia-block" id="intens-block-' + idx + '">'
      + '<div class="materia-block-header">'
      + '<div class="form-group" style="flex:1;margin:0"><label>Materia</label>'
      + '<select id="intens' + idx + '-materia">' + matOpts + '</select></div>'
      + '<div class="form-group" style="min-width:80px;margin:0"><label>Año origen</label>'
      + '<select id="intens' + idx + '-anio">' + anioOpts + '</select></div>'
      + '<button class="btn-remove" onclick="quitarIntens(' + idx + ')">✕</button>'
      + '</div>'
      + (esEditar && notasHtml ? '<div class="intens-notas-label">Notas por período:</div><div class="materia-notas-grid">' + notasHtml + '</div>' : '')
      + '</div>';
  }).join('');

  bindColores();
}

function agregarIntens() {
  if (intensItems.length >= 4) { showToast('Máximo 4 materias de intensificación'); return; }
  const anioAlumno = getAnioAlumno();
  if (!anioAlumno) { showToast('Seleccioná el año del alumno primero'); return; }
  intensItems.push({ materia: MATERIAS[0], anio_origen: Math.max(1, anioAlumno - 1), notas: {} });
  renderIntens();
}

function quitarIntens(idx) {
  intensItems.splice(idx, 1);
  renderIntens();
}

function leerIntensItems() {
  return intensItems.map((_, idx) => ({
    materia:     document.getElementById('intens' + idx + '-materia')?.value || MATERIAS[0],
    anio_origen: parseInt(document.getElementById('intens' + idx + '-anio')?.value) || 1,
    notas: esEditar ? PERIODOS.reduce((acc, p) => {
      const v = parseFloat(document.getElementById('intens' + idx + '-' + p.key)?.value);
      if (!isNaN(v)) acc[p.key] = v;
      return acc;
    }, {}) : {},
  }));
}

async function cargarDatosEditar() {
  const doc = await db.collection('alumnos').doc(editId).get();
  if (!doc.exists) { window.location.href = 'alumnos.html'; return; }
  const a = doc.data();

  document.getElementById('f-nombre').value   = a.nombre   || '';
  document.getElementById('f-apellido').value = a.apellido || '';
  document.getElementById('f-anio').value     = a.anio     || '';
  document.getElementById('f-division').value = a.division || '';

  const asist = a.asistencia?.[mesKey];
  if (asist) document.getElementById('f-ausentes').value = asist.ausentes;

  renderMaterias(a.materias || []);
  renderIntens(a.intensifica || []);
}

async function guardar() {
  const nombre    = document.getElementById('f-nombre').value.trim();
  const apellido  = document.getElementById('f-apellido').value.trim();
  const anio      = parseInt(document.getElementById('f-anio').value);
  const division  = parseInt(document.getElementById('f-division').value);
  const ausentes  = parseInt(document.getElementById('f-ausentes').value) || 0;

  if (!nombre || !apellido || !anio || !division) {
    showToast('Completá nombre, apellido, año y división');
    return;
  }

  let materias;
  if (esEditar) {
    materias = MATERIAS.map((mat, i) => {
      const anioMat = parseInt(document.getElementById('m' + i + '-anio')?.value) || anio;
      const inf1 = document.getElementById('m' + i + '-inf1').value || null;
      const nf1v = document.getElementById('m' + i + '-nf1').value;
      const inf2 = document.getElementById('m' + i + '-inf2').value || null;
      const nf2v = document.getElementById('m' + i + '-nf2').value;
      return {
        nombre:  mat,
        anio:    anioMat,
        recursa: anioMat !== anio,
        inf1,
        nf1:  nf1v  ? parseFloat(nf1v)  : null,
        inf2,
        nf2:  nf2v  ? parseFloat(nf2v)  : null,
      };
    });
  } else {
    materias = MATERIAS.map((mat, i) => ({
      nombre:  mat,
      anio:    document.getElementById('m' + i + '-recursa')?.checked ? anio - 1 : anio,
      recursa: document.getElementById('m' + i + '-recursa')?.checked || false,
      inf1: null, nf1: null, inf2: null, nf2: null,
    }));
  }

  const intensifica = leerIntensItems();
  const data = {
    nombre, apellido, anio, division,
    asistencia: { [mesKey]: { presentes: 20 - ausentes, ausentes } },
    materias,
    intensifica,
  };

  try {
    showSaving('Guardando alumno...');
    if (esEditar) {
      await db.collection('alumnos').doc(editId).update(data);
      hideSaving();
      showToast('Cambios guardados');
      setTimeout(() => window.location.href = 'alumno.html?id=' + editId, 1200);
    } else {
      const ref = await db.collection('alumnos').add(data);
      hideSaving();
      showToast('Alumno agregado');
      setTimeout(() => window.location.href = 'alumno.html?id=' + ref.id, 1200);
    }
  } catch (e) {
    hideSaving();
    showToast('Error al guardar. Intentá de nuevo.');
  }
}

async function eliminar() {
  showConfirm('¿Eliminás este alumno? Esta acción no se puede deshacer.', async () => {
    await db.collection('alumnos').doc(editId).delete();
    showToast('Alumno eliminado');
    setTimeout(() => window.location.href = 'alumnos.html', 1200);
  });
}
