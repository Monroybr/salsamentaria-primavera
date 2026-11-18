/* ==========================================
   NAVEGACIÓN Y PERMISOS
   SALSAMENTARIA PRIMAVERA
========================================== */

(function () {
  'use strict';

  function iniciarNavegacion() {
    const auth = window.PrimaveraAuth;

    if (!auth) {
      console.error('ERROR: auth.js no está cargado.');
      return;
    }

    const paginaActual =
      window.location.pathname.split('/').pop()
      || 'index.html';

    const paginas = {
      'dashboard.html': 'inicio',
      'productos.html': 'productos',
      'nuevo-producto.html': 'productos',
      'inventario.html': 'inventario',
      'registrar-movimiento.html': 'inventario',
      'fraccionamiento.html': 'fraccionamiento',
      'historial-fraccionamientos.html': 'fraccionamiento',
      'ventas.html': 'ventas',
      'nueva-venta.html': 'ventas',
      'clientes.html': 'clientes',
      'nuevo-cliente.html': 'clientes',
      'cartera.html': 'cartera',
      'registrar-abono.html': 'cartera',
      'reportes.html': 'reportes',
      'usuarios.html': 'usuarios',
      'nuevo-usuario.html': 'usuarios'
    };

    const moduloActual = paginas[paginaActual];

    const usuario = auth.obtenerSesion();

    /* ==========================================
       CERRAR SESIÓN
    ========================================== */

    const botonSalir = document.getElementById(
      'cerrarSesion'
    );

    if (botonSalir) {
      botonSalir.addEventListener('click', () => {
        const confirmar = window.confirm(
          '¿Estás seguro de que deseas cerrar sesión?'
        );

        if (confirmar) {
          auth.cerrarSesion();
        }
      });
    }

    /* ==========================================
       COMPROBAR SESIÓN LOCAL
    ========================================== */

    if (!usuario) {
      window.location.replace('index.html');
      return;
    }

    /* ==========================================
       ACTUALIZAR PERFIL
    ========================================== */

    function actualizarPerfil(datos) {
      const nombre = String(
        datos.nombre || 'Usuario'
      ).trim();

      const partes = nombre.split(/\s+/);

      const iniciales = (
        (partes[0]?.[0] || '') +
        (partes.length > 1
          ? partes[partes.length - 1][0]
          : '')
      ).toUpperCase();

      const rol = String(
        datos.rol || ''
      ).toUpperCase();

      const rolVisible =
        rol === 'ADMINISTRADOR'
          ? 'Administrador'
          : rol === 'VENDEDOR'
            ? 'Empleado'
            : rol || 'Sin rol';

      const elementos = {
        nombreUsuarioActual: nombre,
        rolUsuarioActual: rolVisible,
        avatarUsuarioActual: iniciales,
        avatarHeaderUsuario: iniciales
      };

      Object.entries(elementos).forEach(
        ([id, valor]) => {
          const elemento = document.getElementById(id);

          if (elemento) {
            elemento.textContent = valor;
          }
        }
      );

      const avatarHeader = document.getElementById(
        'avatarHeaderUsuario'
      );

      if (avatarHeader) {
        avatarHeader.title = nombre;
      }
    }

    actualizarPerfil(usuario);

    /* ==========================================
       CONTROL DE PERMISOS
    ========================================== */

    function puedeAcceder(modulo, datos = usuario) {
      if (modulo === 'inicio') {
        return true;
      }

      const rol = String(
        datos.rol || ''
      ).toUpperCase();

      if (modulo === 'usuarios') {
        return rol === 'ADMINISTRADOR';
      }

      if (rol === 'ADMINISTRADOR') {
        return true;
      }

      const permisos = Array.isArray(datos.permisos)
        ? datos.permisos
        : [];

      return permisos.some(
        permiso =>
          String(permiso).toLowerCase() === modulo
      );
    }

    function actualizarMenu(datos) {
      const enlaces = document.querySelectorAll(
        '.sidebar__enlace[data-modulo]'
      );

      enlaces.forEach(enlace => {
        const modulo = enlace.dataset.modulo;

        enlace.classList.remove(
          'sidebar__enlace--activo'
        );

        enlace.removeAttribute('aria-current');

        if (!puedeAcceder(modulo, datos)) {
          enlace.hidden = true;
          enlace.style.display = 'none';
          return;
        }

        enlace.hidden = false;
        enlace.style.removeProperty('display');

        if (modulo === moduloActual) {
          enlace.classList.add(
            'sidebar__enlace--activo'
          );

          enlace.setAttribute(
            'aria-current',
            'page'
          );
        }

        enlace.addEventListener('click', () => {
          document.body.classList.remove(
            'sidebar-open',
            'menu-open'
          );

          const overlay = document.getElementById(
            'dashboardOverlay'
          );

          if (overlay) {
            overlay.classList.remove(
              'active',
              'is-visible'
            );
          }
        });
      });
    }

    actualizarMenu(usuario);

    if (
      moduloActual &&
      !puedeAcceder(moduloActual)
    ) {
      window.location.replace('dashboard.html');
      return;
    }

    /* ==========================================
       VALIDACIÓN CON EL BACKEND
    ========================================== */

    auth.validarSesion()
      .then(usuarioActualizado => {
        if (!usuarioActualizado) {
          window.location.replace('index.html');
          return;
        }

        actualizarPerfil(usuarioActualizado);
        actualizarMenu(usuarioActualizado);

        if (
          moduloActual &&
          !puedeAcceder(
            moduloActual,
            usuarioActualizado
          )
        ) {
          window.location.replace('dashboard.html');
        }
      })
      .catch(error => {
        console.error(
          'No se pudo verificar la sesión con el servidor:',
          error
        );
      });
  }

  /* ==========================================
     EJECUTAR CUANDO EXISTA EL DOM
  ========================================== */

  if (document.readyState === 'loading') {
    document.addEventListener(
      'DOMContentLoaded',
      iniciarNavegacion,
      { once: true }
    );
  } else {
    iniciarNavegacion();
  }
})();
