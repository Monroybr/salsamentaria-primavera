
const express = require('express');
const router = express.Router();
const db = require('../db');

// Prueba de conexión del módulo
router.get('/test', async (req, res) => {
  try {
    const [resultado] = await db.query(
      'SELECT COUNT(*) AS total_ventas FROM ventas'
    );

    res.json({
      mensaje: 'Módulo de ventas conectado correctamente.',
      total_ventas: resultado[0].total_ventas
    });
  } catch (error) {
    console.error('Error en ventas:', error);
    res.status(500).json({
      mensaje: 'No fue posible consultar las ventas.'
    });
  }
});

// Consultar productos disponibles para ventas
router.get('/productos', async (req, res) => {
  try {
    const [productos] = await db.query(`
      SELECT
        p.id_producto,
        p.codigo,
        p.nombre,
        pp.id_presentacion,
        pp.peso_gramos,
        pp.stock_actual,
        pp.precio_venta
      FROM productos p
      INNER JOIN presentaciones_producto pp
        ON p.id_producto = pp.id_producto
      WHERE p.estado = 1
        AND pp.estado = 1
      ORDER BY p.nombre, pp.peso_gramos
    `);

    res.json(productos);
  } catch (error) {
    console.error('Error consultando productos:', error);
    res.status(500).json({
      mensaje: 'No fue posible consultar los productos.'
    });
  }
});

// Consultar clientes activos
router.get('/clientes', async (req, res) => {
  try {
    const [clientes] = await db.query(`
      SELECT id_cliente, nombre, numero_documento
      FROM clientes
      WHERE estado = 1
      ORDER BY nombre
    `);

    res.json(clientes);
  } catch (error) {
    console.error('Error consultando clientes:', error);
    res.status(500).json({
      mensaje: 'No fue posible consultar los clientes.'
    });
  }
});

// Listar ventas
router.get('/', async (req, res) => {
  try {
    const [ventas] = await db.query(`
      SELECT
        v.id_venta,
        v.fecha_venta,
        v.tipo_venta,
        v.metodo_pago,
        v.total,
        v.estado,
        v.id_cliente,
        COALESCE(c.nombre, 'Consumidor final') AS cliente
      FROM ventas v
      LEFT JOIN clientes c
        ON v.id_cliente = c.id_cliente
      ORDER BY v.fecha_venta DESC, v.id_venta DESC
    `);

    res.json(ventas);
  } catch (error) {
    console.error('Error consultando ventas:', error);
    res.status(500).json({
      mensaje: 'No fue posible consultar las ventas.'
    });
  }
});

// Consultar detalle de una venta
router.get('/:id', async (req, res) => {
  const idVenta = Number(req.params.id);

  if (!Number.isInteger(idVenta) || idVenta <= 0) {
    return res.status(400).json({
      mensaje: 'Identificador de venta inválido.'
    });
  }

  try {
    const [ventas] = await db.query(`
      SELECT
        v.*,
        COALESCE(c.nombre, 'Consumidor final') AS cliente
      FROM ventas v
      LEFT JOIN clientes c
        ON v.id_cliente = c.id_cliente
      WHERE v.id_venta = ?
    `, [idVenta]);

    if (ventas.length === 0) {
      return res.status(404).json({
        mensaje: 'Venta no encontrada.'
      });
    }

    const [detalles] = await db.query(`
      SELECT
        dv.id_detalle_venta,
        dv.id_producto,
        dv.id_presentacion,
        p.nombre AS producto,
        pp.peso_gramos,
        dv.cantidad,
        dv.precio_unitario,
        dv.subtotal
      FROM detalle_ventas dv
      INNER JOIN productos p
        ON dv.id_producto = p.id_producto
      LEFT JOIN presentaciones_producto pp
        ON dv.id_presentacion = pp.id_presentacion
      WHERE dv.id_venta = ?
    `, [idVenta]);

    res.json({
      ...ventas[0],
      productos: detalles
    });
  } catch (error) {
    console.error('Error consultando detalle:', error);
    res.status(500).json({
      mensaje: 'No fue posible consultar el detalle.'
    });
  }
});

