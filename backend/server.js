require('dotenv').config();

const express = require('express');
const cors = require('cors');
const pool = require('./db');

const fraccionamientosRoutes = require('./routes/fraccionamientos.routes');
const ventasRoutes = require('./routes/ventas.routes');
const clientesRoutes = require('./routes/clientes.routes');
const carteraRoutes = require('./routes/cartera.routes');
const reportesRoutes = require('./routes/reportes.routes');
const usuariosRoutes = require('./routes/usuarios.routes');

const app = express();
const PORT = process.env.PORT || 4000;

const MAX_STOCK = 999999999.999;

// ==========================================
// CONFIGURACIÓN DEL SERVIDOR
// ==========================================

app.use(cors());
app.use(express.json());

// ==========================================
// FUNCIONES AUXILIARES
// ==========================================

function cantidadValida(valor, permitirCero = false) {
  if (valor === null || valor === undefined || valor === '') {
    return false;
  }

  const numero = Number(valor);

  return (
    Number.isFinite(numero) &&
    (permitirCero ? numero >= 0 : numero > 0) &&
    numero <= MAX_STOCK &&
    Math.abs(numero * 1000 - Math.round(numero * 1000)) < 0.000001
  );
}

function redondearCantidad(valor) {
  return Math.round(Number(valor) * 1000) / 1000;
}

function errorHttp(mensaje, status = 400) {
  const error = new Error(mensaje);
  error.status = status;
  return error;
}

// ==========================================
// COMPROBAR CONEXIÓN CON MYSQL
// ==========================================

app.get('/api/test-db', async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT DATABASE() AS base_datos, NOW() AS fecha_servidor'
    );

    res.json({
      mensaje: 'Conexión exitosa con MySQL',
      resultado: rows[0]
    });
  } catch (error) {
    console.error('Error de conexión:', error.message);

    res.status(500).json({
      mensaje: 'No se pudo conectar con MySQL'
    });
  }
});

// ==========================================
// CONSULTAR TODOS LOS PRODUCTOS
// ==========================================

app.get('/api/productos', async (req, res) => {
  try {
    const [productos] = await pool.query(`
      SELECT
        p.id_producto,
        p.id_categoria,
        p.codigo,
        p.nombre,
        p.descripcion,
        c.nombre AS categoria,
        p.precio_compra,
        p.precio_venta,
        p.stock_actual,
        p.stock_minimo,
        p.estado
      FROM productos AS p
      INNER JOIN categorias AS c
        ON p.id_categoria = c.id_categoria
      ORDER BY p.id_producto DESC
    `);

    res.json(productos);
  } catch (error) {
    console.error('Error al consultar productos:', error.message);

    res.status(500).json({
      mensaje: 'No se pudieron consultar los productos'
    });
  }
});

// ==========================================
// CONSULTAR CATEGORÍAS
// ==========================================

app.get('/api/categorias', async (req, res) => {
  try {
    const [categorias] = await pool.query(`
      SELECT
        id_categoria,
        nombre
      FROM categorias
      WHERE estado = 1
      ORDER BY nombre ASC
    `);

    res.json(categorias);
  } catch (error) {
    console.error('Error al consultar categorías:', error.message);

    res.status(500).json({
      mensaje: 'No se pudieron consultar las categorías'
    });
  }
});

// ==========================================
// REGISTRAR PRODUCTO
// ==========================================

