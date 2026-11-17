const express = require('express');
const bcrypt = require('bcrypt');
const pool = require('../db');

const router = express.Router();

const SALT_ROUNDS = 12;

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
  const idRol = Number(datos.id_rol);

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

  if (!idValido(idRol)) {
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

function manejarError(res, error, operacion) {
  console.error(`Error al ${operacion}:`, error);

  if (error.code === 'ER_DUP_ENTRY') {
    return res.status(409).json({
      mensaje: 'El correo o nombre de usuario ya está registrado.'
    });
  }

  res.status(500).json({
    mensaje: `No fue posible ${operacion}.`
  });
}

// ==========================================
// VERIFICAR RUTA
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
    const [roles] = await pool.query(`
      SELECT id_rol, nombre, descripcion, estado
      FROM roles
      ORDER BY id_rol ASC
    `);

    res.json(roles);
  } catch (error) {
    manejarError(res, error, 'consultar los roles');
  }
});

// ==========================================
// CONSULTAR USUARIOS
// ==========================================

router.get('/', async (req, res) => {
  try {
    const [usuarios] = await pool.query(`
      SELECT
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
      ORDER BY u.id_usuario DESC
    `);

    res.json(usuarios);
  } catch (error) {
    manejarError(res, error, 'consultar los usuarios');
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

  try {
    const [usuarios] = await pool.query(`
      SELECT
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
      WHERE u.id_usuario = ?
    `, [Number(req.params.id)]);

    if (usuarios.length === 0) {
      return res.status(404).json({
        mensaje: 'Usuario no encontrado.'
      });
    }

    res.json(usuarios[0]);
  } catch (error) {
    manejarError(res, error, 'consultar el usuario');
  }
});

// ==========================================
// REGISTRAR USUARIO
// ==========================================

router.post('/', async (req, res) => {
  const datos = req.body || {};
  const errorValidacion = validarDatos(datos, true);

  if (errorValidacion) {
    return res.status(400).json({
      mensaje: errorValidacion
    });
  }

  const nombre = texto(datos.nombre);
  const apellido = texto(datos.apellido);
  const correo = texto(datos.correo).toLowerCase();
  const nombreUsuario = texto(datos.nombre_usuario);
  const idRol = Number(datos.id_rol);

  try {
    const [roles] = await pool.query(`
      SELECT id_rol
      FROM roles
      WHERE id_rol = ?
        AND estado = 'ACTIVO'
    `, [idRol]);

    if (roles.length === 0) {
      return res.status(400).json({
        mensaje: 'El rol seleccionado no está disponible.'
      });
    }

    const passwordHash = await bcrypt.hash(
      datos.contrasena,
      SALT_ROUNDS
    );

    const [resultado] = await pool.query(`
      INSERT INTO usuarios (
        id_rol,
        nombre,
        apellido,
        correo,
        nombre_usuario,
        password_hash,
        estado
      )
      VALUES (?, ?, ?, ?, ?, ?, 'ACTIVO')
    `, [
      idRol,
      nombre,
      apellido,
      correo,
      nombreUsuario,
      passwordHash
    ]);

    res.status(201).json({
      mensaje: 'Usuario registrado correctamente.',
      usuario: {
        id_usuario: resultado.insertId,
        id_rol: idRol,
        nombre,
        apellido,
        correo,
        nombre_usuario: nombreUsuario,
        estado: 'ACTIVO'
      }
    });
  } catch (error) {
    manejarError(res, error, 'registrar el usuario');
  }
});

// ==========================================
// ACTUALIZAR USUARIO
// ==========================================

router.put('/:id', async (req, res) => {
  if (!idValido(req.params.id)) {
    return res.status(400).json({
      mensaje: 'El identificador del usuario no es válido.'
    });
  }

  const id = Number(req.params.id);
  const datos = req.body || {};
  const errorValidacion = validarDatos(datos);

  if (errorValidacion) {
    return res.status(400).json({
      mensaje: errorValidacion
    });
  }

  const nombre = texto(datos.nombre);
  const apellido = texto(datos.apellido);
  const correo = texto(datos.correo).toLowerCase();
  const nombreUsuario = texto(datos.nombre_usuario);
  const idRol = Number(datos.id_rol);

  try {
    const [existentes] = await pool.query(`
      SELECT id_usuario
      FROM usuarios
      WHERE id_usuario = ?
    `, [id]);

    if (existentes.length === 0) {
      return res.status(404).json({
        mensaje: 'El usuario no existe.'
      });
    }

    const [roles] = await pool.query(`
      SELECT id_rol
      FROM roles
      WHERE id_rol = ?
        AND estado = 'ACTIVO'
    `, [idRol]);

    if (roles.length === 0) {
      return res.status(400).json({
        mensaje: 'El rol seleccionado no está disponible.'
      });
    }

    if (datos.contrasena !== undefined) {
      const passwordHash = await bcrypt.hash(
        datos.contrasena,
        SALT_ROUNDS
      );

      await pool.query(`
        UPDATE usuarios
        SET
          id_rol = ?,
          nombre = ?,
          apellido = ?,
          correo = ?,
          nombre_usuario = ?,
          password_hash = ?
        WHERE id_usuario = ?
      `, [
        idRol,
        nombre,
        apellido,
        correo,
        nombreUsuario,
        passwordHash,
        id
      ]);
    } else {
      await pool.query(`
        UPDATE usuarios
        SET
          id_rol = ?,
          nombre = ?,
          apellido = ?,
          correo = ?,
          nombre_usuario = ?
        WHERE id_usuario = ?
      `, [
        idRol,
        nombre,
        apellido,
        correo,
        nombreUsuario,
        id
      ]);
    }

    res.json({
      mensaje: 'Usuario actualizado correctamente.',
      id_usuario: id
    });
  } catch (error) {
    manejarError(res, error, 'actualizar el usuario');
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

  try {
    const [resultado] = await pool.query(`
      UPDATE usuarios
      SET estado = ?
      WHERE id_usuario = ?
    `, [estado, id]);

    if (resultado.affectedRows === 0) {
      return res.status(404).json({
        mensaje: 'Usuario no encontrado.'
      });
    }

    res.json({
      mensaje: `Usuario ${estado === 'ACTIVO' ? 'activado' : 'desactivado'} correctamente.`,
      id_usuario: id,
      estado
    });
  } catch (error) {
    manejarError(res, error, 'cambiar el estado del usuario');
  }
});

module.exports = router;