// Registrar venta
router.post('/', async (req, res) => {
  const {
    id_cliente,
    tipo_venta,
    metodo_pago,
    observaciones,
    fecha_vencimiento,
    productos
  } = req.body;

  if (!['CONTADO', 'CREDITO'].includes(tipo_venta)) {
    return res.status(400).json({
      mensaje: 'Tipo de venta inválido.'
    });
  }

  if (!Array.isArray(productos) || productos.length === 0) {
    return res.status(400).json({
      mensaje: 'Debes agregar al menos un producto.'
    });
  }

  if (tipo_venta === 'CREDITO' && !id_cliente) {
    return res.status(400).json({
      mensaje: 'Las ventas a crédito requieren un cliente.'
    });
  }

  if (
    tipo_venta === 'CONTADO' &&
    !['EFECTIVO', 'TRANSFERENCIA', 'TARJETA', 'OTRO']
      .includes(metodo_pago)
  ) {
    return res.status(400).json({
      mensaje: 'Selecciona un medio de pago válido.'
    });
  }

  // Validar antes de abrir la transacción
  const cantidades = new Map();

  for (const item of productos) {
    const id = Number(item.id_presentacion);
    const cantidad = Number(item.cantidad);

    if (
      !Number.isSafeInteger(id) ||
      id <= 0 ||
      !Number.isSafeInteger(cantidad) ||
      cantidad <= 0
    ) {
      return res.status(400).json({
        mensaje: 'Presentación o cantidad inválida.'
      });
    }

    cantidades.set(id, (cantidades.get(id) || 0) + cantidad);
  }

  if (
    [...cantidades.values()].some(
      cantidad => !Number.isSafeInteger(cantidad)
    )
  ) {
    return res.status(400).json({
      mensaje: 'Cantidad acumulada inválida.'
    });
  }

  let conexion;

  try {
    conexion = await db.getConnection();
    await conexion.beginTransaction();

    
    // Verificar cliente y consultar sus condiciones de crédito
    let clienteCredito = null;

    if (id_cliente != null && id_cliente !== '') {
      const [clientes] = await conexion.query(`
        SELECT
          id_cliente,
          nombre,
          credito_habilitado,
          cupo_credito,
          plazo_credito
        FROM clientes
        WHERE id_cliente = ?
          AND estado = 1
        FOR UPDATE
      `, [id_cliente]);

      if (clientes.length === 0) {
        const error = new Error(
          'El cliente no existe o está inactivo.'
        );
        error.status = 400;
        throw error;
      }

      clienteCredito = clientes[0];

      if (tipo_venta === 'CREDITO') {
        if (Number(clienteCredito.credito_habilitado) !== 1) {
          const error = new Error(
            'Este cliente no tiene habilitadas las ventas a crédito.'
          );
          error.status = 400;
          throw error;
        }

        const plazo = Number(clienteCredito.plazo_credito);
        const cupo = Number(clienteCredito.cupo_credito);

        if (
          !Number.isInteger(plazo) ||
          plazo <= 0 ||
          !Number.isFinite(cupo) ||
          cupo <= 0
        ) {
          const error = new Error(
            'Las condiciones de crédito del cliente no son válidas.'
          );
          error.status = 400;
          throw error;
        }
      }
    }


    let total = 0;
    const detalles = [];

    // Orden estable para reducir conflictos de bloqueo
    const ids = [...cantidades.keys()].sort((a, b) => a - b);

    for (const idPresentacion of ids) {
      const cantidad = cantidades.get(idPresentacion);

      const [filas] = await conexion.query(`
        SELECT
          pp.id_presentacion,
          pp.id_producto,
          pp.stock_actual,
          pp.precio_venta
        FROM presentaciones_producto pp
        INNER JOIN productos p
          ON p.id_producto = pp.id_producto
        WHERE pp.id_presentacion = ?
          AND pp.estado = 1
          AND p.estado = 1
        FOR UPDATE
      `, [idPresentacion]);

      if (filas.length === 0) {
        const error = new Error(
          'Una presentación no existe o está inactiva.'
        );
        error.status = 400;
        throw error;
      }

      const presentacion = filas[0];
      const stock = Number(presentacion.stock_actual);
      const precio = Number(presentacion.precio_venta);

      if (
        !Number.isFinite(stock) ||
        stock < cantidad
      ) {
        const error = new Error(
          `Stock insuficiente para la presentación ${idPresentacion}.`
        );
        error.status = 409;
        throw error;
      }

      if (!Number.isFinite(precio) || precio <= 0) {
        const error = new Error(
          `La presentación ${idPresentacion} no tiene un precio válido.`
        );
        error.status = 400;
        throw error;
      }

      const subtotal = Math.round(precio * cantidad * 100) / 100;
      total = Math.round((total + subtotal) * 100) / 100;

      detalles.push({
        id_producto: presentacion.id_producto,
        id_presentacion: idPresentacion,
        cantidad,
        precio_unitario: precio
      });
    }


    // Verificar cupo disponible para ventas a crédito
    if (tipo_venta === 'CREDITO') {
      const [cartera] = await conexion.query(`
        SELECT
          COALESCE(SUM(saldo_pendiente), 0) AS deuda_actual
        FROM cuentas_por_cobrar
        WHERE id_cliente = ?
          AND estado IN ('PENDIENTE', 'PARCIAL')
      `, [id_cliente]);

      const deudaActual = Number(cartera[0].deuda_actual);
      const cupoCredito = Number(clienteCredito.cupo_credito);

      const disponible = Math.round(
        (cupoCredito - deudaActual) * 100
      ) / 100;

      if (total > disponible) {
        const error = new Error(
          `Cupo de crédito insuficiente. ` +
          `Disponible: $${Math.max(0, disponible).toLocaleString('es-CO')}. ` +
          `Valor de la venta: $${total.toLocaleString('es-CO')}.`
        );

        error.status = 409;
        throw error;
      }
    }


    // Registrar encabezado de venta
    const [venta] = await conexion.query(`
      INSERT INTO ventas (
        id_cliente,
        tipo_venta,
        metodo_pago,
        total,
        estado,
        observaciones
      )
      VALUES (?, ?, ?, ?, 'REGISTRADA', ?)
    `, [
      id_cliente || null,
      tipo_venta,
      tipo_venta === 'CREDITO' ? null : metodo_pago,
      total,
      observaciones || null
    ]);

    const idVenta = venta.insertId;

    // Registrar detalle y actualizar inventario
    for (const item of detalles) {
      await conexion.query(`
        INSERT INTO detalle_ventas (
          id_venta,
          id_producto,
          id_presentacion,
          cantidad,
          precio_unitario
        )
        VALUES (?, ?, ?, ?, ?)
      `, [
        idVenta,
        item.id_producto,
        item.id_presentacion,
        item.cantidad,
        item.precio_unitario
      ]);

      await conexion.query(`
        UPDATE presentaciones_producto
        SET stock_actual = stock_actual - ?
        WHERE id_presentacion = ?
      `, [
        item.cantidad,
        item.id_presentacion
      ]);

      // Registrar salida en inventario
      await conexion.query(`
        INSERT INTO movimientos_inventario (
          id_producto,
          tipo_movimiento,
          cantidad,
          motivo,
          observaciones
        )
        VALUES (?, 'SALIDA', ?, 'VENTA', ?)
      `, [
        item.id_producto,
        item.cantidad,
        `Venta ${idVenta}, presentación ${item.id_presentacion}`
      ]);
    }

    
    // Crear cuenta por cobrar para venta a crédito
    if (tipo_venta === 'CREDITO') {
      const plazoCredito = Number(
        clienteCredito.plazo_credito
      );

      await conexion.query(`
        INSERT INTO cuentas_por_cobrar (
          id_venta,
          id_cliente,
          fecha_vencimiento,
          valor_total,
          saldo_pendiente,
          estado,
          observaciones
        )
        VALUES (
          ?,
          ?,
          DATE_ADD(CURDATE(), INTERVAL ? DAY),
          ?,
          ?,
          'PENDIENTE',
          ?
        )
      `, [
        idVenta,
        id_cliente,
        plazoCredito,
        total,
        total,
        observaciones || null
      ]);
    }


    await conexion.commit();

    res.status(201).json({
      mensaje: 'Venta registrada correctamente.',
      id_venta: idVenta,
      tipo_venta,
      total
    });

  } catch (error) {
    if (conexion) {
      try {
        await conexion.rollback();
      } catch (rollbackError) {
        console.error('Error al revertir venta:', rollbackError);
      }
    }

    console.error('Error registrando venta:', error);

    res.status(error.status || 500).json({
      mensaje: error.status
        ? error.message
        : 'No fue posible registrar la venta.'
    });

  } finally {
    if (conexion) conexion.release();
  }
});

module.exports = router;
