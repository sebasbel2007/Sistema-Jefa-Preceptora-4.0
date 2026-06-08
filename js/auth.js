// ── AUTH GUARD ──
// Protege todas las páginas excepto index.html
function requireAuth() {
  auth.onAuthStateChanged(user => {
    if (!user) window.location.href = 'index.html';
  });
}

function showConfirm(mensaje, onConfirmar) {
  const overlay = document.createElement('div');
  overlay.id = 'confirm-overlay';
  overlay.innerHTML = `
    <div class="edit-modal-overlay" onclick="document.getElementById('confirm-overlay').remove()">
      <div class="edit-modal" onclick="event.stopPropagation()" style="max-width:340px">
        <div style="font-size:15px;font-weight:700;margin-bottom:8px">Confirmar</div>
        <div style="font-size:14px;color:var(--text-muted);margin-bottom:20px">${mensaje}</div>
        <div class="edit-modal-btns">
          <button class="btn-primary" style="background:var(--danger)" id="confirm-si">Eliminar</button>
          <button class="btn-secondary" onclick="document.getElementById('confirm-overlay').remove()">Cancelar</button>
        </div>
      </div>
    </div>`;
  document.body.appendChild(overlay);
  document.getElementById('confirm-si').onclick = () => {
    overlay.remove();
    onConfirmar();
  };
}

function logout() {
  showConfirm('¿Cerrar sesión?', () => {
    auth.signOut().then(() => window.location.href = 'index.html');
  });
}

// ── HELPERS GLOBALES ──

const MATERIAS = ['Literatura', 'Matemáticas', 'Física', 'Química', 'Historia'];

// Meses donde hay intensificación (0-indexed: 4=mayo, 5=junio, 7=agosto, 9=octubre)
const MESES_INTENSIFICACION = [4, 5, 7, 9];

// Devuelve el key del período de intensificación del mes dado (ej: "05" para junio)
function getPeriodoKey(fecha = new Date()) {
  return String(fecha.getMonth() + 1).padStart(2, '0');
}

// Próximo mes de intensificación desde una fecha dada
function getProximoMesIntens(fecha = new Date()) {
  const mes = fecha.getMonth();
  const anio = fecha.getFullYear();
  const futuros = MESES_INTENSIFICACION.filter(m => m > mes);
  if (futuros.length > 0) return new Date(anio, futuros[0], 1);
  return new Date(anio + 1, MESES_INTENSIFICACION[0], 1);
}

function esMesIntensificacion(fecha = new Date()) {
  return MESES_INTENSIFICACION.includes(fecha.getMonth());
}

function esSemanaIntensificacion(fecha = new Date()) {
  if (!esMesIntensificacion(fecha)) return false;
  return fecha.getDate() <= 14;
}

// Devuelve las fechas de inicio y fin de las 2 semanas de intensificación del mes dado
function getFechasIntensificacion(fecha = new Date()) {
  const anio = fecha.getFullYear();
  const mes  = fecha.getMonth();
  const inicio = new Date(anio, mes, 1);
  const fin    = new Date(anio, mes, 14);
  return { inicio, fin };
}

function formatFecha(date) {
  return date.toLocaleDateString('es-AR', { day: 'numeric', month: 'long' });
}

function getMesKey(fecha = new Date()) {
  const m = String(fecha.getMonth() + 1).padStart(2, '0');
  return `${fecha.getFullYear()}-${m}`;
}

function getNombreMes(fecha = new Date()) {
  return fecha.toLocaleDateString('es-AR', { month: 'long', year: 'numeric' });
}

// Inf1/Inf2: valores TED/TEP/TEA
function colorInforme(v) {
  if (v === 'TED') return 'baja';
  if (v === 'TEP') return 'media';
  if (v === 'TEA') return 'alta';
  return '';
}

// NF1/NF2 e intensificacion: valores numericos
function colorNota(n) {
  if (n === null || n === undefined || n === '') return '';
  const num = parseFloat(n);
  if (isNaN(num)) return '';
  if (num <= 4) return 'baja';
  if (num <= 7) return 'media';
  return 'alta';
}

// Migracion: numero a TED/TEP/TEA
function numToInforme(n) {
  if (n === null || n === undefined) return null;
  if (n <= 4) return 'TED';
  if (n <= 6) return 'TEP';
  return 'TEA';
}

// Select de informe (TED/TEP/TEA)
function selectInforme(id, valor) {
  const v = valor ?? '';
  return '<select class="nota-select nota-select-inf" id="' + id + '" data-tipo="inf">'
    + '<option value="" ' + (v === '' ? 'selected' : '') + '>\u2014</option>'
    + '<option value="TED" ' + (v === 'TED' ? 'selected' : '') + '>TED</option>'
    + '<option value="TEP" ' + (v === 'TEP' ? 'selected' : '') + '>TEP</option>'
    + '<option value="TEA" ' + (v === 'TEA' ? 'selected' : '') + '>TEA</option>'
    + '</select>';
}

