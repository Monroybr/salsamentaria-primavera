/*
 * SALSAMENTARIA PRIMAVERA
 * HISTORIAL DE ABONOS
 *
 * Consulta los abonos registrados en MySQL.
 */

document.addEventListener('DOMContentLoaded', async () => {

  const datos = window.CarteraDatos;

  const tabla = document.getElementById(
    'tablaHistorialAbonos'
  );

  const sinHistorial = document.getElementById(
    'sinHistorialAbonos'
  );

  const errorHistorial = document.getElementById(
    'errorHistorialAbonos'
  );

  if (!datos || !tabla) return;

  // ==========================================
  // CREAR CELDA
  // ==========================================

  function crearCelda(texto, clase = '') {
    const td = document.createElement('td');

    td.textContent = texto ?? '';

    if (clase) {
      td.className = clase;
    }

    return td;
  }

  // ==========================================
  // FORMATEAR FECHA
  // ==========================================

  function formatearFecha(valor) {
    if (!valor) return 'Sin fecha';

    const texto = String(valor).substring(0, 10);
    const partes = texto.split('-').map(Number);

    if (
      partes.length !== 3 ||
      partes.some(numero => !Number.isFinite(numero))
    ) {
      return String(valor);
    }

    const [anio, mes, dia] = partes;
    const fecha = new Date(anio, mes - 1, dia);

    if (Number.isNaN(fecha.getTime())) {
      return String(valor);
    }

    return fecha.toLocaleDateString('es-CO', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  }

  // ==========================================
  // FORMATEAR COMPROBANTE
  // ==========================================

  function formatearComprobante(id) {
    return `AB-${String(id).padStart(4, '0')}`;
  }

  // ==========================================
  // FORMATEAR MEDIO DE PAGO
  // ==========================================

  function formatearMedioPago(medio) {
    const nombres = {
      EFECTIVO: 'Efectivo',
      TRANSFERENCIA: 'Transferencia',
      TARJETA: 'Tarjeta',
      CONSIGNACION: 'Consignación'
    };

    const clave = String(medio || '').toUpperCase();

    return nombres[clave] ||
      medio ||
      'Sin especificar';
  }

  // ==========================================
  // MOSTRAR HISTORIAL
  // ==========================================

  function mostrarHistorial(abonos) {
    tabla.replaceChildren();

    if (sinHistorial) {
      sinHistorial.hidden = abonos.length !== 0;
    }

    abonos.forEach(abono => {
      const fila = document.createElement('tr');

      fila.appendChild(
        crearCelda(
          formatearComprobante(abono.id)
        )
      );

      fila.appendChild(
        crearCelda(
          abono.cliente,
          'cartera__cliente'
        )
      );

      fila.appendChild(
        crearCelda(abono.ventaId)
      );

      fila.appendChild(
        crearCelda(formatearFecha(abono.fecha))
      );

      fila.appendChild(
        crearCelda(
          datos.dinero(abono.valor),
          'cartera__saldo'
        )
      );

      fila.appendChild(
        crearCelda(
          formatearMedioPago(abono.medioPago)
        )
      );

      tabla.appendChild(fila);
    });
  }

  // ==========================================
  // CARGAR HISTORIAL DESDE MYSQL
  // ==========================================

  async function cargarHistorial() {
    if (errorHistorial) {
      errorHistorial.hidden = true;
    }

    if (sinHistorial) {
      sinHistorial.hidden = true;
    }

    try {
      const abonos =
        await datos.obtenerHistorialAbonos();

      mostrarHistorial(abonos);

    } catch (error) {
      console.error(
        'Error al consultar historial de abonos:',
        error
      );

      tabla.replaceChildren();

      if (errorHistorial) {
        errorHistorial.textContent =
          error.message ||
          'No fue posible consultar el historial de abonos.';

        errorHistorial.hidden = false;
      }
    }
  }

  await cargarHistorial();

});
