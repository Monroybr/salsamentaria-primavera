
document.addEventListener('DOMContentLoaded', () => {
  const datos = window.CarteraDatos;
  const tabla = document.getElementById('tablaCartera');

  if (!datos || !tabla) return;

  const filtro = document.getElementById('filtroFechasCartera');
  const sinCuentas = document.getElementById('sinCuentasCartera');

  function fechaVisible(valor) {
    if (!valor) return 'Sin fecha';

    const [anio, mes, dia] = valor.split('-').map(Number);

    const fecha = new Date(anio, mes - 1, dia);

    return fecha.toLocaleDateString('es-CO', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  }

  // Comparar fechas locales sin problemas de zona horaria.
  function diasHasta(fecha) {
    if (!fecha) return null;

    const [anio, mes, dia] = fecha.split('-').map(Number);
    const objetivo = new Date(anio, mes - 1, dia);
    const hoy = new Date();

    hoy.setHours(0, 0, 0, 0);

    return Math.round(
      (objetivo - hoy) / 86400000
    );
  }

  function estadoCuenta(cuenta) {
    const dias = diasHasta(cuenta.vencimiento);

    if (dias !== null && dias < 0) return 'vencida';

    return 'pendiente';
  }

  function crearCelda(texto, clase = '') {
    const td = document.createElement('td');
    td.textContent = texto;

    if (clase) td.className = clase;

    return td;
  }

  // Indicadores basados en los saldos actuales.
  function actualizarIndicadores() {
    const cuentas = datos.obtenerPendientes();

    const total = cuentas.reduce(
      (suma, c) => suma + Number(c.saldoPendiente), 0
    );

    const porVencer = cuentas
      .filter(c => {
        const dias = diasHasta(c.vencimiento);
        return dias !== null && dias >= 0 && dias <= 7;
      })
      .reduce(
        (suma, c) => suma + Number(c.saldoPendiente), 0
      );

    const vencida = cuentas
      .filter(c => estadoCuenta(c) === 'vencida')
      .reduce(
        (suma, c) => suma + Number(c.saldoPendiente), 0
      );

    const clientes = new Set(
      cuentas.map(c => c.clienteId || datos.normalizar(c.cliente))
    );

    document.getElementById('carteraTotal').textContent =
      datos.dinero(total);

    document.getElementById('carteraPorVencer').textContent =
      datos.dinero(porVencer);

    document.getElementById('carteraVencida').textContent =
      datos.dinero(vencida);

    document.getElementById('clientesConSaldo').textContent =
      `${clientes.size} clientes con saldo`;
  }

  // Construir la tabla.
  function mostrarTabla() {
    tabla.replaceChildren();

    const seleccion = filtro.value;

    const cuentas = datos.obtenerPendientes().filter(cuenta => {
      const dias = diasHasta(cuenta.vencimiento);

      if (seleccion === 'vencidas') {
        return dias !== null && dias < 0;
      }

      if (seleccion === 'proximas') {
        return dias !== null && dias >= 0 && dias <= 7;
      }

      if (seleccion === 'vigentes') {
        return dias === null || dias >= 0;
      }

      return true;
    });

    cuentas.forEach(cuenta => {
      const fila = document.createElement('tr');

      fila.appendChild(
        crearCelda(cuenta.cliente, 'cartera__cliente')
      );

      fila.appendChild(crearCelda(cuenta.ventaId));
      fila.appendChild(crearCelda(fechaVisible(cuenta.fecha)));
      fila.appendChild(crearCelda(fechaVisible(cuenta.vencimiento)));

      fila.appendChild(
        crearCelda(datos.dinero(cuenta.saldoPendiente), 'cartera__saldo')
      );

      const tdEstado = document.createElement('td');
      const etiqueta = document.createElement('span');

      const estado = estadoCuenta(cuenta);

      etiqueta.className =
        `cartera__estado cartera__estado--${estado}`;

      etiqueta.textContent = estado === 'vencida'
        ? 'Vencida'
        : 'Pendiente';

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

    sinCuentas.hidden = cuentas.length !== 0;
  }

  filtro.addEventListener('change', mostrarTabla);

  actualizarIndicadores();
  mostrarTabla();

  if (window.lucide) window.lucide.createIcons();
});