// Select numerico 1-10 (NF e intensificacion)
function selectNota(id, valor) {
  const v = valor ?? '';
  let opts = '<option value="" ' + (v === '' ? 'selected' : '') + '>\u2014</option>';
  for (let n = 1; n <= 10; n++) {
    opts += '<option value="' + n + '" ' + (String(v) === String(n) ? 'selected' : '') + '>' + n + '</option>';
  }
  return '<select class="nota-select nota-select-num" id="' + id + '" data-tipo="num">' + opts + '</select>';
}

// Devuelve el select correcto segun el campo
function selectCampo(id, campo, valor) {
  return (campo === 'inf1' || campo === 'inf2')
    ? selectInforme(id, valor)
    : selectNota(id, valor);
}

// Color CSS para un valor segun su campo
function colorCampo(campo, v) {
  return (campo === 'inf1' || campo === 'inf2') ? colorInforme(v) : colorNota(v);
}

function showSaving(msg = 'Guardando cambios...') {
  let el = document.getElementById('saving-indicator');
  if (!el) {
    el = document.createElement('div');
    el.id = 'saving-indicator';
    el.style.cssText = 'position:fixed;top:60px;left:50%;transform:translateX(-50%);background:#323232;color:#fff;padding:8px 20px;border-radius:24px;font-size:13px;font-weight:500;z-index:9999;display:flex;align-items:center;gap:8px;box-shadow:0 4px 12px rgba(0,0,0,0.2)';
    document.body.appendChild(el);
  }
  el.innerHTML = '<span style="display:inline-block;width:14px;height:14px;border:2px solid #fff;border-top-color:transparent;border-radius:50%;animation:spin .7s linear infinite"></span> ' + msg;
  el.style.display = 'flex';
  if (!document.getElementById('spin-style')) {
    const s = document.createElement('style');
    s.id = 'spin-style';
    s.textContent = '@keyframes spin{to{transform:rotate(360deg)}}';
    document.head.appendChild(s);
  }
}

function hideSaving() {
  const el = document.getElementById('saving-indicator');
  if (el) el.style.display = 'none';
}

function showToast(msg) {
  let t = document.getElementById('toast');
  if (!t) {
    t = document.createElement('div');
    t.id = 'toast';
    t.className = 'toast';
    document.body.appendChild(t);
  }
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2800);
}

// Construye el bottom nav y el sidebar, marca el item activo
function buildNav(active) {
  const items = [
    { id: 'alumnos',  icon: 'img/buscar.png',        label: 'Buscar Alumno',        href: 'alumnos.html'    },
    { id: 'curso',    icon: 'img/escuela.png',        label: 'Ver Curso',     href: 'curso.html'      },
    { id: 'agregar',  icon: 'img/agregar.png',        label: 'Agregar Alumno',       href: 'formulario.html' },
    { id: 'notas',    icon: 'img/subir_notas_barra.png', label: 'Subir Notas',      href: 'notas.html'      },
    { id: 'tablero',  icon: 'img/calendario.png',     label: 'Tablero de Notificaciones ',       href: 'tablero.html'    },
    { id: 'salir',    icon: 'img/cerrar_sesion.png',  label: 'Salir',         href: '#'               },
  ];

  const logoutAttr = 'onclick="logout();return false;"';

  const nav = document.getElementById('bottom-nav');
  if (nav) {
    nav.innerHTML = items.map(it => `
      <a class="nav-item ${it.id === active ? 'active' : ''}"
         href="${it.href}" id="nav-${it.id}"
         ${it.id === 'salir' ? logoutAttr : ''}
         ${it.target ? 'target="_blank" rel="noopener"' : ''}>
        <img class="nav-icon-img" src="${it.icon}" alt="${it.label}">
        ${it.label}
      </a>`).join('');
  }

  const sidebar = document.getElementById('sidebar');
  if (sidebar) {
    sidebar.innerHTML = `
      <div class="sidebar-logo">
        <img src="img/logo_escuela.png" alt="logo">
        <span>Sistema<br>Preceptoria</span>
      </div>
      ${items.map(it => `
        <a class="nav-item ${it.id === active ? 'active' : ''}"
           href="${it.href}" id="snav-${it.id}"
           ${it.id === 'salir' ? logoutAttr : ''}
           ${it.target ? 'target="_blank" rel="noopener"' : ''}>
          <img class="nav-icon-img" src="${it.icon}" alt="${it.label}">
          ${it.label}
        </a>`).join('')}
    `;
  }
}
