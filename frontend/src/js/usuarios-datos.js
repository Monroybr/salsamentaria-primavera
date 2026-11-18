/*
  SALSAMENTARIA PRIMAVERA
  Datos compartidos del módulo de usuarios.

  Los usuarios y sus permisos se almacenan en MySQL
  mediante el backend Express.
*/

window.UsuariosDatos = (() => {
  const API_URL = 'http://localhost:4000/api/usuarios';

  const modulos = [
    {
      id: 'productos',
      nombre: 'Productos',
      icono: 'package',
      descripcion: 'Consultar el catálogo de productos'
    },
    {
      id: 'inventario',
      nombre: 'Inventario',
      icono: 'archive',
      descripcion: 'Consultar existencias y movimientos'
    },
    {
      id: 'fraccionamiento',
      nombre: 'Fraccionamiento',
      icono: 'scale',
      descripcion: 'Registrar y consultar fraccionamientos'
    },
    {
      id: 'ventas',
      nombre: 'Ventas',
      icono: 'shopping-cart',
      descripcion: 'Registrar ventas y consultar el historial'
    },
    {
      id: 'clientes',
      nombre: 'Clientes',
      icono: 'users',
      descripcion: 'Consultar y agregar clientes'
    },
    {
      id: 'cartera',
      nombre: 'Cartera',
      icono: 'wallet',
      descripcion: 'Consultar saldos y registrar abonos'
    },
    {
      id: 'reportes',
      nombre: 'Reportes',
      icono: 'chart-column',
      descripcion: 'Consultar y descargar reportes'
    }
  ];

  const permisosIniciales = [
    'productos',
    'inventario',
    'ventas',
    'clientes',
    'cartera'
  ];

  function obtenerIdRol(rol) {
    if (rol === 'Administrador') return 1;
    if (rol === 'Empleado' || rol === 'Vendedor') return 2;

    throw new Error('El rol seleccionado no es válido.');
  }

  function nombreRol(rol) {
    return String(rol).toUpperCase() === 'ADMINISTRADOR'
      ? 'Administrador'
      : 'Empleado';
  }

  function transformarUsuario(usuario) {
    return {
      id: String(usuario.id_usuario),
      id_usuario: usuario.id_usuario,
      id_rol: usuario.id_rol,
      nombres: usuario.nombre,
      apellidos: usuario.apellido,
      correo: usuario.correo,
      nombre_usuario: usuario.nombre_usuario,
      telefono: usuario.telefono || '',
      rol: nombreRol(usuario.rol),
      permisos: Array.isArray(usuario.permisos)
        ? usuario.permisos
        : [],
      estado: usuario.estado === 'ACTIVO'
        ? 'Activo'
        : 'Inactivo',
      ultimoAcceso: 'No disponible',
      fecha_creacion: usuario.fecha_creacion
    };
  }

  async function solicitar(ruta = '', opciones = {}) {
    let respuesta;

    try {
      respuesta = await fetch(`${API_URL}${ruta}`, {
        ...opciones,
        headers: {
          'Content-Type': 'application/json',
          ...(opciones.headers || {})
        }
      });
    } catch (error) {
      throw new Error(
        'No fue posible conectar con el servidor. ' +
        'Verifica que el backend esté ejecutándose en el puerto 4000.'
      );
    }

    const contenido = await respuesta.text();

    let resultado;

    try {
      resultado = contenido ? JSON.parse(contenido) : null;
    } catch (error) {
      throw new Error(
        'El servidor devolvió una respuesta que no es JSON.'
      );
    }

    if (!respuesta.ok) {
      throw new Error(
        resultado?.mensaje ||
        `Error del servidor (${respuesta.status}).`
      );
    }

    return resultado;
  }

  async function obtener() {
    const usuarios = await solicitar('/');

    return usuarios.map(transformarUsuario);
  }

  async function buscar(id) {
    const usuario = await solicitar(
      `/${encodeURIComponent(id)}`
    );

    return transformarUsuario(usuario);
  }

  async function obtenerRoles() {
    return solicitar('/roles');
  }

  async function guardar(usuario) {
    const esEdicion = Boolean(usuario.id);

    const nombres = String(usuario.nombres || '').trim();
    const apellidos = String(usuario.apellidos || '').trim();

    const nombreUsuario = String(
      usuario.nombre_usuario ||
      usuario.correo.split('@')[0]
    ).trim();

    const permisos = usuario.rol === 'Administrador'
      ? modulos.map(modulo => modulo.id)
      : [...usuario.permisos];

    const cuerpo = {
      nombre: nombres,
      apellido: apellidos,
      correo: String(usuario.correo).trim().toLowerCase(),
      nombre_usuario: nombreUsuario,
      id_rol: obtenerIdRol(usuario.rol),
      permisos
    };

    if (usuario.contrasena) {
      cuerpo.contrasena = usuario.contrasena;
    }

    const resultado = await solicitar(
      esEdicion
        ? `/${encodeURIComponent(usuario.id)}`
        : '/',
      {
        method: esEdicion ? 'PUT' : 'POST',
        body: JSON.stringify(cuerpo)
      }
    );

    return resultado;
  }

  async function cambiarEstado(id) {
    const usuario = await buscar(id);

    if (
      Number(usuario.id_usuario) === 1 &&
      usuario.estado === 'Activo'
    ) {
      throw new Error(
        'No puedes desactivar al administrador principal.'
      );
    }

    const nuevoEstado = usuario.estado === 'Activo'
      ? 'INACTIVO'
      : 'ACTIVO';

    return solicitar(
      `/${encodeURIComponent(id)}/estado`,
      {
        method: 'PATCH',
        body: JSON.stringify({
          estado: nuevoEstado
        })
      }
    );
  }

  return {
    modulos,
    permisosIniciales,
    obtener,
    buscar,
    obtenerRoles,
    guardar,
    cambiarEstado
  };
})();
