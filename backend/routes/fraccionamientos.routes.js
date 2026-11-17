const express = require('express');
const router = express.Router();
const db = require('../db');

// ============================================
// FUNCIONES AUXILIARES
// ============================================

const MAX_CANTIDAD = 999999999.999;
const MAX_BOLSAS = 2147483647;

function crearError(mensaje, status = 400) {
  const error = new Error(mensaje);
  error.status = status;
  return error;
}

function esNumeroValido(valor) {
  return (
    valor !== null &&
    valor !== undefined &&
    valor !== '' &&
    Number.isFinite(Number(valor))
  );
}

function tieneMaximoTresDecimales(valor) {
  const numero = Number(valor);

  return (
    Number.isFinite(numero) &&
    Math.abs(
      numero * 1000 - Math.round(numero * 1000)
    ) < 0.000001
  );
}

function redondearTresDecimales(valor) {
  return Math.round(
    (Number(valor) + Number.EPSILON) * 1000
  ) / 1000;
}

// ============================================
// CONSULTAR PRODUCTOS A GRANEL
// GET /api/fraccionamientos/productos
// ============================================

router.get('/productos', async (req, res) => {
  try {
    const [productos] = await db.query(`
      SELECT
        p.id_producto,
        p.codigo,
        p.nombre,
        p.stock_actual
      FROM productos p
      INNER JOIN categorias c
        ON c.id_categoria = p.id_categoria
      WHERE c.nombre = 'Productos a granel'
        AND p.estado = 1
      ORDER BY p.nombre ASC
    `);

    res.json(productos);

  } catch (error) {
    console.error(
      'Error al consultar productos para fraccionamiento:',
      error
    );

    res.status(500).json({
      mensaje: 'No fue posible consultar los productos.'
    });
  }
});

// ============================================
// CONSULTAR FRACCIONAMIENTOS REGISTRADOS
// GET /api/fraccionamientos
// ============================================

router.get('/', async (req, res) => {
  try {
    const [registros] = await db.query(`
      SELECT
        f.id_fraccionamiento,
        f.id_producto,
        p.nombre AS producto,
        f.cantidad_utilizada,
        f.peso_empacado,
        f.merma,
        f.fecha_registro,
        f.observaciones,
        d.presentacion_gramos,
        d.bolsas_generadas
      FROM fraccionamientos f
      INNER JOIN productos p
        ON p.id_producto = f.id_producto
      INNER JOIN detalle_fraccionamientos d
        ON d.id_fraccionamiento = f.id_fraccionamiento
      ORDER BY
        f.fecha_registro DESC,
        f.id_fraccionamiento DESC
    `);

    res.json(registros);

  } catch (error) {
    console.error(
      'Error al consultar fraccionamientos:',
      error
    );

    res.status(500).json({
      mensaje: 'No fue posible consultar los fraccionamientos.'
    });
  }
});

// ============================================
// REGISTRAR FRACCIONAMIENTO
// POST /api/fraccionamientos
// ============================================

