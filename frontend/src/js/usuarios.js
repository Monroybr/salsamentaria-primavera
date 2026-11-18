document.addEventListener('DOMContentLoaded', async () => {
  const datos = window.UsuariosDatos;
  const tabla = document.getElementById('tablaUsuarios');

  if (!datos || !tabla) return;

  const tabUsuarios = document.getElementById('tabUsuarios');
  const tabRoles = document.getElementById('tabRoles');

  const panelUsuarios = document.getElementById('panelUsuarios');
  const panelRoles = document.getElementById('panelRoles');

  const sinUsuarios = document.getElementById('sinUsuarios');
  const contenedor = document.getElementById('listaModulosUsuarios');

  // ==========================================
  // FUNCIONES AUXILIARES
  // ==========================================

  function iconos() {
    window.lucide?.createIcons();
  }

  function cambiarPestana(roles) {
    panelUsuarios.hidden = roles;
    panelRoles.hidden = !roles;

    tabUsuarios.classList.toggle(
      'usuarios__pestana--activa',
      !roles
    );

    tabRoles.classList.toggle(
      'usuarios__pestana--activa',
      roles
    );

    tabUsuarios.setAttribute(
      'aria-selected',
      String(!roles)
    );

    tabRoles.setAttribute(
      'aria-selected',
      String(roles)
    );
  }

  tabUsuarios?.addEventListener('click', () => {
    cambiarPestana(false);
  });

  tabRoles?.addEventListener('click', () => {
    cambiarPestana(true);
  });

  function td(texto, clase = '') {
    const celda = document.createElement('td');

    celda.textContent = texto ?? '';

    if (clase) {
      celda.className = clase;
    }

    return celda;
  }

  function iniciales(usuario) {
    return (
      (usuario.nombres?.[0] || '') +
      (usuario.apellidos?.[0] || '')
    ).toUpperCase();
  }

  function mostrarMensaje(texto) {
    tabla.replaceChildren();

    const fila = document.createElement('tr');
    const celda = document.createElement('td');

    celda.colSpan = 6;
    celda.textContent = texto;
    celda.style.textAlign = 'center';
    celda.style.padding = '24px';

    fila.appendChild(celda);
    tabla.appendChild(fila);
  }

  // ==========================================
  // CONSULTAR USUARIOS DESDE MYSQL
  // ==========================================

  async function pintarUsuarios() {
    mostrarMensaje('Cargando usuarios...');

    if (sinUsuarios) {
      sinUsuarios.hidden = true;
    }

    let usuarios;

    try {
      usuarios = await datos.obtener();
    } catch (error) {
      console.error('Error al consultar usuarios:', error);

      mostrarMensaje(
        'No fue posible cargar los usuarios. ' +
        'Verifica la conexión con el servidor.'
      );

      return;
    }

    tabla.replaceChildren();

    if (!Array.isArray(usuarios) || usuarios.length === 0) {
      if (sinUsuarios) {
        sinUsuarios.hidden = false;
      }

      return;
    }

    if (sinUsuarios) {
      sinUsuarios.hidden = true;
    }

    // ==========================================
    // CONSTRUIR FILAS DE USUARIOS
    // ==========================================

    usuarios.forEach(usuario => {
      const fila = document.createElement('tr');

      // NOMBRE Y AVATAR
      const nombreCelda = document.createElement('td');

      const persona = document.createElement('div');
      persona.className = 'usuarios__persona';

      const avatar = document.createElement('span');
      avatar.className = 'usuarios__avatar';
      avatar.textContent = iniciales(usuario);

      const nombre = document.createElement('strong');

      nombre.textContent =
        `${usuario.nombres} ${usuario.apellidos}`;

      persona.append(avatar, nombre);
      nombreCelda.appendChild(persona);

      fila.appendChild(nombreCelda);

      // CORREO
      fila.appendChild(td(usuario.correo));

      // ROL
      const rolCelda = document.createElement('td');

      const rol = document.createElement('span');
      rol.className = 'usuarios__etiqueta';
      rol.textContent = usuario.rol;

      rolCelda.appendChild(rol);
      fila.appendChild(rolCelda);

      // ÚLTIMO ACCESO
      // La base de datos todavía no registra
      // el último inicio de sesión.
      fila.appendChild(
        td(usuario.ultimoAcceso || 'No disponible')
      );

      // ESTADO
      const estadoCelda = document.createElement('td');

      const estado = document.createElement('span');

      estado.className =
        'usuarios__etiqueta ' +
        (
          usuario.estado === 'Activo'
            ? 'usuarios__etiqueta--activo'
            : 'usuarios__etiqueta--inactivo'
        );

      estado.textContent = usuario.estado;

      estadoCelda.appendChild(estado);
      fila.appendChild(estadoCelda);

      // ==========================================
      // MENÚ DE ACCIONES
      // ==========================================

      const acciones = document.createElement('td');

      const menu = document.createElement('details');
      menu.className = 'usuarios__menu';

      const disparador = document.createElement('summary');

      disparador.setAttribute(
        'aria-label',
        `Acciones de ${usuario.nombres}`
      );

      const iconoMenu = document.createElement('i');
      iconoMenu.setAttribute('data-lucide', 'ellipsis');

      disparador.appendChild(iconoMenu);

      const opciones = document.createElement('div');
      opciones.className = 'usuarios__menu-opciones';

      // EDITAR USUARIO
      const editar = document.createElement('a');

      editar.href =
        `nuevo-usuario.html?editar=${
          encodeURIComponent(usuario.id)
        }`;

      editar.textContent = 'Editar usuario';

      // ACTIVAR O DESACTIVAR
      const cambiar = document.createElement('button');

      cambiar.type = 'button';

      cambiar.textContent =
        usuario.estado === 'Activo'
          ? 'Desactivar'
          : 'Activar';

      cambiar.addEventListener('click', async () => {
        const accion =
          usuario.estado === 'Activo'
            ? 'desactivar'
            : 'activar';

        const confirmarAccion = confirm(
          `¿Deseas ${accion} a ${usuario.nombres} ` +
          `${usuario.apellidos}?`
        );

        if (!confirmarAccion) return;

        cambiar.disabled = true;

        try {
          await datos.cambiarEstado(usuario.id);

          alert(
            `El usuario fue ${
              accion === 'desactivar'
                ? 'desactivado'
                : 'activado'
            } correctamente.`
          );

          await pintarUsuarios();

        } catch (error) {
          alert(error.message);
          cambiar.disabled = false;
        }
      });

      opciones.append(editar, cambiar);

      menu.append(disparador, opciones);

      acciones.appendChild(menu);
      fila.appendChild(acciones);

      tabla.appendChild(fila);
    });

    iconos();
  }

  // ==========================================
  // MOSTRAR MÓDULOS EN LA PESTAÑA ROLES
  // ==========================================

  if (contenedor) {
    contenedor.replaceChildren();

    datos.modulos.forEach(modulo => {
      const elemento = document.createElement('div');
      elemento.className = 'usuarios__modulo';

      const icono = document.createElement('i');

      icono.setAttribute(
        'data-lucide',
        modulo.icono
      );

      const nombre = document.createElement('strong');
      nombre.textContent = modulo.nombre;

      elemento.append(icono, nombre);

      contenedor.appendChild(elemento);
    });
  }

  // ==========================================
  // INICIALIZAR
  // ==========================================

  await pintarUsuarios();
  iconos();
});
