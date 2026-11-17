const express = require('express');
const router = express.Router();
const db = require('../db');

// ==========================================
// FUNCIONES AUXILIARES
// ==========================================

function validarCliente(datos) {
  const {
    nombre,
    tipo_cliente,
    tipo_documento,
    numero_documento,
    contacto,
    telefono,
    correo,
    direccion,
    ciudad,
    barrio,
    notas,
    credito_habilitado,
    cupo_credito,
    plazo_credito
  } = datos;

  if (
    typeof nombre !== 'string' ||
    !nombre.trim() ||
    nombre.trim().length > 150
  ) {
    return 'Ingresa un nombre válido de hasta 150 caracteres.';
  }

  if (!['natural', 'negocio'].includes(tipo_cliente)) {
    return 'Selecciona un tipo de cliente válido.';
  }

  const campos = [
    [tipo_documento, 20],
    [numero_documento, 30],
    [contacto, 100],
    [telefono, 20],
    [correo, 150],
    [direccion, 255],
    [ciudad, 80],
    [barrio, 80]
  ];

  for (const [valor, maximo] of campos) {
    if (
      valor != null &&
      (typeof valor !== 'string' || valor.trim().length > maximo)
    ) {
      return 'Uno de los campos supera la longitud permitida.';
    }
  }

  if (notas != null && typeof notas !== 'string') {
    return 'Las notas deben ser texto.';
  }

  if (
    typeof contacto !== 'string' ||
    !contacto.trim() ||
    typeof telefono !== 'string' ||
    !telefono.trim()
  ) {
    return 'Completa la persona de contacto y el teléfono.';
  }

  if (
    correo &&
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo.trim())
  ) {
    return 'El correo electrónico no es válido.';
  }

  if (
  credito_habilitado !== true &&
  credito_habilitado !== false &&
  credito_habilitado !== 1 &&
  credito_habilitado !== 0
) {
  return 'El estado del crédito no es válido.';
}

  const cupo = Number(cupo_credito);
  const plazo = Number(plazo_credito);

  if (
    !Number.isFinite(cupo) ||
    cupo < 0 ||
    cupo > 9999999999.99 ||
    !Number.isSafeInteger(plazo) ||
    plazo < 0
  ) {
    return 'El cupo o el plazo del crédito no son válidos.';
  }

  const creditoActivo =
  credito_habilitado === true ||
  credito_habilitado === 1;

    if (creditoActivo && (cupo <= 0 || plazo <= 0)) {
    return 'El crédito requiere un cupo y un plazo mayores que cero.';
    }

  return null;
}

function prepararCliente(datos) {
  const texto = (valor) =>
    typeof valor === 'string' ? valor.trim() : '';

  return {
    nombre: texto(datos.nombre),
    tipo_cliente: datos.tipo_cliente,
    tipo_documento: texto(datos.tipo_documento) || null,
    numero_documento: texto(datos.numero_documento) || null,
    contacto: texto(datos.contacto) || null,
    telefono: texto(datos.telefono) || null,
    correo: texto(datos.correo) || null,
    direccion: texto(datos.direccion) || null,
    ciudad: texto(datos.ciudad) || null,
    barrio: texto(datos.barrio) || null,
    notas: texto(datos.notas) || null,
    credito_habilitado:
    datos.credito_habilitado === true ||
    datos.credito_habilitado === 1
        ? 1
        : 0,

    cupo_credito:
    datos.credito_habilitado === true ||
    datos.credito_habilitado === 1
        ? Number(datos.cupo_credito)
        : 0,

    plazo_credito:
    datos.credito_habilitado === true ||
    datos.credito_habilitado === 1
        ? Number(datos.plazo_credito)
        : 15
  };
}

// ==========================================
// CONSULTAR CLIENTES CON SALDO REAL
// ==========================================

router.get('/', async (req, res) => {
  try {
    const [clientes] = await db.query(`
      SELECT
        c.*,
        COALESCE(cartera.saldo_pendiente, 0)
          AS saldo_pendiente
      FROM clientes c
      LEFT JOIN (
        SELECT
          id_cliente,
          SUM(saldo_pendiente) AS saldo_pendiente
        FROM cuentas_por_cobrar
        WHERE estado IN ('PENDIENTE', 'PARCIAL')
        GROUP BY id_cliente
      ) cartera
        ON cartera.id_cliente = c.id_cliente
      ORDER BY c.id_cliente DESC
    `);

    res.json(clientes);

  } catch (error) {
    console.error('Error consultando clientes:', error);

    res.status(500).json({
      mensaje: 'No fue posible consultar los clientes.'
    });
  }
});

// ==========================================
// CONSULTAR CLIENTE POR ID
// ==========================================

