
/* Datos compartidos del módulo de usuarios.
   Prototipo: no gestiona autenticación real. */

window.UsuariosDatos = (() => {
  const CLAVE = 'primavera_usuarios_demo_v1';

  const modulos = [
    { id: 'productos', nombre: 'Productos', icono: 'package', descripcion: 'Consultar el catálogo de productos' },
    { id: 'inventario', nombre: 'Inventario', icono: 'archive', descripcion: 'Consultar existencias y movimientos' },
    { id: 'fraccionamiento', nombre: 'Fraccionamiento', icono: 'scale', descripcion: 'Registrar y consultar fraccionamientos' },
    { id: 'ventas', nombre: 'Ventas', icono: 'shopping-cart', descripcion: 'Registrar ventas y consultar el historial' },
    { id: 'clientes', nombre: 'Clientes', icono: 'users', descripcion: 'Consultar y agregar clientes' },
    { id: 'cartera', nombre: 'Cartera', icono: 'wallet', descripcion: 'Consultar saldos y registrar abonos' },
    { id: 'reportes', nombre: 'Reportes', icono: 'chart-column', descripcion: 'Consultar y descargar reportes' }
  ];

  const permisosIniciales = [
    'productos', 'inventario', 'ventas', 'clientes', 'cartera'
  ];

  const iniciales = [
    {
      id: 'U-001',
      nombres: 'Ana',
      apellidos: 'Martínez',
      correo: 'ana@primavera.co',
      telefono: '',
      rol: 'Administrador',
      permisos: modulos.map(m => m.id),
      estado: 'Activo',
      ultimoAcceso: 'Ahora'
    },
    {
      id: 'U-002',
      nombres: 'Carlos',
      apellidos: 'Rojas',
      correo: 'carlos@primavera.co',
      telefono: '',
      rol: 'Empleado',
      permisos: [...permisosIniciales],
      estado: 'Activo',
      ultimoAcceso: 'Hoy, 8:24 a. m.'
    },
    {
      id: 'U-003',
      nombres: 'Laura',
      apellidos: 'Pérez',
      correo: 'laura@primavera.co',
      telefono: '',
      rol: 'Empleado',
      permisos: [...permisosIniciales],
      estado: 'Activo',
      ultimoAcceso: 'Hoy, 8:24 a. m.'
    }
  ];

  function obtener() {
    try {
      const guardados = JSON.parse(localStorage.getItem(CLAVE));
      if (Array.isArray(guardados)) return guardados;
    } catch (error) {
      console.warn('No fue posible leer los usuarios.', error);
    }
    return iniciales.map(u => ({ ...u, permisos: [...u.permisos] }));
  }

  function guardarTodos(usuarios) {
    localStorage.setItem(CLAVE, JSON.stringify(usuarios));
  }

  function normalizar(valor) {
    return String(valor || '').trim().toLocaleLowerCase('es');
  }

  function buscar(id) {
    return obtener().find(u => u.id === id);
  }

  function guardar(usuario) {
    const usuarios = obtener();
    const correo = normalizar(usuario.correo);

    if (usuarios.some(u =>
      normalizar(u.correo) === correo && u.id !== usuario.id
    )) {
      throw new Error('Ya existe un usuario con ese correo electrónico.');
    }

    if (usuario.id) {
      const indice = usuarios.findIndex(u => u.id === usuario.id);
      if (indice === -1) throw new Error('El usuario no existe.');

      usuarios[indice] = {
        ...usuarios[indice],
        ...usuario,
        permisos: usuario.rol === 'Administrador'
          ? modulos.map(m => m.id)
          : [...usuario.permisos]
      };

      guardarTodos(usuarios);
      return usuarios[indice];
    }

    const siguiente = Math.max(
      0,
      ...usuarios.map(u => Number(String(u.id).replace('U-', '')) || 0)
    ) + 1;

    const nuevo = {
      ...usuario,
      id: `U-${String(siguiente).padStart(3, '0')}`,
      estado: 'Activo',
      ultimoAcceso: 'Sin acceso',
      permisos: usuario.rol === 'Administrador'
        ? modulos.map(m => m.id)
        : [...usuario.permisos]
    };

    usuarios.push(nuevo);
    guardarTodos(usuarios);
    return nuevo;
  }

  function cambiarEstado(id) {
    const usuarios = obtener();
    const usuario = usuarios.find(u => u.id === id);
    if (!usuario) throw new Error('Usuario no encontrado.');

    // Evita desactivar la cuenta principal de demostración.
    if (id === 'U-001') {
      throw new Error('No puedes desactivar al administrador principal.');
    }

    usuario.estado = usuario.estado === 'Activo'
      ? 'Inactivo'
      : 'Activo';

    guardarTodos(usuarios);
    return usuario;
  }

  return {
    modulos,
    permisosIniciales,
    obtener,
    buscar,
    guardar,
    cambiarEstado
  };
})();
