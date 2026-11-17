/*
 * SALSAMENTARIA PRIMAVERA
 * CARTERA - DATOS COMPARTIDOS
 *
 * Integración con backend Node.js y MySQL.
 */

window.CarteraDatos = (() => {

  const API = 'http://localhost:4000/api/cartera';

  // ==========================================
  // FORMATEAR DINERO
  // ==========================================

  function dinero(valor) {
    return '$' + Number(valor || 0).toLocaleString('es-CO', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    });
  }

  // ==========================================
  // FECHA LOCAL
  // ==========================================

  function fechaLocal() {
    const hoy = new Date();

    return [
      hoy.getFullYear(),
      String(hoy.getMonth() + 1).padStart(2, '0'),
      String(hoy.getDate()).padStart(2, '0')
    ].join('-');
  }

  // ==========================================
  // NORMALIZAR TEXTO
  // ==========================================

  function normalizar(texto) {
    return String(texto || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim();
  }

  // ==========================================
  // CONSULTAR API
  // ==========================================

  async function solicitar(url, opciones = {}) {
    let respuesta;

    try {
      respuesta = await fetch(url, opciones);
    } catch {
      throw new Error(
        'No se pudo conectar con el servidor. ' +
        'Verifica que el backend funcione en el puerto 4000.'
      );
    }

    let resultado;

    try {
      resultado = await respuesta.json();
    } catch {
      throw new Error(
        'El servidor devolvió una respuesta no válida.'
      );
    }

    if (!respuesta.ok) {
      throw new Error(
        resultado.mensaje ||
        'Ocurrió un error al consultar el servidor.'
      );
    }

    return resultado;
  }

  // ==========================================
  // ADAPTAR CUENTA DE MYSQL
  // ==========================================

  function adaptarCuenta(cuenta) {
    return {
      id: String(cuenta.id_cuenta),
      ventaId: `V-${cuenta.id_venta}`,
      clienteId: String(cuenta.id_cliente),
      cliente: cuenta.cliente,
      fecha: cuenta.fecha,
      vencimiento: cuenta.vencimiento,
      montoTotal: Number(cuenta.valor_total),
      saldoPendiente: Number(cuenta.saldo_pendiente),
      estado: cuenta.estado
    };
  }

  // ==========================================
  // OBTENER CUENTAS POR COBRAR
  // ==========================================

  async function obtenerCuentas() {
    const cuentas = await solicitar(API);

    if (!Array.isArray(cuentas)) {
      throw new Error(
        'La API no devolvió una lista válida de cuentas.'
      );
    }

    return cuentas.map(adaptarCuenta);
  }

  // ==========================================
  // OBTENER CUENTAS PENDIENTES
  // ==========================================

  async function obtenerPendientes() {
    const cuentas = await obtenerCuentas();

    return cuentas.filter(
      cuenta => cuenta.saldoPendiente > 0
    );
  }

  // ==========================================
  // BUSCAR CUENTA POR ID
  // ==========================================

  async function buscarCuenta(id) {
    const cuenta = await solicitar(
      `${API}/${encodeURIComponent(id)}`
    );

    return adaptarCuenta(cuenta);
  }

  // ==========================================
  // REGISTRAR ABONO EN MYSQL
  // ==========================================

  async function registrarAbono(datos) {
    const idCuenta = Number(datos.cuentaId);

    if (!Number.isSafeInteger(idCuenta) || idCuenta <= 0) {
      throw new Error(
        'Selecciona una cuenta por cobrar válida.'
      );
    }

    return solicitar(`${API}/${idCuenta}/abonos`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        valor: datos.valor,
        medioPago: datos.medioPago,
        fecha: datos.fecha,
        referencia: datos.referencia || '',
        observaciones: datos.observaciones || ''
      })
    });
  }

  // ==========================================
  // CONSULTAR HISTORIAL DE ABONOS
  // ==========================================

  async function obtenerHistorialAbonos() {
    const historial = await solicitar(
      `${API}/abonos/historial`
    );

    if (!Array.isArray(historial)) {
      throw new Error(
        'La API no devolvió un historial válido.'
      );
    }

    return historial.map(abono => ({
      id: Number(abono.id_abono),
      cuentaId: String(abono.id_cuenta),
      ventaId: `V-${abono.id_venta}`,
      clienteId: String(abono.id_cliente),
      cliente: abono.cliente,
      fecha: abono.fecha,
      valor: Number(abono.valor_abono),
      medioPago: abono.metodo_pago,
      observaciones: abono.observaciones || '',
      saldoPendiente: Number(abono.saldo_pendiente),
      estadoCuenta: abono.estado
    }));
  }

  // ==========================================
  // FUNCIONES DISPONIBLES
  // ==========================================

  return {
    dinero,
    fechaLocal,
    normalizar,
    obtenerCuentas,
    obtenerPendientes,
    buscarCuenta,
    registrarAbono,
    obtenerHistorialAbonos
  };

})();
