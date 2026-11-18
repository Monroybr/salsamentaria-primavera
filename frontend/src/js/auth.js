/* ==========================================
   AUTENTICACIÓN - SALSAMENTARIA PRIMAVERA
   Backend Node.js + MySQL + JWT
========================================== */

(function () {
  'use strict';

  const API_URL = 'http://localhost:4000/api';

  const CLAVE_SESION = 'primavera_sesion';
  const CLAVE_DEMO = 'primavera_sesion_demo';

  // Eliminar autenticación antigua de demostración.
  sessionStorage.removeItem(CLAVE_DEMO);

  /* ==========================================
     NORMALIZAR USUARIO
  ========================================== */

  function normalizarUsuario(datos) {
    if (!datos || typeof datos !== 'object') {
      throw new Error('El servidor no devolvió un usuario válido.');
    }

    const id = Number(datos.id_usuario ?? datos.id);

    if (!Number.isSafeInteger(id) || id <= 0) {
      throw new Error('Identificador de usuario inválido.');
    }

    const nombreCompleto = String(
      datos.nombre_completo ||
      [datos.nombre, datos.apellido].filter(Boolean).join(' ')
    ).trim();

    return {
      id,
      id_usuario: id,
      nombre: nombreCompleto,
      nombres: datos.nombre || nombreCompleto,
      apellidos: datos.apellido || '',
      correo: String(datos.correo || ''),
      nombre_usuario: String(datos.nombre_usuario || ''),
      rol: String(datos.rol || '').toUpperCase(),
      estado: String(datos.estado || '').toUpperCase(),
      permisos: Array.isArray(datos.permisos)
        ? datos.permisos
        : []
    };
  }

  /* ==========================================
     OBTENER TOKEN
  ========================================== */

  function obtenerToken() {
    try {
      const datos = sessionStorage.getItem(CLAVE_SESION);

      if (!datos) return null;

      const sesion = JSON.parse(datos);

      return typeof sesion.token === 'string'
        ? sesion.token
        : null;

    } catch (error) {
      return null;
    }
  }

  /* ==========================================
     OBTENER SESIÓN
  ========================================== */

  function obtenerSesion() {
    try {
      const datos = sessionStorage.getItem(CLAVE_SESION);

      if (!datos) return null;

      const sesion = JSON.parse(datos);

      if (
        !sesion ||
        !sesion.token ||
        !sesion.usuario ||
        !Number.isSafeInteger(Number(sesion.usuario.id))
      ) {
        sessionStorage.removeItem(CLAVE_SESION);
        return null;
      }

      return sesion.usuario;

    } catch (error) {
      console.error('Error al obtener sesión:', error);
      sessionStorage.removeItem(CLAVE_SESION);
      return null;
    }
  }

  /* ==========================================
     INICIAR SESIÓN
  ========================================== */

  async function iniciarSesion(correo, contrasena) {
    const email = String(correo || '').trim().toLowerCase();

    if (!email || !contrasena) {
      return {
        correcto: false,
        mensaje: 'Debes completar todos los campos.'
      };
    }

    try {
      const respuesta = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          correo: email,
          contrasena
        })
      });

      const resultado = await respuesta.json().catch(() => null);

      if (!respuesta.ok) {
        return {
          correcto: false,
          mensaje:
            resultado?.mensaje ||
            'Correo electrónico o contraseña incorrectos.'
        };
      }

      if (
        resultado?.correcto !== true ||
        !resultado.token ||
        !resultado.usuario
      ) {
        return {
          correcto: false,
          mensaje: 'El servidor devolvió una respuesta incompleta.'
        };
      }

      const usuario = normalizarUsuario(resultado.usuario);

      if (usuario.estado !== 'ACTIVO') {
        return {
          correcto: false,
          mensaje: 'La cuenta se encuentra inactiva.'
        };
      }

      sessionStorage.setItem(
        CLAVE_SESION,
        JSON.stringify({
          token: resultado.token,
          usuario
        })
      );

      return {
        correcto: true,
        usuario
      };

    } catch (error) {
      console.error('Error al iniciar sesión:', error);

      return {
        correcto: false,
        mensaje:
          'No fue posible conectar con el servidor.'
      };
    }
  }

  /* ==========================================
     VALIDAR SESIÓN CON EL BACKEND
  ========================================== */

  async function validarSesion() {
    const token = obtenerToken();

    if (!token) return null;

    try {
      const respuesta = await fetch(`${API_URL}/auth/me`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      if (respuesta.status === 401) {
        sessionStorage.removeItem(CLAVE_SESION);
        return null;
      }

      if (!respuesta.ok) {
        throw new Error('No fue posible validar la sesión.');
      }

      const resultado = await respuesta.json();

      if (!resultado.usuario) {
        throw new Error('Respuesta de sesión inválida.');
      }

      const usuario = normalizarUsuario(resultado.usuario);

      sessionStorage.setItem(
        CLAVE_SESION,
        JSON.stringify({
          token,
          usuario
        })
      );

      return usuario;

    } catch (error) {
      console.error('Error al validar sesión:', error);
      throw error;
    }
  }

  /* ==========================================
     PROTEGER PÁGINAS INTERNAS
  ========================================== */

  function protegerPagina() {
    if (!obtenerSesion()) {
      window.location.replace('index.html');
      return false;
    }

    // Comprobación inicial de navegación.
    // Los permisos reales se verifican en el backend.
    return true;
  }

  /* ==========================================
     REDIRIGIR SI ESTÁ AUTENTICADO
  ========================================== */

  function redirigirSiAutenticado() {
    if (obtenerSesion()) {
      window.location.replace('dashboard.html');
      return true;
    }

    return false;
  }

  /* ==========================================
     VERIFICAR PERMISOS
  ========================================== */

  function tienePermiso(modulo) {
    const usuario = obtenerSesion();

    if (!usuario) return false;

    if (usuario.rol === 'ADMINISTRADOR') {
      return true;
    }

    return usuario.permisos.includes(modulo);
  }

  /* ==========================================
     PETICIONES AUTENTICADAS
  ========================================== */

  async function peticionAutenticada(ruta, opciones = {}) {
    const token = obtenerToken();

    if (!token) {
      throw new Error('Debes iniciar sesión.');
    }

    const headers = new Headers(opciones.headers || {});

    headers.set('Authorization', `Bearer ${token}`);

    const respuesta = await fetch(`${API_URL}${ruta}`, {
      ...opciones,
      headers
    });

    if (respuesta.status === 401) {
      sessionStorage.removeItem(CLAVE_SESION);
      window.location.replace('index.html');

      throw new Error('Tu sesión ha expirado.');
    }

    return respuesta;
  }

  /* ==========================================
     CERRAR SESIÓN
  ========================================== */

  function cerrarSesion() {
    sessionStorage.removeItem(CLAVE_SESION);
    sessionStorage.removeItem(CLAVE_DEMO);

    window.location.replace('index.html');
  }

  /* ==========================================
     FUNCIONES DISPONIBLES
  ========================================== */

  window.PrimaveraAuth = {
    obtenerSesion,
    obtenerToken,
    iniciarSesion,
    validarSesion,
    protegerPagina,
    redirigirSiAutenticado,
    tienePermiso,
    peticionAutenticada,
    cerrarSesion
  };

})();
