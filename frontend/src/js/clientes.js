
document.addEventListener('DOMContentLoaded', () => {

  const tabla = document.getElementById('tablaClientes');
  if (!tabla) return;

  const buscador = document.getElementById('buscarCliente');
  const filtro = document.getElementById('filtroEstadoCliente');
  const paginacion = document.getElementById('paginacionClientes');
  const textoPagina = document.getElementById('textoPaginacionClientes');
  const sinClientes = document.getElementById('sinClientes');
  const dialogo = document.getElementById('detalleCliente');
  const detalle = document.getElementById('contenidoDetalleCliente');

  const CLAVE = 'salsamentaria_clientes';
  const CLAVE_CARTERA = 'salsamentaria_cartera';
  const POR_PAGINA = 5;

  let paginaActual = 1;
  let filtrados = [];

  // Clientes de demostración del mockup.
  const ejemplos = [
    {
      id: 'CLI-001',
      tipo: 'negocio',
      nombre: 'Tienda El Portal',
      contacto: 'Lucía Torres',
      telefono: '310 442 1930',
      documento: '',
      correo: '',
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
      documento: '',
      correo: '',
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
      documento: '',
      correo: '',
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
      documento: '',
      correo: '',
      saldoInicialDemo: 92000,
      credito: true,
      cupo: 500000,
      plazo: 15
    }
  ];

  // Leer datos sin detener la página ante un error.
  function leer(clave) {
    try {
      const datos = JSON.parse(localStorage.getItem(clave) || '[]');
      return Array.isArray(datos) ? datos : [];
    } catch {
      return [];
    }
  }

  function dinero(valor) {
    return '$' + Number(valor || 0).toLocaleString('es-CO', {
      maximumFractionDigits: 0
    });
  }

  function normalizar(texto) {
    return String(texto || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim();
  }

  // Se combinan los clientes creados con los de ejemplo.
  function obtenerClientes() {
    const guardados = leer(CLAVE);
    const ids = new Set(guardados.map(c => c.id));

    return [
      ...guardados,
      ...ejemplos.filter(c => !ids.has(c.id))
    ];
  }

  // Consultar cuentas por cobrar del prototipo.
  function saldoCliente(cliente) {
    const cuentas = leer(CLAVE_CARTERA);

    const relacionadas = cuentas.filter(c =>
      c.clienteId === cliente.id ||
      (!c.clienteId &&
       normalizar(c.cliente) === normalizar(cliente.nombre))
    );

    const saldoCartera = relacionadas.reduce(
      (suma, cuenta) =>
        suma + Math.max(0, Number(cuenta.saldoPendiente) || 0),
      0
    );

    // Los saldos del mockup son demostrativos.
    // No se suman a la cartera para evitar duplicaciones.
    return Math.max(
      Number(cliente.saldoInicialDemo) || 0,
      saldoCartera
    );
  }

  function crearCelda(texto, clase = '') {
    const td = document.createElement('td');
    td.textContent = String(texto ?? '');
    if (clase) td.className = clase;
    return td;
  }

  // Iniciales del cliente para el avatar.
  function iniciales(nombre) {
    return String(nombre).trim()
      .split(/\s+/)
      .slice(0, 2)
      .map(parte => parte[0] || '')
      .join('')
      .toUpperCase();
  }

  function mostrarTabla() {
    tabla.replaceChildren();

    const total = filtrados.length;
    const paginas = Math.ceil(total / POR_PAGINA);
    const inicio = (paginaActual - 1) * POR_PAGINA;

    filtrados.slice(inicio, inicio + POR_PAGINA).forEach(cliente => {
      const fila = document.createElement('tr');

      // Cliente e iniciales.
      const tdNombre = document.createElement('td');
      const identidad = document.createElement('div');
      identidad.className = 'clientes__identidad';

      const avatar = document.createElement('span');
      avatar.className = 'clientes__avatar';
      avatar.textContent = iniciales(cliente.nombre);

      const nombre = document.createElement('strong');
      nombre.textContent = cliente.nombre;

      identidad.append(avatar, nombre);
      tdNombre.appendChild(identidad);
      fila.appendChild(tdNombre);

      fila.appendChild(crearCelda(cliente.contacto));
      fila.appendChild(
        crearCelda(cliente.telefono, 'clientes__telefono')
      );

      const saldo = saldoCliente(cliente);
      fila.appendChild(
        crearCelda(dinero(saldo), 'clientes__saldo')
      );

      // Estado de cuenta.
      const tdEstado = document.createElement('td');
      const estado = document.createElement('span');

      estado.className = 'clientes__estado ' +
        (saldo > 0
          ? 'clientes__estado--pendiente'
          : 'clientes__estado--aldia');

      estado.textContent = saldo > 0 ? 'Pendiente' : 'Al día';

      tdEstado.appendChild(estado);
      fila.appendChild(tdEstado);

      // Botón de acciones.
      const tdAcciones = document.createElement('td');
      const boton = document.createElement('button');

      boton.type = 'button';
      boton.className = 'clientes__accion';
      boton.textContent = '•••';
      boton.setAttribute(
        'aria-label',
        `Consultar cliente ${cliente.nombre}`
      );

      boton.addEventListener('click', () => mostrarDetalle(cliente));

      tdAcciones.appendChild(boton);
      fila.appendChild(tdAcciones);
      tabla.appendChild(fila);
    });

    sinClientes.hidden = total !== 0;

    textoPagina.textContent = total
      ? `Mostrando ${inicio + 1}–${Math.min(inicio + POR_PAGINA, total)} de ${total} registros`
      : 'Mostrando 0 registros';

    paginacion.replaceChildren();

    if (paginas > 1) {
      crearBoton('‹', paginaActual - 1, paginaActual === 1);

      for (let n = 1; n <= paginas; n++) {
        crearBoton(String(n), n, false, n === paginaActual);
      }

      crearBoton('›', paginaActual + 1, paginaActual === paginas);
    }
  }

  function crearBoton(texto, pagina, deshabilitado, activo = false) {
    const boton = document.createElement('button');

    boton.type = 'button';
    boton.textContent = texto;
    boton.disabled = deshabilitado;

    if (activo) boton.classList.add('activo');

    boton.addEventListener('click', () => {
      paginaActual = pagina;
      mostrarTabla();
    });

    paginacion.appendChild(boton);
  }

  // Ventana para consultar y editar.
  function mostrarDetalle(cliente) {
    detalle.replaceChildren();

    function agregarCampo(etiqueta, valor) {
      const p = document.createElement('p');
      const fuerte = document.createElement('strong');

      fuerte.textContent = etiqueta + ': ';
      p.append(
        fuerte,
        document.createTextNode(String(valor || 'No registrado'))
      );

      detalle.appendChild(p);
    }

    agregarCampo('Cliente', cliente.nombre);
    agregarCampo('Tipo', cliente.tipo === 'natural'
      ? 'Persona natural'
      : 'Negocio o empresa');
    agregarCampo('Contacto', cliente.contacto);
    agregarCampo('Documento', cliente.documento);
    agregarCampo('Teléfono', cliente.telefono);
    agregarCampo('Correo', cliente.correo);
    agregarCampo('Dirección', cliente.direccion);
    agregarCampo('Ciudad', cliente.ciudad);
    agregarCampo('Barrio', cliente.barrio);
    agregarCampo('Saldo pendiente', dinero(saldoCliente(cliente)));
    agregarCampo('Crédito', cliente.credito ? 'Habilitado' : 'Deshabilitado');

    const enlace = document.createElement('a');
    enlace.href = `nuevo-cliente.html?id=${encodeURIComponent(cliente.id)}`;
    enlace.className =
      'clientes__boton-principal clientes__dialogo-editar';
    enlace.textContent = 'Editar cliente';

    detalle.appendChild(enlace);
    dialogo.showModal();
  }

  // Buscar y filtrar por saldo.
  function filtrar() {
    const texto = normalizar(buscador.value);
    const estado = filtro.value;

    filtrados = obtenerClientes().filter(cliente => {
      const coincideTexto = [
        cliente.nombre,
        cliente.contacto,
        cliente.telefono,
        cliente.documento
      ].some(valor => normalizar(valor).includes(texto));

      const saldo = saldoCliente(cliente);

      const coincideEstado =
        estado === 'todos' ||
        (estado === 'pendiente' && saldo > 0) ||
        (estado === 'aldia' && saldo <= 0);

      return coincideTexto && coincideEstado;
    });

    paginaActual = 1;
    mostrarTabla();
  }

  buscador.addEventListener('input', filtrar);
  filtro.addEventListener('change', filtrar);

  document.getElementById('cerrarDetalleCliente')
    .addEventListener('click', () => dialogo.close());

  filtrar();

  if (window.lucide) window.lucide.createIcons();
});
