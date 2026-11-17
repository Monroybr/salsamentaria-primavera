
const express = require('express');
const router = express.Router();
const db = require('../db');

// ==========================================
// FUNCIONES AUXILIARES
// ==========================================

function idValido(valor) {
  const id = Number(valor);

  return Number.isSafeInteger(id) && id > 0;
}

function fechaValida(fecha) {
  if (
    typeof fecha !== 'string' ||
    !/^\d{4}-\d{2}-\d{2}$/.test(fecha)
  ) {
    return false;
  }

  const [anio, mes, dia] = fecha.split('-').map(Number);

  const comprobacion = new Date(
    Date.UTC(anio, mes - 1, dia)
  );

  return (
    comprobacion.getUTCFullYear() === anio &&
    comprobacion.getUTCMonth() + 1 === mes &&
    comprobacion.getUTCDate() === dia
  );
}

// ==========================================
// CONSULTAR CUENTAS POR COBRAR
// GET /api/cartera
// ==========================================

router.get('/', async (req, res) => {
  try {
    const [cuentas] = await db.query(`
      SELECT
        c.id_cuenta,
        c.id_venta,
        c.id_cliente,
        cl.nombre AS cliente,
        c.valor_total,
        c.saldo_pendiente,
        c.estado,
        DATE_FORMAT(
          c.fecha_creacion,
          '%Y-%m-%d'
        ) AS fecha,
        DATE_FORMAT(
          c.fecha_vencimiento,
          '%Y-%m-%d'
        ) AS vencimiento
      FROM cuentas_por_cobrar AS c
      INNER JOIN clientes AS cl
        ON c.id_cliente = cl.id_cliente
      WHERE c.saldo_pendiente > 0
        AND c.estado IN ('PENDIENTE', 'PARCIAL')
      ORDER BY
        c.fecha_vencimiento ASC,
        c.id_cuenta DESC
    `);

    return res.json(cuentas);

  } catch (error) {
    console.error(
      'Error al consultar cartera:',
      error
    );

    return res.status(500).json({
      mensaje: 'No se pudo consultar la cartera.'
    });
  }
});

// ==========================================
// CONSULTAR HISTORIAL GENERAL DE ABONOS
// GET /api/cartera/abonos/historial
// ==========================================

router.get('/abonos/historial', async (req, res) => {
  try {
    const [abonos] = await db.query(`
      SELECT
        a.id_abono,
        a.id_cuenta,
        c.id_venta,
        c.id_cliente,
        cl.nombre AS cliente,
        DATE_FORMAT(
          a.fecha_abono,
          '%Y-%m-%d'
        ) AS fecha,
        a.valor_abono,
        a.metodo_pago,
        a.observaciones,
        c.valor_total,
        c.saldo_pendiente,
        c.estado
      FROM abonos AS a
      INNER JOIN cuentas_por_cobrar AS c
        ON a.id_cuenta = c.id_cuenta
      INNER JOIN clientes AS cl
        ON c.id_cliente = cl.id_cliente
      ORDER BY
        a.fecha_abono DESC,
        a.id_abono DESC
    `);

    return res.json(abonos);

  } catch (error) {
    console.error(
      'Error al consultar historial de abonos:',
      error
    );

    return res.status(500).json({
      mensaje: 'No se pudo consultar el historial de abonos.'
    });
  }
});

// ==========================================
// CONSULTAR HISTORIAL DE UNA CUENTA
// GET /api/cartera/:id/abonos
// ==========================================

router.get('/:id/abonos', async (req, res) => {
  const idCuenta = Number(req.params.id);

  if (!idValido(req.params.id)) {
    return res.status(400).json({
      mensaje: 'El identificador de la cuenta no es válido.'
    });
  }

  try {
    const [cuentas] = await db.query(`
      SELECT id_cuenta
      FROM cuentas_por_cobrar
      WHERE id_cuenta = ?
    `, [idCuenta]);

    if (cuentas.length === 0) {
      return res.status(404).json({
        mensaje: 'La cuenta por cobrar no existe.'
      });
    }

    const [abonos] = await db.query(`
      SELECT
        id_abono,
        id_cuenta,
        DATE_FORMAT(
          fecha_abono,
          '%Y-%m-%d'
        ) AS fecha,
        valor_abono,
        metodo_pago,
        observaciones
      FROM abonos
      WHERE id_cuenta = ?
      ORDER BY
        fecha_abono DESC,
        id_abono DESC
    `, [idCuenta]);

    return res.json(abonos);

  } catch (error) {
    console.error(
      'Error al consultar abonos de la cuenta:',
      error
    );

    return res.status(500).json({
      mensaje: 'No se pudieron consultar los abonos de la cuenta.'
    });
  }
});

// ==========================================
// CONSULTAR UNA CUENTA POR ID
// GET /api/cartera/:id
// ==========================================

router.get('/:id', async (req, res) => {
  const id = Number(req.params.id);

  if (!idValido(req.params.id)) {
    return res.status(400).json({
      mensaje: 'El identificador de la cuenta no es válido.'
    });
  }

  try {
    const [cuentas] = await db.query(`
      SELECT
        c.id_cuenta,
        c.id_venta,
        c.id_cliente,
        cl.nombre AS cliente,
        c.valor_total,
        c.saldo_pendiente,
        c.estado,
        DATE_FORMAT(
          c.fecha_creacion,
          '%Y-%m-%d'
        ) AS fecha,
        DATE_FORMAT(
          c.fecha_vencimiento,
          '%Y-%m-%d'
        ) AS vencimiento
      FROM cuentas_por_cobrar AS c
      INNER JOIN clientes AS cl
        ON c.id_cliente = cl.id_cliente
      WHERE c.id_cuenta = ?
    `, [id]);

    if (cuentas.length === 0) {
      return res.status(404).json({
        mensaje: 'Cuenta por cobrar no encontrada.'
      });
    }

    return res.json(cuentas[0]);

  } catch (error) {
    console.error(
      'Error al consultar cuenta:',
      error
    );

    return res.status(500).json({
      mensaje: 'No se pudo consultar la cuenta.'
    });
  }
});

