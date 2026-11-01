
/* ==========================================
   INICIO DE SESIÓN
   SALSAMENTARIA PRIMAVERA
========================================== */

document.addEventListener('DOMContentLoaded', () => {

  // Si existe sesión, ir al dashboard.
  if (window.PrimaveraAuth.redirigirSiAutenticado()) {
    return;
  }

  // Elementos del formulario.
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
    console.error('Faltan elementos del formulario de login.');
    return;
  }


  /* ==========================================
     MOSTRAR ERROR
  ========================================== */

  function mostrarError(texto) {

    mensaje.textContent = texto;
    mensaje.hidden = false;
  }


  /* ==========================================
     LIMPIAR ERROR
  ========================================== */

  function limpiarError() {

    mensaje.textContent = '';
    mensaje.hidden = true;
  }


  /* ==========================================
     MOSTRAR / OCULTAR CONTRASEÑA
  ========================================== */

  botonMostrar.addEventListener('click', () => {

    const estaOculta =
      contrasena.type === 'password';

    contrasena.type = estaOculta
      ? 'text'
      : 'password';

    botonMostrar.textContent = estaOculta
      ? 'Ocultar'
      : 'Mostrar';

    botonMostrar.setAttribute(
      'aria-pressed',
      String(estaOculta)
    );

    botonMostrar.setAttribute(
      'aria-label',
      estaOculta
        ? 'Ocultar contraseña'
        : 'Mostrar contraseña'
    );

  });


  /* ==========================================
     VALIDAR INICIO DE SESIÓN
  ========================================== */

  formulario.addEventListener('submit', (evento) => {

    evento.preventDefault();

    limpiarError();

    const email = correo.value.trim();
    const clave = contrasena.value;

    // Validar campos vacíos.
    if (!email || !clave) {

      mostrarError(
        'Debes completar todos los campos.'
      );

      return;
    }

    // Validar formato del correo.
    if (!correo.validity.valid) {

      mostrarError(
        'Ingresa un correo electrónico válido.'
      );

      correo.focus();

      return;
    }

    // Comprobar credenciales.
    const resultado = window.PrimaveraAuth.iniciarSesion(
      email,
      clave
    );

    if (!resultado.correcto) {

      mostrarError(resultado.mensaje);

      contrasena.value = '';
      contrasena.focus();

      return;
    }

    // Inicio de sesión correcto.
    window.location.replace('dashboard.html');

  });

});
