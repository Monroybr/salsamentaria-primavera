const express = require('express');
const bcrypt = require('bcrypt');
const pool = require('../db');

const router = express.Router();
const SALT_ROUNDS = 12;

const MODULOS_VALIDOS = [
  'productos',
  'inventario',
  'fraccionamiento',
  'ventas',
  'clientes',
  'cartera',
  'reportes'
];

// ==========================================
// FUNCIONES AUXILIARES
// ==========================================

function idValido(valor) {
  const id = Number(valor);
  return Number.isSafeInteger(id) && id > 0;
}

function texto(valor) {
  return typeof valor === 'string' ? valor.trim() : '';
}

function correoValido(correo) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo);
}

function validarDatos(datos, requierePassword = false) {
  const nombre = texto(datos.nombre);
  const apellido = texto(datos.apellido);
  const correo = texto(datos.correo).toLowerCase();
  const nombreUsuario = texto(datos.nombre_usuario);

  if (!nombre || nombre.length > 100) {
    return 'El nombre es obligatorio y debe tener máximo 100 caracteres.';
  }

  if (!apellido || apellido.length > 100) {
    return 'El apellido es obligatorio y debe tener máximo 100 caracteres.';
  }

  if (!correoValido(correo) || correo.length > 150) {
    return 'Ingresa un correo electrónico válido.';
  }

  if (!nombreUsuario || nombreUsuario.length > 50) {
    return 'El nombre de usuario es obligatorio y debe tener máximo 50 caracteres.';
  }

  if (!idValido(datos.id_rol)) {
    return 'Selecciona un rol válido.';
  }

  if (requierePassword || datos.contrasena !== undefined) {
    if (
      typeof datos.contrasena !== 'string' ||
      datos.contrasena.length < 8 ||
      Buffer.byteLength(datos.contrasena, 'utf8') > 72
    ) {
      return 'La contraseña debe tener al menos 8 caracteres y máximo 72 bytes.';
    }
  }

  return null;
}

function validarPermisos(permisos) {
  if (!Array.isArray(permisos)) {
    return 'Debes enviar una lista de permisos.';
  }

  if (permisos.some(modulo => !MODULOS_VALIDOS.includes(modulo))) {
    return 'La lista contiene módulos no válidos.';
  }

  if (new Set(permisos).size !== permisos.length) {
    return 'No se permiten permisos duplicados.';
  }

  return null;
}

async function obtenerRol(conexion, idRol) {
  const [roles] = await conexion.query(
    `SELECT id_rol, nombre
     FROM roles
     WHERE id_rol = ? AND estado = 'ACTIVO'`,
    [idRol]
  );

  return roles[0] || null;
}

function permisosSegunRol(rol, permisos) {
  return rol.nombre.toUpperCase() === 'ADMINISTRADOR'
    ? [...MODULOS_VALIDOS]
    : [...permisos];
}

async function guardarPermisos(conexion, idUsuario, permisos) {
  await conexion.query(
    'DELETE FROM usuarios_permisos WHERE id_usuario = ?',
    [idUsuario]
  );

  if (permisos.length === 0) return;

  const valores = permisos.map(modulo => [
    idUsuario,
    modulo
  ]);

  await conexion.query(
    `INSERT INTO usuarios_permisos (id_usuario, modulo)
     VALUES ?`,
    [valores]
  );
}

async function consultarPermisos(conexion, idUsuario) {
  const [filas] = await conexion.query(
    `SELECT modulo
     FROM usuarios_permisos
     WHERE id_usuario = ?
     ORDER BY id_permiso`,
    [idUsuario]
  );

  return filas.map(fila => fila.modulo);
}

function manejarError(res, error, operacion) {
  console.error(`Error al ${operacion}:`, error);

  if (error.code === 'ER_DUP_ENTRY') {
    return res.status(409).json({
      mensaje: 'El correo o nombre de usuario ya está registrado.'
    });
  }

  return res.status(500).json({
    mensaje: `No fue posible ${operacion}.`
  });
}

// ==========================================
// VERIFICAR MÓDULO
// ==========================================

router.get('/test', (req, res) => {
  res.json({
    mensaje: 'Módulo de usuarios disponible.',
    estado: 'OK'
  });
});

// ==========================================
// CONSULTAR ROLES
// ==========================================

router.get('/roles', async (req, res) => {
  try {
    const [roles] = await pool.query(
      `SELECT id_rol, nombre, descripcion, estado
       FROM roles
       ORDER BY id_rol ASC`
    );

    return res.json(roles);
  } catch (error) {
    return manejarError(res, error, 'consultar los roles');
  }
});

// ==========================================
// CONSULTAR TODOS LOS USUARIOS
// ==========================================