// ==========================================
// REGISTRAR ABONO A UNA CUENTA POR COBRAR
// POST /api/cartera/:id/abonos
// ==========================================

router.post('/:id/abonos', async (req, res) => {
  const idCuenta = Number(req.params.id);

  const {
    valor,
    medioPago,
    fecha,
    referencia,
    observaciones
  } = req.body || {};

  const valorTexto = String(valor ?? '').trim();
  const valorNumero = Number(valorTexto);

  const metodo = String(medioPago || '')
    .trim()
    .toUpperCase();

  if (!idValido(req.params.id)) {
    return res.status(400).json({
      mensaje: 'El identificador de la cuenta no es válido.'
    });
  }

  // Validar el valor del abono.
  if (
    !/^\d+(\.\d{1,2})?$/.test(valorTexto) ||
    !Number.isFinite(valorNumero) ||
    valorNumero <= 0 ||
    !Number.isSafeInteger(Math.round(valorNumero * 100))
  ) {
    return res.status(400).json({
      mensaje:
        'El valor del abono debe ser positivo y tener máximo dos decimales.'
    });
  }

  // Métodos de pago admitidos.
  const metodosPermitidos = [
    'EFECTIVO',
    'TRANSFERENCIA',
    'TARJETA'
  ];

  if (!metodosPermitidos.includes(metodo)) {
    return res.status(400).json({
      mensaje: 'El método de pago no es válido.'
    });
  }

  // Validar la fecha.
  if (!fechaValida(fecha)) {
    return res.status(400).json({
      mensaje: 'La fecha del abono no es válida.'
    });
  }

  let conexion;

  try {
    conexion = await db.getConnection();

    await conexion.beginTransaction();

    // Bloquear la cuenta durante el registro.
    const [cuentas] = await conexion.query(`
      SELECT
        id_cuenta,
        id_venta,
        valor_total,
        saldo_pendiente,
        estado
      FROM cuentas_por_cobrar
      WHERE id_cuenta = ?
      FOR UPDATE
    `, [idCuenta]);

    if (cuentas.length === 0) {
      await conexion.rollback();

      return res.status(404).json({
        mensaje: 'La cuenta por cobrar no existe.'
      });
    }

    const cuenta = cuentas[0];

    if (!['PENDIENTE', 'PARCIAL'].includes(cuenta.estado)) {
      await conexion.rollback();

      return res.status(400).json({
        mensaje: 'La cuenta no permite registrar nuevos abonos.'
      });
    }

    // Trabajar en centavos evita errores de precisión.
    const valorCentavos = Math.round(valorNumero * 100);

    const saldoCentavos = Math.round(
      Number(cuenta.saldo_pendiente) * 100
    );

    if (valorCentavos > saldoCentavos) {
      await conexion.rollback();

      return res.status(400).json({
        mensaje: 'El abono no puede superar el saldo pendiente.'
      });
    }

    const nuevoSaldoCentavos =
      saldoCentavos - valorCentavos;

    const nuevoEstado =
      nuevoSaldoCentavos === 0
        ? 'PAGADA'
        : 'PARCIAL';

    const valorSQL =
      (valorCentavos / 100).toFixed(2);

    const saldoSQL =
      (nuevoSaldoCentavos / 100).toFixed(2);

    // Guardar referencia en observaciones.
    const detalleObservaciones = [
      referencia
        ? `Referencia: ${String(referencia).trim()}`
        : '',
      observaciones
        ? String(observaciones).trim()
        : ''
    ].filter(Boolean).join(' | ');

    // Registrar abono.
    const [resultadoAbono] = await conexion.query(`
      INSERT INTO abonos (
        id_cuenta,
        fecha_abono,
        valor_abono,
        metodo_pago,
        observaciones
      )
      VALUES (?, ?, ?, ?, ?)
    `, [
      idCuenta,
      `${fecha} 12:00:00`,
      valorSQL,
      metodo,
      detalleObservaciones || null
    ]);

    // Actualizar saldo y estado de la cuenta.
    await conexion.query(`
      UPDATE cuentas_por_cobrar
      SET
        saldo_pendiente = ?,
        estado = ?
      WHERE id_cuenta = ?
    `, [
      saldoSQL,
      nuevoEstado,
      idCuenta
    ]);

    await conexion.commit();

    return res.status(201).json({
      mensaje: 'Abono registrado correctamente.',
      abono: {
        id: resultadoAbono.insertId,
        cuentaId: idCuenta,
        valor: valorNumero,
        medioPago: metodo,
        fecha
      },
      cuenta: {
        id: idCuenta,
        ventaId: cuenta.id_venta,
        saldoPendiente: Number(saldoSQL),
        estado: nuevoEstado
      }
    });

  } catch (error) {
    if (conexion) {
      try {
        await conexion.rollback();
      } catch (errorRollback) {
        console.error(
          'Error al revertir el abono:',
          errorRollback
        );
      }
    }

    console.error(
      'Error al registrar abono:',
      error
    );

    return res.status(500).json({
      mensaje: 'No fue posible registrar el abono.'
    });

  } finally {
    if (conexion) {
      conexion.release();
    }
  }
});

module.exports = router;
