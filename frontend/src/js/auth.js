
/* ==========================================
   AUTENTICACIÓN - SALSAMENTARIA PRIMAVERA
   Prototipo frontend
========================================== */

(function () {
  'use strict';

  // Clave para almacenar la sesión.
  const CLAVE_SESION = 'primavera_sesion_demo';

  // Administrador de demostración.
  const ADMINISTRADOR = {
    id: 1,
    nombre: 'Ana Martínez',
    correo: 'ana@primavera.co',
    rol: 'Administrador'
  };

  // Contraseña de demostración.
  const CLAVE_DEMO = 'Primavera2026!';


  /* ==========================================
     OBTENER SESIÓN
  ========================================== */

  function obtenerSesion() {

    try {

      const datos = sessionStorage.getItem(CLAVE_SESION);

      if (!datos) {
        return null;
      }

      const sesion = JSON.parse(datos);

      if (
        sesion &&
        sesion.id === ADMINISTRADOR.id &&
        sesion.rol === 'Administrador'
      ) {
        return sesion;
      }

    } catch (error) {

      console.error(
        'Error al consultar la sesión:',
        error
      );

    }

    return null;
  }


  /* ==========================================
     INICIAR SESIÓN
  ========================================== */

  function iniciarSesion(correo, contrasena) {

    const correoIngresado = String(
      correo || ''
    ).trim().toLowerCase();

    const correoValido =
      correoIngresado === ADMINISTRADOR.correo;

    const claveValida =
      contrasena === CLAVE_DEMO;

    if (!correoValido || !claveValida) {

      return {
        correcto: false,
        mensaje:
          'Correo electrónico o contraseña incorrectos.'
      };

    }

    // Guardar sesión.
    sessionStorage.setItem(
      CLAVE_SESION,
      JSON.stringify(ADMINISTRADOR)
    );

    return {
      correcto: true,
      usuario: ADMINISTRADOR
    };
  }


  /* ==========================================
     PROTEGER PÁGINAS INTERNAS
  ========================================== */

  function protegerPagina() {

    const sesion = obtenerSesion();

    if (!sesion) {

      // index.njk se compila como index.html.
      window.location.replace('index.html');

      return false;
    }

    return true;
  }


  /* ==========================================
     REDIRIGIR SI YA INICIÓ SESIÓN
  ========================================== */

  function redirigirSiAutenticado() {

    if (obtenerSesion()) {

      window.location.replace('dashboard.html');

      return true;
    }

    return false;
  }


  /* ==========================================
     CERRAR SESIÓN
  ========================================== */

  function cerrarSesion() {

    // Eliminar sesión del administrador.
    sessionStorage.removeItem('primavera_sesion_demo');

    // Volver al inicio de sesión.
    window.location.replace('index.html');
  }


  /* ==========================================
     FUNCIONES DISPONIBLES
  ========================================== */

  window.PrimaveraAuth = {
    obtenerSesion,
    iniciarSesion,
    protegerPagina,
    redirigirSiAutenticado,
    cerrarSesion
  };

})();
