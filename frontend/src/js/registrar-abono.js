
document.addEventListener('DOMContentLoaded', async () => {

  const datos = window.CarteraDatos;
  const formulario = document.getElementById('formRegistrarAbono');

  if (!datos || !formulario) return;

  const clienteSelect = document.getElementById('clienteAbono');
  const facturaSelect = document.getElementById('facturaAbono');
  const valorInput = document.getElementById('valorAbono');
  const medioInput = document.getElementById('medioPagoAbono');
  const fechaInput = document.getElementById('fechaAbono');
  const referenciaInput = document.getElementById('referenciaAbono');
  const observacionesInput =
    document.getElementById('observacionesAbono');

  const mensaje = document.getElementById('mensajeAbono');
  const guardar = document.getElementById('guardarAbono');

  const parametros = new URLSearchParams(window.location.search);
  const cuentaInicial = parametros.get('cuenta');

  let cuentas = [];
  let guardando = false;

  fechaInput.value = datos.fechaLocal();

  const comprobante = document.getElementById('numeroComprobante');

  if (comprobante) {
    comprobante.textContent = 'Se asignará al guardar';
  }

  function agregarOpcion(select, valor, texto) {
    const opcion = document.createElement('option');
    opcion.value = valor;
    opcion.textContent = texto;
    select.appendChild(opcion);
  }

  function mostrarMensaje(texto) {
    mensaje.textContent = texto;
    mensaje.hidden = false;
  }

  function ocultarMensaje() {
    mensaje.hidden = true;
  }

  function cargarClientes() {
    clienteSelect.replaceChildren();

    const clientes = new Map();

    cuentas.forEach(cuenta => {
      const clave = cuenta.clienteId ||
        datos.normalizar(cuenta.cliente);

      if (!clientes.has(clave)) {
        clientes.set(clave, cuenta.cliente);
      }
    });

    clientes.forEach((nombre, clave) => {
      agregarOpcion(clienteSelect, clave, nombre);
    });

    const inicial = cuentas.find(
      cuenta => cuenta.id === cuentaInicial
    );

    if (inicial) {
      clienteSelect.value = inicial.clienteId ||
        datos.normalizar(inicial.cliente);
    }
  }

  function cargarFacturas() {
    facturaSelect.replaceChildren();

    const relacionadas = cuentas.filter(cuenta => {
      const clave = cuenta.clienteId ||
        datos.normalizar(cuenta.cliente);

      return clave === clienteSelect.value;
    });

    relacionadas.forEach(cuenta => {
      agregarOpcion(
        facturaSelect,
        cuenta.id,
        `${cuenta.ventaId} · Saldo ${datos.dinero(cuenta.saldoPendiente)}`
      );
    });

    if (relacionadas.some(cuenta => cuenta.id === cuentaInicial)) {
      facturaSelect.value = cuentaInicial;
    }

    actualizarResumen();
  }

  function cuentaSeleccionada() {
    return cuentas.find(
      cuenta => cuenta.id === facturaSelect.value
    );
  }

  function actualizarResumen() {
    const cuenta = cuentaSeleccionada();

    const saldo = cuenta
      ? Number(cuenta.saldoPendiente)
      : 0;

    const valor = Number(valorInput.value) || 0;
    const nuevoSaldo = Math.max(0, saldo - valor);

    document.getElementById('saldoActualAbono').textContent =
      datos.dinero(saldo);

    document.getElementById('resumenClienteAbono').textContent =
      cuenta ? cuenta.cliente : 'Sin cuentas pendientes';

    document.getElementById('resumenFacturaAbono').textContent =
      cuenta ? cuenta.ventaId : '—';

    document.getElementById('resumenSaldoAnterior').textContent =
      datos.dinero(saldo);

    document.getElementById('resumenValorAbono').textContent =
      '-' + datos.dinero(valor);

    document.getElementById('resumenNuevoSaldo').textContent =
      datos.dinero(nuevoSaldo);

    guardar.disabled = guardando || !cuenta;
  }

  document.querySelectorAll('.registrar-abono__rapidos button')
    .forEach(boton => {

      boton.addEventListener('click', () => {
        const cuenta = cuentaSeleccionada();

        if (!cuenta) return;

        const saldo = Number(cuenta.saldoPendiente);
        const valorBoton = boton.dataset.valor;

        valorInput.value = valorBoton === 'total'
          ? saldo
          : Math.min(Number(valorBoton), saldo);

        actualizarResumen();
      });
    });

  clienteSelect.addEventListener('change', () => {
    valorInput.value = '';
    cargarFacturas();
  });

  facturaSelect.addEventListener('change', () => {
    valorInput.value = '';
    actualizarResumen();
  });

  valorInput.addEventListener('input', actualizarResumen);

  formulario.addEventListener('submit', async evento => {
    evento.preventDefault();
    ocultarMensaje();

    if (guardando) return;

    const cuenta = cuentaSeleccionada();

    if (!cuenta) {
      mostrarMensaje('Selecciona una cuenta por cobrar.');
      return;
    }

    const valor = Number(valorInput.value);
    const saldo = Number(cuenta.saldoPendiente);

    if (
      !Number.isFinite(valor) ||
      valor <= 0 ||
      !Number.isInteger(Math.round(valor * 100)) ||
      Math.abs(valor * 100 - Math.round(valor * 100)) > 0.000001
    ) {
      mostrarMensaje(
        'Ingresa un abono positivo con máximo dos decimales.'
      );
      return;
    }

    if (valor > saldo) {
      mostrarMensaje(
        `El abono no puede superar el saldo de ${datos.dinero(saldo)}.`
      );
      return;
    }

    if (!fechaInput.value) {
      mostrarMensaje('Selecciona la fecha del pago.');
      return;
    }

    guardando = true;
    guardar.disabled = true;

    const textoOriginal = guardar.textContent;
    guardar.textContent = 'Guardando...';

    try {
      const resultado = await datos.registrarAbono({
        cuentaId: cuenta.id,
        valor,
        medioPago: medioInput.value,
        fecha: fechaInput.value,
        referencia: referenciaInput.value.trim(),
        observaciones: observacionesInput.value.trim()
      });

      alert(
        `Abono registrado correctamente.\n` +
        `Comprobante: AB-${String(resultado.abono.id).padStart(4, '0')}\n` +
        `Nuevo saldo: ${datos.dinero(resultado.cuenta.saldoPendiente)}`
      );

      window.location.href = 'cartera.html';

    } catch (error) {
      mostrarMensaje(
        error.message || 'No fue posible registrar el abono.'
      );

    } finally {
      guardando = false;
      guardar.textContent = textoOriginal;
      actualizarResumen();
    }
  });

  try {
    guardar.disabled = true;

    cuentas = await datos.obtenerPendientes();

    cargarClientes();
    cargarFacturas();

    if (!cuentas.length) {
      mostrarMensaje('No existen cuentas con saldo pendiente.');
      guardar.disabled = true;
    }

  } catch (error) {
    console.error('Error al cargar las cuentas:', error);

    mostrarMensaje(
      error.message || 'No fue posible cargar las cuentas.'
    );

    guardar.disabled = true;
  }

  if (window.lucide) {
    window.lucide.createIcons();
  }
});
