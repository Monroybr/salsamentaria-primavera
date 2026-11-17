document.addEventListener('DOMContentLoaded', () => {
  const API_URL = 'http://localhost:4000/api/clientes';
  const POR_PAGINA = 5;

  const tabla = document.getElementById('tablaClientes');
  if (!tabla) return;

  const buscador = document.getElementById('buscarCliente');
  const filtro = document.getElementById('filtroEstadoCliente');
  const paginacion = document.getElementById('paginacionClientes');
  const textoPagina = document.getElementById('textoPaginacionClientes');
  const sinClientes = document.getElementById('sinClientes');
  const dialogo = document.getElementById('detalleCliente');
  const detalle = document.getElementById('contenidoDetalleCliente');
  const cerrarDetalle = document.getElementById('cerrarDetalleCliente');

  let clientes = [];
  let filtrados = [];
  let paginaActual = 1;
  let cargando = false;
  let mensajeError = '';

  function dinero(valor) {
    return '$' + Number(valor || 0).toLocaleString('es-CO', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    });
  }

  function normalizar(valor) {
    return String(valor ?? '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim();
  }

  function iniciales(nombre) {
    return String(nombre || '')
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map(parte => parte.charAt(0))
      .join('')
      .toUpperCase();
  }

  function saldoCliente(cliente) {
    return Math.max(0, Number(cliente.saldo_pendiente) || 0);
  }

  function contactoCliente(cliente) {
    return cliente.contacto || cliente.nombre || 'No registrado';
  }

  function crearCelda(texto, clase = '') {
    const td = document.createElement('td');
    td.textContent = String(texto ?? '');
    if (clase) td.className = clase;
    return td;
  }

  async function cargarClientes() {
    cargando = true;
    mensajeError = '';
    mostrarTabla();

    try {
      const respuesta = await fetch(API_URL, {
        method: 'GET',
        headers: {
          Accept: 'application/json'
        },
        cache: 'no-store'
      });

      if (!respuesta.ok) {
        throw new Error(
          `Error HTTP ${respuesta.status} al consultar clientes`
        );
      }

      const datos = await respuesta.json();

      if (!Array.isArray(datos)) {
        throw new Error('La API no devolvió una lista de clientes.');
      }

      clientes = datos;
    } catch (error) {
      console.error('Error al cargar clientes:', error);
      clientes = [];
      mensajeError =
        'No fue posible consultar los clientes. Verifica que el servidor esté funcionando.';
    } finally {
      cargando = false;
      filtrar();
    }
  }

  function mostrarTabla() {
    tabla.replaceChildren();
    paginacion.replaceChildren();

    if (cargando) {
      sinClientes.hidden = false;
      sinClientes.textContent = 'Cargando clientes...';
      textoPagina.textContent = '';
      return;
    }

    if (mensajeError) {
      sinClientes.hidden = false;
      sinClientes.textContent = mensajeError;
      textoPagina.textContent = '';
      return;
    }

    const total = filtrados.length;
    const paginas = Math.ceil(total / POR_PAGINA);

    paginaActual = Math.min(
      Math.max(1, paginaActual),
      Math.max(1, paginas)
    );

    const inicio = (paginaActual - 1) * POR_PAGINA;
    const visibles = filtrados.slice(inicio, inicio + POR_PAGINA);

    visibles.forEach(cliente => {
      const fila = document.createElement('tr');

      // Nombre e iniciales.
      const tdNombre = document.createElement('td');
      const identidad = document.createElement('div');
      identidad.className = 'clientes__identidad';

      const avatar = document.createElement('span');
      avatar.className = 'clientes__avatar';
      avatar.textContent = iniciales(cliente.nombre);

      const nombre = document.createElement('strong');
      nombre.textContent = cliente.nombre || 'Sin nombre';

      identidad.append(avatar, nombre);
      tdNombre.appendChild(identidad);
      fila.appendChild(tdNombre);

      // Contacto y teléfono.
      fila.appendChild(
        crearCelda(contactoCliente(cliente))
      );

      fila.appendChild(
        crearCelda(
          cliente.telefono || 'No registrado',
          'clientes__telefono'
        )
      );

      // Saldo pendiente.
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

      // Acciones.
      const tdAcciones = document.createElement('td');
      const boton = document.createElement('button');

      boton.type = 'button';
      boton.className = 'clientes__accion';
      boton.textContent = '•••';

      boton.setAttribute(
        'aria-label',
        `Consultar cliente ${cliente.nombre}`
      );

      boton.addEventListener('click', () => {
        mostrarDetalle(cliente);
      });

      tdAcciones.appendChild(boton);
      fila.appendChild(tdAcciones);

      tabla.appendChild(fila);
    });

    sinClientes.hidden = total !== 0;

    if (total === 0) {
      sinClientes.textContent =
        'No se encontraron clientes con los filtros seleccionados.';
    }

    textoPagina.textContent = total > 0
      ? `Mostrando ${inicio + 1}–${Math.min(
          inicio + POR_PAGINA,
          total
        )} de ${total} registros`
      : 'Mostrando 0 registros';

    if (paginas > 1) {
      crearBoton(
        '‹',
        paginaActual - 1,
        paginaActual === 1
      );

      for (let numero = 1; numero <= paginas; numero++) {
        crearBoton(
          String(numero),
          numero,
          false,
          numero === paginaActual
        );
      }

      crearBoton(
        '›',
        paginaActual + 1,
        paginaActual === paginas
      );
    }
  }

  function crearBoton(texto, pagina, deshabilitado, activo = false) {
    const boton = document.createElement('button');

    boton.type = 'button';
    boton.textContent = texto;
    boton.disabled = deshabilitado;

    if (activo) {
      boton.classList.add('activo');
      boton.setAttribute('aria-current', 'page');
    }

    boton.addEventListener('click', () => {
      paginaActual = pagina;
      mostrarTabla();
    });

    paginacion.appendChild(boton);
  }

  function mostrarDetalle(cliente) {
    if (!dialogo || !detalle) return;

    detalle.replaceChildren();

    function agregarCampo(etiqueta, valor) {
      const p = document.createElement('p');
      const fuerte = document.createElement('strong');

      fuerte.textContent = etiqueta + ': ';

      p.append(
        fuerte,
        document.createTextNode(
          valor === null ||
          valor === undefined ||
          valor === ''
            ? 'No registrado'
            : String(valor)
        )
      );

      detalle.appendChild(p);
    }

    agregarCampo('Cliente', cliente.nombre);

    agregarCampo(
      'Tipo',
      cliente.tipo_cliente === 'negocio'
        ? 'Negocio o empresa'
        : 'Persona natural'
    );

    agregarCampo('Contacto', contactoCliente(cliente));
    agregarCampo('Tipo de documento', cliente.tipo_documento);
    agregarCampo('Número de documento', cliente.numero_documento);
    agregarCampo('Teléfono', cliente.telefono);
    agregarCampo('Correo', cliente.correo);
    agregarCampo('Dirección', cliente.direccion);
    agregarCampo('Ciudad', cliente.ciudad);
    agregarCampo('Barrio', cliente.barrio);

    agregarCampo(
      'Saldo pendiente',
      dinero(saldoCliente(cliente))
    );

    agregarCampo(
      'Crédito',
      Number(cliente.credito_habilitado) === 1
        ? 'Habilitado'
        : 'Deshabilitado'
    );

    agregarCampo(
      'Cupo de crédito',
      dinero(cliente.cupo_credito)
    );

    agregarCampo(
      'Plazo de crédito',
      `${Number(cliente.plazo_credito) || 15} días`
    );

    agregarCampo('Notas', cliente.notas);

    // El formulario de edición se conectará en el siguiente paso.
    const enlace = document.createElement('a');

    enlace.href =
      `nuevo-cliente.html?id=${encodeURIComponent(cliente.id_cliente)}`;

    enlace.className =
      'clientes__boton-principal clientes__dialogo-editar';

    enlace.textContent = 'Editar cliente';

    detalle.appendChild(enlace);

    if (typeof dialogo.showModal === 'function') {
      dialogo.showModal();
    }
  }

  function filtrar() {
    if (cargando || mensajeError) {
      mostrarTabla();
      return;
    }

    const texto = normalizar(buscador?.value);
    const estado = filtro?.value || 'todos';

    filtrados = clientes.filter(cliente => {
      const coincideTexto = [
        cliente.nombre,
        cliente.contacto,
        cliente.telefono,
        cliente.numero_documento,
        cliente.correo
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

  buscador?.addEventListener('input', filtrar);
  filtro?.addEventListener('change', filtrar);

  cerrarDetalle?.addEventListener('click', () => {
    dialogo.close();
  });

  dialogo?.addEventListener('click', evento => {
    if (evento.target === dialogo) {
      dialogo.close();
    }
  });

  // Actualizar los datos cuando se regrese a esta pestaña.
  window.addEventListener('focus', () => {
    if (!document.hidden) {
      cargarClientes();
    }
  });

  cargarClientes();

  if (window.lucide) {
    window.lucide.createIcons();
  }
});
