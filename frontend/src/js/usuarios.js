
document.addEventListener('DOMContentLoaded', () => {
  const datos = window.UsuariosDatos;
  const tabla = document.getElementById('tablaUsuarios');
  if (!datos || !tabla) return;

  const tabUsuarios = document.getElementById('tabUsuarios');
  const tabRoles = document.getElementById('tabRoles');
  const panelUsuarios = document.getElementById('panelUsuarios');
  const panelRoles = document.getElementById('panelRoles');

  function iconos() {
    window.lucide?.createIcons();
  }

  function cambiarPestana(roles) {
    panelUsuarios.hidden = roles;
    panelRoles.hidden = !roles;

    tabUsuarios.classList.toggle('usuarios__pestana--activa', !roles);
    tabRoles.classList.toggle('usuarios__pestana--activa', roles);

    tabUsuarios.setAttribute('aria-selected', String(!roles));
    tabRoles.setAttribute('aria-selected', String(roles));
  }

  tabUsuarios.addEventListener('click', () => cambiarPestana(false));
  tabRoles.addEventListener('click', () => cambiarPestana(true));

  function td(texto, clase = '') {
    const celda = document.createElement('td');
    celda.textContent = texto;
    if (clase) celda.className = clase;
    return celda;
  }

  function iniciales(usuario) {
    return (
      (usuario.nombres?.[0] || '') +
      (usuario.apellidos?.[0] || '')
    ).toUpperCase();
  }

  function pintarUsuarios() {
    tabla.replaceChildren();

    const usuarios = datos.obtener();

    document.getElementById('sinUsuarios').hidden = usuarios.length > 0;

    usuarios.forEach(usuario => {
      const fila = document.createElement('tr');

      const nombreCelda = document.createElement('td');
      const persona = document.createElement('div');
      persona.className = 'usuarios__persona';

      const avatar = document.createElement('span');
      avatar.className = 'usuarios__avatar';
      avatar.textContent = iniciales(usuario);

      const nombre = document.createElement('strong');
      nombre.textContent = `${usuario.nombres} ${usuario.apellidos}`;

      persona.append(avatar, nombre);
      nombreCelda.appendChild(persona);
      fila.appendChild(nombreCelda);

      fila.appendChild(td(usuario.correo));

      const rolCelda = document.createElement('td');
      const rol = document.createElement('span');
      rol.className = 'usuarios__etiqueta';
      rol.textContent = usuario.rol;
      rolCelda.appendChild(rol);
      fila.appendChild(rolCelda);

      fila.appendChild(td(usuario.ultimoAcceso || 'Sin acceso'));

      const estadoCelda = document.createElement('td');
      const estado = document.createElement('span');
      estado.className = 'usuarios__etiqueta ' +
        (usuario.estado === 'Activo'
          ? 'usuarios__etiqueta--activo'
          : 'usuarios__etiqueta--inactivo');

      estado.textContent = usuario.estado;
      estadoCelda.appendChild(estado);
      fila.appendChild(estadoCelda);

      // Menú de acciones.
      const acciones = document.createElement('td');
      const menu = document.createElement('details');
      menu.className = 'usuarios__menu';

      const disparador = document.createElement('summary');
      disparador.setAttribute('aria-label', 'Acciones de usuario');
      disparador.innerHTML = '<i data-lucide="ellipsis"></i>';

      const opciones = document.createElement('div');
      opciones.className = 'usuarios__menu-opciones';

      const editar = document.createElement('a');
      editar.href = `nuevo-usuario.html?editar=${encodeURIComponent(usuario.id)}`;
      editar.textContent = 'Editar usuario';

      const cambiar = document.createElement('button');
      cambiar.type = 'button';
      cambiar.textContent = usuario.estado === 'Activo'
        ? 'Desactivar'
        : 'Activar';

      cambiar.addEventListener('click', () => {
        const accion = usuario.estado === 'Activo'
          ? 'desactivar'
          : 'activar';

        if (!confirm(`¿Deseas ${accion} a ${usuario.nombres}?`)) return;

        try {
          datos.cambiarEstado(usuario.id);
          pintarUsuarios();
        } catch (error) {
          alert(error.message);
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

  // Mostrar los módulos disponibles en la segunda pestaña.
  const contenedor = document.getElementById('listaModulosUsuarios');

  datos.modulos.forEach(modulo => {
    const elemento = document.createElement('div');
    elemento.className = 'usuarios__modulo';

    const icono = document.createElement('i');
    icono.setAttribute('data-lucide', modulo.icono);

    const nombre = document.createElement('strong');
    nombre.textContent = modulo.nombre;

    elemento.append(icono, nombre);
    contenedor.appendChild(elemento);
  });

  pintarUsuarios();
  iconos();
});
