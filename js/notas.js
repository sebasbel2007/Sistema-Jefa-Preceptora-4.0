let modo = 'normal';
let todos = [];

document.addEventListener('DOMContentLoaded', () => {
  requireAuth();
  buildNav('notas');

  db.collection('alumnos').get().then(snap => {
    todos = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  });

  document.getElementById('filter-anio').addEventListener('change', filtrar);
  document.getElementById('filter-division').addEventListener('change', filtrar);
});

function setModo(m) {
  modo = m;
  document.getElementById('tab-normal').classList.toggle('tab-active', m === 'normal');
  document.getElementById('tab-intens').classList.toggle('tab-active', m === 'intensificacion');

  const divSel = document.getElementById('filter-division');
  divSel.style.display = m === 'intensificacion' ? 'none' : '';
  if (m === 'intensificacion') divSel.value = '';

  filtrar();
}

function filtrar() {
  const anio = document.getElementById('filter-anio').value;
  const div  = document.getElementById('filter-division').value;
  const cont = document.getElementById('cursos-lista');
  const countEl = document.getElementById('resultado-count');

  if (!anio || (modo === 'normal' && !div)) {
    cont.innerHTML = '';
    countEl.textContent = '';
    return;
  }

  let lista = todos.filter(a => String(a.anio) === anio);
  if (modo === 'normal') lista = lista.filter(a => String(a.division) === div);

  const label = modo === 'normal'
    ? `${anio}° año · División ${div}`
    : `${anio}° año · Todas las divisiones`;

  countEl.textContent = `${lista.length} alumno${lista.length !== 1 ? 's' : ''}`;

  const url = modo === 'normal'
    ? `curso.html?anio=${anio}&division=${div}`
    : `curso.html?anio=${anio}&modo=intensificacion`;

  cont.innerHTML = `
    <a class="alumno-card" href="${url}" style="text-decoration:none;color:inherit">
      <img class="alumno-avatar" src="img/materias.png" alt="" style="background:#e8f0fe;padding:6px">
      <div class="alumno-info">
        <div class="alumno-nombre">${label}</div>
        <div class="alumno-sub">${lista.length} alumno${lista.length !== 1 ? 's' : ''}</div>
      </div>
      <span style="font-size:20px;color:var(--text-muted)">›</span>
    </a>`;
}
