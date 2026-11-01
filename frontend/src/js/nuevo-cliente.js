
document.addEventListener('DOMContentLoaded', () => {

  const formulario = document.getElementById('formNuevoCliente');
  if (!formulario) return;

  const nombre = document.getElementById('nombreCliente');
  const contacto = document.getElementById('contactoCliente');
  const documento = document.getElementById('documentoCliente');
  const telefono = document.getElementById('telefonoCliente');
  const correo = document.getElementById('correoCliente');

  const direccion = document.getElementById('direccionCliente');
  const ciudad = document.getElementById('ciudadCliente');
  const barrio = document.getElementById('barrioCliente');
  const notas = document.getElementById('notasCliente');

  const credito = document.getElementById('habilitarCredito');
  const camposCredito = document.getElementById('camposCredito');
  const cupo = document.getElementById('cupoCredito');
  const plazo = document.getElementById('plazoCredito');

  const nombreResumen = document.getElementById('nombreResumenCliente');
  const resumenCredito = document.getElementById('resumenCredito');
  const mensaje = document.getElementById('mensajeCliente');
  const botonGuardar = document.getElementById('guardarCliente');

  const CLAVE = 'salsamentaria_clientes';

  // Clientes del mockup que también se pueden editar.
  const ejemplos = [
    {
      id: 'CLI-001',
      tipo: 'negocio',
      nombre: 'Tienda El Portal',
      contacto: 'Lucía Torres',
      telefono: '310 442 1930',
      saldoInicialDemo: 328400,
      credito: true,
      cupo: 500000,
      plazo: 15
    },
    {
      id: 'CLI-002',
      tipo: 'negocio',
      nombre: 'Panadería Central',
      contacto: 'Jorge Ramírez',
      telefono: '315 890 2241',
      saldoInicialDemo: 176500,
      credito: true,
      cupo: 500000,
      plazo: 15
    },
    {
      id: 'CLI-003',
      tipo: 'natural',
      nombre: 'María Rodríguez',
      contacto: 'María Rodríguez',
      telefono: '300 514 7822',
      saldoInicialDemo: 0,
      credito: false,
      cupo: 0,
      plazo: 15
    },
    {
      id: 'CLI-004',
      tipo: 'negocio',
      nombre: 'Mercado San José',
      contacto: 'Andrés Gil',
      telefono: '320 667 1045',
      saldoInicialDemo: 92000,
      credito: true,
      cupo: 500000,
      plazo: 15
    }
  ];

  function leerClientes() {
    try {
      const datos = JSON.parse(localStorage.getItem(CLAVE) || '[]');
      return Array.isArray(datos) ? datos : [];
    } catch {
      return [];
    }
  }

  function tipoSeleccionado() {
    return document.querySelector(
      'input[name="tipoCliente"]:checked'
    ).value;
  }

  function mostrarMensaje(texto) {
    mensaje.textContent = texto;
    mensaje.hidden = false;
  }

  // =====================================
  // CAMBIAR TIPO DE CLIENTE
  // =====================================

  function actualizarTipo() {
    const natural = tipoSeleccionado() === 'natural';

    document.getElementById('etiquetaNombreCliente').textContent =
      natural ? 'Nombre completo' : 'Nombre del negocio';

    document.getElementById('etiquetaDocumentoCliente').textContent =
      natural ? 'Cédula' : 'NIT';

    nombre.placeholder = natural
      ? 'Ej. María Rodríguez'
      : 'Ej. Tienda La Primavera';

    documento.placeholder = natural
      ? 'Número de identificación'
      : '900000000-1';

    document.querySelectorAll('.nuevo-cliente__tipo').forEach(opcion => {
      opcion.classList.toggle(
        'activo',
        opcion.querySelector('input').checked
      );
    });

    actualizarResumen();
  }

  // =====================================
  // ACTIVAR O DESACTIVAR CRÉDITO
  // =====================================

  function actualizarCredito() {
    camposCredito.hidden = !credito.checked;
    cupo.disabled = !credito.checked;
    plazo.disabled = !credito.checked;

    actualizarResumen();
  }

  // =====================================
  // RESUMEN DEL CLIENTE
  // =====================================

  function actualizarResumen() {
    const natural = tipoSeleccionado() === 'natural';

    nombreResumen.textContent = nombre.value.trim() || 'Nuevo cliente';

    const descripcion = document.querySelector(
      '.nuevo-cliente__resumen > p'
    );

    descripcion.textContent = natural
      ? 'Persona natural'
      : 'Negocio o empresa';

    resumenCredito.textContent = credito.checked
      ? 'Habilitado'
      : 'Deshabilitado';
  }

  // =====================================
  // EDICIÓN DE CLIENTES
  // =====================================

  const parametros = new URLSearchParams(window.location.search);
  const idEditar = parametros.get('id');

  let clienteOriginal = null;

  if (idEditar) {
    clienteOriginal = [
      ...leerClientes(),
      ...ejemplos
    ].find(cliente => cliente.id === idEditar);

    if (clienteOriginal) {
      document.getElementById('tituloFormularioCliente').textContent =
        'Editar cliente';

      document.getElementById('textoGuardarCliente').textContent =
        'Guardar cambios';

      const radio = document.querySelector(
        `input[name="tipoCliente"][value="${clienteOriginal.tipo}"]`
      );

      if (radio) radio.checked = true;

      nombre.value = clienteOriginal.nombre || '';
      contacto.value = clienteOriginal.contacto || '';
      documento.value = clienteOriginal.documento || '';
      telefono.value = clienteOriginal.telefono || '';
      correo.value = clienteOriginal.correo || '';
      direccion.value = clienteOriginal.direccion || '';
      ciudad.value = clienteOriginal.ciudad || '';
      barrio.value = clienteOriginal.barrio || '';
      notas.value = clienteOriginal.notas || '';

      credito.checked = Boolean(clienteOriginal.credito);
      cupo.value = clienteOriginal.cupo ?? 0;
      plazo.value = String(clienteOriginal.plazo ?? 15);
    } else {
      mostrarMensaje('No se encontró el cliente solicitado.');
      botonGuardar.disabled = true;
    }
  }

  // =====================================
  // GENERAR CÓDIGO DEL CLIENTE
  // =====================================

  function siguienteId() {
    const todos = [
      ...ejemplos,
      ...leerClientes()
    ];

    const numeros = todos.map(cliente =>
      Number(String(cliente.id).replace('CLI-', ''))
    ).filter(Number.isFinite);

    const siguiente = Math.max(0, ...numeros) + 1;

    return `CLI-${String(siguiente).padStart(3, '0')}`;
  }

  // =====================================
  // GUARDAR CLIENTE
  // =====================================

  formulario.addEventListener('submit', evento => {
    evento.preventDefault();
    mensaje.hidden = true;

    const nombreLimpio = nombre.value.trim();
    const contactoLimpio = contacto.value.trim();
    const telefonoLimpio = telefono.value.trim();

    if (!nombreLimpio || !contactoLimpio || !telefonoLimpio) {
      mostrarMensaje('Completa el nombre, contacto y teléfono.');
      return;
    }

    if (credito.checked && Number(cupo.value) <= 0) {
      mostrarMensaje('El cupo de crédito debe ser mayor que cero.');
      return;
    }

    const todos = [
      ...leerClientes(),
      ...ejemplos
    ];

    // Evitar documentos repetidos.
    const documentoLimpio = documento.value.trim();

    if (documentoLimpio) {
      const duplicado = todos.some(cliente =>
        cliente.id !== idEditar &&
        cliente.documento &&
        cliente.documento.trim() === documentoLimpio
      );

      if (duplicado) {
        mostrarMensaje('Ya existe un cliente con ese documento.');
        return;
      }
    }

    const cliente = {
      id: idEditar || siguienteId(),
      tipo: tipoSeleccionado(),
      nombre: nombreLimpio,
      contacto: contactoLimpio,
      documento: documentoLimpio,
      telefono: telefonoLimpio,
      correo: correo.value.trim(),
      direccion: direccion.value.trim(),
      ciudad: ciudad.value.trim(),
      barrio: barrio.value.trim(),
      notas: notas.value.trim(),
      credito: credito.checked,
      cupo: credito.checked ? Number(cupo.value) : 0,
      plazo: credito.checked ? Number(plazo.value) : 0,

      // Mantener el saldo de demostración si se edita.
      saldoInicialDemo: clienteOriginal?.saldoInicialDemo || 0,

      fechaRegistro: clienteOriginal?.fechaRegistro ||
        new Date().toISOString()
    };

    const guardados = leerClientes();
    const indice = guardados.findIndex(c => c.id === cliente.id);

    if (indice >= 0) {
      guardados[indice] = cliente;
    } else {
      guardados.unshift(cliente);
    }

    try {
      localStorage.setItem(CLAVE, JSON.stringify(guardados));
    } catch (error) {
      console.error('Error guardando cliente:', error);
      mostrarMensaje('No fue posible guardar el cliente.');
      return;
    }

    botonGuardar.disabled = true;

    alert(
      idEditar
        ? 'Cliente actualizado correctamente.'
        : 'Cliente registrado correctamente.'
    );

    window.location.href = 'clientes.html';
  });

  // =====================================
  // EVENTOS
  // =====================================

  document.querySelectorAll('input[name="tipoCliente"]').forEach(radio => {
    radio.addEventListener('change', actualizarTipo);
  });

  nombre.addEventListener('input', actualizarResumen);
  credito.addEventListener('change', actualizarCredito);

  // =====================================
  // INICIAR
  // =====================================

  actualizarTipo();
  actualizarCredito();

  if (window.lucide) window.lucide.createIcons();
});