router.get('/', async (req, res) => {
  try {
    const [usuarios] = await pool.query(
      `SELECT
         u.id_usuario,
         u.id_rol,
         u.nombre,
         u.apellido,
         u.correo,
         u.nombre_usuario,
         u.estado,
         u.fecha_creacion,
         r.nombre AS rol
       FROM usuarios AS u
       INNER JOIN roles AS r
         ON u.id_rol = r.id_rol
       ORDER BY u.id_usuario DESC`
    );

    for (const usuario of usuarios) {
      usuario.permisos = await consultarPermisos(
        pool,
        usuario.id_usuario
      );
    }

    return res.json(usuarios);
  } catch (error) {
    return manejarError(res, error, 'consultar los usuarios');
  }
});

// ==========================================
// CONSULTAR PERMISOS POR USUARIO
// ==========================================

router.get('/:id/permisos', async (req, res) => {
  if (!idValido(req.params.id)) {
    return res.status(400).json({
      mensaje: 'Identificador de usuario no válido.'
    });
  }

  const id = Number(req.params.id);

  try {
    const [usuarios] = await pool.query(
      'SELECT id_usuario FROM usuarios WHERE id_usuario = ?',
      [id]
    );

    if (usuarios.length === 0) {
      return res.status(404).json({
        mensaje: 'Usuario no encontrado.'
      });
    }

    const permisos = await consultarPermisos(pool, id);

    return res.json({
      id_usuario: id,
      permisos
    });
  } catch (error) {
    return manejarError(res, error, 'consultar los permisos');
  }
});

// ==========================================
// CONSULTAR USUARIO POR ID
// ==========================================

router.get('/:id', async (req, res) => {
  if (!idValido(req.params.id)) {
    return res.status(400).json({
      mensaje: 'El identificador del usuario no es válido.'
    });
  }

  const id = Number(req.params.id);

  try {
    const [usuarios] = await pool.query(
      `SELECT
         u.id_usuario,
         u.id_rol,
         u.nombre,
         u.apellido,
         u.correo,
         u.nombre_usuario,
         u.estado,
         u.fecha_creacion,
         r.nombre AS rol
       FROM usuarios AS u
       INNER JOIN roles AS r
         ON u.id_rol = r.id_rol
       WHERE u.id_usuario = ?`,
      [id]
    );

    if (usuarios.length === 0) {
      return res.status(404).json({
        mensaje: 'Usuario no encontrado.'
      });
    }

    const usuario = usuarios[0];
    usuario.permisos = await consultarPermisos(pool, id);

    return res.json(usuario);
  } catch (error) {
    return manejarError(res, error, 'consultar el usuario');
  }
});

// ==========================================
// REGISTRAR USUARIO Y PERMISOS
// ==========================================

router.post('/', async (req, res) => {
  const datos = req.body || {};

  const errorDatos = validarDatos(datos, true);
  if (errorDatos) {
    return res.status(400).json({ mensaje: errorDatos });
  }

  const errorPermisos = validarPermisos(datos.permisos);
  if (errorPermisos) {
    return res.status(400).json({ mensaje: errorPermisos });
  }

  const nombre = texto(datos.nombre);
  const apellido = texto(datos.apellido);
  const correo = texto(datos.correo).toLowerCase();
  const nombreUsuario = texto(datos.nombre_usuario);
  const idRol = Number(datos.id_rol);

  let conexion;

  try {
    conexion = await pool.getConnection();

    const rol = await obtenerRol(conexion, idRol);

    if (!rol) {
      return res.status(400).json({
        mensaje: 'El rol seleccionado no está disponible.'
      });
    }

    const permisosFinales = permisosSegunRol(
      rol,
      datos.permisos
    );

    const passwordHash = await bcrypt.hash(
      datos.contrasena,
      SALT_ROUNDS
    );

    await conexion.beginTransaction();

    const [resultado] = await conexion.query(
      `INSERT INTO usuarios (
         id_rol,
         nombre,
         apellido,
         correo,
         nombre_usuario,
         password_hash,
         estado
       )
       VALUES (?, ?, ?, ?, ?, ?, 'ACTIVO')`,
      [
        idRol,
        nombre,
        apellido,
        correo,
        nombreUsuario,
        passwordHash
      ]
    );

    const idUsuario = resultado.insertId;

    await guardarPermisos(
      conexion,
      idUsuario,
      permisosFinales
    );

    await conexion.commit();

    return res.status(201).json({
      mensaje: 'Usuario y permisos registrados correctamente.',
      usuario: {
        id_usuario: idUsuario,
        id_rol: idRol,
        nombre,
        apellido,
        correo,
        nombre_usuario: nombreUsuario,
        rol: rol.nombre,
        estado: 'ACTIVO',
        permisos: permisosFinales
      }
    });
  } catch (error) {
    if (conexion) {
      try {
        await conexion.rollback();
      } catch (rollbackError) {
        console.error('Error al revertir el registro:', rollbackError);
      }
    }

    return manejarError(res, error, 'registrar el usuario');
  } finally {
    if (conexion) conexion.release();
  }
});