router.get('/:id', async (req, res) => {
  const id = Number(req.params.id);

  if (!Number.isSafeInteger(id) || id <= 0) {
    return res.status(400).json({
      mensaje: 'El identificador del cliente no es válido.'
    });
  }

  try {
    const [clientes] = await db.query(`
      SELECT
        c.*,
        COALESCE((
          SELECT SUM(cpc.saldo_pendiente)
          FROM cuentas_por_cobrar cpc
          WHERE cpc.id_cliente = c.id_cliente
            AND cpc.estado IN ('PENDIENTE', 'PARCIAL')
        ), 0) AS saldo_pendiente
      FROM clientes c
      WHERE c.id_cliente = ?
    `, [id]);

    if (clientes.length === 0) {
      return res.status(404).json({
        mensaje: 'Cliente no encontrado.'
      });
    }

    res.json(clientes[0]);

  } catch (error) {
    console.error('Error consultando cliente:', error);

    res.status(500).json({
      mensaje: 'No fue posible consultar el cliente.'
    });
  }
});

// ==========================================
// REGISTRAR CLIENTE
// ==========================================

router.post('/', async (req, res) => {
  const datos = req.body || {};
  const errorValidacion = validarCliente(datos);

  if (errorValidacion) {
    return res.status(400).json({
      mensaje: errorValidacion
    });
  }

  const cliente = prepararCliente(datos);

  try {
    const [resultado] = await db.query(`
      INSERT INTO clientes (
        nombre,
        tipo_cliente,
        tipo_documento,
        numero_documento,
        contacto,
        telefono,
        correo,
        direccion,
        ciudad,
        barrio,
        notas,
        credito_habilitado,
        cupo_credito,
        plazo_credito,
        estado
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
    `, [
      cliente.nombre,
      cliente.tipo_cliente,
      cliente.tipo_documento,
      cliente.numero_documento,
      cliente.contacto,
      cliente.telefono,
      cliente.correo,
      cliente.direccion,
      cliente.ciudad,
      cliente.barrio,
      cliente.notas,
      cliente.credito_habilitado,
      cliente.cupo_credito,
      cliente.plazo_credito
    ]);

    res.status(201).json({
      mensaje: 'Cliente registrado correctamente.',
      id_cliente: resultado.insertId
    });

  } catch (error) {
    console.error('Error registrando cliente:', error);

    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({
        mensaje: 'Ya existe un cliente con ese documento.'
      });
    }

    res.status(500).json({
      mensaje: 'No fue posible registrar el cliente.'
    });
  }
});

// ==========================================
// ACTUALIZAR CLIENTE
// ==========================================

router.put('/:id', async (req, res) => {
  const id = Number(req.params.id);

  if (!Number.isSafeInteger(id) || id <= 0) {
    return res.status(400).json({
      mensaje: 'El identificador del cliente no es válido.'
    });
  }

  const datos = req.body || {};
  const errorValidacion = validarCliente(datos);

  if (errorValidacion) {
    return res.status(400).json({
      mensaje: errorValidacion
    });
  }

  const cliente = prepararCliente(datos);

  try {
    const [resultado] = await db.query(`
      UPDATE clientes
      SET
        nombre = ?,
        tipo_cliente = ?,
        tipo_documento = ?,
        numero_documento = ?,
        contacto = ?,
        telefono = ?,
        correo = ?,
        direccion = ?,
        ciudad = ?,
        barrio = ?,
        notas = ?,
        credito_habilitado = ?,
        cupo_credito = ?,
        plazo_credito = ?
      WHERE id_cliente = ?
    `, [
      cliente.nombre,
      cliente.tipo_cliente,
      cliente.tipo_documento,
      cliente.numero_documento,
      cliente.contacto,
      cliente.telefono,
      cliente.correo,
      cliente.direccion,
      cliente.ciudad,
      cliente.barrio,
      cliente.notas,
      cliente.credito_habilitado,
      cliente.cupo_credito,
      cliente.plazo_credito,
      id
    ]);

    if (resultado.affectedRows === 0) {
      return res.status(404).json({
        mensaje: 'Cliente no encontrado.'
      });
    }

    res.json({
      mensaje: 'Cliente actualizado correctamente.',
      id_cliente: id
    });

  } catch (error) {
    console.error('Error actualizando cliente:', error);

    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({
        mensaje: 'Ya existe otro cliente con ese documento.'
      });
    }

    res.status(500).json({
      mensaje: 'No fue posible actualizar el cliente.'
    });
  }
});

// ==========================================
// ACTIVAR O DESACTIVAR CLIENTE
// ==========================================

router.patch('/:id/estado', async (req, res) => {
  const id = Number(req.params.id);
  const { estado } = req.body || {};

  if (!Number.isSafeInteger(id) || id <= 0) {
    return res.status(400).json({
      mensaje: 'Identificador de cliente inválido.'
    });
  }

  if (estado !== 0 && estado !== 1) {
    return res.status(400).json({
      mensaje: 'El estado debe ser 0 o 1.'
    });
  }

  try {
    const [resultado] = await db.query(`
      UPDATE clientes
      SET estado = ?
      WHERE id_cliente = ?
    `, [estado, id]);

    if (resultado.affectedRows === 0) {
      return res.status(404).json({
        mensaje: 'Cliente no encontrado.'
      });
    }

    res.json({
      mensaje: estado === 1
        ? 'Cliente activado correctamente.'
        : 'Cliente desactivado correctamente.'
    });

  } catch (error) {
    console.error('Error cambiando estado:', error);

    res.status(500).json({
      mensaje: 'No fue posible cambiar el estado del cliente.'
    });
  }
});

module.exports = router;
