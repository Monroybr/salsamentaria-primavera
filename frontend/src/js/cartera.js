/*
 * SALSAMENTARIA PRIMAVERA
 * MÓDULO CARTERA
 *
 * Consulta saldos pendientes desde MySQL.
 */

document.addEventListener('DOMContentLoaded', async () => {

  const datos = window.CarteraDatos;
  const tabla = document.getElementById('tablaCartera');

  if (!datos || !tabla) return;

  const filtro = document.getElementById(
    'filtroFechasCartera'
  );

  const sinCuentas = document.getElementById(
    'sinCuentasCartera'
  );

  let cuentas = [];

  // ==========================================
  // FECHAS
  // ==========================================

  function fechaVisible(valor) {
    if (!valor) return 'Sin fecha';

    const partes = String(valor)
      .substring(0, 10)
      .split('-')
      .map(Number);

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

  function diasHasta(valor) {
    if (!valor) return null;

    const [anio, mes, dia] = String(valor)
      .substring(0, 10)
      .split('-')
      .map(Number);

    if (![anio, mes, dia].every(Number.isFinite)) {
      return null;
    }

    const hoy = new Date();
    const objetivo = new Date(anio, mes - 1, dia);

    hoy.setHours(0, 0, 0, 0);
    objetivo.setHours(0, 0, 0, 0);

    const inicioHoy = Date.UTC(
      hoy.getFullYear(),
      hoy.getMonth(),
      hoy.getDate()
    );

    const inicioObjetivo = Date.UTC(
      objetivo.getFullYear(),
      objetivo.getMonth(),
      objetivo.getDate()
    );

    return Math.round(
      (inicioObjetivo - inicioHoy) / 86400000
    );
  }

  // ==========================================
  // ESTADO DE CUENTA
  // ==========================================

  function estadoCuenta(cuenta) {
    const dias = diasHasta(cuenta.vencimiento);

    if (dias !== null && dias < 0) {
      return {
        texto: 'Vencida',
        clase: 'vencida'
      };
    }

    if (cuenta.estado === 'PARCIAL') {
      return {
        texto: 'Abonada parcialmente',
        clase: 'pendiente'
      };
    }

    return {
      texto: 'Pendiente',
      clase: 'pendiente'
    };
  }

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
  // ACTUALIZAR INDICADORES
  // ==========================================

  function actualizarIndicadores() {
    const total = cuentas.reduce(
      (suma, cuenta) =>
        suma + Number(cuenta.saldoPendiente),
      0
    );

    const porVencer = cuentas
      .filter(cuenta => {
        const dias = diasHasta(cuenta.vencimiento);

        return dias !== null &&
          dias >= 0 &&
          dias <= 7;
      })
      .reduce(
        (suma, cuenta) =>
          suma + Number(cuenta.saldoPendiente),
        0
      );

    const vencida = cuentas
      .filter(cuenta => {
        const dias = diasHasta(cuenta.vencimiento);

        return dias !== null && dias < 0;
      })
      .reduce(
        (suma, cuenta) =>
          suma + Number(cuenta.saldoPendiente),
        0
      );

    const clientes = new Set(
      cuentas.map(cuenta =>
        cuenta.clienteId ||
        datos.normalizar(cuenta.cliente)
      )
    );

    document.getElementById(
      'carteraTotal'
    ).textContent = datos.dinero(total);

    document.getElementById(
      'carteraPorVencer'
    ).textContent = datos.dinero(porVencer);

    document.getElementById(
      'carteraVencida'
    ).textContent = datos.dinero(vencida);

    document.getElementById(
      'clientesConSaldo'
    ).textContent =
      `${clientes.size} clientes con saldo`;
  }

  // ==========================================
  // MOSTRAR TABLA
  // ==========================================

  function mostrarTabla() {
    tabla.replaceChildren();

    const seleccion = filtro ? filtro.value : 'todas';

    const filtradas = cuentas.filter(cuenta => {
      const dias = diasHasta(cuenta.vencimiento);

      if (seleccion === 'vencidas') {
        return dias !== null && dias < 0;
      }

      if (seleccion === 'proximas') {
        return dias !== null &&
          dias >= 0 &&
          dias <= 7;
      }

      if (seleccion === 'vigentes') {
        return dias === null || dias >= 0;
      }

      return true;
    });

    filtradas.forEach(cuenta => {
      const fila = document.createElement('tr');

      fila.appendChild(
        crearCelda(
          cuenta.cliente,
          'cartera__cliente'
        )
      );

      fila.appendChild(
        crearCelda(cuenta.ventaId)
      );

      fila.appendChild(
        crearCelda(fechaVisible(cuenta.fecha))
      );

      fila.appendChild(
        crearCelda(fechaVisible(cuenta.vencimiento))
      );

      fila.appendChild(
        crearCelda(
          datos.dinero(cuenta.saldoPendiente),
          'cartera__saldo'
        )
      );

      const tdEstado = document.createElement('td');
      const etiqueta = document.createElement('span');

      const estado = estadoCuenta(cuenta);

      etiqueta.className =
        `cartera__estado cartera__estado--${estado.clase}`;

      etiqueta.textContent = estado.texto;

      tdEstado.appendChild(etiqueta);
      fila.appendChild(tdEstado);

      const tdAccion = document.createElement('td');
      const boton = document.createElement('button');

      boton.type = 'button';
      boton.className = 'cartera__abonar';
      boton.textContent = 'Abonar';

      boton.addEventListener('click', () => {
        window.location.href =
          `registrar-abono.html?cuenta=${encodeURIComponent(cuenta.id)}`;
      });

      tdAccion.appendChild(boton);
      fila.appendChild(tdAccion);

      tabla.appendChild(fila);
    });

    if (sinCuentas) {
      sinCuentas.hidden = filtradas.length !== 0;
    }
  }

  // ==========================================
  // CONSULTAR MYSQL
  // ==========================================

  async function cargarCartera() {
    try {
      cuentas = await datos.obtenerPendientes();

      actualizarIndicadores();
      mostrarTabla();

    } catch (error) {
      console.error(
        'Error al cargar cartera:',
        error
      );

      cuentas = [];

      actualizarIndicadores();
      tabla.replaceChildren();

      if (sinCuentas) {
        sinCuentas.textContent =
          error.message ||
          'No fue posible consultar las cuentas por cobrar.';

        sinCuentas.hidden = false;
      }
    }
  }

  if (filtro) {
    filtro.addEventListener(
      'change',
      mostrarTabla
    );
  }

  await cargarCartera();

  if (window.lucide) {
    window.lucide.createIcons();
  }

});
