document.addEventListener('DOMContentLoaded', async () => {
  const datos = window.UsuariosDatos;
  const formulario = document.getElementById('formNuevoUsuario');

  if (!datos || !formulario) return;

  const nombre = document.getElementById('nombreUsuario');
  const apellido = document.getElementById('apellidoUsuario');
  const correo = document.getElementById('correoUsuario');
  const telefono = document.getElementById('telefonoUsuario');
  const password = document.getElementById('passwordUsuario');
  const confirmar = document.getElementById(
    'confirmarPasswordUsuario'
  );

  const permisosContenedor = document.getElementById(
    'listaPermisosUsuario'
  );

  const seleccionarTodos = document.getElementById(
    'seleccionarTodosPermisos'
  );

  const mensaje = document.getElementById(
    'mensajeNuevoUsuario'
  );

  const guardarBoton = document.getElementById(
    'guardarUsuario'
  );

  const idEditar = new URLSearchParams(
    window.location.search
  ).get('editar');

  let usuarioEditar = null;

  function mostrarError(texto) {
    mensaje.textContent = texto;
    mensaje.hidden = false;
  }

  function ocultarError() {
    mensaje.textContent = '';
    mensaje.hidden = true;
  }

  function rolSeleccionado() {
    return document.querySelector(
      'input[name="rolUsuario"]:checked'
    )?.value || 'Empleado';
  }

  function casillas() {
    return [
      ...permisosContenedor.querySelectorAll(
        'input[type="checkbox"]'
      )
    ];
  }

  function permisosSeleccionados() {
    return casillas()
      .filter(casilla => casilla.checked)
      .map(casilla => casilla.value);
  }

  // ==========================================
  // CONSTRUIR MÓDULOS
  // ==========================================

  datos.modulos.forEach(modulo => {
    const etiqueta = document.createElement('label');
    etiqueta.className = 'nuevo-usuario__permiso';

    const icono = document.createElement('span');
    icono.className = 'nuevo-usuario__permiso-icono';

    const elementoIcono = document.createElement('i');
    elementoIcono.setAttribute('data-lucide', modulo.icono);
    icono.appendChild(elementoIcono);

    const texto = document.createElement('span');
    texto.className = 'nuevo-usuario__permiso-texto';

    const titulo = document.createElement('strong');
    titulo.textContent = modulo.nombre;

    const descripcion = document.createElement('small');
    descripcion.textContent = modulo.descripcion;

    texto.append(titulo, descripcion);

    const casilla = document.createElement('input');
    casilla.type = 'checkbox';
    casilla.value = modulo.id;

    casilla.checked = datos.permisosIniciales.includes(
      modulo.id
    );

    casilla.addEventListener('change', actualizarResumen);

    etiqueta.append(icono, texto, casilla);
    permisosContenedor.appendChild(etiqueta);
  });

  // ==========================================
  // ACTUALIZAR RESUMEN
  // ==========================================

  function actualizarResumen() {
    const nombres = nombre.value.trim();
    const apellidos = apellido.value.trim();
    const rol = rolSeleccionado();

    const administrador = rol === 'Administrador';

    document.getElementById(
      'nombreResumenUsuario'
    ).textContent =
      `${nombres} ${apellidos}`.trim() || 'Nuevo usuario';

    document.getElementById(
      'avatarNuevoUsuario'
    ).textContent =
      (
        (nombres[0] || 'N') +
        (apellidos[0] || 'U')
      ).toUpperCase();

    document.getElementById(
      'rolResumenUsuario'
    ).textContent = rol;

    // Administrador tiene todos los módulos.
    casillas().forEach(casilla => {
      if (administrador) {
        casilla.checked = true;
      }

      casilla.disabled = administrador;
    });

    const cantidad = administrador
      ? datos.modulos.length
      : permisosSeleccionados().length;

    document.getElementById(
      'permisosResumenUsuario'
    ).textContent =
      `${cantidad} ${cantidad === 1 ? 'módulo' : 'módulos'}`;

    document.querySelectorAll(
      '.nuevo-usuario__rol'
    ).forEach(etiqueta => {
      const radio = etiqueta.querySelector('input');

      etiqueta.classList.toggle(
        'nuevo-usuario__rol--activo',
        Boolean(radio?.checked)
      );
    });

    seleccionarTodos.disabled = administrador;
  }

  // ==========================================
  // SELECCIONAR TODOS LOS PERMISOS
  // ==========================================

  seleccionarTodos.addEventListener('click', () => {
    const todosMarcados = casillas().every(
      casilla => casilla.checked
    );

    casillas().forEach(casilla => {
      casilla.checked = !todosMarcados;
    });

    actualizarResumen();
  });

  // ==========================================
  // EVENTOS DEL FORMULARIO
  // ==========================================

  document.querySelectorAll(
    'input[name="rolUsuario"]'
  ).forEach(radio => {
    radio.addEventListener('change', actualizarResumen);
  });

  nombre.addEventListener('input', actualizarResumen);
  apellido.addEventListener('input', actualizarResumen);

  // ==========================================
  // CARGAR USUARIO EN MODO EDICIÓN
  // ==========================================

  if (idEditar) {
    guardarBoton.disabled = true;

    try {
      usuarioEditar = await datos.buscar(idEditar);

      document.getElementById(
        'tituloFormularioUsuario'
      ).textContent = 'Editar usuario';

      document.getElementById(
        'textoGuardarUsuario'
      ).textContent = 'Guardar cambios';

      nombre.value = usuarioEditar.nombres;
      apellido.value = usuarioEditar.apellidos;
      correo.value = usuarioEditar.correo;
      telefono.value = usuarioEditar.telefono || '';

      const radio = [
        ...document.querySelectorAll(
          'input[name="rolUsuario"]'
        )
      ].find(
        elemento => elemento.value === usuarioEditar.rol
      );

      if (radio) radio.checked = true;

      casillas().forEach(casilla => {
        casilla.checked = usuarioEditar.permisos.includes(
          casilla.value
        );
      });

      // La contraseña es opcional al editar.
      password.required = false;
      confirmar.required = false;

      guardarBoton.disabled = false;

    } catch (error) {
      mostrarError(
        `No fue posible cargar el usuario: ${error.message}`
      );

      guardarBoton.disabled = true;
    }
  }

  // ==========================================
  // GUARDAR USUARIO EN MYSQL
  // ==========================================

  formulario.addEventListener('submit', async evento => {
    evento.preventDefault();
    ocultarError();

    const nombres = nombre.value.trim();
    const apellidos = apellido.value.trim();
    const email = correo.value.trim().toLowerCase();
    const rol = rolSeleccionado();

    const permisos = rol === 'Administrador'
      ? datos.modulos.map(modulo => modulo.id)
      : permisosSeleccionados();

    if (!nombres || !apellidos || !email) {
      mostrarError(
        'Completa los datos personales obligatorios.'
      );
      return;
    }

    if (rol === 'Empleado' && permisos.length === 0) {
      mostrarError(
        'Selecciona al menos un módulo para el empleado.'
      );
      return;
    }

    const cambiarPassword = (
      !usuarioEditar ||
      password.value.length > 0 ||
      confirmar.value.length > 0
    );

    if (cambiarPassword) {
      if (password.value.length < 10) {
        mostrarError(
          'La contraseña debe tener al menos 10 caracteres.'
        );
        return;
      }

      if (password.value !== confirmar.value) {
        mostrarError('Las contraseñas no coinciden.');
        return;
      }

      if (
        new TextEncoder().encode(password.value).length > 72
      ) {
        mostrarError(
          'La contraseña no puede superar 72 bytes.'
        );
        return;
      }
    }

    guardarBoton.disabled = true;

    const textoGuardar = document.getElementById(
      'textoGuardarUsuario'
    );

    const textoOriginal = textoGuardar.textContent;
    textoGuardar.textContent = 'Guardando...';

    try {
      // El formulario actual no tiene campo
      // para nombre de usuario.
      // Se propone el texto anterior al @ del correo.
      const nombreUsuario = usuarioEditar?.nombre_usuario ||
        email.split('@')[0];

      const usuario = {
        id: usuarioEditar?.id,
        nombres,
        apellidos,
        correo: email,
        nombre_usuario: nombreUsuario,
        telefono: telefono.value.trim(),
        rol,
        permisos
      };

      if (cambiarPassword) {
        usuario.contrasena = password.value;
      }

      await datos.guardar(usuario);

      alert(
        usuarioEditar
          ? 'Usuario y permisos actualizados en MySQL.'
          : 'Usuario y permisos registrados en MySQL.'
      );

      window.location.href = 'usuarios.html';

    } catch (error) {
      mostrarError(error.message);
      guardarBoton.disabled = false;
      textoGuardar.textContent = textoOriginal;
    }
  });

  actualizarResumen();

  window.lucide?.createIcons();
});
