const express = require('express');
const router = express.Router();
const db = require('../db');

// Validar las fechas recibidas.
function fechaValida(fecha) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha || '')) {
    return false;
  }

  const [anio, mes, dia] = fecha.split('-').map(Number);
  const comprobacion = new Date(Date.UTC(anio, mes - 1, dia));

  return (
    comprobacion.getUTCFullYear() === anio &&
    comprobacion.getUTCMonth() + 1 === mes &&
    comprobacion.getUTCDate() === dia
  );
}

// ==========================================
// GENERAR REPORTE DE VENTAS
// GET /api/reportes?desde=2026-11-01&hasta=2026-11-30
// ==========================================

router.get('/', async (req, res) => {
  const { desde, hasta } = req.query;

  if (!fechaValida(desde) || !fechaValida(hasta) || desde > hasta) {
    return res.status(400).json({
      mensaje: 'Selecciona un rango de fechas válido.'
    });
  }

  try {
    // 1. Indicadores generales.
    const [indicadores] = await db.query(`
      SELECT
        COUNT(*) AS total_ventas,
        COALESCE(SUM(total), 0) AS ventas_totales,
        COALESCE(AVG(total), 0) AS ticket_promedio,
        COALESCE(SUM(
          CASE WHEN tipo_venta = 'CONTADO' THEN total ELSE 0 END
        ), 0) AS ventas_contado,
        COALESCE(SUM(
          CASE WHEN tipo_venta = 'CREDITO' THEN total ELSE 0 END
        ), 0) AS ventas_credito
      FROM ventas
      WHERE fecha_venta >= ?
        AND fecha_venta < DATE_ADD(?, INTERVAL 1 DAY)
        AND estado = 'REGISTRADA'
    `, [desde, hasta]);

    // 2. Cantidad total de unidades vendidas.
    const [unidades] = await db.query(`
      SELECT
        COALESCE(SUM(d.cantidad), 0) AS unidades_vendidas
      FROM detalle_ventas AS d
      INNER JOIN ventas AS v
        ON d.id_venta = v.id_venta
      WHERE v.fecha_venta >= ?
        AND v.fecha_venta < DATE_ADD(?, INTERVAL 1 DAY)
        AND v.estado = 'REGISTRADA'
    `, [desde, hasta]);

    // 3. Ventas agrupadas por semana.
    const [ventasSemanales] = await db.query(`
      SELECT
        DATE_FORMAT(
          DATE_SUB(fecha_venta, INTERVAL WEEKDAY(fecha_venta) DAY),
          '%Y-%m-%d'
        ) AS semana,
        COUNT(*) AS cantidad_ventas,
        COALESCE(SUM(total), 0) AS total
      FROM ventas
      WHERE fecha_venta >= ?
        AND fecha_venta < DATE_ADD(?, INTERVAL 1 DAY)
        AND estado = 'REGISTRADA'
      GROUP BY semana
      ORDER BY semana ASC
    `, [desde, hasta]);

    // 4. Productos más vendidos.
    const [productos] = await db.query(`
      SELECT
        p.id_producto,
        p.nombre,
        COALESCE(SUM(d.cantidad), 0) AS unidades,
        COALESCE(SUM(d.subtotal), 0) AS ingresos
      FROM detalle_ventas AS d
      INNER JOIN ventas AS v
        ON d.id_venta = v.id_venta
      INNER JOIN productos AS p
        ON d.id_producto = p.id_producto
      WHERE v.fecha_venta >= ?
        AND v.fecha_venta < DATE_ADD(?, INTERVAL 1 DAY)
        AND v.estado = 'REGISTRADA'
      GROUP BY p.id_producto, p.nombre
      ORDER BY ingresos DESC, unidades DESC
      LIMIT 10
    `, [desde, hasta]);

    // 5. Respuesta para el frontend.
    return res.json({
      periodo: { desde, hasta },

      indicadores: {
        totalVentas: Number(indicadores[0].total_ventas),
        ventasTotales: Number(indicadores[0].ventas_totales),
        ticketPromedio: Number(indicadores[0].ticket_promedio),
        ventasContado: Number(indicadores[0].ventas_contado),
        ventasCredito: Number(indicadores[0].ventas_credito),
        unidadesVendidas: Number(unidades[0].unidades_vendidas)
      },

      ventasSemanales: ventasSemanales.map(item => ({
        semana: item.semana,
        cantidadVentas: Number(item.cantidad_ventas),
        total: Number(item.total)
      })),

      productosMasVendidos: productos.map(item => ({
        id: item.id_producto,
        nombre: item.nombre,
        unidades: Number(item.unidades),
        ingresos: Number(item.ingresos)
      }))
    });

  } catch (error) {
    console.error('Error al generar reporte:', error);

    return res.status(500).json({
      mensaje: 'No fue posible generar el reporte.'
    });
  }
});

module.exports = router;
