const express = require('express');
const router = express.Router();

const db = require('../db');

// Consultar historial de movimientos.
router.get('/', async (req, res) => {
  try {
    const [movimientos] = await db.query(`
      SELECT
        m.id_movimiento,
        m.id_producto,
        p.nombre AS producto,
        m.id_usuario,
        m.tipo_movimiento,
        m.cantidad,
        m.fecha_movimiento,
        m.motivo,
        m.observaciones
      FROM movimientos_inventario AS m
      INNER JOIN productos AS p
        ON p.id_producto = m.id_producto
      ORDER BY
        m.fecha_movimiento DESC,
        m.id_movimiento DESC
    `);

    const resultado = movimientos.map(movimiento => ({
      ...movimiento,
      responsable: movimiento.id_usuario
        ? `Usuario ${movimiento.id_usuario}`
        : 'No asignado'
    }));

    res.json(resultado);

  } catch (error) {
    console.error(
      'Error al consultar movimientos:',
      error
    );

    res.status(500).json({
      mensaje: 'No fue posible consultar los movimientos.'
    });
  }
});

module.exports = router;
