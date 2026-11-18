/* ==========================================
   INICIO DE SESIÓN
   SALSAMENTARIA PRIMAVERA
========================================== */

document.addEventListener('DOMContentLoaded', () => {
  'use strict';

  const auth = window.PrimaveraAuth;

  if (!auth) {
    console.error('No se cargó auth.js.');
    return;
  }

  if (auth.redirigirSiAutenticado()) {
    return;
  }

  const formulario = document.getElementById('formLogin');
  const correo = document.getElementById('correo');
  const contrasena = document.getElementById('contrasena');
  const botonMostrar = document.getElementById('mostrarPassword');
  const mensaje = document.getElementById('mensajeLogin');

  if (
    !formulario ||
    !correo ||
    !contrasena ||
    !botonMostrar ||
    !mensaje
  ) {
    console.error('Faltan elementos del formulario.');
    return;
  }

  const botonIngresar = formulario.querySelector(
    'button[type="submit"]'
  );

  const textoOriginal = botonIngresar
    ? botonIngresar.textContent
    : 'Ingresar';

  /* ==========================================
     MOSTRAR MENSAJES
  ========================================== */

  function mostrarError(texto) {
    mensaje.textContent = texto;
    mensaje.hidden = false;
  }

  function limpiarError() {
    mensaje.textContent = '';
    mensaje.hidden = true;
  }

  /* ==========================================
     MOSTRAR CONTRASEÑA
  ========================================== */

  botonMostrar.addEventListener('click', () => {
    const oculta = contrasena.type === 'password';

    contrasena.type = oculta ? 'text' : 'password';

    botonMostrar.textContent = oculta
      ? 'Ocultar'
      : 'Mostrar';

    botonMostrar.setAttribute(
      'aria-pressed',
      String(oculta)
    );

    botonMostrar.setAttribute(
      'aria-label',
      oculta
        ? 'Ocultar contraseña'
        : 'Mostrar contraseña'
    );
  });

  correo.addEventListener('input', limpiarError);
  contrasena.addEventListener('input', limpiarError);

  /* ==========================================
     INICIAR SESIÓN
  ========================================== */

  let procesando = false;

  formulario.addEventListener('submit', async (evento) => {
    evento.preventDefault();

    if (procesando) return;

    limpiarError();

    const email = correo.value.trim().toLowerCase();
    const clave = contrasena.value;

    if (!email || !clave) {
      mostrarError('Debes completar todos los campos.');
      return;
    }

    if (!correo.validity.valid) {
      mostrarError('Ingresa un correo electrónico válido.');
      correo.focus();
      return;
    }

    procesando = true;

    if (botonIngresar) {
      botonIngresar.disabled = true;
      botonIngresar.textContent = 'Verificando...';
    }

    try {
      const resultado = await auth.iniciarSesion(
        email,
        clave
      );

      if (!resultado.correcto) {
        mostrarError(resultado.mensaje);

        contrasena.value = '';
        contrasena.focus();

        return;
      }

      window.location.replace('dashboard.html');

    } catch (error) {
      console.error('Error de inicio de sesión:', error);

      mostrarError(
        'Ocurrió un error al iniciar sesión.'
      );

    } finally {
      procesando = false;

      if (botonIngresar) {
        botonIngresar.disabled = false;
        botonIngresar.textContent = textoOriginal;
      }
    }
  });

});