app.post('/api/productos', async (req, res) => {
  const {
    nombre,
    codigo,
    id_categoria,
    descripcion,
    stock_actual,
    stock_minimo,
    precio_compra,
    precio_venta
  } = req.body || {};

  const categoriaId = Number(id_categoria);
  const cantidad = Number(stock_actual);
  const minimo = Number(stock_minimo);
  const compra = Number(precio_compra);
  const venta = Number(precio_venta);

  if (
    typeof nombre !== 'string' ||
    !nombre.trim() ||
    nombre.trim().length > 150 ||
    typeof codigo !== 'string' ||
    !codigo.trim() ||
    codigo.trim().length > 50 ||
    !Number.isSafeInteger(categoriaId) ||
    categoriaId <= 0 ||
    !cantidadValida(stock_actual, true) ||
    !cantidadValida(stock_minimo, true) ||
    precio_compra == null ||
    precio_compra === '' ||
    !Number.isFinite(compra) ||
    compra < 0 ||
    precio_venta == null ||
    precio_venta === '' ||
    !Number.isFinite(venta) ||
    venta < 0 ||
    (descripcion != null && typeof descripcion !== 'string')
  ) {
    return res.status(400).json({
      mensaje: 'Revisa los datos obligatorios del producto.'
    });
  }

  try {
    const [categorias] = await pool.query(`
      SELECT id_categoria, nombre
      FROM categorias
      WHERE id_categoria = ?
        AND estado = 1
    `, [categoriaId]);

    if (categorias.length === 0) {
      return res.status(400).json({
        mensaje: 'La categoría seleccionada no está disponible.'
      });
    }

    const esGranel =
      categorias[0].nombre === 'Productos a granel';

    if (
      !esGranel &&
      (!Number.isSafeInteger(cantidad) ||
       !Number.isSafeInteger(minimo))
    ) {
      return res.status(400).json({
        mensaje:
          'Para productos que no son a granel, el stock debe estar en unidades enteras.'
      });
    }

    const [existentes] = await pool.query(
      'SELECT id_producto FROM productos WHERE codigo = ?',
      [codigo.trim()]
    );

    if (existentes.length > 0) {
      return res.status(409).json({
        mensaje: 'Ya existe un producto con ese código.'
      });
    }

    const [resultado] = await pool.query(`
      INSERT INTO productos (
        id_categoria,
        codigo,
        nombre,
        descripcion,
        precio_compra,
        precio_venta,
        stock_actual,
        stock_minimo
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      categoriaId,
      codigo.trim(),
      nombre.trim(),
      descripcion?.trim() || null,
      compra,
      venta,
      redondearCantidad(cantidad),
      redondearCantidad(minimo)
    ]);

    res.status(201).json({
      mensaje: 'Producto registrado correctamente.',
      id_producto: resultado.insertId,
      nombre: nombre.trim(),
      codigo: codigo.trim()
    });
  } catch (error) {
    console.error('Error al registrar producto:', error.message);

    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({
        mensaje: 'Ya existe un producto con ese código.'
      });
    }

    res.status(500).json({
      mensaje: 'No fue posible registrar el producto.'
    });
  }
});

// ==========================================
// CONSULTAR PRODUCTO POR ID
// ==========================================

app.get('/api/productos/:id', async (req, res) => {
  const id = Number(req.params.id);

  if (!Number.isSafeInteger(id) || id <= 0) {
    return res.status(400).json({
      mensaje: 'El ID del producto no es válido.'
    });
  }

  try {
    const [productos] = await pool.query(`
      SELECT
        id_producto,
        id_categoria,
        codigo,
        nombre,
        descripcion,
        precio_compra,
        precio_venta,
        stock_actual,
        stock_minimo,
        estado
      FROM productos
      WHERE id_producto = ?
    `, [id]);

    if (productos.length === 0) {
      return res.status(404).json({
        mensaje: 'Producto no encontrado.'
      });
    }

    res.json(productos[0]);
  } catch (error) {
    console.error('Error al consultar producto:', error.message);

    res.status(500).json({
      mensaje: 'No se pudo consultar el producto.'
    });
  }
});

// ==========================================
// ACTUALIZAR PRODUCTO
// ==========================================

app.put('/api/productos/:id', async (req, res) => {
  const id = Number(req.params.id);

  const {
    nombre,
    codigo,
    id_categoria,
    descripcion,
    precio_compra,
    precio_venta,
    stock_minimo
  } = req.body || {};

  const categoriaId = Number(id_categoria);
  const compra = Number(precio_compra);
  const venta = Number(precio_venta);
  const minimo = Number(stock_minimo);

  if (!Number.isSafeInteger(id) || id <= 0) {
    return res.status(400).json({
      mensaje: 'El ID del producto no es válido.'
    });
  }

  if (
    typeof nombre !== 'string' ||
    !nombre.trim() ||
    nombre.trim().length > 150 ||
    typeof codigo !== 'string' ||
    !codigo.trim() ||
    codigo.trim().length > 50 ||
    !Number.isSafeInteger(categoriaId) ||
    categoriaId <= 0 ||
    precio_compra == null ||
    precio_compra === '' ||
    !Number.isFinite(compra) ||
    compra < 0 ||
    precio_venta == null ||
    precio_venta === '' ||
    !Number.isFinite(venta) ||
    venta < 0 ||
    !cantidadValida(stock_minimo, true) ||
    (descripcion != null && typeof descripcion !== 'string')
  ) {
    return res.status(400).json({
      mensaje: 'Revisa los datos del producto.'
    });
  }

  try {
    const [categorias] = await pool.query(`
      SELECT id_categoria, nombre
      FROM categorias
      WHERE id_categoria = ?
        AND estado = 1
    `, [categoriaId]);

    if (categorias.length === 0) {
      return res.status(400).json({
        mensaje: 'La categoría seleccionada no está disponible.'
      });
    }

    const esGranel =
      categorias[0].nombre === 'Productos a granel';

    if (!esGranel && !Number.isSafeInteger(minimo)) {
      return res.status(400).json({
        mensaje:
          'Para productos que no son a granel, el stock mínimo debe ser entero.'
      });
    }

    const [duplicados] = await pool.query(`
      SELECT id_producto
      FROM productos
      WHERE codigo = ?
        AND id_producto <> ?
    `, [codigo.trim(), id]);

    if (duplicados.length > 0) {
      return res.status(409).json({
        mensaje: 'Ya existe otro producto con ese código.'
      });
    }

    const [resultado] = await pool.query(`
      UPDATE productos
      SET
        nombre = ?,
        codigo = ?,
        id_categoria = ?,
        descripcion = ?,
        precio_compra = ?,
        precio_venta = ?,
        stock_minimo = ?
      WHERE id_producto = ?
    `, [
      nombre.trim(),
      codigo.trim(),
      categoriaId,
      descripcion?.trim() || null,
      compra,
      venta,
      redondearCantidad(minimo),
      id
    ]);

    if (resultado.affectedRows === 0) {
      return res.status(404).json({
        mensaje: 'El producto no existe.'
      });
    }

    res.json({
      mensaje: 'Producto actualizado correctamente.',
      id_producto: id
    });
  } catch (error) {
    console.error('Error al actualizar producto:', error.message);

    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({
        mensaje: 'Ya existe otro producto con ese código.'
      });
    }

    res.status(500).json({
      mensaje: 'No fue posible actualizar el producto.'
    });
  }
});

// ==========================================
// CONSULTAR MOVIMIENTOS DE INVENTARIO
// ==========================================

app.get('/api/movimientos', async (req, res) => {
  try {
    const [movimientos] = await pool.query(`
      SELECT
        m.id_movimiento,
        m.id_producto,
        m.id_usuario,
        m.fecha_movimiento,
        p.nombre AS producto,
        m.tipo_movimiento,
        m.cantidad,
        m.motivo,
        m.observaciones
      FROM movimientos_inventario AS m
      INNER JOIN productos AS p
        ON m.id_producto = p.id_producto
      ORDER BY
        m.fecha_movimiento DESC,
        m.id_movimiento DESC
    `);

    res.json(movimientos);
  } catch (error) {
    console.error('Error al consultar movimientos:', error.message);

    res.status(500).json({
      mensaje: 'No se pudieron consultar los movimientos.'
    });
  }
});

// ==========================================
// REGISTRAR MOVIMIENTO DE INVENTARIO
// ==========================================

app.post('/api/movimientos', async (req, res) => {
  const {
    id_producto,
    tipo_movimiento,
    cantidad,
    motivo,
    observaciones
  } = req.body || {};

  const idProducto = Number(id_producto);
  const cantidadSolicitada = Number(cantidad);

  const tipo =
    typeof tipo_movimiento === 'string'
      ? tipo_movimiento.trim().toUpperCase()
      : '';

  if (!Number.isSafeInteger(idProducto) || idProducto <= 0) {
    return res.status(400).json({
      mensaje: 'Selecciona un producto válido.'
    });
  }

  if (!['ENTRADA', 'SALIDA', 'AJUSTE'].includes(tipo)) {
    return res.status(400).json({
      mensaje: 'El tipo de movimiento no es válido.'
    });
  }

  if (!cantidadValida(cantidad, tipo === 'AJUSTE')) {
    return res.status(400).json({
      mensaje:
        tipo === 'AJUSTE'
          ? 'La existencia contada debe ser mayor o igual que cero y tener máximo tres decimales.'
          : 'La cantidad debe ser mayor que cero y tener máximo tres decimales.'
    });
  }

  if (
    typeof motivo !== 'string' ||
    !motivo.trim() ||
    motivo.trim().length > 255
  ) {
    return res.status(400).json({
      mensaje: 'Ingresa un motivo válido de hasta 255 caracteres.'
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

  let conexion;

  try {
    conexion = await pool.getConnection();
    await conexion.beginTransaction();

    const [productos] = await conexion.query(`
      SELECT
        p.id_producto,
        p.nombre,
        p.stock_actual,
        p.estado,
        c.nombre AS categoria
      FROM productos AS p
      INNER JOIN categorias AS c
        ON p.id_categoria = c.id_categoria
      WHERE p.id_producto = ?
      FOR UPDATE
    `, [idProducto]);

    if (productos.length === 0) {
      throw errorHttp(
        'El producto seleccionado no existe.',
        404
      );
    }

    const producto = productos[0];

    if (Number(producto.estado) !== 1) {
      throw errorHttp(
        'No se pueden registrar movimientos de un producto inactivo.'
      );
    }

    const esGranel =
      producto.categoria === 'Productos a granel';

    if (
      !esGranel &&
      !Number.isSafeInteger(cantidadSolicitada)
    ) {
      throw errorHttp(
        'Para productos que no son a granel, utiliza cantidades enteras.'
      );
    }

    const stockAnterior = Number(producto.stock_actual);

    if (!cantidadValida(stockAnterior, true)) {
      throw errorHttp(
        'El inventario actual del producto no es válido.',
        409
      );
    }

    let stockNuevo = stockAnterior;

    if (tipo === 'ENTRADA') {
      stockNuevo = stockAnterior + cantidadSolicitada;
    }

    if (tipo === 'SALIDA') {
      stockNuevo = stockAnterior - cantidadSolicitada;
    }

    if (tipo === 'AJUSTE') {
      stockNuevo = cantidadSolicitada;
    }

    stockNuevo = redondearCantidad(stockNuevo);

    if (stockNuevo < 0) {
      throw errorHttp(
        'La salida supera las existencias disponibles.',
        409
      );
    }

    if (!cantidadValida(stockNuevo, true)) {
      throw errorHttp(
        'La existencia resultante supera el límite permitido.'
      );
    }

    if (
      !esGranel &&
      !Number.isSafeInteger(stockNuevo)
    ) {
      throw errorHttp(
        'El inventario de productos por unidad debe ser entero.',
        409
      );
    }

    const diferencia = redondearCantidad(
      stockNuevo - stockAnterior
    );

    const cantidadRegistrada =
      tipo === 'AJUSTE'
        ? Math.abs(diferencia)
        : redondearCantidad(cantidadSolicitada);

    let observacionesFinales =
      typeof observaciones === 'string'
        ? observaciones.trim()
        : '';

    if (tipo === 'AJUSTE') {
      observacionesFinales = [
        `Ajuste de inventario. Stock anterior: ${stockAnterior}. Stock contado: ${stockNuevo}. Diferencia: ${diferencia}.`,
        observacionesFinales
      ].filter(Boolean).join(' ');
    }

    const [resultado] = await conexion.query(`
      INSERT INTO movimientos_inventario (
        id_producto,
        id_usuario,
        tipo_movimiento,
        cantidad,
        motivo,
        observaciones
      )
      VALUES (?, NULL, ?, ?, ?, ?)
    `, [
      idProducto,
      tipo,
      cantidadRegistrada,
      motivo.trim(),
      observacionesFinales || null
    ]);

    await conexion.query(`
      UPDATE productos
      SET stock_actual = ?
      WHERE id_producto = ?
    `, [stockNuevo, idProducto]);

    await conexion.commit();

    res.status(201).json({
      mensaje: 'Movimiento registrado correctamente.',
      movimiento: {
        id_movimiento: resultado.insertId,
        id_producto: idProducto,
        producto: producto.nombre,
        categoria: producto.categoria,
        unidad_medida: esGranel ? 'kg' : 'unidades',
        tipo_movimiento: tipo,
        cantidad: cantidadRegistrada,
        motivo: motivo.trim(),
        stock_anterior: stockAnterior,
        stock_nuevo: stockNuevo
      }
    });
  } catch (error) {
    if (conexion) {
      try {
        await conexion.rollback();
      } catch (rollbackError) {
        console.error(
          'Error al revertir la transacción:',
          rollbackError.message
        );
      }
    }

    console.error(
      'Error al registrar movimiento:',
      error.message
    );

    res.status(error.status || 500).json({
      mensaje: error.status
        ? error.message
        : 'No se pudo registrar el movimiento.'
    });
  } finally {
    if (conexion) {
      conexion.release();
    }
  }
});

// ==========================================
// RUTAS DE FRACCIONAMIENTO
// ==========================================

app.use(
  '/api/fraccionamientos',
  fraccionamientosRoutes
);

// ==========================================
// RUTAS DE VENTAS
// ==========================================

app.use(
  '/api/ventas',
  ventasRoutes
);

// ==========================================
// RUTAS DE CLIENTES
// ==========================================

app.use(
  '/api/clientes',
  clientesRoutes
);

// ==========================================
// RUTAS DE CARTERA
// ==========================================

app.use('/api/cartera', carteraRoutes);

// ==========================================
// RUTAS DE REPORTES
// ==========================================

app.use('/api/reportes', reportesRoutes);

// ==========================================
// RUTAS DE USUARIOS Y PERMISOS
// ==========================================

app.use('/api/usuarios', usuariosRoutes);

// ==========================================
// INICIAR SERVIDOR
// ==========================================

app.listen(PORT, () => {
  console.log(
    `Servidor activo en http://localhost:${PORT}`
  );
});
