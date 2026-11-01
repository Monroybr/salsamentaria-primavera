
document.addEventListener('DOMContentLoaded', () => {

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

  const cuentas = datos.obtenerPendientes();

  document.getElementById('numeroComprobante').textContent =
    datos.siguienteComprobante();

  fechaInput.value = datos.fechaLocal();

  // Crear una opción de selección.
  function agregarOpcion(select, valor, texto) {
    const opcion = document.createElement('option');
    opcion.value = valor;
    opcion.textContent = texto;
    select.appendChild(opcion);
  }

  // Agrupar cuentas por cliente.
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

    // Si se abrió desde "Abonar" en la tabla,
    // seleccionar automáticamente ese cliente.
    const inicial = cuentas.find(c => c.id === cuentaInicial);

    if (inicial) {
      clienteSelect.value = inicial.clienteId ||
        datos.normalizar(inicial.cliente);
    }
  }

  // Mostrar las facturas pendientes del cliente.
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

    if (relacionadas.some(c => c.id === cuentaInicial)) {
      facturaSelect.value = cuentaInicial;
    }

    actualizarResumen();
  }

  function cuentaSeleccionada() {
    return cuentas.find(c => c.id === facturaSelect.value);
  }

  function actualizarResumen() {
    const cuenta = cuentaSeleccionada();
    const saldo = cuenta ? Number(cuenta.saldoPendiente) : 0;

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

    // No permitir registrar sin una cuenta válida.
    guardar.disabled = !cuenta;
  }

  function mostrarMensaje(texto) {
    mensaje.textContent = texto;
    mensaje.hidden = false;
  }

  // Botones de abono rápido.
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
    // Evitar conservar un valor superior al saldo
    // de otro cliente.
    valorInput.value = '';
    cargarFacturas();
  });

  facturaSelect.addEventListener('change', () => {
    valorInput.value = '';
    actualizarResumen();
  });

  valorInput.addEventListener('input', actualizarResumen);

  // Registrar el pago.
  formulario.addEventListener('submit', evento => {
    evento.preventDefault();
    mensaje.hidden = true;

    const cuenta = cuentaSeleccionada();

    if (!cuenta) {
      mostrarMensaje('Selecciona una cuenta por cobrar.');
      return;
    }

    const valor = Number(valorInput.value);
    const saldo = Number(cuenta.saldoPendiente);

    if (!Number.isInteger(valor) || valor <= 0) {
      mostrarMensaje('Ingresa un abono válido mayor que cero.');
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

    // Evitar que se guarde dos veces.
    guardar.disabled = true;

    try {
      const resultado = datos.registrarAbono({
        cuentaId: cuenta.id,
        valor,
        medioPago: medioInput.value,
        fecha: fechaInput.value,
        referencia: referenciaInput.value.trim(),
        observaciones: observacionesInput.value.trim()
      });

      alert(
        `Abono ${resultado.abono.id} registrado correctamente.\n` +
        `Nuevo saldo: ${datos.dinero(resultado.cuenta.saldoPendiente)}`
      );

      window.location.href = 'cartera.html';

    } catch (error) {
      guardar.disabled = false;
      mostrarMensaje(error.message || 'No fue posible registrar el abono.');
    }
  });

  // Inicializar.
  cargarClientes();
  cargarFacturas();

  if (!cuentas.length) {
    mostrarMensaje('No existen cuentas con saldo pendiente.');
    guardar.disabled = true;
  }

  if (window.lucide) window.lucide.createIcons();
});
