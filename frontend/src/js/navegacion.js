
/* ==========================================
   NAVEGACIÓN ENTRE MÓDULOS
   SALSAMENTARIA PRIMAVERA
========================================== */

document.addEventListener('DOMContentLoaded', () => {

  /* ==========================================
     1. IDENTIFICAR PÁGINA ACTUAL
  ========================================== */

  const paginaActual =
    window.location.pathname.split('/').pop()
    || 'index.html';


  /* ==========================================
     2. RELACIONAR PÁGINAS CON MÓDULOS
  ========================================== */

  const paginas = {

    // INICIO
    'dashboard.html': 'inicio',

    // PRODUCTOS
    'productos.html': 'productos',
    'nuevo-producto.html': 'productos',

    // INVENTARIO
    'inventario.html': 'inventario',
    'registrar-movimiento.html': 'inventario',

    // FRACCIONAMIENTO
    'fraccionamiento.html': 'fraccionamiento',
    'historial-fraccionamientos.html': 'fraccionamiento',

    // VENTAS
    'ventas.html': 'ventas',
    'nueva-venta.html': 'ventas',

    // CLIENTES
    'clientes.html': 'clientes',
    'nuevo-cliente.html': 'clientes',

    // CARTERA
    'cartera.html': 'cartera',
    'registrar-abono.html': 'cartera',

    // REPORTES
    'reportes.html': 'reportes',

    // USUARIOS
    'usuarios.html': 'usuarios',
    'nuevo-usuario.html': 'usuarios'

  };


  /* ==========================================
     3. RESALTAR MÓDULO ACTIVO
  ========================================== */

  const moduloActual = paginas[paginaActual];

  const enlaces = document.querySelectorAll(
    '.sidebar__enlace[data-modulo]'
  );

  enlaces.forEach((enlace) => {

    enlace.classList.remove(
      'sidebar__enlace--activo'
    );

    enlace.removeAttribute('aria-current');

    if (enlace.dataset.modulo === moduloActual) {

      enlace.classList.add(
        'sidebar__enlace--activo'
      );

      enlace.setAttribute('aria-current', 'page');

    }

  });


  /* ==========================================
     4. CERRAR MENÚ MÓVIL
  ========================================== */

  enlaces.forEach((enlace) => {

    enlace.addEventListener('click', () => {

      document.body.classList.remove('sidebar-open');
      document.body.classList.remove('menu-open');

      const overlay = document.getElementById(
        'dashboardOverlay'
      );

      if (overlay) {
        overlay.classList.remove('active');
        overlay.classList.remove('is-visible');
      }

    });

  });


  /* ==========================================
     5. PROTEGER PÁGINAS INTERNAS
  ========================================== */

  // Comprobar la sesión aunque auth.js
  // no se haya incluido en una página.
  const CLAVE_SESION = 'primavera_sesion_demo';

  let sesion = null;

  try {

    const datos = sessionStorage.getItem(CLAVE_SESION);

    if (datos) {
      sesion = JSON.parse(datos);
    }

  } catch (error) {

    console.error('Error al leer sesión:', error);

  }

  // Si no hay una sesión de administrador,
  // regresar al inicio de sesión.
  if (
    paginaActual !== 'index.html' &&
    (
      !sesion ||
      sesion.id !== 1 ||
      sesion.rol !== 'Administrador'
    )
  ) {

    window.location.replace('index.html');

    return;
  }


  /* ==========================================
     6. CERRAR SESIÓN EN CUALQUIER MÓDULO
  ========================================== */

  const botonSalir = document.getElementById(
    'cerrarSesion'
  );

  if (botonSalir) {

    botonSalir.addEventListener('click', () => {

      const confirmar = window.confirm(
        '¿Estás seguro de que deseas cerrar sesión?'
      );

      if (!confirmar) {
        return;
      }

      // Si auth.js está cargado, utilizar
      // su función de cierre de sesión.
      if (
        window.PrimaveraAuth &&
        typeof window.PrimaveraAuth.cerrarSesion === 'function'
      ) {

        window.PrimaveraAuth.cerrarSesion();

      } else {

        // Alternativa para las páginas que todavía
        // no cargan auth.js.
        sessionStorage.removeItem(CLAVE_SESION);

        window.location.replace('index.html');

      }

    });

  }

});
