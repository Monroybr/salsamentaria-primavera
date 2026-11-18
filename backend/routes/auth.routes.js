/* ==========================================
   AUTENTICACIÓN - SALSAMENTARIA PRIMAVERA
   Backend Node.js + MySQL + bcrypt + JWT
========================================== */

const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const pool = require('../db');

const router = express.Router();

const MODULOS_VALIDOS = [
  'productos',
  'inventario',
  'fraccionamiento',
  'ventas',
  'clientes',
  'cartera',
  'reportes'
];

/* ==========================================
   CONFIGURACIÓN JWT
========================================== */

function obtenerSecretoJWT() {
  const secreto = process.env.JWT_SECRET;

  if (!secreto || secreto.length < 32) {
    throw new Error(
      'Configura JWT_SECRET con al menos 32 caracteres aleatorios en .env.'
    );
  }

  return secreto;
}

/* ==========================================
   CONSULTAR USUARIO Y PERMISOS
========================================== */

async function consultarUsuario(idUsuario) {
  const [usuarios] = await pool.query(`
    SELECT
      u.id_usuario,
      u.id_rol,
      u.nombre,
      u.apellido,
      u.correo,
      u.nombre_usuario,
      u.estado,
      r.nombre AS rol,
      r.estado AS estado_rol
    FROM usuarios AS u
    INNER JOIN roles AS r
      ON u.id_rol = r.id_rol
    WHERE u.id_usuario = ?
    LIMIT 1
  `, [idUsuario]);

  if (usuarios.length === 0) {
    return null;
  }

  const usuario = usuarios[0];

  const [filas] = await pool.query(`
    SELECT modulo
    FROM usuarios_permisos
    WHERE id_usuario = ?
    ORDER BY id_permiso
  `, [idUsuario]);

  const permisos = filas
    .map(fila => fila.modulo)
    .filter(modulo => MODULOS_VALIDOS.includes(modulo));

  return {
    ...usuario,
    permisos: usuario.rol.toUpperCase() === 'ADMINISTRADOR'
      ? [...MODULOS_VALIDOS]
      : permisos
  };
}

/* ==========================================
   FORMATEAR USUARIO
========================================== */

function usuarioPublico(usuario) {
  return {
    id_usuario: usuario.id_usuario,
    id_rol: usuario.id_rol,
    nombre: usuario.nombre,
    apellido: usuario.apellido,
    nombre_completo:
      `${usuario.nombre} ${usuario.apellido}`.trim(),
    correo: usuario.correo,
    nombre_usuario: usuario.nombre_usuario,
    rol: usuario.rol,
    estado: usuario.estado,
    permisos: usuario.permisos
  };
}

/* ==========================================
   INICIAR SESIÓN
   POST /api/auth/login
========================================== */

router.post('/login', async (req, res) => {
  const correo = typeof req.body?.correo === 'string'
    ? req.body.correo.trim().toLowerCase()
    : '';

  const contrasena = req.body?.contrasena;

  if (
    !correo ||
    typeof contrasena !== 'string' ||
    !contrasena
  ) {
    return res.status(400).json({
      correcto: false,
      mensaje: 'Ingresa el correo y la contraseña.'
    });
  }

  try {
    const secreto = obtenerSecretoJWT();

    const [usuarios] = await pool.query(`
      SELECT
        id_usuario,
        password_hash
      FROM usuarios
      WHERE correo = ?
      LIMIT 1
    `, [correo]);

    if (usuarios.length === 0) {
      return res.status(401).json({
        correcto: false,
        mensaje: 'Correo electrónico o contraseña incorrectos.'
      });
    }

    const registro = usuarios[0];

    const coincide = await bcrypt.compare(
      contrasena,
      registro.password_hash
    );

    if (!coincide) {
      return res.status(401).json({
        correcto: false,
        mensaje: 'Correo electrónico o contraseña incorrectos.'
      });
    }

    const usuario = await consultarUsuario(
      registro.id_usuario
    );

    if (
      !usuario ||
      usuario.estado !== 'ACTIVO' ||
      usuario.estado_rol !== 'ACTIVO'
    ) {
      return res.status(403).json({
        correcto: false,
        mensaje: 'La cuenta no se encuentra activa.'
      });
    }

    const token = jwt.sign(
      {
        id_usuario: usuario.id_usuario
      },
      secreto,
      {
        algorithm: 'HS256',
        expiresIn: '2h'
      }
    );

    return res.json({
      correcto: true,
      mensaje: 'Inicio de sesión correcto.',
      token,
      usuario: usuarioPublico(usuario)
    });

  } catch (error) {
    console.error('Error al iniciar sesión:', error);

    return res.status(500).json({
      correcto: false,
      mensaje: 'No fue posible iniciar sesión.'
    });
  }
});

/* ==========================================
   VALIDAR TOKEN
========================================== */

async function verificarToken(req, res, next) {
  const autorizacion = req.headers.authorization || '';

  if (!autorizacion.startsWith('Bearer ')) {
    return res.status(401).json({
      mensaje: 'Debes iniciar sesión.'
    });
  }

  const token = autorizacion.slice(7);

  try {
    const datos = jwt.verify(
      token,
      obtenerSecretoJWT(),
      { algorithms: ['HS256'] }
    );

    const usuario = await consultarUsuario(
      datos.id_usuario
    );

    if (
      !usuario ||
      usuario.estado !== 'ACTIVO' ||
      usuario.estado_rol !== 'ACTIVO'
    ) {
      return res.status(401).json({
        mensaje: 'La sesión ya no es válida.'
      });
    }

    req.usuario = usuario;
    next();

  } catch (error) {
    if (
      error.name === 'JsonWebTokenError' ||
      error.name === 'TokenExpiredError' ||
      error.name === 'NotBeforeError'
    ) {
      return res.status(401).json({
        mensaje: 'La sesión ha expirado o no es válida.'
      });
    }

    console.error('Error al verificar token:', error);

    return res.status(500).json({
      mensaje: 'No fue posible verificar la sesión.'
    });
  }
}

/* ==========================================
   CONSULTAR SESIÓN ACTUAL
   GET /api/auth/me
========================================== */

router.get('/me', verificarToken, (req, res) => {
  return res.json({
    correcto: true,
    usuario: usuarioPublico(req.usuario)
  });
});

/* ==========================================
   VERIFICAR PERMISOS
========================================== */

function requierePermiso(modulo) {
  return (req, res, next) => {
    if (!req.usuario) {
      return res.status(401).json({
        mensaje: 'Debes iniciar sesión.'
      });
    }

    if (
      req.usuario.rol.toUpperCase() === 'ADMINISTRADOR' ||
      req.usuario.permisos.includes(modulo)
    ) {
      return next();
    }

    return res.status(403).json({
      mensaje: 'No tienes permiso para acceder a este módulo.'
    });
  };
}

module.exports = router;
module.exports.verificarToken = verificarToken;
module.exports.requierePermiso = requierePermiso;
