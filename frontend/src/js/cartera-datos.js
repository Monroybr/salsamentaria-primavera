
/*
 * CARTERA - DATOS COMPARTIDOS
 * Maneja las cuentas por cobrar y sus abonos
 * en el prototipo del navegador.
 */

window.CarteraDatos = (() => {
  const CLAVE_CUENTAS = 'salsamentaria_cartera';
  const CLAVE_ABONOS = 'salsamentaria_abonos';

  // Registros de ejemplo del mockup.
  // Las fechas son históricas y no se modifican automáticamente.
  const ejemplos = [
    {
      id: 'CC-V-1047',
      ventaId: 'V-1047',
      clienteId: 'CLI-001',
      cliente: 'Tienda El Portal',
      fecha: '2025-03-12',
      vencimiento: '2025-03-27',
      montoTotal: 328400,
      saldoPendiente: 328400,
      demo: true
    },
    {
      id: 'CC-V-1039',
      ventaId: 'V-1039',
      clienteId: 'CLI-002',
      cliente: 'Panadería Central',
      fecha: '2025-03-08',
      vencimiento: '2025-03-23',
      montoTotal: 176500,
      saldoPendiente: 176500,
      demo: true
    },
    {
      id: 'CC-V-1031',
      ventaId: 'V-1031',
      clienteId: 'CLI-004',
      cliente: 'Mercado San José',
      fecha: '2025-02-27',
      vencimiento: '2025-03-14',
      montoTotal: 92000,
      saldoPendiente: 92000,
      demo: true
    }
  ];

  function leer(clave) {
    try {
      const datos = JSON.parse(localStorage.getItem(clave) || '[]');
      return Array.isArray(datos) ? datos : [];
    } catch {
      return [];
    }
  }

  function guardar(clave, datos) {
    localStorage.setItem(clave, JSON.stringify(datos));
  }

  function dinero(valor) {
    return '$' + Number(valor || 0).toLocaleString('es-CO', {
      maximumFractionDigits: 0
    });
  }

  function fechaLocal() {
    const hoy = new Date();

    return [
      hoy.getFullYear(),
      String(hoy.getMonth() + 1).padStart(2, '0'),
      String(hoy.getDate()).padStart(2, '0')
    ].join('-');
  }

  function normalizar(texto) {
    return String(texto || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim();
  }

  // Devuelve las cuentas guardadas y las del mockup.
  // Si se guardó una cuenta de ejemplo, se utiliza
  // su versión actualizada en lugar del valor inicial.
  function obtenerCuentas() {
    const guardadas = leer(CLAVE_CUENTAS);
    const ids = new Set(guardadas.map(c => c.id));

    return [
      ...guardadas,
      ...ejemplos.filter(c => !ids.has(c.id))
    ];
  }

  function obtenerPendientes() {
    return obtenerCuentas().filter(
      cuenta => Number(cuenta.saldoPendiente) > 0
    );
  }

  function buscarCuenta(id) {
    return obtenerCuentas().find(c => c.id === id);
  }

  function obtenerAbonos() {
    return leer(CLAVE_ABONOS);
  }

  function siguienteComprobante() {
    const abonos = obtenerAbonos();

    const numeros = abonos.map(a =>
      Number(String(a.id).replace('AB-', ''))
    ).filter(Number.isFinite);

    const numero = Math.max(185, ...numeros) + 1;

    return `AB-${String(numero).padStart(4, '0')}`;
  }

  // Registrar un abono y actualizar el saldo.
  function registrarAbono(datos) {
    const cuentasGuardadas = leer(CLAVE_CUENTAS);
    const abonosGuardados = leer(CLAVE_ABONOS);

    const cuenta = buscarCuenta(datos.cuentaId);

    if (!cuenta) {
      throw new Error('No se encontró la cuenta por cobrar.');
    }

    const valor = Number(datos.valor);
    const saldo = Number(cuenta.saldoPendiente);

    if (!Number.isFinite(valor) || valor <= 0) {
      throw new Error('El abono debe ser mayor que cero.');
    }

    if (valor > saldo) {
      throw new Error('El abono no puede superar el saldo pendiente.');
    }

    const abono = {
      id: siguienteComprobante(),
      cuentaId: cuenta.id,
      ventaId: cuenta.ventaId,
      clienteId: cuenta.clienteId || '',
      cliente: cuenta.cliente,
      valor,
      medioPago: datos.medioPago,
      fecha: datos.fecha,
      referencia: datos.referencia || '',
      observaciones: datos.observaciones || '',
      fechaRegistro: new Date().toISOString()
    };

    const cuentaActualizada = {
      ...cuenta,
      saldoPendiente: Math.max(0, saldo - valor),
      estado: valor === saldo ? 'pagada' : 'pendiente'
    };

    const indice = cuentasGuardadas.findIndex(
      c => c.id === cuenta.id
    );

    if (indice >= 0) {
      cuentasGuardadas[indice] = cuentaActualizada;
    } else {
      cuentasGuardadas.unshift(cuentaActualizada);
    }

    abonosGuardados.unshift(abono);

    // Se guardan ambos conjuntos de datos.
    // En el backend esto será una transacción MySQL.
    const anteriorCuentas = localStorage.getItem(CLAVE_CUENTAS);
    const anteriorAbonos = localStorage.getItem(CLAVE_ABONOS);

    try {
      guardar(CLAVE_CUENTAS, cuentasGuardadas);
      guardar(CLAVE_ABONOS, abonosGuardados);
    } catch (error) {
      // Recuperar el estado previo si falla la escritura.
      try {
        if (anteriorCuentas === null) {
          localStorage.removeItem(CLAVE_CUENTAS);
        } else {
          localStorage.setItem(CLAVE_CUENTAS, anteriorCuentas);
        }

        if (anteriorAbonos === null) {
          localStorage.removeItem(CLAVE_ABONOS);
        } else {
          localStorage.setItem(CLAVE_ABONOS, anteriorAbonos);
        }
      } catch (recuperacionError) {
        console.error('No se pudo restaurar el estado:', recuperacionError);
      }

      throw error;
    }

    return {
      abono,
      cuenta: cuentaActualizada
    };
  }

  return {
    dinero,
    fechaLocal,
    normalizar,
    obtenerCuentas,
    obtenerPendientes,
    buscarCuenta,
    obtenerAbonos,
    siguienteComprobante,
    registrarAbono
  };
})();