// ==========================================
// ACTUALIZAR USUARIO Y PERMISOS
// ==========================================

router.put('/:id', async (req, res) => {
  if (!idValido(req.params.id)) {
    return res.status(400).json({
      mensaje: 'El identificador del usuario no es válido.'
    });
  }

  const id = Number(req.params.id);
  const datos = req.body || {};

  const errorDatos = validarDatos(datos);
  if (errorDatos) {
    return res.status(400).json({ mensaje: errorDatos });
  }

  const errorPermisos = validarPermisos(datos.permisos);
  if (errorPermisos) {
    return res.status(400).json({ mensaje: errorPermisos });
  }

  const nombre = texto(datos.nombre);
  const apellido = texto(datos.apellido);
  const correo = texto(datos.correo).toLowerCase();
  const nombreUsuario = texto(datos.nombre_usuario);
  const idRol = Number(datos.id_rol);

  let conexion;

  try {
    conexion = await pool.getConnection();
    await conexion.beginTransaction();

    const [existentes] = await conexion.query(
      `SELECT id_usuario
       FROM usuarios
       WHERE id_usuario = ?
       FOR UPDATE`,
      [id]
    );

    if (existentes.length === 0) {
      await conexion.rollback();

      return res.status(404).json({
        mensaje: 'El usuario no existe.'
      });
    }

    const rol = await obtenerRol(conexion, idRol);

    if (!rol) {
      await conexion.rollback();

      return res.status(400).json({
        mensaje: 'El rol seleccionado no está disponible.'
      });
    }

    const permisosFinales = permisosSegunRol(
      rol,
      datos.permisos
    );

    if (datos.contrasena !== undefined) {
      const passwordHash = await bcrypt.hash(
        datos.contrasena,
        SALT_ROUNDS
      );

      await conexion.query(
        `UPDATE usuarios
         SET
           id_rol = ?,
           nombre = ?,
           apellido = ?,
           correo = ?,
           nombre_usuario = ?,
           password_hash = ?
         WHERE id_usuario = ?`,
        [
          idRol,
          nombre,
          apellido,
          correo,
          nombreUsuario,
          passwordHash,
          id
        ]
      );
    } else {
      await conexion.query(
        `UPDATE usuarios
         SET
           id_rol = ?,
           nombre = ?,
           apellido = ?,
           correo = ?,
           nombre_usuario = ?
         WHERE id_usuario = ?`,
        [
          idRol,
          nombre,
          apellido,
          correo,
          nombreUsuario,
          id
        ]
      );
    }

    await guardarPermisos(
      conexion,
      id,
      permisosFinales
    );

    await conexion.commit();

    return res.json({
      mensaje: 'Usuario y permisos actualizados correctamente.',
      id_usuario: id,
      rol: rol.nombre,
      permisos: permisosFinales
    });
  } catch (error) {
    if (conexion) {
      try {
        await conexion.rollback();
      } catch (rollbackError) {
        console.error('Error al revertir la actualización:', rollbackError);
      }
    }

    return manejarError(res, error, 'actualizar el usuario');
  } finally {
    if (conexion) conexion.release();
  }
});

// ==========================================
// ACTIVAR O DESACTIVAR USUARIO
// ==========================================

router.patch('/:id/estado', async (req, res) => {
  if (!idValido(req.params.id)) {
    return res.status(400).json({
      mensaje: 'El identificador del usuario no es válido.'
    });
  }

  const id = Number(req.params.id);
  const estado = req.body?.estado;

  if (!['ACTIVO', 'INACTIVO'].includes(estado)) {
    return res.status(400).json({
      mensaje: 'El estado debe ser ACTIVO o INACTIVO.'
    });
  }

  // Protección provisional del administrador principal.
  if (id === 1 && estado === 'INACTIVO') {
    return res.status(403).json({
      mensaje: 'No se puede desactivar al administrador principal.'
    });
  }

  try {
    const [resultado] = await pool.query(
      `UPDATE usuarios
       SET estado = ?
       WHERE id_usuario = ?`,
      [estado, id]
    );

    if (resultado.affectedRows === 0) {
      return res.status(404).json({
        mensaje: 'Usuario no encontrado.'
      });
    }

    return res.json({
      mensaje: `Usuario ${
        estado === 'ACTIVO' ? 'activado' : 'desactivado'
      } correctamente.`,
      id_usuario: id,
      estado
    });
  } catch (error) {
    return manejarError(res, error, 'cambiar el estado del usuario');
  }
});

module.exports = router;