router.post('/', async (req, res) => {
  const {
    id_producto,
    cantidad_utilizada,
    presentacion_gramos,
    bolsas_generadas,
    observaciones
  } = req.body || {};

  const idProducto = Number(id_producto);
  const cantidad = Number(cantidad_utilizada);
  const gramos = Number(presentacion_gramos);
  const bolsas = Number(bolsas_generadas);

  // ==========================================
  // VALIDAR PRODUCTO
  // ==========================================

  if (
    !esNumeroValido(id_producto) ||
    !Number.isSafeInteger(idProducto) ||
    idProducto <= 0
  ) {
    return res.status(400).json({
      mensaje: 'Selecciona un producto válido.'
    });
  }

  // ==========================================
  // VALIDAR CANTIDAD UTILIZADA EN KG
  // ==========================================

  if (
    !esNumeroValido(cantidad_utilizada) ||
    !Number.isFinite(cantidad) ||
    cantidad <= 0 ||
    cantidad > MAX_CANTIDAD ||
    !tieneMaximoTresDecimales(cantidad_utilizada)
  ) {
    return res.status(400).json({
      mensaje:
        'La cantidad utilizada debe ser mayor que cero ' +
        'y tener máximo tres decimales.'
    });
  }

  // ==========================================
  // VALIDAR PRESENTACIÓN
  // ==========================================

  if (
    !esNumeroValido(presentacion_gramos) ||
    !Number.isSafeInteger(gramos) ||
    ![250, 500, 1000].includes(gramos)
  ) {
    return res.status(400).json({
      mensaje:
        'Selecciona una presentación de 250, 500 o 1000 gramos.'
    });
  }

  // ==========================================
  // VALIDAR BOLSAS GENERADAS
  // ==========================================

  if (
    !esNumeroValido(bolsas_generadas) ||
    !Number.isSafeInteger(bolsas) ||
    bolsas <= 0 ||
    bolsas > MAX_BOLSAS
  ) {
    return res.status(400).json({
      mensaje:
        'La cantidad de bolsas debe ser un entero mayor que cero.'
    });
  }

  if (
    observaciones != null &&
    typeof observaciones !== 'string'
  ) {
    return res.status(400).json({
      mensaje: 'Las observaciones deben ser texto.'
    });
  }

  // ==========================================
  // CALCULAR PESO Y MERMA
  // ==========================================

  const pesoEmpacado = redondearTresDecimales(
    (gramos * bolsas) / 1000
  );

  const diferencia = redondearTresDecimales(
    cantidad - pesoEmpacado
  );

  if (
    pesoEmpacado > MAX_CANTIDAD ||
    diferencia < 0
  ) {
    return res.status(400).json({
      mensaje:
        'El peso empacado no puede superar la cantidad utilizada.'
    });
  }

  // Se mantiene la regla actual del proyecto:
  // la cantidad utilizada debe coincidir con
  // el peso empacado, sin merma.

  if (diferencia > 0) {
    return res.status(400).json({
      mensaje:
        'La cantidad utilizada debe coincidir ' +
        'con el peso total de las bolsas generadas.'
    });
  }

  let conexion;

  try {
    // ========================================
    // INICIAR TRANSACCIÓN
    // ========================================

    conexion = await db.getConnection();

    await conexion.beginTransaction();

    // ========================================
    // CONSULTAR Y BLOQUEAR PRODUCTO A GRANEL
    // ========================================

    const [productos] = await conexion.query(`
      SELECT
        p.id_producto,
        p.nombre,
        p.stock_actual
      FROM productos p
      INNER JOIN categorias c
        ON c.id_categoria = p.id_categoria
      WHERE p.id_producto = ?
        AND p.estado = 1
        AND c.nombre = 'Productos a granel'
      FOR UPDATE
    `, [idProducto]);

    if (productos.length === 0) {
      throw crearError(
        'No se encontró un producto a granel activo.',
        404
      );
    }

    const producto = productos[0];

    const stockAnterior = Number(
      producto.stock_actual
    );

    if (
      !Number.isFinite(stockAnterior) ||
      stockAnterior < 0
    ) {
      throw crearError(
        'El producto tiene existencias inválidas.',
        409
      );
    }

    if (cantidad > stockAnterior) {
      throw crearError(
        `Stock insuficiente. Disponible: ${stockAnterior} kg.`,
        409
      );
    }

    const stockRestante = redondearTresDecimales(
      stockAnterior - cantidad
    );

    // ========================================
    // CONSULTAR PRESENTACIÓN EXISTENTE
    // ========================================

    const [presentaciones] = await conexion.query(`
      SELECT
        id_presentacion,
        stock_actual,
        precio_venta,
        estado
      FROM presentaciones_producto
      WHERE id_producto = ?
        AND peso_gramos = ?
      FOR UPDATE
    `, [
      idProducto,
      gramos
    ]);

    let idPresentacion;
    let stockPresentacionAnterior = 0;
    let stockPresentacionNuevo = bolsas;
    let presentacionCreada = false;
    let precioVenta = 0;

    if (presentaciones.length > 0) {
      const presentacion = presentaciones[0];

      idPresentacion = Number(
        presentacion.id_presentacion
      );

      stockPresentacionAnterior = Number(
        presentacion.stock_actual
      );

      precioVenta = Number(
        presentacion.precio_venta
      );

      if (
        !Number.isSafeInteger(stockPresentacionAnterior) ||
        stockPresentacionAnterior < 0
      ) {
        throw crearError(
          'La presentación tiene existencias inválidas.',
          409
        );
      }

      stockPresentacionNuevo =
        stockPresentacionAnterior + bolsas;

      if (
        !Number.isSafeInteger(stockPresentacionNuevo) ||
        stockPresentacionNuevo > MAX_BOLSAS
      ) {
        throw crearError(
          'La cantidad de bolsas supera el límite permitido.',
          400
        );
      }
    }

    // ========================================
    // REGISTRAR FRACCIONAMIENTO
    // ========================================

    const [registro] = await conexion.query(`
      INSERT INTO fraccionamientos (
        id_producto,
        cantidad_utilizada,
        peso_empacado,
        merma,
        observaciones
      )
      VALUES (?, ?, ?, ?, ?)
    `, [
      idProducto,
      cantidad,
      pesoEmpacado,
      diferencia,
      observaciones?.trim() || null
    ]);

    const idFraccionamiento = registro.insertId;

    // ========================================
    // REGISTRAR DETALLE DEL FRACCIONAMIENTO
    // ========================================

    await conexion.query(`
      INSERT INTO detalle_fraccionamientos (
        id_fraccionamiento,
        presentacion_gramos,
        bolsas_generadas
      )
      VALUES (?, ?, ?)
    `, [
      idFraccionamiento,
      gramos,
      bolsas
    ]);

    // ========================================
    // DESCONTAR PRODUCTO A GRANEL
    // ========================================

    await conexion.query(`
      UPDATE productos
      SET stock_actual = ?
      WHERE id_producto = ?
    `, [
      stockRestante,
      idProducto
    ]);

    // ========================================
    // ACTUALIZAR O CREAR PRESENTACIÓN
    // ========================================

    if (presentaciones.length > 0) {
      await conexion.query(`
        UPDATE presentaciones_producto
        SET
          stock_actual = ?,
          estado = 1
        WHERE id_presentacion = ?
      `, [
        stockPresentacionNuevo,
        idPresentacion
      ]);

    } else {
      // Una presentación nueva queda con precio 0.
      // El precio debe configurarse antes de venderla.

      const [nuevaPresentacion] =
        await conexion.query(`
          INSERT INTO presentaciones_producto (
            id_producto,
            peso_gramos,
            stock_actual,
            precio_venta,
            estado
          )
          VALUES (?, ?, ?, 0, 1)
        `, [
          idProducto,
          gramos,
          bolsas
        ]);

      idPresentacion = nuevaPresentacion.insertId;
      presentacionCreada = true;
      precioVenta = 0;
    }

    // ========================================
    // REGISTRAR SALIDA DEL INVENTARIO
    // ========================================

    await conexion.query(`
      INSERT INTO movimientos_inventario (
        id_producto,
        id_usuario,
        tipo_movimiento,
        cantidad,
        motivo,
        observaciones
      )
      VALUES (?, NULL, 'SALIDA', ?, ?, ?)
    `, [
      idProducto,
      cantidad,
      'Fraccionamiento',
      `Fraccionamiento #${idFraccionamiento}. ` +
      `${bolsas} bolsa(s) de ${gramos} g.`
    ]);

    // ========================================
    // CONFIRMAR TRANSACCIÓN
    // ========================================

    await conexion.commit();

    // ========================================
    // RESPUESTA EXITOSA
    // ========================================

    res.status(201).json({
      mensaje: 'Fraccionamiento registrado correctamente.',
      id_fraccionamiento: idFraccionamiento,
      producto: producto.nombre,
      id_producto: idProducto,

      cantidad_utilizada: cantidad,
      peso_empacado: pesoEmpacado,
      merma: diferencia,

      stock_anterior: stockAnterior,
      stock_restante: stockRestante,

      presentacion: {
        id_presentacion: idPresentacion,
        peso_gramos: gramos,
        bolsas_generadas: bolsas,
        stock_anterior: stockPresentacionAnterior,
        stock_actual: stockPresentacionNuevo,
        precio_venta: precioVenta,
        creada: presentacionCreada
      },

      aviso:
        precioVenta <= 0
          ? 'Configura el precio de venta de esta presentación antes de venderla.'
          : null
    });

  } catch (error) {
    // ========================================
    // REVERTIR TRANSACCIÓN SI OCURRE UN ERROR
    // ========================================

    if (conexion) {
      try {
        await conexion.rollback();

      } catch (rollbackError) {
        console.error(
          'Error al revertir fraccionamiento:',
          rollbackError
        );
      }
    }

    console.error(
      'Error al registrar fraccionamiento:',
      error
    );

    res.status(error.status || 500).json({
      mensaje: error.status
        ? error.message
        : 'No fue posible registrar el fraccionamiento.'
    });

  } finally {
    // ========================================
    // LIBERAR CONEXIÓN MYSQL
    // ========================================

    if (conexion) {
      conexion.release();
    }
  }
});

module.exports = router;
