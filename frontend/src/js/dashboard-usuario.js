/* ==========================================
   USUARIO AUTENTICADO EN DASHBOARD
   SALSAMENTARIA PRIMAVERA
========================================== */

document.addEventListener('DOMContentLoaded', async () => {
  'use strict';

  const auth = window.PrimaveraAuth;

  if (!auth) {
    console.error('No se cargó auth.js.');
    return;
  }

  let usuario;

  try {
    usuario = await auth.validarSesion();
  } catch (error) {
    console.error('No fue posible validar la sesión:', error);
    return;
  }

  if (!usuario) {
    window.location.replace('index.html');
    return;
  }

  const nombreCompleto = usuario.nombre || 'Usuario';

  const primerNombre = nombreCompleto
    .trim()
    .split(/\s+/)[0];

  const hora = new Date().getHours();

  let saludo = 'Buenas noches';

  if (hora >= 5 && hora < 12) {
    saludo = 'Buenos días';
  } else if (hora >= 12 && hora < 19) {
    saludo = 'Buenas tardes';
  }

  const elementoSaludo = document.getElementById(
    'saludoUsuario'
  );

  if (elementoSaludo) {
    elementoSaludo.textContent =
      `${saludo}, ${primerNombre}`;
  }
});
