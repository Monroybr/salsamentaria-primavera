
document.addEventListener('DOMContentLoaded', () => {
  const datos = window.UsuariosDatos;
  const formulario = document.getElementById('formNuevoUsuario');
  if (!datos || !formulario) return;

  const nombre = document.getElementById('nombreUsuario');
  const apellido = document.getElementById('apellidoUsuario');
  const correo = document.getElementById('correoUsuario');
  const telefono = document.getElementById('telefonoUsuario');
  const password = document.getElementById('passwordUsuario');
  const confirmar = document.getElementById('confirmarPasswordUsuario');

  const permisosContenedor = document.getElementById('listaPermisosUsuario');
  const seleccionarTodos = document.getElementById('seleccionarTodosPermisos');
  const mensaje = document.getElementById('mensajeNuevoUsuario');
  const guardarBoton = document.getElementById('guardarUsuario');

  const idEditar = new URLSearchParams(location.search).get('editar');
  const usuarioEditar = idEditar ? datos.buscar(idEditar) : null;

  if (idEditar && !usuarioEditar) {
    mensaje.hidden = false;
    mensaje.textContent = 'No se encontró el usuario solicitado.';
    guardarBoton.disabled = true;
    return;
  }

  function rolSeleccionado() {
    return document.querySelector('input[name="rolUsuario"]:checked').value;
  }

  function casillas() {
    return [...permisosContenedor.querySelectorAll('input[type="checkbox"]')];
  }

  function permisosSeleccionados() {
    return casillas().filter(c => c.checked).map(c => c.value);
  }

  // Construir los siete módulos del mockup.
  datos.modulos.forEach(modulo => {
    const etiqueta = document.createElement('label');
    etiqueta.className = 'nuevo-usuario__permiso';

    const icono = document.createElement('span');
    icono.className = 'nuevo-usuario__permiso-icono';
    icono.innerHTML = `<i data-lucide="${modulo.icono}"></i>`;

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
    casilla.checked = datos.permisosIniciales.includes(modulo.id);

    casilla.addEventListener('change', actualizarResumen);
    etiqueta.append(icono, texto, casilla);
    permisosContenedor.appendChild(etiqueta);
  });

  function actualizarResumen() {
    const nombres = nombre.value.trim();
    const apellidos = apellido.value.trim();
    const rol = rolSeleccionado();
    const administrador = rol === 'Administrador';

    document.getElementById('nombreResumenUsuario').textContent =
      `${nombres} ${apellidos}`.trim() || 'Nuevo usuario';

    document.getElementById('avatarNuevoUsuario').textContent =
      ((nombres[0] || 'N') + (apellidos[0] || 'U')).toUpperCase();

    document.getElementById('rolResumenUsuario').textContent = rol;

    const cantidad = administrador
      ? datos.modulos.length
      : permisosSeleccionados().length;

    document.getElementById('permisosResumenUsuario').textContent =
      `${cantidad} ${cantidad === 1 ? 'módulo' : 'módulos'}`;

    document.querySelectorAll('.nuevo-usuario__rol').forEach(etiqueta => {
      etiqueta.classList.toggle(
        'nuevo-usuario__rol--activo',
        etiqueta.querySelector('input').checked
      );
    });

    // Administrador: todos los módulos incluidos.
    casillas().forEach(casilla => {
      if (administrador) casilla.checked = true;
      casilla.disabled = administrador;
    });

    seleccionarTodos.disabled = administrador;
  }

  // Seleccionar o deseleccionar todos los permisos.
  seleccionarTodos.addEventListener('click', () => {
    const todosMarcados = casillas().every(c => c.checked);
    casillas().forEach(c => c.checked = !todosMarcados);
    actualizarResumen();
  });

  document.querySelectorAll('input[name="rolUsuario"]').forEach(radio => {
    radio.addEventListener('change', actualizarResumen);
  });

  nombre.addEventListener('input', actualizarResumen);
  apellido.addEventListener('input', actualizarResumen);

  // Modo edición.
  if (usuarioEditar) {
    document.getElementById('tituloFormularioUsuario').textContent =
      'Editar usuario';

    document.getElementById('textoGuardarUsuario').textContent =
      'Guardar cambios';

    nombre.value = usuarioEditar.nombres;
    apellido.value = usuarioEditar.apellidos;
    correo.value = usuarioEditar.correo;
    telefono.value = usuarioEditar.telefono || '';

    const radio = document.querySelector(
      `input[name="rolUsuario"][value="${usuarioEditar.rol}"]`
    );

    if (radio) radio.checked = true;

    casillas().forEach(casilla => {
      casilla.checked = usuarioEditar.permisos.includes(casilla.value);
    });

    // En edición la contraseña es opcional.
    password.required = false;
    confirmar.required = false;
  }

  function error(texto) {
    mensaje.textContent = texto;
    mensaje.hidden = false;
  }

  formulario.addEventListener('submit', evento => {
    evento.preventDefault();
    mensaje.hidden = true;

    const nombres = nombre.value.trim();
    const apellidos = apellido.value.trim();
    const email = correo.value.trim().toLowerCase();
    const rol = rolSeleccionado();
    const permisos = rol === 'Administrador'
      ? datos.modulos.map(m => m.id)
      : permisosSeleccionados();

    if (!nombres || !apellidos || !email) {
      error('Completa los datos personales obligatorios.');
      return;
    }

    if (rol === 'Empleado' && permisos.length === 0) {
      error('Selecciona al menos un módulo para el empleado.');
      return;
    }

    // Validación únicamente para el prototipo.
    // La contraseña nunca se almacena en localStorage.
    if (!usuarioEditar || password.value || confirmar.value) {
      if (password.value.length < 10) {
        error('La contraseña debe tener al menos 10 caracteres.');
        return;
      }

      if (password.value !== confirmar.value) {
        error('Las contraseñas no coinciden.');
        return;
      }
    }

    guardarBoton.disabled = true;

    try {
      datos.guardar({
        id: usuarioEditar?.id,
        nombres,
        apellidos,
        correo: email,
        telefono: telefono.value.trim(),
        rol,
        permisos
      });

      alert(
        usuarioEditar
          ? 'Cambios guardados en el prototipo.'
          : 'Usuario agregado al prototipo. El acceso real aún no está habilitado.'
      );

      location.href = 'usuarios.html';
    } catch (e) {
      guardarBoton.disabled = false;
      error(e.message);
    }
  });

  actualizarResumen();
  window.lucide?.createIcons();
});
